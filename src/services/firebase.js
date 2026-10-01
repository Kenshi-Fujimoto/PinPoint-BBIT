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
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import {
  browserLocalPersistence,
  getAuth,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from 'firebase/auth';
import { getStoredCivicIssues, saveCivicIssues, getStoredLostFound, saveLostFound } from './storage';

const AUTH_STORAGE_KEY = 'pinpoint_user';
const LEGACY_AUTH_STORAGE_KEY = 'civicbloom_user';

// Firebase configuration is intentionally supplied by the deployment environment.
// Values prefixed with VITE_ are public Firebase web-app identifiers, not service
// account credentials. See .env.example and docs/google-sign-in.md for setup.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

const REQUIRED_FIREBASE_FIELDS = [
  'apiKey',
  'authDomain',
  'projectId',
  'storageBucket',
  'messagingSenderId',
  'appId',
];

const isPlaceholderValue = (value) => /^(your_|replace_|<)/i.test(value.trim());

// Firebase Auth needs the complete web-app configuration. The former check only
// required an API key and project ID, which made a partial configuration look like
// a working Google login until Firebase failed at runtime.
const isFirebaseConfigured = REQUIRED_FIREBASE_FIELDS.every((field) => {
  const value = firebaseConfig[field];
  return typeof value === 'string' && value.trim() && !isPlaceholderValue(value);
});

let app = null;
let db = null;
let auth = null;
let authPersistenceReady = Promise.resolve();

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

function canUseBrowserStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function toAppUser(firebaseUser) {
  return {
    uid: firebaseUser.uid,
    displayName: firebaseUser.displayName || 'BBIT Member',
    email: firebaseUser.email || '',
    photoURL: firebaseUser.photoURL || '',
  };
}

function saveAuthenticatedUser(user) {
  if (!canUseBrowserStorage()) return;
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  window.localStorage.removeItem(LEGACY_AUTH_STORAGE_KEY);
}

function clearStoredAuthenticatedUser() {
  if (!canUseBrowserStorage()) return;
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
  window.localStorage.removeItem(LEGACY_AUTH_STORAGE_KEY);
}

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

    if (typeof window !== 'undefined') {
      try {
        db = initializeFirestore(app, {
          localCache: persistentLocalCache({
            tabManager: persistentMultipleTabManager(),
          }),
        });
      } catch (cacheErr) {
        // Firestore may already be initialized (for example after hot reload).
        db = getFirestore(app);
      }
    } else {
      db = getFirestore(app);
    }

    auth = getAuth(app);
    authPersistenceReady = setPersistence(auth, browserLocalPersistence).catch((error) => {
      // Auth still works with Firebase's default persistence if a browser blocks
      // IndexedDB/local storage. Do not prevent a user from signing in for that.
      console.warn('Unable to set persistent Firebase Auth session:', error);
    });

    // Completes a sign-in that used the redirect fallback after a blocked popup.
    // onAuthStateChanged below remains the source of truth for the app user.
    authPersistenceReady
      .then(() => getRedirectResult(auth))
      .catch((error) => console.error('Google redirect sign-in error:', error));

    console.log('✅ Connected to Firebase Firestore & Auth with persistent multi-tab cache');
  } catch (err) {
    console.error('Firebase initialization error:', err);
    app = null;
    db = null;
    auth = null;
  }
} else {
  console.info('Firebase credentials are not configured. Google sign-in is unavailable until the VITE_FIREBASE_* values are set.');
}

export { isFirebaseConfigured, db, auth };

/**
 * Convert Firebase Auth codes into instructions a student can act on instead of
 * silently failing or exposing a raw SDK error.
 */
export function getGoogleSignInErrorMessage(error) {
  switch (error?.code) {
    case 'auth/configuration-not-found':
      return 'Google sign-in has not been configured for this deployment yet. Please ask a site administrator to complete the Firebase setup.';
    case 'auth/unauthorized-domain':
      return 'This website is not authorised for Google sign-in yet. Ask an administrator to add this domain in Firebase Authentication.';
    case 'auth/operation-not-allowed':
      return 'Google sign-in is disabled in Firebase Authentication. Ask an administrator to enable the Google provider.';
    case 'auth/popup-closed-by-user':
      return 'The Google sign-in window was closed before you finished. Please try again.';
    case 'auth/popup-blocked':
      return 'Your browser blocked the Google sign-in window. Please allow pop-ups and try again.';
    case 'auth/network-request-failed':
      return 'We could not reach Google. Check your internet connection and try again.';
    case 'auth/account-exists-with-different-credential':
      return 'An account already exists with a different sign-in method. Use that method first, then try Google again.';
    default:
      return 'Google sign-in could not be completed. Please try again.';
  }
}

