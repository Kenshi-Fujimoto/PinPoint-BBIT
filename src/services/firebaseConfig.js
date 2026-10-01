/**
 * PinPoint — Firebase configuration & authentication error helpers.
 *
 * This module is intentionally free of any Firebase SDK import so that it can
 * be unit-tested in plain Node (see `firebaseConfig.test.js`) and reused by the
 * browser app, the Express server and the Vercel serverless functions.
 *
 * Why it exists: the app used to fail silently whenever Google sign-in did not
 * work — the auth modal just closed with a `console.error` and the user saw
 * nothing. These helpers turn "nothing happened" into a specific, actionable
 * message (missing env var, unauthorized domain, disabled Google provider, …).
 */

/**
 * Every accepted environment-variable name per Firebase config field.
 * The first name is the canonical `VITE_*` key; the rest are aliases people
 * commonly use (plain `FIREBASE_*`, CRA `REACT_APP_*`, Next.js `NEXT_PUBLIC_*`),
 * which `vite.config.js` resolves at dev-server/build time.
 */
export const FIREBASE_ENV_KEYS = {
  apiKey: [
    'VITE_FIREBASE_API_KEY',
    'FIREBASE_API_KEY',
    'REACT_APP_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_API_KEY',
  ],
  authDomain: [
    'VITE_FIREBASE_AUTH_DOMAIN',
    'FIREBASE_AUTH_DOMAIN',
    'REACT_APP_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  ],
  projectId: [
    'VITE_FIREBASE_PROJECT_ID',
    'FIREBASE_PROJECT_ID',
    'REACT_APP_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  ],
  storageBucket: [
    'VITE_FIREBASE_STORAGE_BUCKET',
    'FIREBASE_STORAGE_BUCKET',
    'REACT_APP_FIREBASE_STORAGE_BUCKET',
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  ],
  messagingSenderId: [
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'FIREBASE_MESSAGING_SENDER_ID',
    'REACT_APP_FIREBASE_MESSAGING_SENDER_ID',
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  ],
  appId: [
    'VITE_FIREBASE_APP_ID',
    'FIREBASE_APP_ID',
    'REACT_APP_FIREBASE_APP_ID',
    'NEXT_PUBLIC_FIREBASE_APP_ID',
  ],
};

export const FIREBASE_CONFIG_FIELDS = Object.keys(FIREBASE_ENV_KEYS);

/** Fields without which Google sign-in simply cannot work. */
export const REQUIRED_CONFIG_FIELDS = ['apiKey', 'authDomain', 'projectId', 'appId'];

/** Fields the SDK accepts as empty, but which the console gives you anyway. */
export const RECOMMENDED_CONFIG_FIELDS = ['storageBucket', 'messagingSenderId'];

/** Values that look like the placeholder text from a `.env.example` file. */
const PLACEHOLDER_PATTERN = /(your[_-]|paste|replace[_-]?me|changeme|xxx+|<[^>]*>|example\.com)/i;

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Pick Firebase values out of a flat env-like object, trying every known alias.
 * @param {Record<string, string|undefined>} env
 * @returns {{ apiKey: string, authDomain: string, projectId: string, storageBucket: string, messagingSenderId: string, appId: string }}
 */
export function readFirebaseConfigFromEnv(env = {}) {
  const config = {};
  for (const field of FIREBASE_CONFIG_FIELDS) {
    let value = '';
    for (const key of FIREBASE_ENV_KEYS[field]) {
      value = clean(env?.[key]);
      if (value) break;
    }
    config[field] = value;
  }
  return config;
}

/**
 * Read a Firebase config from an object whose keys may be **either**:
 *
 *   - config field names — `{ apiKey, authDomain, projectId, … }`, the shape
 *     produced by `vite.config.js`, `/api/config` and
 *     `window.__PINPOINT_FIREBASE_CONFIG__`; or
 *   - environment-variable names — `{ VITE_FIREBASE_API_KEY, … }`, the shape
 *     found in `.env`, `process.env` and `import.meta.env`.
 *
 * Accepting both spellings matters: passing one shape to a reader that expects
 * the other silently yields an empty config, which makes a fully configured app
 * behave as if it had no Firebase keys at all.
 *
 * @param {Record<string, unknown>} [source]
 * @returns {{ apiKey: string, authDomain: string, projectId: string, storageBucket: string, messagingSenderId: string, appId: string }}
 */
export function readFirebaseConfig(source = {}) {
  const envStyle = readFirebaseConfigFromEnv(source);
  const config = {};
  for (const field of FIREBASE_CONFIG_FIELDS) {
    config[field] = clean(source?.[field]) || envStyle[field];
  }
  return config;
}

/**
 * Merge config sources left-to-right; the first non-empty value per field wins.
 * Typical call order in the app: runtime (window/API) → build-time (.env).
 * @param {...Record<string, unknown>} sources
 * @returns {{ apiKey: string, authDomain: string, projectId: string, storageBucket: string, messagingSenderId: string, appId: string }}
 */
export function mergeFirebaseConfig(...sources) {
  const merged = {};
  for (const field of FIREBASE_CONFIG_FIELDS) {
    let value = '';
    for (const source of sources) {
      value = clean(source?.[field]);
      if (value) break;
    }
    merged[field] = value;
  }
  return merged;
}

/**
 * Decide whether a config can actually be used, and explain what is wrong.
 * @param {Record<string, string>} config
 * @returns {{
 *   configured: boolean,
 *   missing: string[],
 *   placeholders: string[],
 *   warnings: string[],
 *   problems: string[],
 *   envKeysFor: (field: string) => string[],
 *   missingEnvVars: string[]
 * }}
 */
export function validateFirebaseConfig(config = {}) {
  const missing = [];
  const placeholders = [];
  const warnings = [];

  for (const field of REQUIRED_CONFIG_FIELDS) {
    const value = clean(config[field]);
    if (!value) missing.push(field);
    else if (PLACEHOLDER_PATTERN.test(value)) placeholders.push(field);
  }

  for (const field of RECOMMENDED_CONFIG_FIELDS) {
    const value = clean(config[field]);
    if (value && PLACEHOLDER_PATTERN.test(value)) placeholders.push(field);
  }

  const apiKey = clean(config.apiKey);
  if (apiKey && !placeholders.includes('apiKey') && !apiKey.startsWith('AIza')) {
    warnings.push(
      'The API key does not start with "AIza" — double-check you copied the Web API key (Project settings → General → Your apps).'
    );
  }

  const authDomain = clean(config.authDomain);
  if (authDomain && !placeholders.includes('authDomain') && !authDomain.includes('.')) {
    warnings.push(
      `authDomain "${authDomain}" does not look like a domain — it should be "<project-id>.firebaseapp.com".`
    );
  }

  const problems = [
    ...missing.map((field) => `Missing required value: ${field}`),
    ...placeholders.map((field) => `Still contains placeholder text: ${field}`),
  ];

  const missingEnvVars = [
    ...missing.flatMap((field) => FIREBASE_ENV_KEYS[field].slice(0, 1)),
    ...placeholders.flatMap((field) => FIREBASE_ENV_KEYS[field].slice(0, 1)),
  ];

  return {
    configured: problems.length === 0,
    missing,
    placeholders,
    warnings,
    problems,
    missingEnvVars,
    envKeysFor: (field) => FIREBASE_ENV_KEYS[field] || [],
  };
}

/**
 * Turn a Firebase Auth error into something a student (or the developer)
 * can act on: a headline, an explanation and concrete steps.
 *
 * @param {unknown} error
 * @param {{ hostname?: string, isEmbedded?: boolean, configured?: boolean }} [context]
 * @returns {{
 *   code: string,
 *   title: string,
 *   message: string,
 *   hints: string[],
 *   isCancellation: boolean,
 *   suggestRedirect: boolean,
 *   suggestNewTab: boolean
 * }}
 */
export function describeAuthError(error, context = {}) {
  const code = clean(error?.code) || 'auth/unknown';
  const hostname = clean(context.hostname) || 'this domain';
  const isEmbedded = Boolean(context.isEmbedded);
  const base = {
    code,
    title: 'Sign-in could not be completed',
    message:
      'Firebase returned an unexpected error. Expand "Technical details" below and check the browser console for the full message.',
    hints: [],
    isCancellation: false,
    suggestRedirect: false,
    suggestNewTab: isEmbedded,
  };

  const preset = {
    'auth/unauthorized-domain': {
      title: 'This domain is not authorized in Firebase',
      message: `Firebase rejected the sign-in request coming from "${hostname}".`,
      hints: [
        'Open the Firebase Console → Authentication → Settings → Authorized domains.',
        `Click "Add domain" and add: ${hostname}`,
        'Also add your production domain (for example your-app.vercel.app) if you deploy elsewhere.',
        'Wait about a minute, reload the page and try again.',
      ],
    },
    'auth/operation-not-allowed': {
      title: 'Google sign-in is not enabled on this Firebase project',
      message: 'The Google provider is switched off for this project.',
      hints: [
        'Open the Firebase Console → Authentication → Sign-in method.',
        'Click "Add new provider" → Google → Enable → Save.',
        'Reload this page and try again.',
      ],
    },
    'auth/configuration-not-found': {
      title: 'Firebase Authentication is not set up yet',
      message: 'This Firebase project has no Authentication configuration to sign in against.',
      hints: [
        'Open the Firebase Console → Authentication and click "Get started".',
        'Then enable the Google provider under Sign-in method.',
        'Check the project ID in your .env matches the console project.',
      ],
    },
    'auth/invalid-api-key': {
      title: 'The Firebase API key is invalid',
      message: 'Firebase did not accept the API key that is baked into this build.',
      hints: [
        'Copy the Web API key again from Firebase Console → Project settings → General → Your apps.',
        'Put it in .env as VITE_FIREBASE_API_KEY (Vite reloads .env automatically; restart npm run dev if it does not).',
        'If you deploy on Vercel, add the variable in Project → Settings → Environment Variables and redeploy.',
      ],
    },
    'auth/api-key-not-valid.': {
      title: 'The Firebase API key is invalid',
      message: 'Firebase did not accept the API key that is baked into this build.',
      hints: [
        'Re-copy the Web API key from Firebase Console → Project settings → General → Your apps.',
        'Set it as VITE_FIREBASE_API_KEY in .env / Vercel and restart or redeploy.',
      ],
    },
    'auth/popup-blocked': {
      title: 'The sign-in pop-up was blocked',
      message: 'Your browser blocked the Google account picker window.',
      hints: [
        'Allow pop-ups for this site (click the icon in the address bar) and try again.',
        environmentRedirectHint(isEmbedded),
      ],
      suggestRedirect: true,
    },
    'auth/popup-closed-by-user': {
      title: 'Sign-in was cancelled',
      message: 'The Google window closed before you finished choosing an account.',
      hints: ['Click "Continue with Google" again and pick your account to finish signing in.'],
      isCancellation: true,
      suggestRedirect: isEmbedded,
      suggestNewTab: isEmbedded,
    },
    'auth/cancelled-popup-request': {
      title: 'Sign-in was cancelled',
      message: 'Another sign-in attempt replaced this one before it finished.',
      hints: ['Wait a moment, then try signing in once more.'],
      isCancellation: true,
    },
    'auth/operation-not-supported-in-this-environment': {
      title: 'Google sign-in is blocked in this environment',
      message: 'This browser or embedded preview does not allow the pop-up sign-in flow.',
      hints: [
        'Open PinPoint in a normal browser tab (Chrome, Edge, Safari, Firefox) and try again.',
        environmentRedirectHint(isEmbedded),
      ],
      suggestRedirect: true,
      suggestNewTab: isEmbedded,
    },
    'auth/network-request-failed': {
      title: 'Could not reach Firebase',
      message: 'The network request to Firebase failed before sign-in could start.',
      hints: [
        'Check your internet connection.',
        'If you use an ad-blocker, privacy extension or a VPN, allow *.googleapis.com and *.firebaseapp.com and retry.',
      ],
    },
    'auth/web-storage-unsupported': {
      title: 'Cookies and site data are blocked',
      message: 'Firebase Auth needs local storage/cookies to keep you signed in, but the browser refused it.',
      hints: [
        'Turn off "Block third-party cookies" or private/incognito restrictions for this site.',
        'If you are inside an embedded preview, open the app in its own browser tab.',
      ],
      suggestNewTab: isEmbedded,
    },
    'auth/internal-error': {
      title: 'Firebase internal error',
      message: 'Firebase could not complete the request. This is often a blocked pop-up, a blocked cookie or a bad key restriction.',
      hints: [
        'Reload the page and try again.',
        'If you restricted the API key in Google Cloud Console, make sure this site is allowed under "Websites (HTTP referrers)".',
        environmentRedirectHint(isEmbedded),
      ],
      suggestRedirect: !isEmbedded,
    },
    'auth/requests-from-referer-are-blocked.': {
      title: 'The API key is restricted to other websites',
      message: 'Your Google Cloud API key restrictions are blocking requests from this domain.',
      hints: [
        'Open Google Cloud Console → APIs & Services → Credentials → your browser key.',
        'Under "Website restrictions" add this domain (or remove the restriction while testing).',
        'Note: "auth/requests-from-referer-<domain>-are-blocked" means exactly this.',
      ],
    },
    'auth/too-many-requests': {
      title: 'Too many attempts',
      message: 'Firebase temporarily blocked sign-in attempts from this device.',
      hints: ['Wait a few minutes before trying again.'],
    },
    'auth/account-exists-with-different-credential': {
      title: 'This email already uses another sign-in method',
      message: 'An account with this email exists with a different provider.',
      hints: ['Sign in with the method you originally used for this email address.'],
    },
    'auth/user-disabled': {
      title: 'This account has been disabled',
      message: 'The Firebase project administrator disabled this account.',
      hints: ['Contact the PinPoint staff administrator.'],
    },
  };

  // Firebase appends the blocked referer domain to the code, so match by prefix.
  if (!preset[code] && code.startsWith('auth/requests-from-referer')) {
    return { ...base, ...preset['auth/requests-from-referer-are-blocked.'], code };
  }

  if (preset[code]) {
    return { ...base, ...preset[code], code, suggestNewTab: preset[code].suggestNewTab ?? isEmbedded };
  }

  if (context.configured === false) {
    return {
      ...base,
      title: 'Firebase is not configured in this build',
      message: 'The app is running in offline demo mode, so real Google sign-in is unavailable.',
      hints: [
        'Create a .env file from .env.example and fill in the six VITE_FIREBASE_* values.',
        'Save .env and let Vite reload it (restart npm run dev if the values do not appear).',
        'On Vercel, add the same variables in Project → Settings → Environment Variables and redeploy.',
      ],
    };
  }

  return {
    ...base,
    message: error?.message
      ? `${error.message}${code === 'auth/unknown' ? '' : ` (code: ${code})`}`
      : base.message,
  };
}

function environmentRedirectHint(isEmbedded) {
  return isEmbedded
    ? 'Embedded previews often block pop-ups — open PinPoint in a new browser tab, or use "Sign in with redirect" below.'
    : 'If pop-ups keep being blocked, use "Sign in with redirect" below instead.';
}

/**
 * Pop-up failures that mean "this environment cannot open a pop-up at all" —
 * worth retrying automatically with the redirect flow.
 */
export const REDIRECT_FALLBACK_CODES = new Set([
  'auth/popup-blocked',
  'auth/operation-not-supported-in-this-environment',
]);

export function shouldFallbackToRedirect(error) {
  return REDIRECT_FALLBACK_CODES.has(clean(error?.code));
}
