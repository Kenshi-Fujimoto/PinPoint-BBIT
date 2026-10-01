/**
 * Demo (offline) session helpers.
 *
 * Firebase keys are optional for local development and grading. When they are
 * absent, "Continue with Google" must still produce a usable signed-in
 * identity, so the app creates a local demo profile instead. These helpers
 * keep that profile:
 *
 *   1. Visible  — the profile carries `isDemo: true` so the UI can label it as
 *                 a demo account instead of pretending it is a verified one.
 *   2. Resilient — parsing stored sessions can never throw, so a corrupted or
 *                 truncated localStorage value cannot white-screen the app.
 *   3. Stable   — the uid is constant, so upvotes and ownership checks still
 *                 resolve after a reload (the old `Date.now()` uid changed on
 *                 every sign-in and silently orphaned the user's upvotes).
 */

/** Key of the current session record. */
export const DEMO_USER_KEY = 'pinpoint_user';

/** Legacy key from the CivicBloom era, still read for continuity. */
export const LEGACY_USER_KEY = 'civicbloom_user';

export const DEMO_SCHOLAR = Object.freeze({
  uid: 'demo-bbit-scholar',
  displayName: 'BBIT Scholar',
  email: 'student@bbit.edu.in',
  photoURL:
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80',
  isDemo: true,
});

/** Build a fresh copy of the offline demo profile. */
export function createDemoUser() {
  return { ...DEMO_SCHOLAR };
}

/** True for profiles created locally in offline demo mode. */
export function isDemoUser(user) {
  return Boolean(user && user.isDemo);
}

/**
 * Parse a raw localStorage session value.
 *
 * Always returns a normalized user object or `null` — never throws — so the
 * auth subscription is safe to run on the first paint even if storage holds
 * garbage (broken JSON, a bare string, an array, a record without a uid, or a
 * value written by an unrelated app).
 */
export function parseStoredUser(raw) {
  if (typeof raw !== 'string' || !raw.trim()) return null;

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;

  const uid = typeof parsed.uid === 'string' ? parsed.uid.trim() : '';
  if (!uid) return null;

  const displayName =
    typeof parsed.displayName === 'string' && parsed.displayName.trim()
      ? parsed.displayName.trim()
      : 'BBIT Member';

  return {
    ...parsed,
    uid,
    displayName,
    email: typeof parsed.email === 'string' ? parsed.email : '',
    photoURL: typeof parsed.photoURL === 'string' ? parsed.photoURL : '',
    isDemo: Boolean(parsed.isDemo),
  };
}
