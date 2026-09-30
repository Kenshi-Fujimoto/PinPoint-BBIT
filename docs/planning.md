# 📍 PinPoint BBIT — Project Plan & Product Roadmap

**A unified campus platform for Budge Budge Institute of Technology (BBIT) to report civic infrastructure hazards and recover lost-and-found possessions.**

> 📖 **Related documentation:** [Progress Report (`progress.md`)](progress.md) · [Testing & Quality Report (`_qa.md`)](_qa.md) · [Detailed QA Checklist (`_qa-checklist.md`)](_qa-checklist.md) · [Deployment Guide (`deployment.md`)](deployment.md) · [README (`../README.md`)](../README.md)

| | |
| :--- | :--- |
| **Project** | PinPoint — BBIT Campus Civic & Lost-and-Found Platform |
| **Target Campus** | Budge Budge Institute of Technology (BBIT), Kolkata (`22.4589° N, 88.1695° E`) |
| **Last Updated** | 30 September 2026 |
| **Current Phase** | **Phase 2 Complete (Demo-Ready)** → **Phase 3 (Security & Production Hardening)** |

---

## 1. Our Goal & Vision

**PinPoint** is a fast, approachable campus web and mobile (PWA) app built for **BBIT students, faculty, and facility staff**.

Instead of scattered WhatsApp messages or unreported broken infrastructure, PinPoint gives the campus community one shared place to:
1. **Report campus problems** (potholes, broken lights, water leaks, Wi-Fi dead zones, electrical hazards) with a photo and an exact pin on the BBIT satellite map.
2. **Post and recover lost or found items** with automatic smart matching and secret-question ownership verification.
3. **Track real progress** as facility staff review reports and move them through clear stages from *Reported* to *Resolved* (or *Reunited 🎉*).

The app **always starts with empty report lists**. Reports appear only when real people submit them.

---

## 2. Important Promises (Non-Negotiables)

Every design and engineering decision in PinPoint is governed by four core promises:

1. **Zero fake or sample reports — ever.**
   New deployments and fresh sessions start with empty report lists. No mock or placeholder issues are ever seeded into the UI. An automated integrity test (`src/appIntegrity.test.js`) fails the build if `mockData` is ever imported by application code.
2. **Campus map reference data stays separate from user reports.**
   The 50 curated BBIT campus landmarks (`src/data/bbitPlaces.json`) are static map reference markers to help students orient themselves—never mixed with user-submitted reports.
3. **Strict BBIT campus boundary enforcement.**
   Reports are geofenced to the official BBIT campus bounding box (`[22.4570, 88.1658]` SW to `[22.4618, 88.1710]` NE) so the feed stays relevant to campus life.
4. **Careful handling of user data and tested changes.**
   Contact details, photos, and claimant verification answers are protected, and every code change is verified against the automated test suite (`npm test`) and production build (`npm run build`) before release.

---

## 3. Target Users & Core Workflows

| User Role | Primary Needs | Key Workflows in PinPoint |
| :--- | :--- | :--- |
| **Students & Campus Community** | Quick reporting on mobile, knowing if an issue is already reported, recovering lost belongings safely | • Drop a map pin + photo to report a campus hazard<br>• Upvote, verify, rate severity (1–5), and comment on existing issues<br>• Post lost/found items (with mandatory photo on found items & custom item types)<br>• Review smart match suggestions and verify ownership via secret questions |
| **Facility & Maintenance Staff** | Clear triage queue, accurate locations, spam filtering, status tracking | • Filter and search all campus reports in the Facility Staff Portal<br>• Advance issues through `Reported → Acknowledged → In Progress → Resolved`<br>• Review auto-flagged suspicious/spam posts and remove invalid reports with logged reasons |
| **Evaluators & Administrators** | Easy verification, transparent architecture, reliable deployment | • Run locally or in degraded/offline mode without mandatory cloud keys<br>• Verify logic with `npm test` (68 unit tests) and inspect `/api/health` |

---

## 4. What We Plan to Do (Four Core Pillars)

### Pillar 1: Keep the App Safe and Reliable
- **Empty-start integrity:** Ensure old or sample reports never reappear when the app starts (`appIntegrity.test.js`).
- **Secure sign-in & staff access:** Authenticate users with Google Sign-In and replace the demo staff passcode gate with role-based staff authentication backed by Firebase Auth and server/database verification.
- **Clear save & error feedback:** Clearly notify users with toast/banner confirmations when a report is saved—or explain what went wrong if a submission fails.
- **Offline & weak-network resilience:** Keep the app usable as an installable PWA when campus connectivity drops, and ensure reports created on weak connections are reliably queued and synced.

