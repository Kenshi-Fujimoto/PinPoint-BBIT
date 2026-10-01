import { describe, expect, it } from 'vitest';
import { getGoogleSignInErrorMessage, sanitizeForFirestore } from './firebase';

describe('Google authentication feedback', () => {
  it.each([
    ['auth/configuration-not-found', 'has not been configured'],
    ['auth/unauthorized-domain', 'not authorised'],
    ['auth/operation-not-allowed', 'disabled'],
    ['auth/popup-closed-by-user', 'was closed'],
    ['auth/network-request-failed', 'internet connection'],
  ])('explains %s without exposing an SDK error', (code, expectedText) => {
    expect(getGoogleSignInErrorMessage({ code })).toContain(expectedText);
  });

  it('returns a safe retry message for an unknown Firebase error', () => {
    expect(getGoogleSignInErrorMessage({ code: 'auth/unexpected-error' }))
      .toBe('Google sign-in could not be completed. Please try again.');
  });
});

describe('sanitizeForFirestore', () => {
  it('removes undefined fields without dropping valid falsey values', () => {
    expect(sanitizeForFirestore({
      displayName: undefined,
      email: '',
      optedIn: false,
      count: 0,
      tags: ['student', undefined, 'bbit'],
      profile: { photoURL: undefined, verified: false },
    })).toEqual({
      email: '',
      optedIn: false,
      count: 0,
      tags: ['student', 'bbit'],
      profile: { verified: false },
    });
  });
});
