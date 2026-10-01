import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  collection,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy
} from 'firebase/firestore';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { getStoredCivicIssues, saveCivicIssues, getStoredLostFound, saveLostFound } from './storage';
import {
  readFirebaseConfig,
  readFirebaseConfigFromEnv,
  mergeFirebaseConfig,
  validateFirebaseConfig,
  describeAuthError,
  shouldFallbackToRedirect,
} from './firebaseConfig';

/**
 * Firebase configuration — resolved from three places, in this order:
 *
 *   1. Runtime config   — `window.__PINPOINT_FIREBASE_CONFIG__` and/or
 *                         `GET /api/config` (Express server / Vercel function).
 *                         Lets a pre-built `dist/` be re-pointed at a project
 *                         without rebuilding, and lets self-hosters keep keys
 *                         in server-side env vars.
 *   2. Build-time env    — `VITE_FIREBASE_*` (plus the FIREBASE_, REACT_APP_
 *                         and NEXT_PUBLIC_ aliases inlined by vite.config.js).
 *
 * Whichever source provides a value for a field wins; a field missing from the
 * runtime config falls back to the build-time value.
 */

/**
 * Values inlined by vite.config.js (`__PINPOINT_FIREBASE_ENV__`, field-named)
 * plus anything Vite exposes on `import.meta.env` (env-var-named).
 */
function readBundledConfig() {
  const inlined = typeof __PINPOINT_FIREBASE_ENV__ === 'undefined' ? {} : __PINPOINT_FIREBASE_ENV__;
  const fromVite = readFirebaseConfigFromEnv(import.meta.env || {});
  return mergeFirebaseConfig(readFirebaseConfig(inlined || {}), fromVite);
}

/** Config injected by the host page (see vite.config.js / server.js). */
function readWindowConfig() {
  if (typeof window === 'undefined') return {};
  return readFirebaseConfig(
    window.__PINPOINT_FIREBASE_CONFIG__ || window.__FIREBASE_CONFIG__ || {}
  );
}