### Pillar 2: Make the Main Features Work Well
- **Civic hazard reporting:** Let students report campus issues across 9 categories (*Pothole & Road Hazard*, *Lighting & Streetlight*, *Water Leak & Drainage*, *Waste & Sanitation*, *Broken Infrastructure*, *WiFi & Connectivity*, *Electrical & Safety*, *HVAC & Climate*, *Other / Custom Hazard*) with a photo, 1–5 severity score, and exact map pin.
- **Proximity duplicate detection:** Warn users when a similar active report already exists within **~35–40 metres** (Haversine distance), encouraging them to upvote the existing report while still allowing a new submission if needed.
- **Lost & Found with smart matching:** Support 6 core categories (*Electronics*, *Keys, IDs & Cards*, *Bottles & Tumblers*, *Clothing & Bags*, *Books & Notes*, *Other Items* with reusable custom item types), require a photo when reporting a **Found** item, and automatically score Lost ↔ Found pairs with a confidence percentage and plain-language match reasons.
- **Interactive BBIT satellite map:** Display high-resolution satellite imagery with **50 curated BBIT campus places** rendered as clean point markers, alongside live report pins and category filters.
- **4-stage progress tracking:** Let staff move reports through *Reported → Acknowledged → In Progress → Resolved* (and *Reunited 🎉* for lost items) so students can see live progress.
- **Responsive, accessible design:** Deliver a clean Apple-inspired light/dark interface with a consistent BBIT blue/cyan hero shader across mobile phones and desktop computers.

### Pillar 3: Test Before Release
- **Automated unit & integrity tests:** Maintain fast Vitest suites covering proximity duplicate detection, Lost & Found similarity scoring, heuristic spam/scam detection, campus geofence math, all 50 campus places, campus map marker rendering, and the no-mock-data guard (`68/68` tests passing).
- **End-to-end & UI flow testing:** Test report creation, photo uploads, Lost & Found matching, Google sign-in, and staff status updates across mobile and desktop browsers using [`docs/_qa-checklist.md`](_qa-checklist.md).
- **Refresh & resilience checks:** Verify that data persists cleanly across page refreshes, theme toggles, and temporary connection drops.

### Pillar 4: Prepare for Real Campus Use
- **Complete setup & deployment documentation:** Provide step-by-step instructions for local development, Express self-hosting, and Vercel deployment, including all `VITE_FIREBASE_*` and `EDGE_STORE_*` environment variables.
- **Database & storage security rules:** Enforce Firestore security rules and EdgeStore upload validation so user photos, contact details, and staff actions are protected at the data layer.
- **Moderation & governance:** Equip staff with heuristic spam/phishing detection (`src/services/spamDetector.js`), audit reasons on deleted posts, and a recoverable recycle bin.

---

## 5. System Architecture & Technology Plan

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        PinPoint Client (React 18 + Vite 5)                  │
│   Tailwind CSS 3 (Light/Dark) · Leaflet Satellite Map · PWA Service Worker  │
└───────────────┬─────────────────────────────┬───────────────────────────────┘
                │                             │
                ▼                             ▼
