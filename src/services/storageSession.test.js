/**
 * Regression guard: importing the storage module must not sign the user out.
 *
 * storage.js purges legacy data generations on load. It used to include the
 * session keys in that purge list, which deleted `pinpoint_user` on every page
 * load — the offline demo profile (and any saved session) vanished on refresh.
 * This test imports the real module against a stubbed localStorage and asserts
 * the session survives while legacy data keys are still cleaned up.
 */
import { describe, it, expect, vi } from 'vitest';

describe('storage module: session safety on load', () => {
  it('keeps the saved profile but still purges legacy data keys', async () => {
    const store = new Map([
      ['pinpoint_user', JSON.stringify({ uid: 'demo-bbit-scholar', displayName: 'BBIT Scholar', isDemo: true })],
      ['civicbloom_user', JSON.stringify({ uid: 'legacy-user', displayName: 'Legacy' })],
      ['pinpoint_issues_v1', '[]'],
      ['pinpoint_lostfound_v3', '[]'],
      ['pinpoint_issues_v4', '[]'],
    ]);

    vi.stubGlobal('localStorage', {
      getItem: (key) => (store.has(key) ? store.get(key) : null),
      setItem: (key, value) => store.set(key, String(value)),
      removeItem: (key) => store.delete(key),
    });

    await import('./storage');

    // The signed-in profile must survive a page load
    expect(store.has('pinpoint_user')).toBe(true);
    expect(store.has('civicbloom_user')).toBe(true);

    // ...while legacy data generations are still purged
    expect(store.has('pinpoint_issues_v1')).toBe(false);
    expect(store.has('pinpoint_lostfound_v3')).toBe(false);
    expect(store.has('pinpoint_issues_v4')).toBe(true);

    vi.unstubAllGlobals();
  });
});