/** Ask the backend for server-side env config. Never blocks the app. */
async function fetchServerConfig(timeoutMs = 4000) {
  if (typeof fetch !== 'function') return {};
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    const res = await fetch('/api/config', {
      headers: { Accept: 'application/json' },
      signal: controller ? controller.signal : undefined,
    });
    if (!res.ok) return {};
    const data = await res.json();
    const payload = data?.firebase || data?.firebaseConfig || data || {};
    return readFirebaseConfig(payload);
  } catch {
    // No backend (pure `vite dev`), no network, or HTML fallback — ignore.
    return {};
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** @type {{ configured: boolean, config: object, source: string, problems: string[], missingEnvVars: string[], warnings: string[], checkedAt: string|null }} */
let status = {
  configured: false,
  config: {},
  source: 'none',
  problems: [],
  missingEnvVars: [],
  warnings: [],
  checkedAt: null,
};

let app = null;
let db = null;
let auth = null;
let pendingAuthError = null;
let initPromise = null;

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

/**
 * Resolve config and initialize the Firebase SDK exactly once.
 * Safe to call from anywhere — every call returns the same promise.
 */
export function initializeFirebase() {
  if (!initPromise) initPromise = doInitializeFirebase();
  return initPromise;
}

async function doInitializeFirebase() {
  const bundled = readBundledConfig();
  const fromWindow = readWindowConfig();

  let config = mergeFirebaseConfig(fromWindow, bundled);
  const hasWindowValues = Object.keys(fromWindow).some((k) => fromWindow[k]);
  const windowDiffers = Object.keys(fromWindow).some(
    (k) => fromWindow[k] && bundled[k] && fromWindow[k] !== bundled[k]
  );
  let source = windowDiffers
    ? 'runtime (window)'
    : (Object.keys(bundled).some((k) => bundled[k]) ? 'build-time env (.env)' : 'runtime (window)');
  if (!hasWindowValues && !Object.keys(bundled).some((k) => bundled[k])) source = 'none';

  let validation = validateFirebaseConfig(config);
  if (!validation.configured) {
    const fromServer = await fetchServerConfig();
    if (Object.keys(fromServer).some((k) => fromServer[k])) {
      config = mergeFirebaseConfig(fromWindow, fromServer, bundled);
      source = 'runtime (/api/config)';
      validation = validateFirebaseConfig(config);
    }
  }

  status = {
    configured: validation.configured,
    config,
    source,
    problems: validation.problems,
    missingEnvVars: validation.missingEnvVars,
    warnings: validation.warnings,
    checkedAt: new Date().toISOString(),
  };

  if (!validation.configured) {
    console.warn(
      'ℹ️ Firebase is not configured — running in offline/demo mode.\n' +
        (validation.problems.length
          ? `   Problems: ${validation.problems.join(' · ')}\n`
          : '') +
        '   Fix: copy .env.example to .env and fill in the VITE_FIREBASE_* values (restart the dev server if it does not reload them).\n' +
        '   The app will keep working from localStorage until then.'
    );
    return { configured: false, auth: null, db: null, app: null, status };
  }

  // Surface non-blocking config warnings (e.g. an API key that does not look
  // like a Firebase web key) without refusing to start.
  if (validation.warnings.length) {
    console.warn(`⚠️ Firebase config warnings:\n   - ${validation.warnings.join('\n   - ')}`);
  }

  try {
    app = getApps().length === 0 ? initializeApp(config) : getApps()[0];

    if (typeof window !== 'undefined') {
      try {
        db = initializeFirestore(app, {
          localCache: persistentLocalCache({
            tabManager: persistentMultipleTabManager(),
          }),
        });
      } catch (cacheErr) {
        db = getFirestore(app);
      }
    } else {
      db = getFirestore(app);
    }

    auth = getAuth(app);

    // Finish a redirect-based sign-in initiated on a previous page load. Bounded
    // by a timeout: a slow/blocked auth domain must never delay the first paint
    // (onAuthStateChanged picks the session up anyway once it is set up).
    const redirectCheck = getRedirectResult(auth)
      .then((redirectResult) => {
        if (redirectResult?.user) {
          console.log('✅ Completed Google redirect sign-in for', redirectResult.user.email);
        }
      })
      .catch((redirectErr) => {
        console.error('Google redirect sign-in failed:', redirectErr);
        pendingAuthError = redirectErr;
      });
    await Promise.race([
      redirectCheck,
      new Promise((resolve) => setTimeout(resolve, 6000)),
    ]);

    console.log(
      `✅ Connected to Firebase (project: ${config.projectId}, auth domain: ${config.authDomain}) with persistent multi-tab cache`
    );
  } catch (err) {
    console.error('Firebase initialization error:', err);
    status.configured = false;
    status.problems = [...status.problems, err?.message || String(err)];
    return { configured: false, auth: null, db: null, app: null, status };
  }

  return { configured: true, auth, db, app, status };
}

/** True when Firebase credentials were found and the SDK initialised. */
export function isFirebaseReady() {
  return status.configured && Boolean(auth);
}

/** Current configuration status — safe to call during render. */
export function getFirebaseStatus() {
  return { ...status };
}

/** Firebase handles for advanced usage (may be null in offline mode). */
export function getFirebaseServices() {
  return { app, db, auth };
}

/**
 * Turn a raw auth error into a user-facing explanation.
 * @param {unknown} error
 */
export function explainAuthError(error) {
  const isEmbedded =
    typeof window !== 'undefined' && window.self !== window.top;
  const description = describeAuthError(error, {
    hostname: typeof window !== 'undefined' ? window.location.hostname : 'this domain',
    isEmbedded,
    configured: status.configured,
  });
  return { ...description, technical: error?.message || '', raw: error };
}

/** Error captured while finishing a redirect sign-in, if any (consumed once). */
export function consumePendingAuthError() {
  const err = pendingAuthError;
  pendingAuthError = null;
  return err;
}

/**
 * localStorage access that never throws — private browsing modes and some
 * embedded webviews block storage entirely, which must not break sign-in.
 */
function safeStorage() {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

function persistUser(user) {
  try {
    safeStorage()?.setItem('pinpoint_user', JSON.stringify(user));
  } catch {
    /* storage unavailable — session still works in memory */
  }
}

function clearPersistedUser() {
  try {
    safeStorage()?.removeItem('pinpoint_user');
    safeStorage()?.removeItem('civicbloom_user');
  } catch {
    /* ignore */
  }
}

function readPersistedUser() {
  try {
    const raw = safeStorage()?.getItem('pinpoint_user') || safeStorage()?.getItem('civicbloom_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function toAppUser(firebaseUser) {
  return {
    uid: firebaseUser.uid,
    displayName: firebaseUser.displayName || 'BBIT Member',
    email: firebaseUser.email,
    photoURL: firebaseUser.photoURL,
  };
}

function createOfflineDemoUser() {
  const demoUser = {
    uid: `google-user-${Date.now()}`,
    displayName: 'BBIT Scholar',
    email: 'student@bbit.edu.in',
    photoURL:
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80',
    isDemo: true,
  };
  persistUser(demoUser);
  return demoUser;
}

/**
 * Google Sign-In.
 *
 * - Firebase configured  → popup, with an automatic redirect fallback when the
 *   environment refuses to open pop-ups (embedded previews, strict browsers).
 * - Firebase not configured → offline demo profile (the app's localStorage mode),
 *   and the AuthModal clearly says so.
 *
 * Throws on real failures so the UI can show the reason instead of silently
 * closing the modal.
 */
export async function signInWithGoogle() {
  const state = await initializeFirebase();

  if (!state.configured) {
    console.warn(
      'Firebase Auth not configured — signing in with the offline demo profile. ' +
        'Add VITE_FIREBASE_* values to .env for real Google sign-in.'
    );
    return createOfflineDemoUser();
  }

  try {
    const result = await signInWithPopup(state.auth, googleProvider);
    const user = toAppUser(result.user);
    persistUser(user);
    return user;
  } catch (error) {
    if (shouldFallbackToRedirect(error)) {
      console.warn(
        `Popup sign-in unavailable (${error.code}) — retrying with the redirect flow…`
      );
      await signInWithGoogleRedirect();
      // The redirect flow navigates away; resolve so callers do not show an error.
      return null;
    }
    console.error('Google Sign-In Error:', error);
    throw error;
  }
}

/**
 * Redirect-based Google Sign-In — the fallback for browsers/iframes that block
 * pop-ups. The page leaves for accounts.google.com and returns to the app,
 * where `getRedirectResult` finishes the sign-in on the next load.
 */
export async function signInWithGoogleRedirect() {
  const state = await initializeFirebase();
  if (!state.configured) {
    throw Object.assign(
      new Error('Firebase is not configured, so Google sign-in is unavailable.'),
      { code: 'pinpoint/firebase-not-configured' }
    );
  }
  await signInWithRedirect(state.auth, googleProvider);
}

export async function signOutUser() {
  const state = await initializeFirebase();
  if (state.auth) {
    try {
      await signOut(state.auth);
    } catch (error) {
      console.error('Sign-out error:', error);
    }
  }
  clearPersistedUser();
}

/**
 * Subscribe to auth state. Works whether Firebase finished initialising before
 * or after this call (config hydration is asynchronous).
 */
export function subscribeToAuth(callback) {
  let unsubscribed = false;
  let unsubscribe = () => {};

  initializeFirebase().then((state) => {
    if (unsubscribed) return;

    if (state.auth) {
      unsubscribe = onAuthStateChanged(state.auth, (firebaseUser) => {
        if (firebaseUser) {
          const user = toAppUser(firebaseUser);
          persistUser(user);
          callback(user);
        } else {
          clearPersistedUser();
          callback(null);
        }
      });
      return;
    }

    // Offline demo mode — restore the last local profile, if any.
    callback(readPersistedUser());
  });

  return () => {
    unsubscribed = true;
    unsubscribe();
  };
}

/**
 * Subscribe to Civic Issues in Real-Time
 */
export function subscribeToCivicIssues(onUpdate) {
  let unsubscribed = false;
  let unsubscribe = () => {};

  initializeFirebase().then((state) => {
    if (unsubscribed) return;

    if (state.db && state.configured) {
      const q = query(collection(state.db, 'civic_issues'), orderBy('reportedAt', 'desc'));
      unsubscribe = onSnapshot(q, (snapshot) => {
        const issues = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        saveCivicIssues(issues);
        onUpdate(issues);
      }, (error) => {
        console.warn('Firestore subscription fallback to local storage:', error);
        onUpdate(getStoredCivicIssues());
      });
      return;
    }

    onUpdate(getStoredCivicIssues());
  });

  return () => {
    unsubscribed = true;
    unsubscribe();
  };
}

/**
 * Subscribe to Lost & Found in Real-Time
 */
export function subscribeToLostFound(onUpdate) {
  let unsubscribed = false;
  let unsubscribe = () => {};

  initializeFirebase().then((state) => {
    if (unsubscribed) return;

    if (state.db && state.configured) {
      const q = query(collection(state.db, 'lost_found_items'), orderBy('timestamp', 'desc'));
      unsubscribe = onSnapshot(q, (snapshot) => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        saveLostFound(items);
        onUpdate(items);
      }, (error) => {
        console.warn('Firestore subscription fallback to local storage:', error);
        onUpdate(getStoredLostFound());
      });
      return;
    }

    onUpdate(getStoredLostFound());
  });

  return () => {
    unsubscribed = true;
    unsubscribe();
  };
}

/**
 * Recursively strip undefined values from data objects before passing to Firestore setDoc/updateDoc
 * to prevent FirebaseError: Unsupported field value: undefined
 */
export function sanitizeForFirestore(obj) {
  if (obj === null || obj === undefined) {
    return null;
  }
  if (Array.isArray(obj)) {
    return obj
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirestore(item));
  }
  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const clean = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        clean[key] = sanitizeForFirestore(value);
      }
    }
    return clean;
  }
  return obj;
}

