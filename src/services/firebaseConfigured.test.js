/**
 * The bug report this suite exists for: "the Firebase keys are in place but the
 * app still behaves as if Firebase is missing."
 *
 * vite.config.js injects the resolved config into index.html as
 * `window.__PINPOINT_FIREBASE_CONFIG__` (dev and build), so a page with a
 * complete config MUST be detected as configured. The window global is set
 * before the service is imported here, mirroring a real page load.
 */
import { describe, it, expect } from 'vitest';

globalThis.window = {
  __PINPOINT_FIREBASE_CONFIG__: {
    apiKey: 'AIzaSyTestKeyForUnitTests1234567890abcdef',
    authDomain: 'pinpoint-test.firebaseapp.com',
    projectId: 'pinpoint-test',
    storageBucket: 'pinpoint-test.appspot.com',
    messagingSenderId: '123456789012',
    appId: '1:123456789012:web:abcdef1234567890',
  },
};
globalThis.window.self = globalThis.window; // not embedded in an iframe

const { initializeFirebase, getFirebaseStatus, isFirebaseReady } = await import('./firebase');

describe('firebase service with a complete runtime config', () => {
  it('initializes the SDK and reports the project as configured', async () => {
    const state = await initializeFirebase();

    expect(state.configured).toBe(true);
    expect(isFirebaseReady()).toBe(true);

    const status = getFirebaseStatus();
    expect(status.configured).toBe(true);
    expect(status.config.projectId).toBe('pinpoint-test');
    expect(status.config.authDomain).toBe('pinpoint-test.firebaseapp.com');
    expect(status.problems).toEqual([]);
    expect(status.missingEnvVars).toEqual([]);
  });

  it('exposes the initialized Firebase handles (db + auth)', async () => {
    const state = await initializeFirebase();
    expect(state.auth).toBeTruthy();
    expect(state.db).toBeTruthy();
  });
});
