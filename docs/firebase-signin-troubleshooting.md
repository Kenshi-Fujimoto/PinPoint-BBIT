# 🔐 Google sign-in troubleshooting (PinPoint)

> Plain-language guide: **"I added my Firebase keys but sign-in still doesn't work."**
> The app no longer fails silently — the sign-in dialog now tells you *which* of
> the situations below applies, with the exact fix.

---

## 0. First, read the message in the dialog

When you press **Continue with Google**, one of these happens:

| What you see | What it means | Where to fix it |
| :--- | :--- | :--- |
| Amber box: *"Firebase is not configured in this build"* + a list of missing `VITE_FIREBASE_*` names | The keys never reached the app | §1 below |
| *"This domain is not authorized in Firebase"* | Keys are fine, the domain is not on the allow-list | §2 |
| *"Google sign-in is not enabled"* / *"Firebase Authentication is not set up"* | Provider disabled / Auth not initialised | §3 |
| *"The Firebase API key is invalid"* | Wrong or restricted key | §4 |
| *"The sign-in pop-up was blocked"* → use **Sign in with redirect** | Browser/embedded preview blocked the window | §5 |
| *"Sign-in was cancelled"* | The Google window closed early — just retry | — |

The dialog also has **Copy details** (pastes project, URL, error code into the
clipboard) and **Technical details** (the raw Firebase error). Both make it easy
to report exactly what failed.

---

## 1. "Firebase is not configured in this build"

The app reads the configuration from three places, in this order:

1. **Runtime** — `window.__PINPOINT_FIREBASE_CONFIG__`, or `GET /api/config`
   (served by `server.js` and by Vercel; it reads the same env variables).
2. **Build-time** — `.env` / `.env.local` via Vite (`VITE_FIREBASE_*`, plus the
   `FIREBASE_*`, `REACT_APP_FIREBASE_*`, `NEXT_PUBLIC_FIREBASE_*` aliases).

Checklist:

- [ ] `cp .env.example .env` and paste the **six** values from
      Firebase Console → Project settings → General → Your apps → *SDK setup and configuration*.
      The API key alone is not enough: `authDomain`, `projectId` and `appId` are
      required too.
- [ ] Save `.env` and, if the running dev server does not pick the values up
      within a second or two, restart it (`npm run dev`). Vite normally restarts
      itself when `.env` changes.
- [ ] `npm run build` and then `npm start` also needs the values at build time
      (or a `.env` next to `dist/`, because the Express server serves them
      through `/api/config`).
- [ ] On **Vercel**: Project → Settings → Environment Variables → add all six →
      **Redeploy**. Variables added after a build only apply to the next deployment.
- [ ] Open DevTools → Console: the app prints
      `✅ Connected to Firebase (project: …)` or a `ℹ️ Firebase is not configured …` line with the missing fields.

Quick sanity check in the browser console:

```js
fetch('/api/config').then(r => r.json()).then(console.log)
```

---

## 2. `auth/unauthorized-domain`

Firebase only accepts sign-in from domains you explicitly allow.

1. Firebase Console → **Authentication** → **Settings** → **Authorized domains**.
2. **Add domain** for every place the app runs, for example:
   - `localhost` (already there by default)
   - `your-app.vercel.app`
   - the preview/deployment domain shown in your browser's address bar (the
     dialog prints it for you)
3. Wait ~1 minute, reload, retry.

---

## 3. `auth/operation-not-allowed` / `auth/configuration-not-found`

1. Firebase Console → **Authentication** → **Get started** (first time only).
2. **Sign-in method** → **Add new provider** → **Google** → **Enable** → **Save**.
3. Pick a project support email when asked.

---

## 4. `auth/invalid-api-key` / `auth/api-key-not-valid` / referrer blocked

- Re-copy the **Web API key** (Project settings → General → Your apps).
  It should look like `AIzaSy…` (the modal warns when it doesn't).
- If you restricted the key in **Google Cloud Console → APIs & Services →
  Credentials**, either add this domain under *Website restrictions* or remove
  the restriction while testing.
- Make sure you did not paste the API key into `VITE_FIREBASE_APP_ID` (a common
  copy/paste slip — the app IDs start with `1:`).

---

## 5. Pop-up blocked / embedded preview

Google sign-in opens a separate window. Embedded previews (and some browsers or
extensions) refuse to open it:

- The app automatically retries with the **redirect** flow when the pop-up
  cannot be opened at all.
- You can always press **Sign in with redirect** — the page goes to Google and
  comes back signed in (the app completes the flow with `getRedirectResult`).
- If you are inside an embedded preview, **Open in new tab** is the most
  reliable option.

---

## 6. "I redeployed with the keys but the app still behaves like before"

PinPoint is a PWA: a service worker keeps the previous version of the app on the
device until the new one has downloaded. Symptom: the sign-in dialog still says
*"Firebase is not configured"* even though the keys are in the deployment.

- Hard-refresh the page (`Ctrl/Cmd + Shift + R`).
- Or unregister the old worker: DevTools → **Application** → **Service Workers**
  → *Unregister*, then reload (Chrome/Edge), or Safari → Develop → Service Workers.
- The dialog's **Copy details** output shows the project ID the running bundle
  actually uses — if it is empty, the browser is still serving the old build.

## 7. Verify it works

```bash
npm run dev         # http://localhost:3000
```

1. The sign-in dialog footer should say **“Firebase connected”** (not “Offline
   demo mode”).
2. Press **Continue with Google** → account picker → your name appears in the
   navbar.
3. Reload: you stay signed in (`onAuthStateChanged`).
4. `npm test` — the config/error-mapping helpers are covered by unit tests.

---

## 8. Offline demo mode (when no keys are present)

With no Firebase keys the app still runs — reports and items are stored in the
browser's `localStorage`, and the sign-in dialog clearly states that it is
offline demo mode. The demo profile is labelled **“Offline Demo Mode”** in the
navbar instead of “Verified Account”, so a fake sign-in can never be mistaken
for a real one.