/**
 * Firestore Mutations with LocalStorage Sync
 */
export async function syncCivicIssue(issue) {
  const state = await initializeFirebase();
  if (state.db && state.configured) {
    try {
      const sanitized = sanitizeForFirestore(issue);
      await setDoc(doc(state.db, 'civic_issues', issue.id), sanitized, { merge: true });
    } catch (e) {
      console.error('Error syncing civic issue to Firestore:', e);
    }
  }
}

export async function syncLostFoundItem(item) {
  const state = await initializeFirebase();
  if (state.db && state.configured) {
    try {
      const sanitized = sanitizeForFirestore(item);
      await setDoc(doc(state.db, 'lost_found_items', item.id), sanitized, { merge: true });
    } catch (e) {
      console.error('Error syncing lost & found item to Firestore:', e);
    }
  }
}

export async function deleteCivicIssue(issueId) {
  const state = await initializeFirebase();
  if (state.db && state.configured) {
    try {
      await deleteDoc(doc(state.db, 'civic_issues', issueId));
    } catch (e) {
      console.error('Error deleting civic issue from Firestore:', e);
    }
  }
}

export async function deleteLostFoundItem(itemId) {
  const state = await initializeFirebase();
  if (state.db && state.configured) {
    try {
      await deleteDoc(doc(state.db, 'lost_found_items', itemId));
    } catch (e) {
      console.error('Error deleting lost & found item from Firestore:', e);
    }
  }
}

/** Starts configuration hydration as soon as the module is imported (browser only). */
if (typeof window !== 'undefined') {
  initializeFirebase();
}
