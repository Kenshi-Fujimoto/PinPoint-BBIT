/**
 * Tests for the Firebase configuration + auth-error helpers.
 *
 * These cover the "sign-in does nothing" class of bugs: the app must be able to
 * say *why* sign-in failed (missing env var, unauthorized domain, blocked
 * pop-up, disabled provider) instead of closing the modal silently.
 */
import { describe, it, expect } from 'vitest';
import {
  readFirebaseConfig,
  readFirebaseConfigFromEnv,
  mergeFirebaseConfig,
  validateFirebaseConfig,
  describeAuthError,
  shouldFallbackToRedirect,
} from './firebaseConfig';

const VALID_ENV = {
  VITE_FIREBASE_API_KEY: 'AIzaSyA-validlookingkey1234567890abcdefghi',
  VITE_FIREBASE_AUTH_DOMAIN: 'pinpoint-bbit.firebaseapp.com',
  VITE_FIREBASE_PROJECT_ID: 'pinpoint-bbit',
  VITE_FIREBASE_STORAGE_BUCKET: 'pinpoint-bbit.appspot.com',
  VITE_FIREBASE_MESSAGING_SENDER_ID: '123456789012',
  VITE_FIREBASE_APP_ID: '1:123456789012:web:abcdef1234567890',
};

describe('readFirebaseConfigFromEnv', () => {
  it('reads the canonical VITE_* names', () => {
    const config = readFirebaseConfigFromEnv(VALID_ENV);
    expect(config.apiKey).toBe(VALID_ENV.VITE_FIREBASE_API_KEY);
    expect(config.projectId).toBe('pinpoint-bbit');
    expect(config.appId).toBe(VALID_ENV.VITE_FIREBASE_APP_ID);
  });

  it('accepts common aliases (FIREBASE_*, REACT_APP_*, NEXT_PUBLIC_*)', () => {
    const config = readFirebaseConfigFromEnv({
      FIREBASE_API_KEY: 'AIzaSyAliasKey1234567890abcdefghijklmno',
      FIREBASE_AUTH_DOMAIN: 'alias-project.firebaseapp.com',
      REACT_APP_FIREBASE_PROJECT_ID: 'alias-project',
      NEXT_PUBLIC_FIREBASE_APP_ID: '1:999:web:zzz',
    });
    expect(config.apiKey).toContain('AliasKey');
    expect(config.authDomain).toBe('alias-project.firebaseapp.com');
    expect(config.projectId).toBe('alias-project');
    expect(config.appId).toBe('1:999:web:zzz');
  });

  it('prefers VITE_* when both a canonical name and an alias are present', () => {
    const config = readFirebaseConfigFromEnv({
      ...VALID_ENV,
      FIREBASE_API_KEY: 'AIzaSyAliasShouldLose1234567890abcdefg',
    });
    expect(config.apiKey).toBe(VALID_ENV.VITE_FIREBASE_API_KEY);
  });

  it('ignores blank/whitespace values and never crashes on undefined input', () => {
    const config = readFirebaseConfigFromEnv({ VITE_FIREBASE_API_KEY: '   ' });
    expect(config.apiKey).toBe('');
    expect(readFirebaseConfigFromEnv(undefined).projectId).toBe('');
  });
});

describe('mergeFirebaseConfig', () => {
  it('fills gaps across sources (runtime first, build-time second)', () => {
    const merged = mergeFirebaseConfig(
      { apiKey: 'AIzaSyRuntimeKey1234567890abcdefghijklmn' },
      readFirebaseConfigFromEnv(VALID_ENV)
    );
    expect(merged.apiKey).toBe('AIzaSyRuntimeKey1234567890abcdefghijklmn');
    expect(merged.projectId).toBe('pinpoint-bbit');
    expect(merged.authDomain).toBe('pinpoint-bbit.firebaseapp.com');
  });
});

