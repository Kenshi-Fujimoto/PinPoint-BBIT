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
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { getStoredCivicIssues, saveCivicIssues, getStoredLostFound, saveLostFound } from './storage';
import {
  DEMO_USER_KEY,
  LEGACY_USER_KEY,
  createDemoUser,
  parseStoredUser,
} from './demoSession';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && 
  firebaseConfig.projectId && 
  !firebaseConfig.apiKey.includes('YOUR_')
);

let app = null;
let db = null;
let auth = null;
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

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
        db = getFirestore(app);
      }
    } else {
      db = getFirestore(app);
    }

    auth = getAuth(app);
    console.log('✅ Connected to Firebase Firestore & Auth with persistent multi-tab cache');
  } catch (err) {
    console.error('Firebase initialization error:', err);
  }
} else {
  console.log('ℹ️ Firebase credentials not provided in .env. Running in synchronized offline-first mode.');
}

export { isFirebaseConfigured, db, auth };

/**
 * Session persistence helpers.
 *
 * Every access is wrapped: Safari private mode, disabled cookies and quota
 * errors must never break the sign-in flow. Reads are validated through
 * `parseStoredUser`, and corrupted records are dropped instead of being
 * handed to React.
 */
function readStoredSession() {
  try {
    const raw = localStorage.getItem(DEMO_USER_KEY) || localStorage.getItem(LEGACY_USER_KEY);
    const user = parseStoredUser(raw);
    if (!user && raw) {
      // Untrusted/corrupt record: clear it so a later read stays clean.
      localStorage.removeItem(DEMO_USER_KEY);
      localStorage.removeItem(LEGACY_USER_KEY);
    }
    return user;
  } catch (err) {
    console.warn('Unable to read the saved session — continuing signed out:', err);
    return null;
  }
}

function writeStoredSession(user) {
  try {
    localStorage.setItem(DEMO_USER_KEY, JSON.stringify(user));
    localStorage.removeItem(LEGACY_USER_KEY);
  } catch (err) {
    console.warn('Unable to persist the session locally:', err);
  }
}

function clearStoredSession() {
  try {
    localStorage.removeItem(DEMO_USER_KEY);
    localStorage.removeItem(LEGACY_USER_KEY);
  } catch (err) {
    console.warn('Unable to clear the saved session:', err);
  }
}

/**
 * Google Authentication Helpers
 */
export async function signInWithGoogle() {
  if (!auth) {
    // Offline demo mode: no Firebase keys, so hand back a local demo profile.
    // The stable uid keeps upvotes and ownership checks valid across reloads,
    // and `isDemo` lets the navbar label the account honestly.
    console.warn('Firebase Auth not configured — signing in with a local demo Google profile');
    const demoUser = createDemoUser();
    writeStoredSession(demoUser);
    return demoUser;
  }

  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = {
      uid: result.user.uid,
      displayName: result.user.displayName || 'BBIT Member',
      email: result.user.email,
      photoURL: result.user.photoURL,
    };
    writeStoredSession(user);
    return user;
  } catch (error) {
    console.error('Google Sign-In Error:', error);
    throw error;
  }
}

export async function signOutUser() {
  if (auth) {
    await signOut(auth);
  }
  clearStoredSession();
}

export function subscribeToAuth(callback) {
  if (auth) {
    return onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const user = {
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName || 'BBIT Member',
          email: firebaseUser.email,
          photoURL: firebaseUser.photoURL,
          isDemo: false,
        };
        writeStoredSession(user);
        callback(user);
      } else {
        clearStoredSession();
        callback(null);
      }
    });
  } else {
    // Offline demo mode: restore the saved profile (never throws) and keep
    // tabs in sync, so signing out in one tab signs out everywhere.
    callback(readStoredSession());

    if (typeof window === 'undefined') return () => {};

    const handleStorage = (event) => {
      if (!event || event.key === null || event.key === DEMO_USER_KEY || event.key === LEGACY_USER_KEY) {
        callback(readStoredSession());
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }
}

/**
 * Subscribe to Civic Issues in Real-Time
 */
export function subscribeToCivicIssues(onUpdate) {
  if (db && isFirebaseConfigured) {
    const q = query(collection(db, 'civic_issues'), orderBy('reportedAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const issues = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      saveCivicIssues(issues);
      onUpdate(issues);
    }, (error) => {
      console.warn('Firestore subscription fallback to local storage:', error);
      onUpdate(getStoredCivicIssues());
    });
  } else {
    const local = getStoredCivicIssues();
    onUpdate(local);
    return () => {};
  }
}

/**
 * Subscribe to Lost & Found in Real-Time
 */
export function subscribeToLostFound(onUpdate) {
  if (db && isFirebaseConfigured) {
    const q = query(collection(db, 'lost_found_items'), orderBy('timestamp', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      saveLostFound(items);
      onUpdate(items);
    }, (error) => {
      console.warn('Firestore subscription fallback to local storage:', error);
      onUpdate(getStoredLostFound());
    });
  } else {
    const local = getStoredLostFound();
    onUpdate(local);
    return () => {};
  }
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
    } catch (e) {
      console.error('Error syncing civic issue to Firestore:', e);
    }
  }
}

export async function syncLostFoundItem(item) {
  if (db && isFirebaseConfigured) {
    try {
      const sanitized = sanitizeForFirestore(item);
      await setDoc(doc(db, 'lost_found_items', item.id), sanitized, { merge: true });
    } catch (e) {
      console.error('Error syncing lost & found item to Firestore:', e);
    }
  }
}

export async function deleteCivicIssue(issueId) {
  if (db && isFirebaseConfigured) {
    try {
      await deleteDoc(doc(db, 'civic_issues', issueId));
    } catch (e) {
      console.error('Error deleting civic issue from Firestore:', e);
    }
  }
}

export async function deleteLostFoundItem(itemId) {
  if (db && isFirebaseConfigured) {
    try {
      await deleteDoc(doc(db, 'lost_found_items', itemId));
    } catch (e) {
      console.error('Error deleting lost & found item from Firestore:', e);
    }
  }
}

