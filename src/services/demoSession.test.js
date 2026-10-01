/**
 * Demo sign-in profile — visibility and resilience guarantees.
 *
 * These tests lock in the two properties the offline sign-in flow depends on:
 *   • the profile is clearly marked as a demo account, and its uid is stable
 *     across sign-ins (otherwise saved upvotes silently stop matching); and
 *   • a corrupted localStorage record degrades to "signed out" instead of
 *     throwing on every page load.
 */
import { describe, it, expect } from 'vitest';
import {
  DEMO_USER_KEY,
  LEGACY_USER_KEY,
  DEMO_SCHOLAR,
  createDemoUser,
  isDemoUser,
  parseStoredUser,
} from './demoSession';

describe('demo session profile', () => {
  it('exposes the canonical storage keys', () => {
    expect(DEMO_USER_KEY).toBe('pinpoint_user');
    expect(LEGACY_USER_KEY).toBe('civicbloom_user');
  });

  it('creates a clearly-marked demo profile', () => {
    const user = createDemoUser();

    expect(user.isDemo).toBe(true);
    expect(isDemoUser(user)).toBe(true);
    expect(user.displayName).toBe('BBIT Scholar');
    expect(user.email).toBe('student@bbit.edu.in');
  });

  it('uses a stable uid so upvotes survive reloads and repeat sign-ins', () => {
    const first = createDemoUser();
    const second = createDemoUser();

    expect(first.uid).toBe(second.uid);
    expect(first.uid).toBe(DEMO_SCHOLAR.uid);
    expect(first.uid).not.toMatch(/\d{10,}/); // no Date.now()-based churn
  });

  it('returns copies, never the shared frozen constant', () => {
    const user = createDemoUser();
    user.displayName = 'Mutated';

    expect(DEMO_SCHOLAR.displayName).toBe('BBIT Scholar');
    expect(createDemoUser().displayName).toBe('BBIT Scholar');
  });

  it('round-trips a stored demo profile', () => {
    const restored = parseStoredUser(JSON.stringify(createDemoUser()));

    expect(restored).not.toBeNull();
    expect(restored.uid).toBe(DEMO_SCHOLAR.uid);
    expect(isDemoUser(restored)).toBe(true);
  });

  it('treats real Google profiles as non-demo', () => {
    const restored = parseStoredUser(
      JSON.stringify({ uid: 'google-uid-123', displayName: 'Real Student', email: 'r@bbit.edu.in' })
    );

    expect(restored).not.toBeNull();
    expect(isDemoUser(restored)).toBe(false);
  });

  it('never throws on missing or corrupt storage values', () => {
    [
      undefined,
      null,
      '',
      '   ',
      '{not json',
      '"just a string"',
      '[]',
      '{}',
      '{"uid":""}',
      '{"uid":42}',
      'null',
    ].forEach((value) => {
      expect(parseStoredUser(value)).toBeNull();
    });
  });

  it('normalizes missing display fields instead of surfacing undefined', () => {
    const restored = parseStoredUser(JSON.stringify({ uid: 'abc', photoURL: 7 }));

    expect(restored).toEqual({
      uid: 'abc',
      displayName: 'BBIT Member',
      email: '',
      photoURL: '',
      isDemo: false,
    });
  });
});
