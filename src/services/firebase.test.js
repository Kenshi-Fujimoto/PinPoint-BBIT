/**
 * Guards the sign-in service against the old failure mode where a
 * misconfigured Firebase project produced a silent no-op:
 *   - importing the module must never throw (Node/SSR/test environments),
 *   - with no keys the app must report *which* variables are missing,
 *   - the offline demo profile must be clearly flagged (isDemo).
 */
import { describe, it, expect } from 'vitest';
import {
  initializeFirebase,
  getFirebaseStatus,
  isFirebaseReady,
  signInWithGoogle,
  explainAuthError,
  consumePendingAuthError,
} from './firebase';

describe('firebase service without credentials', () => {
  it('imports and initializes without throwing in a non-browser environment', async () => {
    const state = await initializeFirebase();
    expect(state.configured).toBe(false);
    expect(isFirebaseReady()).toBe(false);
  });

  it('reports the missing env vars so the UI can list them', () => {
    const status = getFirebaseStatus();
    expect(status.configured).toBe(false);
    expect(status.missingEnvVars).toContain('VITE_FIREBASE_API_KEY');
    expect(status.problems.length).toBeGreaterThan(0);
  });

  it('signs in with an explicitly flagged offline demo profile', async () => {
    const user = await signInWithGoogle();
    expect(user).toBeTruthy();
    expect(user.isDemo).toBe(true);
    expect(user.uid).toMatch(/^google-user-/);
  });

  it('explains an unknown auth error to the user in plain language', () => {
    const info = explainAuthError(Object.assign(new Error('boom'), { code: 'auth/internal-error' }));
    expect(info.title).toBeTruthy();
    expect(Array.isArray(info.hints)).toBe(true);
    expect(info.technical).toBe('boom');
  });

  it('has no pending redirect error on a fresh load', () => {
    expect(consumePendingAuthError()).toBeNull();
  });
});
