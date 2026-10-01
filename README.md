# 📍 PinPoint

> **A Unified Community Platform for Budge Budge Institute of Technology (BBIT) Civic Infrastructure Hazards & Lost-and-Found Possessions**  
> *Featuring 50 curated campus places of Budge Budge Institute of Technology, satellite aerial overlays, proximity duplicate detection, and EdgeStore cloud storage.*

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-5B5BE6.svg)](https://web.dev/progressive-web-apps/)
[![Firebase Firestore](https://img.shields.io/badge/Database-Firebase%20Firestore-FFA611.svg)](https://firebase.google.com/)
[![EdgeStore.dev](https://img.shields.io/badge/Cloud%20Bucket-EdgeStore.dev-000000.svg)](https://edgestore.dev/)
[![Vercel Deployment](https://img.shields.io/badge/Deploy-Vercel-black.svg)](https://vercel.com/)

---

## 🌟 Core Architecture

```
                  ┌───────────────────────────────────────────────────────────┐
                  │                         PinPoint                          │
                  └─────────────────────────────┬─────────────────────────────┘
                                                │
                 ┌──────────────────────────────┴──────────────────────────────┐
                 ▼                                                             ▼
     [ ⚠️ Civic Issues & Potholes ]                                [ 🔎 Lost & Found Tracker ]
                 │                                                             │
                 ▼                                                             ▼
  [ 📍 Strict BBIT Campus Geotagging ]                         [ 📝 Post Lost / Found Items ]
                 │                                                             │
                 ▼                                                             ▼
  [ ⚡ Proximity Duplicate Detector (<40m) ]                    [ ✨ Multi-Factor Smart Matching ]
  Prompt: "Similar report nearby! Upvote instead"               Auto-match suggestions & % confidence
                 │                                                             │
                 ▼                                                             ▼
  [ 🔥 Community Urgency Upvotes (1-5 Severity) ]               [ 🔐 Secret Question Verification ]
                 │                                                             │
                 ▼                                                             ▼
  [ 🚀 4-Stage Status Pipeline: Reported ➔ Acknowledged ➔ In Progress ➔ Resolved / Reunited 🎉 ]
```

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, Vite 5, Tailwind CSS 3, Lucide Icons, Canvas Confetti |
| **Mapping** | Leaflet, React-Leaflet, High-Res Satellite Aerial Imagery + 50 Curated Campus Places of BBIT |
| **PWA** | Vite Plugin PWA (`vite-plugin-pwa`), Service Worker, Web App Manifest |
| **Database** | Firebase Firestore (Real-time `onSnapshot` & Offline Persistence) |
| **Cloud Storage** | EdgeStore.dev (`@edgestore/react`, `@edgestore/server`) for image buckets |
| **Backend & Serving** | Node.js + Express (`server.js`) with static SPA production fallback |
| **Deployment** | Vercel (Configured with `vercel.json` SPA & API rewrites) |

---

## 🚀 Running Locally & Serving via Express

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Google Sign-In (required for real accounts)
Copy the provided template and add the Firebase Web App values for this project:

```bash
cp .env.example .env.local
```

Then enable the **Google** provider and authorize the app domain in Firebase Authentication. The complete, deploy-safe checklist is in **[docs/google-sign-in.md](docs/google-sign-in.md)**. Without these values, PinPoint intentionally keeps visitors signed out rather than creating a fake/demo Google profile.

### 3. Run Development Mode
```bash
# Vite frontend dev server with Hot Module Replacement
npm run dev
```
Open **`http://localhost:3000`** in your browser.

### 4. Build & Serve Full App Through Express
To build the production bundle and serve both the frontend and backend APIs unified on a single Express server:

```bash
# Step 1: Build the production static bundle
npm run build

# Step 2: Start the Express server
npm start
# or: npm run server
```
Open **`http://localhost:3001`** in your browser. Express serves all frontend pages (`/`, `/civic`, `/lost-found`, `/admin`) and handles `/api/edgestore` and `/api/health`.

---

## 🧪 Testing & QA

The project ships with an automated unit-test suite (Vitest) covering the pure-logic services — the proximity duplicate detector, the lost & found smart-matching engine, the spam/scam detector, campus geofencing, and the curated campus-places data — plus an integrity guard that enforces the *"app never renders mock data"* promise:

```bash
npm test          # run the full suite once (CI-friendly)
npm run test:watch  # watch mode during development
```

📖 **Plain-language testing report (start here):** [`docs/_qa.md`](docs/_qa.md) · full step-by-step test checklist for the team: [`docs/_qa-checklist.md`](docs/_qa-checklist.md)

---

## ▲ Deploying to Vercel

> 📖 **Full step-by-step guide:** see **[`DEPLOYMENT.md`](DEPLOYMENT.md)** for environment variables, Firebase/EdgeStore setup, self-hosting (Express/Docker/Nginx), post-deploy smoke tests, troubleshooting and the production-readiness checklist.

The project is pre-configured with [`vercel.json`](vercel.json) to deploy seamlessly on Vercel:

### Method 1: Deploy with Vercel CLI
```bash
npm i -g vercel
vercel
```

### Method 2: Deploy via Vercel Web Dashboard
1. Push your repository to GitHub.
2. Go to [vercel.com/new](https://vercel.com/new) and import your repository.
3. In **Build and Output Settings**:
   - **Framework Preset**: `Vite` (automatically detected)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add your **Environment Variables** (`VITE_FIREBASE_API_KEY`, `EDGE_STORE_ACCESS_KEY`, etc.).
5. Click **Deploy**. Vercel will automatically build the static assets, route client-side SPA requests to `index.html`, and route `/api/edgestore` to the EdgeStore serverless handler!

---

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for more information.
