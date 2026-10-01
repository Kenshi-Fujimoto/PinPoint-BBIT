/**
 * End-to-end session behaviour in offline demo mode (no Firebase keys).
 *
 * Exercises the real services/firebase.js against a stubbed localStorage:
 * sign in → persist → simulate a page reload by re-importing the module →
 * the demo profile is restored. Also covers the corrupt-record path that used
 * to throw during the very first render.
 */
import { describe, it, expect, vi } from 'vitest';

function makeStorage(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    store,
    api: {
      getItem: (key) => (store.has(key) ? store.get(key) : null),
      setItem: (key, value) => store.set(key, String(value)),
      removeItem: (key) => store.delete(key),
    },
  };
}

async function freshFirebaseModule() {
  vi.resetModules();
  return import('./firebase');
}

describe('offline demo session end-to-end', () => {
  it('signs the demo profile in, survives a reload, then signs out', async () => {
    const { store, api } = makeStorage();
    vi.stubGlobal('localStorage', api);

    // 1. First visit: click "Continue with Google" with no Firebase keys
    const first = await freshFirebaseModule();
    expect(first.isFirebaseConfigured).toBe(false);

    const user = await first.signInWithGoogle();
    expect(user.isDemo).toBe(true);
    expect(user.displayName).toBe('BBIT Scholar');
    expect(JSON.parse(store.get('pinpoint_user')).uid).toBe('demo-bbit-scholar');

    // 2. Reload: a brand-new module instance reads the persisted profile
    const reloaded = await freshFirebaseModule();
    const restored = [];
    reloaded.subscribeToAuth((u) => restored.push(u));

    expect(restored).toHaveLength(1);
    expect(restored[0]).not.toBeNull();
    expect(restored[0].displayName).toBe('BBIT Scholar');
    expect(restored[0].isDemo).toBe(true);

    // 3. Sign out clears the session everywhere
    await reloaded.signOutUser();
    expect(store.has('pinpoint_user')).toBe(false);

    const afterSignOut = [];
    reloaded.subscribeToAuth((u) => afterSignOut.push(u));
    expect(afterSignOut[0]).toBeNull();

    vi.unstubAllGlobals();
  });

  it('treats a corrupt stored profile as signed out instead of crashing', async () => {
    const { store, api } = makeStorage({ pinpoint_user: '{{{not valid json' });
    vi.stubGlobal('localStorage', api);

    const module = await freshFirebaseModule();
    const seen = [];
    expect(() => module.subscribeToAuth((u) => seen.push(u))).not.toThrow();

    expect(seen).toEqual([null]);
    expect(store.has('pinpoint_user')).toBe(false); // corrupt record discarded

    vi.unstubAllGlobals();
  });
});