┌───────────────────────────────┐ ┌───────────────────────────────────────────┐
│   Core Domain & Smart Engines │ │        Data, Auth & Cloud Services        │
│ • matchingEngine.js           │ │ • Firebase Firestore (Real-time + Cache)  │
│   - Haversine 35–40m detector │ │ • Firebase Google Auth                    │
│   - Multi-factor L&F matcher  │ │ • Browser localStorage fallback (Demo)    │
│ • spamDetector.js             │ │ • EdgeStore (/api/edgestore) + fallback   │
│   - Scam/phishing heuristics  │ │ • Express Server (server.js) / Vercel API │
│ • types/index.js + 50 Places  │ │   with /api/health diagnostics            │
└───────────────────────────────┘ └───────────────────────────────────────────┘
```

| Layer | Technology | Role in the Plan |
| :--- | :--- | :--- |
| **Frontend UI** | React 18, Vite 5, Tailwind CSS 3, Lucide Icons | Fast SPA with responsive mobile/desktop layouts and light/dark themes |
| **Campus Mapping** | Leaflet, React-Leaflet, Esri World Imagery + `bbitPlaces.json` | Satellite campus view, 50 point landmarks, geofenced pin picker |
| **Database & Sync** | Firebase Firestore + `localStorage` fallback | Real-time `onSnapshot` updates with multi-tab offline persistence |
| **Authentication** | Firebase Auth (Google OAuth) | Student identity for reports, upvotes, verifications, and comments |
| **Photo Storage** | EdgeStore (`@edgestore/react`, `@edgestore/server`) | Cloud image buckets with automatic compression/base64 fallback in demo mode |
| **Backend / Hosting** | Node.js + Express (`server.js`) & Vercel (`vercel.json`) | Unified static SPA serving, EdgeStore API handler, and `/api/health` endpoint |
| **Quality Assurance** | Vitest (`npm test`) + Manual QA Suites | 68 automated unit/component/integrity tests + 90+ manual checklist cases |

---

## 6. Phased Roadmap & Current Status

**Status legend:** ✅ Done · 🟡 In progress / partial · ⬜ Planned next

### Phase 1 — Foundation & Core Campus Workflows (✅ Complete)
- [x] Empty-start architecture with zero seeded mock reports (`src/App.jsx`, `src/services/storage.js`).
- [x] Civic issue reporting modal with 9 categories, severity slider (1–5), photo upload, and campus map pin picker.
- [x] Lost & Found reporting modal with 6 categories, custom item types under *Other Items*, mandatory photo validation on *Found* items, and secret-question protection.
- [x] Interactive BBIT satellite map with 50 curated campus landmarks rendered as clean point markers (`src/data/bbitPlaces.json`).
- [x] 4-stage resolution pipeline (*Reported → Acknowledged → In Progress → Resolved* / *Reunited 🎉*).
- [x] Installable Progressive Web App (PWA) manifest, icons, and service worker.

### Phase 2 — Smart Engines, UI Polish & Automated Logic Tests (✅ Complete)
- [x] Haversine proximity duplicate detector warning users of active issues within ~35–40m (`src/services/matchingEngine.js`).
- [x] Multi-factor Lost & Found cross-matching engine with confidence percentages and match reasons.
- [x] Heuristic spam, scam, phishing, and gibberish detector for staff moderation (`src/services/spamDetector.js`).
- [x] Apple-inspired visual design system with consistent BBIT blue/cyan hero shader across light and dark modes.
- [x] Automated Vitest test suite (**68 passing tests across 5 test files**) including the `appIntegrity.test.js` no-mock-data guard and `campusMapMarkers.test.jsx`.
- [x] Comprehensive project documentation (`docs/planning.md`, `docs/progress.md`, `docs/_qa.md`, `docs/_qa-checklist.md`, `docs/deployment.md`).

### Phase 3 — Security Hardening & User Feedback (🟡 Next Priority Before Live Campus Rollout)
- [ ] 🔴 **Real staff authentication & authorization:** Replace the client-side demo passcode in `AdminPortal.jsx` with verified Firebase Auth staff roles/custom claims.
- [ ] 🔴 **Deploy Firestore security rules:** Enforce read/write permissions, campus coordinate validation, and staff-only status transitions in Firebase.
- [ ] 🟡 **Explicit save & error notifications:** Add clear toast notifications when a report, upvote, or status change succeeds or fails, replacing silent modal closures.
- [ ] 🟡 **Reliable offline write queue:** Add explicit pending-sync indicators and retry handling for reports submitted while offline.

### Phase 4 — End-to-End Automation & Campus Launch (⬜ Planned)
- [ ] 🟡 **UI / E2E automated tests:** Add browser-level tests for form submission, modal flows, and staff moderation screens.
- [ ] 🟡 **Dependency & bundle hygiene:** Resolve remaining `npm audit` transitive warnings and optimize initial map/shader bundle chunking.
- [ ] 🟢 **Persistent staff recycle bin:** Store deleted-item history in Firestore so staff can restore accidentally removed posts after a page refresh.

---

## 7. How We Will Know It Is Ready (Definition of Done)

### Ready for Demo & Evaluation (Current State — ✅ Met)
- [x] New users open an empty app with zero fake or sample reports.
- [x] Students can create and view campus hazard reports and Lost & Found posts on both mobile and desktop.
- [x] Duplicate detection (<40m) and Lost & Found smart match suggestions work and are covered by automated unit tests.
- [x] Staff can review reports, inspect flagged spam, and update progress through all 4 stages in the Facility Staff Portal.
- [x] `npm test` passes all **68 automated tests** and `npm run build` compiles cleanly with PWA assets.

### Ready for Live BBIT Student Rollout (Production Release Gate)
- [ ] Staff portal access is locked behind real authenticated staff accounts (no client-side passcode fallback).
- [ ] Firestore security rules and EdgeStore production keys are deployed and verified on staging.
- [ ] Users receive clear visual feedback (success confirmation or actionable error message) on every submission.
- [ ] Offline submissions reliably sync when connectivity returns without silent data loss.
- [ ] All release sign-off checks in [`docs/_qa-checklist.md` §11](_qa-checklist.md#11-release-sign-off-checklist) pass on the live staging URL.
