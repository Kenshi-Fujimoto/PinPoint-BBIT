# 🚀 PinPoint BBIT — Deployment Guide

**How to run, build, host and verify PinPoint — on a laptop, on Vercel, or on your own server**

| | |
| :--- | :--- |
| **Document** | Deployment & Operations Guide |
| **Version** | 2.0 |
| **Last updated** | 30 September 2026 |
| **Applies to** | PinPoint v1.0 (`main`) |
| **Companion documents** | [Planning](planning.md) · [QA report](_qa.md) · [QA checklist](_qa-checklist.md) · [Defense Q&A](defense-qa.md) · [Progress](progress.md) |

> ⚠️ **Read §9 before going live.** PinPoint is fully deployable today, but two security items (real staff authentication and Firestore security rules) are still outstanding. They do not block a demo — they do block real student use.

---

## 1. Deployment options at a glance

| Option | Best for | Frontend | Backend / API | Section |
| :--- | :--- | :--- | :--- | :--- |
| **A. Local development** | Building and testing | Vite dev server on `:3000` | Proxy → Express on `:3001` | §4 |
| **B. Express self-host** | One-box demo, lab machine | `dist/` served by Express | Express on `:3001` (single process) | §5 |
| **C. Vercel** *(recommended)* | Real campus use | Static CDN build | Serverless functions from `api/` | §6 |
| **D. Docker + Nginx** | On-premise / institutional server | Nginx static + reverse proxy | Node container | §7 |

---

## 2. Prerequisites

| Requirement | Version | Notes |
| :--- | :--- | :--- |
| Node.js | 18 LTS or 20 LTS | Vite 5 requires Node ≥ 18 |
| npm | 9+ | Ships with Node |
| Git | any recent | To clone the repository |
| Firebase project | — | Optional for a local demo; **required** for real use (§3.1) |
| EdgeStore account | — | Optional; without it uploads degrade gracefully (§3.2) |
| Vercel account | — | Only for option C |

```bash
git clone https://github.com/Kenshi-Fujimoto/PinPoint-BBIT.git
cd PinPoint-BBIT
npm install
```

The app is designed to **boot without any credentials**. With no keys configured it logs `ℹ️ Firebase credentials not provided…` and runs in local-only mode against `localStorage` — useful for UI demos and offline review.

---

## 3. Third-party service setup

### 3.1 Firebase (Firestore + Google sign-in)