function userFacingGoogleSignInError(error) {
  const normalized = new Error(getGoogleSignInErrorMessage(error));
  normalized.code = error?.code || 'auth/unknown';
  return normalized;
}

/**
 * Google Authentication Helpers
 */
export async function signInWithGoogle() {
  if (!auth) {
    // Never manufacture a local "Google" user. That made it appear that real
    // Google sign-in worked even though no account had authenticated.
    throw userFacingGoogleSignInError({ code: 'auth/configuration-not-found' });
  }

  await authPersistenceReady;

  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = toAppUser(result.user);
    saveAuthenticatedUser(user);
    return user;
  } catch (error) {
    // Popup sign-in is best on desktop. On browsers that block it (including
    // some installed PWAs), continue with Firebase's full-page redirect flow.
    if (error?.code === 'auth/popup-blocked') {
      try {
        await signInWithRedirect(auth, googleProvider);
        return null; // The browser navigates; the auth listener restores the user on return.
      } catch (redirectError) {
        throw userFacingGoogleSignInError(redirectError);
      }
    }

    throw userFacingGoogleSignInError(error);
  }
}

export async function signOutUser() {
  if (auth) {
    await signOut(auth);
  }
  clearStoredAuthenticatedUser();
}

export function subscribeToAuth(callback) {
  if (auth) {
    return onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const user = toAppUser(firebaseUser);
        saveAuthenticatedUser(user);
        callback(user);
      } else {
        clearStoredAuthenticatedUser();
        callback(null);
      }
    });
  }

  // A Firebase session is the only source of authentication. Clear legacy demo
  // profiles so an old localStorage value can never grant member-only access.
  clearStoredAuthenticatedUser();
  callback(null);
  return () => {};
}

/**
 * Subscribe to Civic Issues in Real-Time
 */
export function subscribeToCivicIssues(onUpdate) {
  if (db && isFirebaseConfigured) {
    const q = query(collection(db, 'civic_issues'), orderBy('reportedAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const issues = snapshot.docs.map((document) => ({ id: document.id, ...document.data() }));
      saveCivicIssues(issues);
      onUpdate(issues);
    }, (error) => {
      console.warn('Firestore subscription fallback to local storage:', error);
      onUpdate(getStoredCivicIssues());
    });
  }

  onUpdate(getStoredCivicIssues());
  return () => {};
}

/**
 * Subscribe to Lost & Found in Real-Time
 */
export function subscribeToLostFound(onUpdate) {
  if (db && isFirebaseConfigured) {
    const q = query(collection(db, 'lost_found_items'), orderBy('timestamp', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((document) => ({ id: document.id, ...document.data() }));
      saveLostFound(items);
      onUpdate(items);
    }, (error) => {
      console.warn('Firestore subscription fallback to local storage:', error);
      onUpdate(getStoredLostFound());
    });
  }

  onUpdate(getStoredLostFound());
  return () => {};
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
  if (db && isFirebaseConfigured) {
    try {
      const sanitized = sanitizeForFirestore(issue);
      await setDoc(doc(db, 'civic_issues', issue.id), sanitized, { merge: true });
    } catch (error) {
      console.error('Error syncing civic issue to Firestore:', error);
    }
  }
}

export async function syncLostFoundItem(item) {
  if (db && isFirebaseConfigured) {
    try {
      const sanitized = sanitizeForFirestore(item);
      await setDoc(doc(db, 'lost_found_items', item.id), sanitized, { merge: true });
    } catch (error) {
      console.error('Error syncing lost & found item to Firestore:', error);
    }
  }
}

export async function deleteCivicIssue(issueId) {
  if (db && isFirebaseConfigured) {
    try {
      await deleteDoc(doc(db, 'civic_issues', issueId));
    } catch (error) {
      console.error('Error deleting civic issue from Firestore:', error);
    }
  }
}

export async function deleteLostFoundItem(itemId) {
  if (db && isFirebaseConfigured) {
    try {
      await deleteDoc(doc(db, 'lost_found_items', itemId));
    } catch (error) {
      console.error('Error deleting lost & found item from Firestore:', error);
    }
  }
}
