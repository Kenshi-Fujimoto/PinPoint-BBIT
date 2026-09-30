# 🚀 PinPoint — Deployment Guide

**App:** PinPoint — BBIT Campus Civic Hazards & Lost-and-Found Platform
**Stack:** Vite 5 + React 18 SPA (PWA) · Firebase Firestore/Auth · EdgeStore buckets · Express (`server.js`) or Vercel serverless (`api/`)
**Last verified:** 30 September 2026 on Node `v22.22.3`, npm `10.9.8`

> ⚠️ **Read [Section 10 — Production readiness gate](#10-production-readiness-gate) before pointing real students at a public URL.** The staff portal is currently open and Firestore security rules are not written yet (see [`progress.md`](progress.md)). A deployment that *works* is not the same as a deployment that is *safe to use*.

---

## Table of contents

1. [Deployment options at a glance](#1-deployment-options-at-a-glance)
2. [Prerequisites](#2-prerequisites)
3. [Environment variables](#3-environment-variables)
4. [Backend services setup](#4-backend-services-setup)
   - [4.1 Firebase](#41-firebase-firestore--google-auth)
   - [4.2 EdgeStore](#42-edgestore-image-buckets)
   - [4.3 Firestore security rules (draft)](#43-firestore-security-rules-draft--review-required)
5. [Verify the production build locally](#5-verify-the-production-build-locally)
6. [Option A — Vercel (recommended)](#6-option-a--vercel-recommended)
7. [Option B — Long-running Node/Express host](#7-option-b--long-running-nodeexpress-host)
8. [Option C — Static-only hosting](#8-option-c--static-only-hosting)
9. [Post-deploy smoke tests](#9-post-deploy-smoke-tests)
10. [Production readiness gate](#10-production-readiness-gate)
11. [Operations: logs, cleanup, rollback, key rotation](#11-operations-logs-cleanup-rollback-key-rotation)
12. [Troubleshooting](#12-troubleshooting)
13. [Appendix: deploy-relevant files](#13-appendix-deploy-relevant-files)

---

## 1. Deployment options at a glance

PinPoint is one codebase that ships **two different serverless/API shapes**, so you must pick the right host.

| Option | Host examples | What serves the app | `/api/*` works? | Effort | Recommended for |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **A. Vercel** | Vercel | Static `dist/` + `api/*.js` functions | ✅ Yes — EdgeStore runs in a serverless function | ⭐ Lowest | The repo is already wired for this (`vercel.json`). **Default choice.** |
| **B. Node/Express host** | Render, Railway, Fly.io, Koyeb, Heroku, a VPS with Nginx | Express (`server.js`) serves `dist/` **and** `/api/edgestore`, `/api/health` | ✅ Yes — real long-running Node process | ⭐⭐ Low | You need one origin for app + API, or self-hosting. |
| **C. Static-only host** | Netlify, Cloudflare Pages, GitHub Pages, S3 + CloudFront | Static `dist/` only | ❌ No backend | ⭐ Low, but degraded | Pure demo/portfolio. Uploads fall back to in-browser compression (see caveat in §8). |

**Where the frontend expects the API:** the EdgeStore React provider defaults to `basePath = /api/edgestore` (same origin). Both the Express server and the Vercel rewrites satisfy this, so **no frontend change is needed** on Options A or B.

---

## 2. Prerequisites

| Requirement | Notes |
| :--- | :--- |
| **Node.js ≥ 18.18** (20 LTS or 22 recommended) | Vite 5 requires `^18.0.0 \|\| >=20.0.0`. Verified on Node 22.22.3. |
| **npm ≥ 9** | `package-lock.json` is committed; use `npm ci` in CI/hosts. |
| **Git** | You must push the repo to GitHub (or GitLab/Bitbucket) before connecting a host. |
| A Firebase project | Firestore + Google Auth. See [§4.1](#41-firebase-firestore--google-auth). |
| An EdgeStore account | Free tier is enough to start. See [§4.2](#42-edgestore-image-buckets). |
| HTTPS in the deployed environment | Required by the PWA install prompt and Firebase Auth popups. Every host below provides TLS automatically. |

There are **no automated tests** in the repo yet (`progress.md` §4.2), so verification is manual — this guide supplies the exact commands and checks to run.

---

## 3. Environment variables

### 3.1 Full reference

| Variable | Scope | Used by | Required? | Where to get it |
| :--- | :--- | :--- | :--- | :--- |
| `VITE_FIREBASE_API_KEY` | **Build-time (public)** | `src/services/firebase.js` | ✅ Yes for live data | Firebase Console → Project settings → Web app config |
| `VITE_FIREBASE_AUTH_DOMAIN` | Build-time (public) | same | ✅ Yes | same |
| `VITE_FIREBASE_PROJECT_ID` | Build-time (public) | `firebase.js`, `api/health.js` | ✅ Yes | same |
| `VITE_FIREBASE_STORAGE_BUCKET` | Build-time (public) | `firebase.js` | ✅ Yes | same |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Build-time (public) | `firebase.js` | ✅ Yes | same |
| `VITE_FIREBASE_APP_ID` | Build-time (public) | `firebase.js` | ✅ Yes | same |
| `EDGE_STORE_ACCESS_KEY` | **Runtime (secret)** | `src/services/edgestoreRouter.js` via `server.js` / `api/edgestore/[...edgestore].js` | ✅ Yes for cloud uploads | EdgeStore dashboard → your project → access keys |
| `EDGE_STORE_SECRET_KEY` | **Runtime (secret)** | same | ✅ Yes for cloud uploads | same |
| `PORT` | Runtime | `server.js` (defaults to `3001`) | No | Injected automatically by Render/Railway/Fly/Heroku; set manually on a VPS |
| `NODE_ENV` | Runtime | `/api/health`, Express behaviour | No (set to `production`) | Set on the host |

Optional EdgeStore overrides respected by the SDK (leave unset unless you are on a custom EdgeStore plan):

| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `EDGE_STORE_JWT_SECRET` | falls back to `EDGE_STORE_SECRET_KEY` | Signing key for upload tokens |
| `EDGE_STORE_API_ENDPOINT` | `https://api.edgestore.dev` | EdgeStore API base URL |
| `NEXT_PUBLIC_EDGE_STORE_BASE_URL` | `https://files.edgestore.dev` | File-serving CDN base URL |

### 3.2 The three rules that break deployments

1. **`VITE_*` variables are baked into the JavaScript bundle at build time.** They are public by definition — never put a secret behind a `VITE_` prefix. After changing any `VITE_*` value you must trigger a **new build/redeploy**; restarting a running server does nothing.
2. **`EDGE_STORE_*` must never be prefixed with `VITE_`.** They are read only on the server (`server.js`, `api/edgestore/[...edgestore].js`). Leaking them into the client bundle hands over your bucket.
3. **`.env` must never be committed.** `.gitignore` already covers `.env`, `.env.local`, `.env.*.local`, and `.vercel`.

### 3.3 Local `.env` template

Create `.env` in the repo root (git-ignored) and fill in real values:

```dotenv
# ── Firebase (public — inlined into the client bundle at build time) ──────────
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890
VITE_FIREBASE_APP_ID=1:1234567890:web:abcdef123456

# ── EdgeStore (secrets — server side only, never prefix with VITE_) ──────────
EDGE_STORE_ACCESS_KEY=...
EDGE_STORE_SECRET_KEY=...

# ── Server ───────────────────────────────────────────────────────────────────
PORT=3001
NODE_ENV=production
```

### 3.4 Degraded / demo mode (no keys at all)

The app is deliberately resilient and this is useful for a first deploy:

- **No Firebase keys** → the app logs "running in synchronized offline-first mode" and persists everything in `localStorage`. Sign-in returns a demo profile. Nothing is shared between devices.
- **No EdgeStore keys** → `server.js` logs `EdgeStore handler initialization deferred: Missing EDGE_STORE_ACCESS_KEY or EDGE_STORE_SECRET_KEY.` and `/api/edgestore/*` answers `{"status":"fallback","configured":false}`. The frontend falls back to **in-browser canvas compression producing a base64 data URL**, which is then stored inside the Firestore document (bounded by Firestore's 1 MiB per-document limit and the ~5 MB `localStorage` quota).

Both paths are intentional fallbacks, not errors — but do not ship a "real" launch on either.

---

## 4. Backend services setup

### 4.1 Firebase (Firestore + Google Auth)

1. Create a project at <https://console.firebase.google.com>.
2. **Build → Firestore Database → Create database.** Start in *production mode*; pick a region close to your users (e.g. `asia-south1` for Kolkata).
3. **Build → Authentication → Get started → Sign-in method → Google → Enable.**
4. **Authentication → Settings → Authorized domains → Add domain** for *every* hostname the app will be served from:
   - `localhost` (already present, for local testing)
   - `your-app.vercel.app` (Vercel) **and** your custom domain
   - `your-app.onrender.com` / other host domain
   Without this, Google sign-in popups fail with `auth/unauthorized-domain`.
5. **Project settings → Your apps → Web (`</>`)** → register an app → copy the six config values into `VITE_FIREBASE_*`.
6. Collections used by the app (created automatically on first write): `civic_issues`, `lost_found_items`.
7. Write security rules — see [§4.3](#43-firestore-security-rules-draft--review-required). **They are currently unwritten; this is a release blocker.**

### 4.2 EdgeStore image buckets

1. Create a project at <https://edgestore.dev>.
2. Copy the **access key** and **secret key** into `EDGE_STORE_ACCESS_KEY` / `EDGE_STORE_SECRET_KEY`.
3. Create the buckets. The router in `src/services/edgestoreRouter.js` defines these names, and the client tries them in this order:

   | Bucket name | Type | Max size | Used as |
   | :--- | :--- | :--- | :--- |
   | `pinpoint` | file bucket | 20 MB | **Primary** (first match in the client) |
   | `PinPoint` | file bucket | 20 MB | Legacy alias |
   | `FOundHUb` | file bucket | 20 MB | Legacy alias |
   | `foundhub` | file bucket | 20 MB | Legacy alias |
   | `publicImages` | image bucket | 10 MB | Images only (`jpeg/png/webp/gif`) |
   | `publicFiles` | file bucket | 20 MB | Generic fallback |

   > Only the **first bucket that exists in your EdgeStore project** will actually be used, because `uploadToEdgeStore()` picks the first defined uploader. Creating just **`pinpoint`** (or just **`publicImages`**) is the cleanest production setup.

4. Set both keys on your host as **runtime** variables (§6.2 / §7.2). In the Vercel dashboard, EdgeStore-created projects mount at `/api/edgestore`, which matches the `vercel.json` rewrite.

### 4.3 Firestore security rules (draft — review required)

`progress.md` §4.6 flags this as **not done**. Rules live in the Firebase console (**Firestore → Rules**) or in a committed `firestore.rules` file if you adopt the Firebase CLI. The draft below matches how the app actually behaves today (every mutation is gated behind sign-in in `App.jsx`; the admin portal uses the same signed-in account, with no staff role).

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Anyone can read reports; only signed-in users can create them.
    // Only signed-in users can edit — tighten this to a staff role/claim
    // before real use (see DEPLOYMENT.md §10).
    match /civic_issues/{issueId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null;
    }

    match /lost_found_items/{itemId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null;
    }

    // Deny everything else by default.
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

> ⚠️ This draft is a **starting point, not a finished policy.** It still lets *any* signed-in Google account (i.e. anyone with a Google login) delete reports — the same gap the staff-portal blocker describes. Do not treat it as the final rule set.

---

## 5. Verify the production build locally

Run this **before** every deployment. These commands were executed against this exact commit and their real outputs are shown.

```bash
# 1. Clean, reproducible install
npm ci

# 2. Production build (Vite + PWA service worker)
npm run build

# 3. Serve dist/ + APIs through Express, exactly like Option B
npm start          # honours PORT, defaults to 3001
```

Verified build output:

```text
vite v5.4.21 building for production...
✓ 1666 modules transformed.
dist/index.html                   2.49 kB │ gzip:   1.06 kB
dist/assets/index-*.css          69.28 kB │ gzip:  11.28 kB
dist/assets/leaflet-*.js        296.99 kB │ gzip:  90.73 kB
dist/assets/firebase-*.js       533.59 kB │ gzip: 127.24 kB
dist/assets/index-*.js        1,038.64 kB │ gzip: 201.18 kB
✓ built in 5.90s

PWA v0.20.5  mode generateSW  precache 20 entries (1895.92 KiB)
  files generated: dist/sw.js, dist/workbox-*.js
```

Verified runtime checks (Express on port 3001):

```bash
curl -s http://localhost:3001/api/health
# {"status":"ok","app":"PinPoint Unified Express Server","environment":"production",
#  "timestamp":"...","services":{"edgestore":false,"firestore":false}}

curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3001/        # 200 (SPA)
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3001/admin   # 200 (SPA fallback)
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3001/sw.js   # 200 (service worker)
```

`"edgestore":false` / `"firestore":false` simply means no keys were present in that shell — with a real `.env` both flip to `true`.

To preview the **static bundle alone** (no API, like Option C):

```bash
npm run preview     # Vite preview server, http://localhost:4173
```

---

## 6. Option A — Vercel (recommended)

The repo already contains everything Vercel needs; `vercel.json` sets the framework preset, build command, output directory and rewrites.

### 6.1 Deploy

**CLI**

```bash
npm i -g vercel
vercel login
vercel            # preview deployment
vercel --prod     # production deployment
```

**Dashboard**

1. Push the repository to GitHub.
2. Go to <https://vercel.com/new> and import it.
3. Confirm the detected settings — **Framework preset:** `Vite`, **Build command:** `npm run build`, **Output directory:** `dist`. These already come from `vercel.json`; do not override them.
4. Add the environment variables from [§3.1](#31-full-reference) (see §6.2 for the scoping detail).
5. Deploy.

### 6.2 Environment variables on Vercel (the #1 mistake)

Add **all** variables in **Project → Settings → Environment Variables**, and scope them:

| Variable group | Environments | ⚠️ Important |
| :--- | :--- | :--- |
| `VITE_FIREBASE_*` (6 vars) | Production, Preview, Development | Inlined at **build** time. Adding/changing them requires a **redeploy** (`vercel --prod` or "Redeploy" in the dashboard). Editing them alone changes nothing. |
| `EDGE_STORE_ACCESS_KEY`, `EDGE_STORE_SECRET_KEY` | Production, Preview | Read at **runtime** by the serverless function. Mark as *Sensitive*; never use a `VITE_` prefix. |

### 6.3 How routing behaves

`vercel.json` in full effect:

| Incoming request | Handled by |
| :--- | :--- |
| `/`, `/assets/*`, `/icons/*`, `/sw.js`, `/manifest.webmanifest` | Static files from `dist/` (filesystem check runs before rewrites) |
| `/api/health` | `api/health.js` serverless function |
| `/api/edgestore/*` | `api/edgestore/[...edgestore].js` (EdgeStore Next-pages-style adapter) |
| `/api/*` (anything else) | `api/index.js` → the Express app in `server.js` |
| Anything else (`/admin`, `/civic`, …) | Rewritten to `/index.html` (SPA fallback) |

Notes:

- Vercel serverless functions have a **default body-size limit (~4.5 MB)**. The uploader compresses images client-side (max 1200 px, `quality 0.85`), so real uploads stay well under it — but the buckets allow 10–20 MB, so a native-size upload could hit a 413. If you need larger files, raise the limit in the function config or host on Option B.
- A freshly added custom domain must also be added to **Firebase → Authentication → Authorized domains** (§4.1 step 4).
- Every deploy that changes assets produces new hashed filenames and a new `sw.js`, so installed PWAs update on next load (`registerType: 'autoUpdate'`).

---

## 7. Option B — Long-running Node/Express host

Use this when you want one origin serving both the SPA and the API, or you are self-hosting.

### 7.1 Host configuration

| Setting | Value |
| :--- | :--- |
| **Build command** | `npm ci && npm run build` |
| **Start command** | `npm start` (→ `node server.js`) |
| **Port** | Bind to the host-provided `PORT`; `server.js` already reads `process.env.PORT` and defaults to `3001` |
| **Health check path** | `/api/health` (returns HTTP 200 with `{"status":"ok"}`) |
| **Node version** | 20 or 22 (add an `engines` field or a `.nvmrc` if the host needs it — neither exists in the repo today) |

`server.js` behaves as follows once `dist/` exists:

- Serves `dist/` statically with `maxAge: '1d'`.
- Falls back to `dist/index.html` for any non-API route (client-side navigation and deep links).
- Handles `/api/edgestore/*` through the EdgeStore Express adapter and `/api/health`.
- If `dist/` is missing it returns a friendly inline HTML page telling you to run `npm run build` — useful during setup, but the signal that your build step did not run on the host.

> ⚠️ **Do not expose port 3001 to the public internet directly.** `server.js` sets `cors({ origin: true, credentials: true })`, i.e. it reflects any origin. Finish with a reverse proxy that terminates TLS and add restricted CORS before wide release.

### 7.2 Environment variables

Set every variable from [§3.1](#31-full-reference) in the host's dashboard. `VITE_FIREBASE_*` must be present **before the build step runs** (build-time inlining); `EDGE_STORE_*` must be present **at runtime**.

### 7.3 Nginx reverse proxy (VPS)

```nginx
server {
    listen 80;
    server_name pinpoint.example.edu.in;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name pinpoint.example.edu.in;

    ssl_certificate     /etc/letsencrypt/live/pinpoint.example.edu.in/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/pinpoint.example.edu.in/privkey.pem;

    client_max_body_size 25m;   # must exceed the EdgeStore 20 MB bucket limit

    location / {
        proxy_pass         http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }
}
```

### 7.4 systemd unit (VPS)

```ini
# /etc/systemd/system/pinpoint.service
[Unit]
Description=PinPoint BBIT (Express + Vite build)
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/srv/pinpoint
EnvironmentFile=/srv/pinpoint/.env
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now pinpoint
sudo systemctl status pinpoint
journalctl -u pinpoint -f          # live logs
```

### 7.5 Docker (optional — no Dockerfile ships in this repo)

Two files to add if you containerise. The multi-stage build keeps `node_modules` out of the final image, and `.dockerignore` must list `node_modules` and `dist` (both are git-ignored but would otherwise be copied).

```dockerfile
# Dockerfile
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# VITE_* must be supplied at build time (build args or .env baked in)
RUN npm run build

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY server.js ./
COPY src ./src
COPY api ./api
EXPOSE 3001
CMD ["node", "server.js"]
```

```text
# .dockerignore
node_modules
dist
.git
.env
.env.*
*.log
```

Run it:

```bash
docker build -t pinpoint --build-arg VITE_FIREBASE_API_KEY=... .
docker run -p 3001:3001 --env-file .env pinpoint
```

---

## 8. Option C — Static-only hosting

Netlify, Cloudflare Pages, GitHub Pages, or S3 + CloudFront can host `dist/`, but **there is no serverless API**, so `/api/edgestore` and `/api/health` will not exist.

**You must add an SPA fallback** (otherwise any deep link or bookmark 404s; the PWA `start_url` is `/`):

| Host | Configuration |
| :--- | :--- |
| **Netlify** | `public/_redirects` containing `/*  /index.html  200` |
| **Cloudflare Pages** | Same `_redirects` file, or a `_routes.json` that excludes `/*.js`, `/*.css`, `/*.png` from functions |
| **GitHub Pages** | Copy `dist/index.html` to `dist/404.html` after each build |
| **S3 + CloudFront** | Set the error document to `index.html` and add a CloudFront function rewriting 404 → 200 `/index.html` |

**Expected behaviour without the API (this is the important caveat):**

- `src/services/edgestore.jsx` catches the failed upload request and silently falls back to `compressImage()`.
- The resulting value is a **base64 data URL**, stored inside the report document in Firestore.
- Firestore caps a document at **1 MiB**, and `localStorage` at roughly **5 MB** per origin. Oversized photos will fail to save or silently disappear from the offline cache.
- Keep this mode for demos. For real use, deploy with Option A or B so images land in EdgeStore buckets as URLs.

---

## 9. Post-deploy smoke tests

Run against the deployed URL (`https://<your-domain>`).

**Automated checks**

```bash
curl -s https://<your-domain>/api/health
# Expect: {"status":"ok", ..., "services":{"edgestore":true,"firestore":true}}

curl -s -o /dev/null -w "%{http_code}\n" https://<your-domain>/            # 200
curl -s -o /dev/null -w "%{http_code}\n" https://<your-domain>/admin       # 200 (SPA fallback)
curl -s -o /dev/null -w "%{http_code}\n" https://<your-domain>/sw.js       # 200 (service worker)
curl -s -o /dev/null -w "%{http_code}\n" https://<your-domain>/manifest.webmanifest  # 200
```

If service flags read `false`, the environment variables are missing in the **production** scope (not just Preview) and the deployment must be rebuilt/restarted.

**Manual checklist**

| # | Check | Pass criteria |
| :--- | :--- | :--- |
| 1 | Load the app on a phone and a desktop | Layout works on both; no console errors |
| 2 | App starts empty | No sample/fake reports appear (a core project promise) |
| 3 | Google sign-in | Popup completes; no `auth/unauthorized-domain` error (domain added in §4.1) |
| 4 | Submit a civic report with photo + map pin | Appears instantly in list and on the map |
| 5 | Report the same hazard nearby again | Duplicate warning appears (~40 m threshold) |
| 6 | Post a lost & found item | Created; match suggestions show a confidence percentage |
| 7 | Open the Facility Staff Portal | Should require the passcode — see §10 if it opens unlocked |
| 8 | Change a report's status | Reported → Acknowledged → In Progress → Resolved propagates to the public view |
| 9 | Photo upload (with EdgeStore keys set) | Network tab shows an upload to `/api/edgestore` returning a hosted URL, **not** a `data:image/...` fallback |
| 10 | Reload / go offline | App still opens from the service worker cache |
| 11 | Install as PWA | Browser offers "Install app"; icon and standalone display work (needs HTTPS) |
| 12 | Repeat steps 4–8 in a second browser | Data is shared through Firestore, proving real backend sync |

---

## 10. Production readiness gate

Do **not** share the URL with real students until these are closed. They mirror the open items in [`progress.md`](progress.md).

| # | Blocker | Impact if deployed as-is | Where to fix |
| :--- | :--- | :--- | :--- |
| 1 | 🔴 **Staff portal is not protected** — passcode logic accepts `admin`, `1234`, or an **empty string** (`src/components/AdminPortal.jsx` line ~270) | Anyone can edit, resolve or delete any report | Replace with Firebase Auth + a staff role/custom claim |
| 2 | 🔴 **Firestore security rules not written** (§4.3) | Data readable/writable beyond your intent; photos and locations at risk | Firebase console → Rules |
| 3 | 🔴 **No automated tests** | Regressions ship silently | Add a test runner before inviting users |
| 4 | 🟡 **Save feedback is silent** | Students cannot tell whether a report saved or failed | `progress.md` §4.3 |
| 5 | 🟡 **Offline reports may be lost** | A report created offline may never reach the server | Add a retry queue |
| 6 | 🟡 **Outdated dependencies** | Audit warnings | `npm audit`, then upgrade deliberately |

**Minimum safe internal launch:** items 1 and 2 done, and the app shared only with invited testers.

---

## 11. Operations: logs, cleanup, rollback, key rotation

### Logs

| Host | Where |
| :--- | :--- |
| Vercel | Dashboard → Project → **Logs** (per-function); also `vercel logs <deployment-url>` |
| Render / Railway / Fly | Dashboard log stream, or `fly logs` / `railway logs` |
| VPS + systemd | `journalctl -u pinpoint -f` |

Watch for these lines: `EdgeStore handler initialization deferred: ...` (missing keys — uploads degrade), `Firestore subscription fallback to local storage` (rules/auth problem), `Error syncing civic issue to Firestore` (write rejected).

### Emptying the database (destructive)

`npm run db:clean` runs `scripts/cleanupDatabase.js`, which **deletes every document** in `civic_issues` and `lost_found_items`, using the `VITE_FIREBASE_*` values from your local `.env`.

```bash
npm run db:clean    # ⚠️ irreversible; prints each deleted document ID
```

Use it only to reset a demo/staging project. Back up first (below) if any data matters.

### Backups

- Adopt the Firebase CLI: `firebase firestore:export gs://<your-bucket>/backups/$(date +%F)` on a schedule.
- Or export from the Firestore console before any destructive operation.
- Enable Firestore point-in-time recovery if your Firebase plan supports it — otherwise exports above are your only recovery path.

### Rollback

| Host | How |
| :--- | :--- |
| Vercel | Project → **Deployments** → `…` → **Promote to Production** on the last good build (instant, no rebuild) |
| Render / Railway | Redeploy a previous commit from the dashboard |
| VPS / Docker | `git checkout <last-good-sha> && npm ci && npm run build && sudo systemctl restart pinpoint` |

> Rolling back the server does **not** roll back client PWAs immediately. `vite-plugin-pwa` is configured with `registerType: 'autoUpdate'`, so updated clients pick up the new `sw.js` on their next load — but a user with the app open in a stale tab may keep the old bundle until they reload. Bump the app version/asset hash (any new build does this) and tell testers to hard-reload.

### Key rotation

1. Firebase web API keys: rotate in Google Cloud Console → APIs & Services → Credentials, then update `VITE_FIREBASE_*` and **redeploy** (build-time values).
2. EdgeStore keys: generate a new key pair in the dashboard, update `EDGE_STORE_ACCESS_KEY` / `EDGE_STORE_SECRET_KEY`, restart/redeploy, then revoke the old pair.
3. If a key was ever pasted into a `VITE_*` variable, a commit, or chat, treat it as compromised and rotate it.

---

## 12. Troubleshooting

| Symptom | Likely cause | Fix |
| :--- | :--- | :--- |
| `/api/health` shows `"firestore": false` | `VITE_FIREBASE_*` missing in the **production** scope, or no rebuild after adding them | Add vars → **redeploy** (they are inlined at build time) |
| `/api/health` shows `"edgestore": false` | `EDGE_STORE_*` missing at runtime | Add both keys in the host's runtime env; restart/redeploy |
| Server log: `EdgeStore handler initialization deferred: Missing EDGE_STORE_ACCESS_KEY or EDGE_STORE_SECRET_KEY` | Keys absent when `server.js` booted (or the module was imported in a client context) | Set the keys, restart. The app stays up and uses the local-compression fallback meanwhile |
| Photos become huge `data:image/...` strings in Firestore | Upload to `/api/edgestore` failed and the client fell back to compression | Verify keys, that the bucket name matches the router (`pinpoint`), and that `/api/edgestore/*` is routed to a function/server |
| Document write failures on image-heavy reports | Base64 data URL exceeds Firestore's 1 MiB per-document limit | Restore EdgeStore uploads (§4.2); compress harder |
| `auth/unauthorized-domain` on Google sign-in | Domain missing in Firebase Auth | Add it under Authentication → Settings → Authorized domains |
| Google sign-in popup blocked | Browser popup blocker, or non-HTTPS origin | Use HTTPS; allow popups |
| Blank page / 404 on `/admin` after deploy | SPA fallback missing | Option A/B handle it; on static hosts add the `_redirects` rule (§8) |
| Blank page immediately after a deploy | Service worker serving a cached, stale bundle | Hard reload (Ctrl/Cmd+Shift+R); confirm a new `sw.js` hash was deployed |
| Map tiles blank, or app unusable offline | Basemap/CDN unreachable; tile cache cold | Tiles come from Esri World Imagery and CARTO CDNs — check network/firewall; the PWA caches tiles for 14 days after first view |
| `413 Payload Too Large` on upload | File exceeds the host's request-body cap (Vercel ~4.5 MB default; Nginx defaults to 1 MB) | Raise `client_max_body_size` (Nginx) / the function limit (Vercel); images are pre-compressed client-side by default |
| CORS errors from another origin | `server.js` uses `cors({ origin: true, credentials: true })` (reflects any origin) | Front the server with a proxy that pins allowed origins, or restrict the CORS config |
| Express starts but shows the "Production `dist/` folder not detected" card | The host's build step did not run | Set the build command to `npm ci && npm run build` |
| Build fails on the host but works locally | Node too old, or lockfile not used | Use Node ≥ 18.18 and `npm ci` |

---

## 13. Appendix: deploy-relevant files

| Path | Role in deployment |
| :--- | :--- |
| `vercel.json` | Vercel build/output config, `/api/*` rewrites, SPA fallback |
| `server.js` | Express server: static `dist/`, SPA fallback, `/api/health`, `/api/edgestore/*`, reads `PORT` |
| `api/index.js` | Vercel function that delegates all `/api/*` traffic to the Express app |
| `api/health.js` | Vercel health-check function |
| `api/edgestore/[...edgestore].js` | Vercel EdgeStore handler (returns `pending_configuration` when keys are absent) |
| `src/services/edgestoreRouter.js` | Bucket definitions: `pinpoint`, `PinPoint`, `FOundHUb`, `foundhub`, `publicImages`, `publicFiles` |
| `src/services/edgestore.jsx` | Client upload + image compression + offline fallback |
| `src/services/firebase.js` | Reads `VITE_FIREBASE_*`, Firestore offline persistence, Google Auth |
| `src/services/storage.js` | `localStorage` persistence (versioned keys, `pinpoint_*_v4`) |
| `vite.config.js` | Build chunking, dev proxy `:3000 → :3001`, PWA manifest & workbox caching |
| `scripts/cleanupDatabase.js` | `npm run db:clean` — destructive Firestore reset |
| `public/` | Icons, `favicon.ico`, `apple-touch-icon.png`, `manifest.webmanifest` |
| `.env` (git-ignored) | Local secrets/config, per [§3.3](#33-local-env-template) |
| `progress.md` / `planning.md` | Known gaps and the readiness gate in [§10](#10-production-readiness-gate) |

**Port reference:** Vite dev `3000` · Express `3001` (or `PORT`) · Vite preview `4173`.

**npm scripts:** `dev` · `build` · `preview` · `start` / `server` (`node server.js`) · `db:clean`.

---

*Deployed successfully? Work through [§10](#10-production-readiness-gate) next — that is what stands between a working demo and something safe for real BBIT students.*