describe('validateFirebaseConfig', () => {
  it('marks a complete config as configured with no problems', () => {
    const result = validateFirebaseConfig(readFirebaseConfigFromEnv(VALID_ENV));
    expect(result.configured).toBe(true);
    expect(result.problems).toEqual([]);
    expect(result.missingEnvVars).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it('reports each missing required field with its env var name', () => {
    const result = validateFirebaseConfig(readFirebaseConfigFromEnv({
      VITE_FIREBASE_API_KEY: VALID_ENV.VITE_FIREBASE_API_KEY,
    }));
    expect(result.configured).toBe(false);
    expect(result.missing).toEqual(expect.arrayContaining(['authDomain', 'projectId', 'appId']));
    expect(result.missingEnvVars).toContain('VITE_FIREBASE_AUTH_DOMAIN');
    expect(result.missingEnvVars).toContain('VITE_FIREBASE_PROJECT_ID');
  });

  it('rejects values that are still placeholder text from .env.example', () => {
    const result = validateFirebaseConfig({
      apiKey: 'YOUR_API_KEY',
      authDomain: 'your-project.firebaseapp.com',
      projectId: 'your-project-id',
      appId: '1:000:web:000',
    });
    expect(result.configured).toBe(false);
    expect(result.placeholders).toEqual(expect.arrayContaining(['apiKey']));
  });

  it('warns (but does not block) on an API key that is not a Firebase web key', () => {
    const result = validateFirebaseConfig({
      ...readFirebaseConfigFromEnv(VALID_ENV),
      apiKey: 'not-a-firebase-key',
    });
    expect(result.configured).toBe(true);
    expect(result.warnings.join(' ')).toMatch(/does not start with "AIza"/);
  });
});

describe('describeAuthError', () => {
  const context = { hostname: 'localhost:3000' };

  it('explains an unauthorized domain and names the exact host', () => {
    const info = describeAuthError({ code: 'auth/unauthorized-domain' }, context);
    expect(info.title).toMatch(/not authorized/i);
    expect(info.message).toContain('localhost:3000');
    expect(info.hints.join(' ')).toContain('Authorized domains');
  });

  it('tells the user to enable the Google provider', () => {
    const info = describeAuthError({ code: 'auth/operation-not-allowed' }, context);
    expect(info.hints.join(' ')).toContain('Google');
    expect(info.hints.join(' ')).toMatch(/Enable/i);
  });

  it('suggests the redirect flow when the pop-up is blocked', () => {
    const info = describeAuthError({ code: 'auth/popup-blocked' }, context);
    expect(info.suggestRedirect).toBe(true);
    expect(info.isCancellation).toBe(false);
  });

  it('treats a closed pop-up as a cancellation, not a scary failure', () => {
    const info = describeAuthError({ code: 'auth/popup-closed-by-user' }, context);
    expect(info.isCancellation).toBe(true);
    expect(info.title).toMatch(/cancelled/i);
  });

  it('matches the dynamic referer-blocked code by prefix', () => {
    const info = describeAuthError(
      { code: 'auth/requests-from-referer-http://localhost:3000-are-blocked.' },
      context
    );
    expect(info.title).toMatch(/API key is restricted/i);
  });

  it('falls back to the raw message for unknown codes', () => {
    const info = describeAuthError({ code: 'auth/weird-new-code', message: 'boom' }, context);
    expect(info.code).toBe('auth/weird-new-code');
    expect(info.message).toContain('boom');
  });

  it('explains that sign-in is unavailable when Firebase is unconfigured', () => {
    const info = describeAuthError(new Error('x'), { ...context, configured: false });
    expect(info.title).toMatch(/not configured/i);
    expect(info.hints.join(' ')).toContain('.env.example');
  });

  it('mentions the new-tab workaround when embedded in a preview', () => {
    const info = describeAuthError({ code: 'auth/popup-blocked' }, { ...context, isEmbedded: true });
    expect(info.suggestNewTab).toBe(true);
    expect(info.hints.join(' ')).toMatch(/embedded preview/i);
  });
});

describe('shouldFallbackToRedirect', () => {
  it('only falls back for environment-level pop-up failures', () => {
    expect(shouldFallbackToRedirect({ code: 'auth/popup-blocked' })).toBe(true);
    expect(shouldFallbackToRedirect({ code: 'auth/operation-not-supported-in-this-environment' })).toBe(true);
    expect(shouldFallbackToRedirect({ code: 'auth/cancelled-popup-request' })).toBe(false);
    expect(shouldFallbackToRedirect({ code: 'auth/unauthorized-domain' })).toBe(false);
    expect(shouldFallbackToRedirect(undefined)).toBe(false);
  });
});

describe('readFirebaseConfig (field-named vs env-var-named sources)', () => {
  it('reads a field-named config — the shape injected by vite.config.js and /api/config', () => {
    const config = readFirebaseConfig({
      apiKey: 'AIzaSyFieldNamedKey1234567890abcdefghij',
      authDomain: 'field-named.firebaseapp.com',
      projectId: 'field-named',
      appId: '1:123:web:field',
    });
    expect(config.apiKey).toBe('AIzaSyFieldNamedKey1234567890abcdefghij');
    expect(config.projectId).toBe('field-named');
    expect(validateFirebaseConfig(config).configured).toBe(true);
  });

  it('still reads an env-var-named config — the shape of .env and process.env', () => {
    const config = readFirebaseConfig(VALID_ENV);
    expect(config.apiKey).toBe(VALID_ENV.VITE_FIREBASE_API_KEY);
    expect(validateFirebaseConfig(config).configured).toBe(true);
  });

  it('prefers the field-named value when both spellings are present', () => {
    const config = readFirebaseConfig({ ...VALID_ENV, projectId: 'field-wins' });
    expect(config.projectId).toBe('field-wins');
  });

  it('never crashes on undefined', () => {
    expect(readFirebaseConfig(undefined).apiKey).toBe('');
  });
});
