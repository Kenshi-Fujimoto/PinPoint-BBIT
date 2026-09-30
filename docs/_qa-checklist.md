# 🧪 PinPoint — Detailed QA Checklist (for the team)

> **This is the working checklist we use internally.** Judges and non-technical readers: start with **[`_qa.md`](_qa.md)** — a plain-language summary of the same information.
>
> Quality Assurance documentation for **PinPoint**, the BBIT campus app for reporting civic infrastructure hazards and tracking lost & found items.
>
> | | |
> | :--- | :--- |
> | **Version** | 1.0.0 |
> | **Last updated** | 30 September 2026 |
> | **Current QA verdict** | 🟡 **Demo-ready — NOT production-ready** (see [Known Issues](#8-known-issues--open-defects)) |
> | **Plain-language report** | [`_qa.md`](_qa.md) |
> | **Related docs** | [README.md](../README.md) · [DEPLOYMENT.md](../DEPLOYMENT.md) · [progress.md](../progress.md) · [planning.md](../planning.md) |

---

## Table of Contents

1. [Scope & Goals](#1-scope--goals)
2. [Test Environments](#2-test-environments)
3. [Severity & Priority Definitions](#3-severity--priority-definitions)
4. [Smoke Test Suite](#4-smoke-test-suite)
5. [Functional Test Suites](#5-functional-test-suites)
   - [5.1 Civic Issue Reporting](#51-civic-issue-reporting)
   - [5.2 Duplicate Detection (Proximity)](#52-duplicate-detection-proximity)
   - [5.3 Lost & Found](#53-lost--found)
   - [5.4 Smart Matching Engine](#54-smart-matching-engine)
   - [5.5 Community Interactions](#55-community-interactions)
   - [5.6 Status Pipeline](#56-status-pipeline)
   - [5.7 Authentication](#57-authentication)
   - [5.8 Admin / Staff Portal](#58-admin--staff-portal)
   - [5.9 Map & Geofencing](#59-map--geofencing)
   - [5.10 Spam Detection](#510-spam-detection)
   - [5.11 Photo Uploads (EdgeStore)](#511-photo-uploads-edgestore)
   - [5.12 Offline & PWA](#512-offline--pwa)
6. [Non-Functional Testing](#6-non-functional-testing)
7. [Cross-Platform / Compatibility Matrix](#7-cross-platform--compatibility-matrix)
8. [Known Issues & Open Defects](#8-known-issues--open-defects)
9. [Test Data Management](#9-test-data-management)
10. [Bug Report Template](#10-bug-report-template)
11. [Release Sign-off Checklist](#11-release-sign-off-checklist)

---

## 1. Scope & Goals

### 1.1 What is in scope

| Area | Description |
| :--- | :--- |
| **Civic hazard reporting** | Reporting potholes, broken lights, leaks, garbage, broken infrastructure, WiFi dead zones, electrical, HVAC issues with photo + map pin |
| **Lost & Found** | Posting lost/found items, smart match suggestions, secret-question verification, "Reunited" flow |
| **Duplicate detection** | Proximity warning when a similar civic report exists within **40 m** |
| **Community features** | Upvotes, 1–5 severity rating, verification, comments |
| **Status pipeline** | `Reported → Acknowledged → In Progress → Resolved` / `Reunited` |
| **Admin portal** | Moderation, filters, search, status updates, deletion with reasons, suspicious-posts list, recycle bin |
| **Map** | Leaflet satellite map, 50 curated BBIT campus places, clustering, geofencing |
| **Infra** | Firebase Firestore (real-time + offline cache), Google Auth, EdgeStore uploads, Express server, Vercel deployment |
| **PWA** | Installability, service worker, offline shell |
| **UI/UX** | Responsive layout, dark mode, accessibility basics |

### 1.2 What is out of scope (for now)

- Automated unit / E2E tests — **none exist yet** (top priority gap, see [§8](#8-known-issues--open-defects))
- Load / stress testing
- Real Google OAuth end-to-end with production accounts (requires real keys — must be tested on a staging deployment)
- Firestore security rule enforcement (rules are drafted in [DEPLOYMENT.md §4.3](../DEPLOYMENT.md) but not deployed/verified)

### 1.3 QA goals

1. Verify every user journey works end-to-end (report → appear on map → status update → resolved).
2. Confirm the app **always starts empty** — no fake/sample data ever renders (a firm project promise).
3. Confirm campus geofencing rejects off-campus coordinates.
4. Catch regressions in the matching, duplicate-detection and spam engines.
5. Establish a repeatable manual test suite until automation lands.

---

## 2. Test Environments

### 2.1 Environment modes

| Mode | How to start | URL | Firebase | EdgeStore | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Dev (Vite)** | `npm run dev` | `http://localhost:3000` | live if `VITE_*` set | via Vite proxy | Hot reload |
| **Prod-like (Express)** | `npm run build && npm start` | `http://localhost:3001` | live if `VITE_*` set | live if keys set | Closest to production |
| **Preview (Vite)** | `npm run preview` | Vite output | live if set | — | Static-only check |
| **Degraded / demo** | no `.env` at all | any | ❌ falls back to localStorage | ❌ fallback mode | App must still open & be usable |
| **Staging (Vercel)** | `vercel` or Git integration | `*.vercel.app` | staging keys | staging keys | For real auth/upload testing |

### 2.2 Prerequisites

```bash
npm install          # clean install
cp .env.example .env # if present; otherwise see DEPLOYMENT.md §3.3 for the template
```

Environment variables (full reference in [DEPLOYMENT.md §3](../DEPLOYMENT.md)):

- `VITE_FIREBASE_*` — 6 public client values (API key, auth domain, project ID, storage bucket, messaging sender ID, app ID)
- `EDGE_STORE_ACCESS_KEY` / `EDGE_STORE_SECRET_KEY` — server-side secrets (**never** prefix with `VITE_`)

### 2.3 Test accounts & data

- 1× Google account for a "student" user (sign-in, upvotes, comments)
- 1× second Google account to verify per-user upvote behaviour and multi-user real-time sync
- Admin portal passcodes during QA: `admin`, `1234`, or **leave blank** (⚠️ placeholder — see [§8](#8-known-issues--open-defects))
- Always reset data between cycles: `npm run db:clean` (see [§9](#9-test-data-management))

### 2.4 Automated unit tests (Vitest)

The pure-logic core of the app is covered by an automated Vitest suite — run it before every commit, demo, or deployment:

```bash
npm test            # full suite, single run (CI-friendly)
npm run test:watch  # watch mode during development
```

| Test file | Covers | QA suites automated |
| :--- | :--- | :--- |
| `src/services/matchingEngine.test.js` | Haversine distance, 40 m duplicate detection, lost & found similarity scoring, match suggestions | DUP-01…08, MAT-01…08 |
| `src/services/spamDetector.test.js` | Scam/phishing/fake patterns, field weightings, risk levels, off-campus GPS penalty, moderation reasons | SPA-01…07 |
| `src/types/index.test.js` | Campus geofence & clamping, surveyed layout (wall, roads, greens, water, parking, trees, gates), category/status catalogues, 50 curated places with footprints | MAP-01…09, STS-01 |
| `src/appIntegrity.test.js` | Static guard: no app code may import `mockData` — enforces the "never render fake data" promise | SMK-05, §9.1 |

> **Still manual:** all UI/interaction cases (§5.1, §5.3 flows, §5.7 auth, §5.8 admin portal, §5.11 uploads, §5.12 PWA) and the smoke suite (§4) — see known issue [#2](#8-known-issues--open-defects).

---

## 3. Severity & Priority Definitions

| Severity | Label | Meaning |
| :--- | :--- | :--- |
| 🔴 **S1 — Blocker** | Critical | Data loss, security hole, app won't build/start, core journey impossible |
| 🟠 **S2 — Major** | High | Core feature broken for a significant path; no acceptable workaround |
| 🟡 **S3 — Moderate** | Medium | Feature partially broken; workaround exists; confusing UX |
| 🔵 **S4 — Minor** | Low | Cosmetic, wording, small polish items |

| Priority | Response |
| :--- | :--- |
| **P1** | Fix before any demo/deployment |
| **P2** | Fix before production release |
| **P3** | Backlog / next sprint |

---

## 4. Smoke Test Suite

> Run these before every demo, deployment, or merge into `main`. ~10 minutes.
> Any ❌ stops the release.

| ID | Check | Steps | Expected | Result |
| :--- | :--- | :--- | :--- | :--- |
| SMK-01 | Install & build | `npm ci && npm run build` | Exit code 0, no errors, `dist/` + service worker generated | ☐ |
| SMK-02 | Dev server starts | `npm run dev` → open `localhost:3000` | App renders; map loads; navbar + hero visible | ☐ |
| SMK-03 | Express server starts | `npm start` → open `localhost:3001` | Full SPA served; no "dist not detected" page | ☐ |
| SMK-04 | Health endpoint | `curl localhost:3001/api/health` | `{"status":"ok", "app":"PinPoint Unified Express Server", ...}` | ☐ |
| SMK-05 | App starts empty | Fresh load → Civic + Lost & Found tabs | **Zero** pre-seeded reports (no mock data anywhere) | ☐ |
| SMK-06 | 50 campus places | Open Map tab | 50 curated BBIT places load with markers/clustering | ☐ |
| SMK-07 | Report a civic issue | Report an Issue → category + photo + pin → submit | New pin + list entry appear **immediately** (real-time) | ☐ |
| SMK-08 | Post a lost item | Lost & Found → Post Lost → fill → submit | Item appears in list immediately | ☐ |
| SMK-09 | Admin portal opens | Open staff portal | Dashboard, filters, search, suspicious list render | ☐ |
| SMK-10 | Status pipeline | In admin, advance an issue | `Reported → Acknowledged → In Progress → Resolved` with visible history | ☐ |
| SMK-11 | SPA deep-link refresh | With `/civic` (or admin view) open, hard refresh | No 404 — client routing recovers | ☐ |
| SMK-12 | Console health | Watch DevTools console during SMK-01…11 | No uncaught errors; only expected warnings | ☐ |
| SMK-13 | Automated unit tests | `npm test` | All 4 suites pass (73 tests) — matching, spam, geofence & layout, integrity | ☐ |

---

## 5. Functional Test Suites

> Convention: mark each case ✅ Pass / ❌ Fail / ⚠️ Partial / ☐ Untested. Log failures with the [bug template](#10-bug-report-template).

### 5.1 Civic Issue Reporting

Covers `CivicReportModal.jsx` (+ map picker + uploader). Categories: pothole, streetlight, water leak, garbage, broken infrastructure, WiFi dead zone, electrical, HVAC, other.

| ID | Test Case | Steps | Expected | Result |
| :--- | :--- | :--- | :--- | :--- |
| CIV-01 | Submit minimal valid report | Category + title + pin inside campus, no photo | Report saved; appears in list + map | ☐ |
| CIV-02 | Submit with photo | Attach JPG/PNG | Photo uploads (EdgeStore) and renders on pin/detail | ☐ |
| CIV-03 | Required-field validation | Submit with empty title/category/location | Blocked with clear inline validation | ☐ |
| CIV-04 | All 9 categories | Submit once per category | Correct icon, emoji, colour tag per category | ☐ |
| CIV-05 | Location picker | Open map picker; drag/search; confirm | Lat/lng captured; marker matches selection | ☐ |
| CIV-06 | Off-campus rejection | Pin outside BBIT bounding box (see LF/MAP-01) | Submission blocked with campus-restriction message | ☐ |
| CIV-07 | Cancel flow | Open modal → close without submitting | Nothing saved; no orphan uploads | ☐ |
| CIV-08 | Long/garbage input | 5000-char title, emoji, script tags `<script>` | No crash; stored as text; no HTML injection on render | ☐ |
| CIV-09 | Save feedback | Submit a report | ⚠️ *Known gap:* modal closes silently — no "saved" confirmation (Issue #3) | ☐ |
| CIV-10 | Save failure handling | Kill network mid-submit | ⚠️ *Known gap:* error only logged to console — user not told (Issue #3) | ☐ |
| CIV-11 | Real-time propagation | User A reports; User B watches (2 devices) | Appears for B within ~1 s via `onSnapshot` | ☐ |
| CIV-12 | Persistence | Report → full page reload | Report still present (Firestore, not just memory) | ☐ |

### 5.2 Duplicate Detection (Proximity)

Covers `findNearbyCivicDuplicates()` in `src/services/matchingEngine.js` — Haversine distance, threshold **40 m** (set in `CivicReportModal.jsx`), only non-`resolved` issues considered.

| ID | Test Case | Steps | Expected | Result |
| :--- | :--- | :--- | :--- | :--- |
| DUP-01 | Same spot, same category | Report pothole at X; start a new pothole report ~5 m away | Duplicate warning shown; suggests upvoting existing report | ☐ |
| DUP-02 | Same spot, different category | Pothole at X; new *streetlight* report ~5 m away | Warning shown but flagged as lower relevance (cross-category) | ☐ |
| DUP-03 | Just outside threshold | New report ~50 m from existing | No warning | ☐ |
| DUP-04 | Just inside threshold | New report ~35 m from existing | Warning shown | ☐ |
| DUP-05 | Resolved issues ignored | Resolve existing issue; report same spot | No duplicate warning (resolved excluded) | ☐ |
| DUP-06 | Warning is non-blocking | On duplicate warning, choose to submit anyway | User can still create their own report | ☐ |
| DUP-07 | "Upvote instead" path | On warning, tap the upvote-existing action | Upvote applied to existing issue; new draft discarded | ☐ |
| DUP-08 | Sort order | Multiple nearby duplicates | Closest match listed first | ☐ |

### 5.3 Lost & Found

Covers `LostFoundModal.jsx`, `LostFoundView.jsx`, `LostFoundDetailModal.jsx`. Categories: electronics, keys/IDs/cards, bottles & mugs, clothing & bags, stationery, other.

| ID | Test Case | Steps | Expected | Result |
| :--- | :--- | :--- | :--- | :--- |
| LF-01 | Post a lost item | Type=Lost + required fields | Saved; visible under Lost & Found | ☐ |
| LF-02 | Post a found item | Type=Found + required fields | Saved; visible | ☐ |
| LF-03 | Secret question set | Post a found item with secret Q/A | Question shown on detail view; answer never displayed | ☐ |
| LF-04 | Secret question verification | As the owner of the *lost* item, answer correctly on the found item's detail | Verified/unlocked contact flow | ☐ |
| LF-05 | Wrong secret answer | Answer incorrectly | Rejected; no owner contact details exposed | ☐ |
| LF-06 | Missing secret question | Item without a secret question | Contact flow falls back appropriately (no crash) | ☐ |
| LF-07 | Category coverage | Post one item per category | Correct icon + colour per category | ☐ |
| LF-08 | Mark as Reunited | Owner confirms recovery | Status → *Reunited 🎉*; celebratory confetti fires | ☐ |
| LF-09 | Comments | Add a comment to a lost/found post | Comment appended with author + timestamp | ☐ |
| LF-10 | Photo support | Attach photo when posting | Uploads and renders | ☐ |
| LF-11 | Lost vs Found filtering | Filter list by type | Only matching type shown | ☐ |

### 5.4 Smart Matching Engine

Covers `calculateLostFoundSimilarity()` in `src/services/matchingEngine.js`. Scoring: identical title 45 pts, partial title 35, same category 25, keyword/brand/colour Jaccard overlap up to 25, plus location/date factors; displayed as **% match** with human-readable reasons.

| ID | Test Case | Steps | Expected | Result |
| :--- | :--- | :--- | :--- | :--- |
| MAT-01 | Identical items | Post "Lost: blue Milton bottle"; then "Found: blue Milton bottle", same category | High % match with reasons ("Identical title", "Identical item category", keyword overlap) | ☐ |
| MAT-02 | Partial title overlap | "Lost: iPhone 15" vs "Found: iPhone 15 Pro" | Medium-high match; "Strong title match" reason | ☐ |
| MAT-03 | Same type never matches | Two *lost* items, identical text | Score 0 — cross-matching only happens lost↔found | ☐ |
| MAT-04 | Unrelated items | "Lost: chemistry notes" vs "Found: silver keys" | Low/no match suggested | ☐ |
| MAT-05 | Reason strings | Inspect match card | Reasons are readable, max ~3 common keywords, no duplicates | ☐ |
| MAT-06 | Match badge in list | Create a strong lost/found pair | "✨ N% Match Found" badge appears on the list card | ☐ |
| MAT-07 | Stop-word filtering | Items differing only by stop words ("the", "with", "item"…) | Match score not inflated by meaningless words | ☐ |
| MAT-08 | Symmetry | Score(A,B) vs Score(B,A) | Consistent (no direction-dependent blow-ups) | ☐ |

### 5.5 Community Interactions

Covers upvotes, 1–5 severity, verification, comments in `App.jsx` / detail modals.

| ID | Test Case | Steps | Expected | Result |
| :--- | :--- | :--- | :--- | :--- |
| COM-01 | Upvote requires sign-in | Not signed in → tap upvote | Auth modal prompted with a reason | ☐ |
| COM-02 | Upvote toggles | Signed in → upvote → upvote again | Count +1 then −1 (toggle); button shows active state | ☐ |
| COM-03 | One upvote per user | User A upvotes from two devices | Count increments once (tracked via `upvotedBy`) | ☐ |
| COM-04 | Severity rating 1–5 | Rate an issue | Severity level stored and displayed | ☐ |
| COM-05 | Verification | Tap "verify" on an issue | `verifiedCount` increments | ☐ |
| COM-06 | Comment requires sign-in | Not signed in → comment | Auth prompt | ☐ |
| COM-07 | Comment content | Add comment with emoji + 2000 chars | Renders safely; timestamps correct | ☐ |

### 5.6 Status Pipeline

Covers `CIVIC_STATUSES` and admin updates in `AdminPanel.jsx` / `App.jsx`.

| ID | Test Case | Steps | Expected | Result |
| :--- | :--- | :--- | :--- | :--- |
| STS-01 | Full civic pipeline | Advance an issue through all 4 stages | `Reported → Acknowledged → In Progress → Resolved`; each change visible to students in real time | ☐ |
| STS-02 | Status note attached | Add a note with a status change | Note appears in the issue's history | ☐ |
| STS-03 | History log | Inspect detail after several changes | Chronological history entries with status + note + timestamp | ☐ |
| STS-04 | Backwards transition | Move a resolved issue back to in-progress | Allowed (admin control) and logged | ☐ |
| STS-05 | Lost & Found terminal state | Mark item reunited | Reunited is the terminal state with 🎉 feedback | ☐ |
| STS-06 | Resolved issues on map | Resolve an issue | Pin reflects resolved state / de-emphasised | ☐ |

### 5.7 Authentication

Covers `AuthModal.jsx` + `src/services/firebase.js` (Google popup, `onAuthStateChanged`). **Requires a staging deployment with real Firebase keys.**

| ID | Test Case | Steps | Expected | Result |
| :--- | :--- | :--- | :--- | :--- |
| AUT-01 | Google sign-in | Sign in via popup | Account picker → user avatar/name in navbar | ☐ |
| AUT-02 | Sign out | Tap sign out | Session cleared; UI returns to guest state | ☐ |
| AUT-03 | Session persistence | Sign in → reload | Still signed in | ☐ |
| AUT-04 | Auth state subscription | Sign in on tab 1 while tab 2 open | Both tabs update (multi-tab manager) | ☐ |
| AUT-05 | Popup blocked | Block popups → sign in | Graceful error, not a silent failure | ☐ |
| AUT-06 | Unconfigured Firebase | Run with no `VITE_FIREBASE_*` | App degrades cleanly to localStorage mode; sign-in clearly unavailable | ☐ |
| AUT-07 | Auth errors | Cancel popup / network fail | User sees a readable error message | ☐ |

### 5.8 Admin / Staff Portal

Covers `AdminPortal.jsx` / `AdminPanel.jsx`.

> ⚠️ **Security caveat:** the portal currently accepts passcodes `admin`, `1234`, **or blank**, client-side only. This is a known S1 defect (Issue #1) — test the functionality, but do not deploy to real students.

| ID | Test Case | Steps | Expected | Result |
| :--- | :--- | :--- | :--- | :--- |
| ADM-01 | Passcode gate | Enter wrong passcode | Rejected with hint message | ☐ |
| ADM-02 | Passcode accept | Enter `admin` / `1234` / blank | Portal unlocks | ☐ |
| ADM-03 | Unauthenticated access | Deep-link straight into admin functions | ⚠️ *Known gap:* portal is reachable/open — Issue #1 | ☐ |
| ADM-04 | List all reports | Open dashboard | Both civic and lost/found collections listed with key fields | ☐ |
| ADM-05 | Filters | Filter by status, category, type | Correct subset shown | ☐ |
| ADM-06 | Search | Search by title/keyword | Matches found; empty state for no hits | ☐ |
| ADM-07 | Update status | Change an issue's status + note | Saved; students see it; history logged | ☐ |
| ADM-08 | Delete with reason | Delete a post as `fake` / `scam` + admin note | Removed from public views; recorded in recycle bin with reason + note | ☐ |
| ADM-09 | Recycle bin persistence | Delete → refresh page | ⚠️ *Known gap:* recycle bin empties on refresh — Issue #8 | ☐ |
| ADM-10 | Suspicious posts list | Post spam (see §5.10) → open suspicious list | Post flagged and listed for moderation | ☐ |
| ADM-11 | Moderation actions on spam | Handle a suspicious post | Can delete with appropriate reason | ☐ |

### 5.9 Map & Geofencing

Covers `InteractiveMap.jsx`, `MapLocationPickerModal.jsx`, `src/data/bbitPlaces.json`, `isInsideCampus()`.

Campus geofence (derived in `src/types/index.js` from the surveyed campus wall in `src/data/campusLayout.json`): **lat 22.45683–22.45964, lng 88.16787–88.17092** — roughly 310 m × 310 m of real ground, centred on `[22.458234, 88.169398]`, default zoom 17.

| ID | Test Case | Steps | Expected | Result |
| :--- | :--- | :--- | :--- | :--- |
| MAP-01 | Geofence — inside | Pin at the campus centre | Accepted | ☐ |
| MAP-02 | Geofence — outside | Pin in central Kolkata / another city | Rejected with message | ☐ |
| MAP-03 | Geofence — edge cases | Pins exactly on each boundary coordinate | Behaviour consistent (just-inside accepted, just-outside rejected) | ☐ |
| MAP-04 | 50 curated places | Load map | All 50 BBIT places present, correctly named/positioned | ☐ |
| MAP-05 | Satellite overlay | Toggle layer | High-res aerial imagery renders | ☐ |
| MAP-06 | Clustering | Create 5+ reports within metres of each other | Markers cluster; cluster expands on zoom/tap | ☐ |
| MAP-07 | Pin ↔ detail round-trip | Tap a report pin | Detail modal opens for the right report | ☐ |
| MAP-08 | Map performance | 50+ markers | Pan/zoom stays smooth; no freezing | ☐ |
| MAP-09 | Places ≠ user reports | Compare places list vs report pins | Curated places and user reports are visually distinct and never conflated | ☐ |

### 5.10 Spam Detection

Covers `evaluateSpamRisk()` in `src/services/spamDetector.js` — scam/phishing regexes (telegram links, crypto, "free money", URL shorteners, etc.), fake/junk patterns, plus campus-geofence sanity.

| ID | Test Case | Steps | Expected | Result |
| :--- | :--- | :--- | :--- | :--- |
| SPA-01 | Phishing contact | Post "contact me on t.me/scammer123" | Flagged suspicious; appears in admin suspicious list | ☐ |
| SPA-02 | Crypto scam | Post "invest in bitcoin, double your money" | Flagged | ☐ |
| SPA-03 | URL shortener spam | Post a bit.ly "prize claim" link | Flagged | ☐ |
| SPA-04 | Junk/troll text | Post "lorem ipsum asdfgh test test" | Flagged as fake/junk | ☐ |
| SPA-05 | Legitimate report | Post a genuine pothole report with normal text | **Not** flagged (no false positive) | ☐ |
| SPA-06 | Applies to both modules | Repeat SPA-01 as a lost & found post | Also flagged | ☐ |
| SPA-07 | Flag severity/notes | Inspect the suspicious entry | Reason(s) shown to the moderator | ☐ |

### 5.11 Photo Uploads (EdgeStore)

Covers `EdgeStoreUploader.jsx`, `src/services/edgestore*.js`, `/api/edgestore/*`.

| ID | Test Case | Steps | Expected | Result |
| :--- | :--- | :--- | :--- | :--- |
| IMG-01 | Upload JPEG | Attach a normal phone photo | Progress → uploaded URL → preview shown | ☐ |
| IMG-02 | Upload PNG | Attach a PNG | Works | ☐ |
| IMG-03 | Oversized file | Attach a 15 MB+ image | Graceful handling (compressed or clear error), no crash | ☐ |
| IMG-04 | Non-image file | Attach a PDF/EXE | Rejected with a clear message | ☐ |
| IMG-05 | Unconfigured EdgeStore | Run without EdgeStore keys | Fallback/ client-compression mode; app remains usable | ☐ |
| IMG-06 | Upload then cancel | Upload in progress → close modal | No stuck UI; no orphaned report | ☐ |
| IMG-07 | Endpoint health | `curl localhost:3001/api/edgestore/` (unconfigured) | Fallback JSON `{"status":"fallback","configured":false,...}` | ☐ |
| IMG-08 | Image renders after reload | Submit report with photo → reload | Image still loads from the bucket URL | ☐ |

### 5.12 Offline & PWA

Covers `vite-plugin-pwa`, service worker, `manifest.webmanifest`, Firestore persistent local cache.

| ID | Test Case | Steps | Expected | Result |
| :--- | :--- | :--- | :--- | :--- |
| PWA-01 | Installable | Chrome/Edge: install icon in address bar | App installs with PinPoint icon + standalone window | ☐ |
| PWA-02 | Manifest validity | Lighthouse → PWA section / inspect manifest | Valid manifest; all icons resolve (192/512/maskable) | ☐ |
| PWA-03 | Offline shell | DevTools → Offline → reload | App shell loads from cache (not the browser dino) | ☐ |
| PWA-04 | Offline read | Go offline → open app | Previously seen reports render from local cache | ☐ |
| PWA-05 | Offline write | Go offline → submit a report | ⚠️ *Known gap:* may be silently lost — no retry queue (Issue #4) | ☐ |
| PWA-06 | Reconnect sync | Come back online | New data from other users appears | ☐ |
| PWA-07 | Install banner | First visit on mobile | Install banner behaves (dismiss + re-show rules) | ☐ |
| PWA-08 | New SW activation | Deploy new build → reload | Service worker updates without bricking older tabs | ☐ |

---

## 6. Non-Functional Testing

| ID | Category | Check | Expected | Result |
| :--- | :--- | :--- | :--- | :--- |
| NFR-01 | Performance | First meaningful paint on 3G throttle | Reasonably fast; ⚠️ first load is slow on poor connections (Issue #8) | ☐ |
| NFR-02 | Performance | Map with 100+ reports | Smooth interaction | ☐ |
| NFR-03 | Security | No secrets in client bundle | `VITE_`-prefixed values only are public; **no** EdgeStore keys in `dist/` | ☐ |
| NFR-04 | Security | Firestore rules | ⚠️ Not yet written/deployed — Issue #6 | ☐ |
| NFR-05 | Security | Admin gate | ⚠️ Placeholder passcode — Issue #1 (S1) | ☐ |
| NFR-06 | Security | Input sanitisation | All user text rendered as text (React escaping); no stored XSS | ☐ |
| NFR-07 | Dependency health | `npm audit` | ⚠️ Warnings present; worst are in unused transitive deps — Issue #7 | ☐ |
| NFR-08 | Accessibility | Keyboard-only navigation of navbar/tabs/modals | Reachable and operable; focus visible; Esc closes modals | ☐ |
| NFR-09 | Accessibility | Alt text / ARIA on icon buttons | Screen-reader labels present on interactive controls | ☐ |
| NFR-10 | Usability | Dark mode toggle | Persists (`localStorage`), all views legible | ☐ |
| NFR-11 | Reliability | Kill network during any write | No uncaught exception; recovery on reconnect | ☐ |
| NFR-12 | Data integrity | Two tabs, same account, concurrent writes | No duplicate/lost docs (multi-tab Firestore cache manager) | ☐ |

---

## 7. Cross-Platform / Compatibility Matrix

Test on the latest stable versions unless noted.

| Platform / Browser | Chrome | Firefox | Safari | Edge | Mobile (Android/Chrome) | Mobile (iOS/Safari) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Load & render | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Map + satellite | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Photo upload | ☐ | ☐ | ☐ | ☐ | ☐ (camera) | ☐ (camera) |
| Google sign-in popup | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| PWA install | ☐ | n/a | ☐* | ☐ | ☐ | ☐* |
| Offline mode | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |

> \* Safari PWA support is more limited — record actual behaviour rather than expecting parity.
> Note the map (Leaflet) and camera APIs are the most browser-sensitive areas.

---

## 8. Known Issues & Open Defects

Source: [progress.md](../progress.md) — verified against the code on 30 Sep 2026.

| # | Issue | Severity | Priority | Evidence |
| :--- | :--- | :--- | :--- | :--- |
| 1 | **Admin portal is not secured.** Accepts `admin` / `1234` / blank, client-side only; effectively open to anyone who finds the page. | 🔴 S1 | P1 | `AdminPortal.jsx` (passcode check ~line 270) |
| 2 | **No automated tests.** All testing is manual; regressions can slip through silently. | 🔴 S1 | P1 | No test runner in `package.json` |
| 3 | **Silent save.** Submitting a report just closes the modal — no success confirmation; failures only logged to console. | 🟡 S3 | P2 | `App.jsx` create handlers |
| 4 | **Offline writes can be lost.** App opens offline, but there is no retry queue for reports made without a connection. | 🟡 S3 | P2 | Firestore persistence without sync guarantee |
| 5 | **Setup documentation incomplete** (largely addressed by DEPLOYMENT.md — verify before closing). | 🟡 S3 | P3 | — |
| 6 | **No Firestore security rules deployed.** Anyone with the config can read/write the database. | 🔴 S1 | P1 | Draft rules exist in DEPLOYMENT.md §4.3 only |
| 7 | **Dependency audit warnings.** Worst offenders are in unused transitive dependencies. | 🟡 S3 | P3 | `npm audit` |
| 8 | **Polish:** recycle bin empties on refresh; slow first load on poor connections. | 🔵 S4 | P3 | `AdminPanel.jsx` in-memory history |

**Release gate:** issues **#1, #2, and #6** must be closed before any real-student deployment.

---

## 9. Test Data Management

### 9.1 Principles

1. **Never ship mock data.** `src/data/mockData.js` exists in the repo but the app must never render it — a hard project promise. Any test failing this is an S1.
2. Campus places (`bbitPlaces.json`) are **reference data**, not user reports — they are allowed and expected to be present.
3. Use a **dedicated staging Firebase project** for QA. Never run destructive tests against production.

### 9.2 Reset between cycles

```bash
# Wipes all documents from the Firestore collections (requires .env with Firebase config)
npm run db:clean
```

`scripts/cleanupDatabase.js` connects using the `VITE_FIREBASE_*` variables and deletes every document in the `civic_issues` and `lost_found_items` collections. **Double-check which project `.env` points at before running** — there is no confirmation prompt.

### 9.3 Suggested QA data set

After a clean reset, seed manually through the UI:

- 2 civic issues at the **same spot** (duplicate-detection tests) + 1 resolved one
- 1 civic issue per remaining category
- 1 lost/found **pair** designed to match ≥80% (identical title + category + keywords)
- 1 lost and 1 found item that should **not** match
- 1 post containing spam patterns (for the suspicious list)
- 1 item with a secret question (verification flow)

### 9.4 Degraded-mode data

With no Firebase keys, reports persist to browser `localStorage` — useful for UI testing, but remember data is per-browser. Clear via DevTools → Application → Local Storage when done.

---

## 10. Bug Report Template

```markdown
**Title:** [Short, specific summary]

**ID:** BUG-YYYYMMDD-NNN
**Reported by:** <name> · **Date:** YYYY-MM-DD
**Severity:** S1 / S2 / S3 / S4    **Priority:** P1 / P2 / P3
**Suite / Case ID:** e.g. CIV-09

**Environment:**
- Mode: dev (Vite :3000) / express (:3001) / staging URL
- Browser + version, OS, device
- Firebase configured: yes/no · EdgeStore configured: yes/no
- Signed in: yes/no (account role)

**Preconditions:** (state of data, prior steps)

**Steps to reproduce:**
1. …
2. …
3. …

**Expected result:** …
**Actual result:** …

**Evidence:** console errors, network tab, screenshots/screen recording

**Reproducibility:** always / intermittent (x of y attempts) / once

**Notes/workaround:** …
```

---

## 11. Release Sign-off Checklist

Before tagging a release or pointing real students at the app, **all** of the following must hold:

- [ ] All **smoke tests** (§4) pass on the staging deployment
- [ ] All functional suites (§5) executed; no open ❌ without a waived, documented decision
- [ ] **`npm test` passes** — all automated unit suites green
- [ ] **S1 issues #1 (admin security) and #6 (Firestore rules) are closed**; the UI/E2E half of #2 is completed
- [ ] `npm run build` succeeds; `npm audit` reviewed
- [ ] Secrets scan of the built bundle passes (no EdgeStore keys client-side)
- [ ] Post-deploy smoke tests from [DEPLOYMENT.md §9](../DEPLOYMENT.md) pass against the live URL
- [ ] `/api/health` returns `"status":"ok"` with expected service flags on the live deployment
- [ ] App verified to start **empty** on a fresh staging database
- [ ] Data reset/cleanup plan for the staging project confirmed
- [ ] Sign-off recorded below

| Release | Date | Tester | Result | Notes |
| :--- | :--- | :--- | :--- | :--- |
| v1.0.0 | _ | _ | 🟡 Demo-ready (issues #1, #6 open; #2 half-closed) | First documented QA pass + automated unit suite added |

---

*Maintained alongside [progress.md](../progress.md). Update the Known Issues table and sign-off log whenever a defect is fixed or found.*