1. Open the [Firebase console](https://console.firebase.google.com/) → **Add project** (e.g. `pinpoint-bbit`).
2. **Build → Firestore Database → Create database.** Choose a region close to Kolkata (e.g. `asia-south1`) and start in production mode.
3. **Build → Authentication → Get started → Sign-in method → Google → Enable.** Add your deployment domain (and `localhost`) under **Authorized domains**.
4. **Project settings → General → Your apps → Web app (`</>`)** — register a web app and copy the config values.
5. Map the config onto the environment variables in §3.3. The two created collections are:
   - `civic_issues`
   - `lost_found_items`

*(PinPoint creates documents on first write; you do not need to pre-create collections.)*

**Optional — clear the database during testing:**

```bash
# Requires .env with valid Firebase config
npm run db:clean
```

### 3.2 EdgeStore (photo storage)

1. Create an account at [edgestore.dev](https://edgestore.dev/) and create a project.
2. Copy the **Access key** and **Secret key** from the dashboard.
3. The bucket router is already defined in [`src/services/edgestoreRouter.js`](../src/services/edgestoreRouter.js):

   | Bucket | Type | Limit |
   | :--- | :--- | :--- |
   | `publicImages` | image | 10 MB · jpeg/png/webp/gif |
   | `publicFiles` / `pinpoint` / `PinPoint` / `FOundHUb` / `foundhub` | file | 20 MB |

4. If the keys are missing, `/api/edgestore` returns a friendly `pending_configuration` payload instead of failing — the app continues to work without cloud photos.

### 3.3 Environment variables

Create `.env.local` (or `.env`) in the repository root — both are git-ignored. On Vercel, add these under **Project → Settings → Environment Variables**.

| Variable | Where it is used | Required | Example / notes |
| :--- | :--- | :--- | :--- |
| `VITE_FIREBASE_API_KEY` | Client bundle | Yes for real use | `AIzaSy…` |
| `VITE_FIREBASE_AUTH_DOMAIN` | Client bundle | Yes | `pinpoint-bbit.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Client bundle + health check | Yes | `pinpoint-bbit` |
| `VITE_FIREBASE_STORAGE_BUCKET` | Client bundle | Yes | `pinpoint-bbit.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Client bundle | Yes | Numeric sender ID |
| `VITE_FIREBASE_APP_ID` | Client bundle | Yes | `1:123…:web:abc…` |
| `EDGE_STORE_ACCESS_KEY` | Server only | For uploads | From the EdgeStore dashboard — **never** prefix with `VITE_` |
| `EDGE_STORE_SECRET_KEY` | Server only | For uploads | Same — server-side secret |
| `PORT` | Express (`server.js`) | No | Defaults to `3001` |
| `NODE_ENV` | Express | No | `production` on the server |

`.env.local` template:

```bash
# ---- Firebase (client-visible; ship only public web config) ----
VITE_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_FIREBASE_AUTH_DOMAIN=pinpoint-bbit.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=pinpoint-bbit
VITE_FIREBASE_STORAGE_BUCKET=pinpoint-bbit.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef1234567890

# ---- EdgeStore (server-side secrets — no VITE_ prefix) ----
EDGE_STORE_ACCESS_KEY=es_access_xxxxxxxxxxxxxxxx
EDGE_STORE_SECRET_KEY=es_secret_xxxxxxxxxxxxxxxx
```

> 🔐 **Rule of thumb:** anything prefixed `VITE_` is embedded in the browser bundle and is public. Firebase web config keys are safe to expose (Firestore rules protect the data). EdgeStore keys are **not** — they must only ever live on the server.

---

## 4. Option A — Local development

```bash
npm run dev          # http://localhost:3000
```

- Vite serves the SPA with hot module replacement.
- Requests to `/api/*` are proxied to `http://localhost:3001` (see `vite.config.js`), so start the backend too if you want uploads:

```bash
npm run server       # in a second terminal → http://localhost:3001
```

Without the backend running, everything except photo upload still works — an intentional demo guarantee.

---

## 5. Option B — Express self-host (single process)

The simplest way to serve the *real* production build with a working API.

```bash
npm run build        # emits dist/
npm start            # node server.js → http://localhost:3001
```

What `server.js` provides:

| Route | Behaviour |
| :--- | :--- |
| `/api/health` | JSON status plus whether EdgeStore and Firestore are configured |
| `/api/edgestore/*` | EdgeStore upload handler (Express adapter) |
| `/*` | Static assets from `dist/`, SPA fallback to `index.html` |

If `dist/` is missing, the server prints a friendly HTML page telling you to run `npm run build` — it will not crash.

```bash
curl -s http://localhost:3001/api/health
# {"status":"ok","app":"PinPoint Unified Express Server","services":{"edgestore":true,"firestore":true}}
```

---

## 6. Option C — Vercel (recommended)

[`vercel.json`](../vercel.json) already configures the build and rewrites, so deployment is import-and-click.

### 6.1 Deploy with the CLI

```bash
npm i -g vercel
vercel            # preview deployment
vercel --prod     # production deployment
```

### 6.2 Deploy from the dashboard

1. Push the repository to GitHub.
2. Go to [vercel.com/new](https://vercel.com/new) and import the repository.
3. **Build and Output Settings** — Framework preset **Vite**, Build command `npm run build`, Output directory `dist`.
4. Add every environment variable from §3.3 (**Settings → Environment Variables**, all environments).
5. **Deploy.**

### 6.3 What `vercel.json` does

| Rewrite | Destination | Purpose |
| :--- | :--- | :--- |
| `/api/health` | `/api/health.js` | Lightweight health probe |
| `/api/edgestore/(.*)` | `/api/edgestore/[...edgestore].js` | EdgeStore upload handler |
| `/api/(.*)` | `/api/index.js` | Catch-all API (reuses the Express app) |
| `/(.*)` | `/index.html` | SPA deep links such as `/admin` |

> Order matters — the more specific rewrites are listed first so `/api/health` is never swallowed by the catch-all.

### 6.4 Custom domain

**Project → Settings → Domains → Add.** After adding `pinpoint.bbit.edu.in`, add the same host to Firebase Auth's authorized domains, or Google sign-in will fail on the new domain.

---

## 7. Option D — Docker + Nginx (on-premise)

Build once, run anywhere with Node inside the container.

**`Dockerfile`**

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY server.js ./
COPY src ./src
COPY api ./api
EXPOSE 3001
CMD ["node", "server.js"]
```

```bash
docker build -t pinpoint-bbit .
docker run -d --name pinpoint -p 3001:3001 --env-file .env.local pinpoint-bbit
```

**Nginx reverse proxy**

```nginx
server {
    listen 80;
    server_name pinpoint.bbit.edu.in;

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

> Note: the container serves the SPA and the EdgeStore handler. Firestore traffic goes directly from the browser to Google — no proxy is needed for it, but campus firewalls must allow `*.googleapis.com` and `*.gstatic.com`.

---

## 8. Post-deployment verification

Run these **after every deployment**. Tick them off in order.

| # | Check | Command / action | Expected |
| :--- | :--- | :--- | :--- |
| 1 | Health endpoint | `curl -s https://<domain>/api/health` | `{"status":"ok"…}` with `edgestore`/`firestore` flags matching your config |
| 2 | App shell loads | Open `/` | Map + empty report lists, no console errors |
| 3 | SPA deep link | Open `/admin` directly | Staff portal renders (not a 404) |
| 4 | Empty start | Look at the map and lists | No sample/fake reports anywhere |
| 5 | Report flow | Submit a civic report with a pin | Appears on the map instantly |
| 6 | Geofence | Try to drop a pin outside campus | Rejected/clamped to the BBIT boundary |
| 7 | Duplicate warning | Report the same spot twice | Nearby-report warning appears, submission still allowed |
| 8 | Uploads | Attach a photo | Image uploads and renders (EdgeStore configured) |
| 9 | Lost & found | Post a lost item, then a matching found item | Match suggestion with a confidence % and reasons |
| 10 | Sign-in | Continue with Google | Google popup completes; user name appears |
| 11 | Offline | DevTools → Network → Offline, reload | App opens from cache with previously seen data |
| 12 | PWA install | Browser install prompt / "Add to Home Screen" | Opens standalone with the PinPoint icon |
| 13 | Automated tests | `npm test` | **64 / 64 passing** |

---

## 9. Production-readiness checklist

Go/no-go items before students use the app for real.

| | Item | Status | Action |
| :--- | :--- | :--- | :--- |
| ☐ | Firebase credentials configured on the host | ⬜ | §3.1 + §3.3 |
| ☐ | EdgeStore keys configured on the host | ⬜ | §3.2 + §3.3 |
| ☐ | **Real staff authentication** replaces the placeholder passcode | ⬜ | **Blocker** — see planning §11 R1 |
| ☐ | **Firestore security rules deployed** | ⬜ | **Blocker** — see snippet below |
| ☐ | `npm test` green (64/64) on the release commit | ⬜ | §8 step 13 |
| ☐ | Post-deploy verification table completed | ⬜ | §8 |
| ☐ | Custom domain added to Firebase Auth authorized domains | ⬜ | §6.4 |
| ☐ | `.env*` files never committed | ⬜ | Confirm with `git status --porcelain` |

**Starter Firestore rules** (adapt to your chosen staff model before deploying — this is the missing F18 item):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /civic_issues/{issueId} {
      allow read: if true;                             // public campus board
      allow create: if request.auth != null
                    && request.resource.data.reporterId == request.auth.uid;
      allow update, delete: if request.auth != null
                    && request.auth.token.staff == true;   // staff only
    }

    match /lost_found_items/{itemId} {
      allow read: if true;
      allow create: if request.auth != null
                    && request.resource.data.posterId == request.auth.uid;
      allow update, delete: if request.auth != null
                    && (resource.data.posterId == request.auth.uid
                        || request.auth.token.staff == true);
    }
  }
}
```

---

## 10. Updates, rollback and maintenance

- **Vercel** — every push to the deployment branch produces a preview URL; merges to the production branch go live. Roll back instantly from **Deployments → ⋯ → Promote to Production** on a known-good build.
- **Express / Docker** — rebuild the image, redeploy, keep the previous image tag:

  ```bash
  docker build -t pinpoint-bbit:v1.1 . && docker tag pinpoint-bbit:v1.1 pinpoint-bbit:latest
  docker stop pinpoint && docker rm pinpoint
  docker run -d --name pinpoint -p 3001:3001 --env-file .env.local pinpoint-bbit:v1.1
  ```

- **PWA clients** — `registerType: 'autoUpdate'` in `vite.config.js` means an open tab picks up a new version on the next reload. Users may need one extra refresh to see a fresh build.
- **Routine maintenance**
  - `npm test` before every release.
  - `npm audit` reviewed each maintenance pass (see the progress report's note on transitive advisories).
  - Re-check EdgeStore/Firebase quotas after high-traffic campus events.

---

## 11. Troubleshooting

| Symptom | Likely cause | Fix |
| :--- | :--- | :--- |
| Console: `Firebase credentials not provided` | Missing/placeholder `VITE_*` vars | Fill in `.env.local`, restart `npm run dev`, rebuild for production |
| Everything works but photos fail | EdgeStore keys missing or wrong prefix | Set `EDGE_STORE_ACCESS_KEY` / `EDGE_STORE_SECRET_KEY` **without** `VITE_` |
| `/api/edgestore` returns `pending_configuration` | Server env vars not visible to the function | Add them in the host dashboard and redeploy |
| Google sign-in popup blocked or `auth/unauthorized-domain` | Domain missing from Firebase Auth | Add the domain under Authentication → Settings → Authorized domains |
| Deep links like `/admin` 404 in production | SPA rewrite missing | Confirm `vercel.json` rewrites or the Express catch-all is deployed |
| Map tiles blank | Tile host blocked by the campus network | Allow `server.arcgisonline.com` and `*.basemaps.cartocdn.com`, or rely on the Workbox tile cache |
| Reports not appearing for other users | Firebase not configured, so the app is in local-only mode | Configure Firebase; local-only mode is per-device |
| Offline reload shows a stale shell | Service worker serving the previous build | Hard-refresh once, or unregister the service worker in DevTools → Application |
| `npm run build` fails after adding a dependency | Version conflict | Delete `node_modules` and `package-lock.json`, re-run `npm install` |
| `vitest: not found` | Dependencies not installed | `npm install`, then `npm test` |

---

## 12. Common command reference

| Command | Purpose |
| :--- | :--- |
| `npm install` | Install dependencies |
| `npm run dev` | Vite dev server (`:3000`) |
| `npm run build` | Production build into `dist/` |
| `npm start` / `npm run server` | Express server serving `dist/` + API (`:3001`) |
| `npm run preview` | Preview the built bundle with Vite |
| `npm test` | Run the Vitest suite once (64 tests) |
| `npm run test:watch` | Vitest in watch mode |
| `npm run db:clean` | Wipe Firestore collections (testing only) |
| `vercel --prod` | Deploy to Vercel production |

---

*Related documents: [Planning](planning.md) · [QA report](_qa.md) · [QA checklist](_qa-checklist.md) · [Defense Q&A](defense-qa.md) · [Progress report](progress.md)*
