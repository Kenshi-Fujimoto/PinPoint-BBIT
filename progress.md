# 📊 PinPoint BBIT — Progress Tracker

> Living status document for the PinPoint campus platform.
> **Source of truth for scope:** [`planning.md`](planning.md) · **Product overview:** [`README.md`](README.md)

| | |
| :--- | :--- |
| **Last updated** | 2026-09-30 |
| **Branch** | `arena/01a0f27b-pinpoint-bbit` |
| **Base commit** | `e3e35ad` (merge of PR #1) |
| **Build status** | ✅ `npm run build` passes (6.1 s, 1666 modules) |
| **Test status** | ❌ No test framework or test files in repo |
| **Overall readiness** | 🟡 **Feature-complete for a demo; not yet release-ready** (blockers: staff access control, no test suite) |

**Legend:** ✅ Done · 🟡 Partial / needs verification · ⬜ Not started · 🔴 Blocker

---

## 1. Status board

Mapped directly to the four themes in `planning.md`.

| # | Workstream | Status | Evidence / Notes |
| :-- | :--- | :-- | :--- |
| 1 | **Safe & reliable app** | 🟡 | Empty-start enforced; staff auth is not secure yet (G-01) |
| 1a | App always starts with empty lists — no sample reports | ✅ | `src/data/mockData.js` exports `[]`; `src/services/storage.js` uses versioned keys `_v4` and purges all legacy generations on load |
| 1b | Secure sign-in & staff access | 🔴 | Staff portal opens already unlocked; hardcoded shared passcodes (G-01) |
| 1c | Clear feedback when a report is saved or fails | 🟡 | Modals close on submit with no success/error toast; write failures are `console.error` only (G-02) |
| 1d | Works on weak / offline connections | 🟡 | Firestore persistent multi-tab cache + localStorage fallback; queued writes on reconnect not implemented (G-03) |
| 2 | **Core features** | ✅ | All primary user flows implemented |
| 2a | Report a campus problem with location + photo | ✅ | `CivicReportModal.jsx`, `MapLocationPickerModal.jsx`, `EdgeStoreUploader.jsx` |
| 2b | Post lost & found items, see possible matches | ✅ | `LostFoundModal.jsx`, `LostFoundView.jsx`, `matchingEngine.js` (multi-factor scoring, % confidence) |
| 2c | Proximity duplicate detection, still allow a new report | ✅ | `findNearbyCivicDuplicates()` — 40 m at call site (`CivicReportModal.jsx:64`); shows "Similar report nearby" prompt with an override |
| 2d | Staff update issue progress, visible to students | ✅ | 4-stage pipeline `reported → acknowledged → in_progress → resolved` (`src/types/index.js`), `statusHistory` timeline, reunited celebration |
| 2e | Works on phones and computers | ✅ | Tailwind responsive layouts, dark mode default, mobile bottom-nav in `Navbar.jsx` |
| 3 | **Testing before release** | 🔴 | No tests exist at all (G-04) |
| 4 | **Ready for real use** | 🟡 | Deployment path works; setup docs, rules and data-handling policy missing |
| 4a | Clear setup instructions for external services | 🟡 | README covers Firebase/EdgeStore env vars at a high level; no `.env.example` (G-05) |
| 4b | Protect user info, photos and location details | ⬜ | No Firestore security rules file; no privacy/retention notes (G-06) |
| 4c | Explain how reports are reviewed and managed | 🟡 | Admin portal implements moderation + spam radar; the *policy* is not written down (G-07) |
| 4d | Deploy and update reliably | ✅ | `vercel.json` rewrites (SPA + API), `server.js` Express SPA fallback, PWA `autoUpdate` service worker |

---

## 2. What is built and verified

- **Campus mapping** — 50 curated BBIT places (`src/data/bbitPlaces.json`, verified count = 50), satellite aerial tiles, marker clustering, campus bounds + `isInsideCampus()` / `clampToCampus()` guards (`src/types/index.js:123-136`).
- **Civic hazard pipeline** — report → acknowledge → in progress → resolved, with severity upvotes, verification counts, comments and a full `statusHistory` audit trail rendered in `CivicDetailModal.jsx`.
- **Proximity duplicate detection** — Haversine distance in `matchingEngine.js`, surfaced as a "Similar hazard reported nearby!" prompt before submission, with an explicit option to continue submitting anyway.
- **Lost & found smart matching** — multi-factor title/description/category/location scoring producing ranked suggestions with confidence percentages (`src/services/matchingEngine.js`).
- **Anti-spam heuristics** — `src/services/spamDetector.js` flags phishing/scam patterns, fake/junk text and duplicate flooding; feeds the admin "spam radar" and suspect queue.
- **Staff operations portal** — `src/components/AdminPortal.jsx` (1,565 lines): stats dashboard, search/filter/sort, bulk actions, soft-delete to trash with restore, deletion reasons, resolution & reunion rates.
- **Persistence** — Firebase Firestore realtime `onSnapshot` subscriptions with persistent multi-tab cache, plus a localStorage mirror so the app stays usable with no Firebase credentials configured.
- **PWA** — `vite-plugin-pwa` with `autoUpdate`, manifest, maskable icons, install banner; build precaches 20 entries (~1.9 MB).
- **Deployment** — Vercel config with `/api/edgestore` and `/api/health` rewrites; Express server serves the SPA and the EdgeStore router on one port.

---

## 3. Gap register

| ID | Severity | Gap | Evidence | Next action |
| :-- | :-- | :--- | :--- | :--- |
| **G-01** | 🔴 Blocker | Staff portal is effectively unauthenticated. `isAuthenticated` initialises to `true`, and even the gate accepts `admin`, `1234` or an **empty** passcode. Passcodes are hardcoded in the client bundle. | `AdminPortal.jsx:44`, `AdminPortal.jsx:268-270` | Drive staff access from Firebase Auth custom claims/allow-list + Firestore rules; remove hardcoded passcodes and the `true` default; add role check before rendering the portal |
| **G-02** | 🟡 High | No success or failure feedback on submission. Modals call `onSubmit()` then `onClose()` synchronously; Firestore write errors are swallowed with `console.error`. | `CivicReportModal.jsx:191-192`, `LostFoundModal.jsx`, `firebase.js` sync helpers | Make `syncCivicIssue`/`syncLostFoundItem` return status; show success toast + an error toast with retry |
| **G-03** | 🟡 High | Offline writes are fire-and-forget. If a write fails while offline it is only logged; there is no retry queue, so data can silently diverge from Firestore. | `src/services/firebase.js` (`syncCivicIssue`, `syncLostFoundItem`) | Add an outbox/retry queue flushed on reconnect, and an "unsynced changes" indicator |
| **G-04** | 🔴 Blocker | Zero automated tests, no test runner. All of planning.md §3 is unaddressed. | No `*.test.*`/`*.spec.*`, no vitest/jest config, no `test` script in `package.json` | Add Vitest; unit-test `matchingEngine`, `spamDetector`, `isInsideCampus`, storage purge; smoke-test empty-start |
| **G-05** | 🟡 Medium | No `.env.example`; required variables are only implied by README prose. | No `.env*` files in repo | Add `.env.example` documenting `VITE_FIREBASE_*`, `EDGE_STORE_ACCESS_KEY`, `EDGE_STORE_SECRET_KEY`, `PORT` |
| **G-06** | 🟡 Medium | No Firestore security rules checked in. All writes are client-side, so the DB is only as safe as the console settings. | No `*.rules` file anywhere in repo | Commit `firestore.rules` (owner-only writes for reports, staff-only for status/moderation) and document deployment |
| **G-07** | 🟢 Low | Moderation/review policy and privacy/data-retention notes are not written down. | `planning.md` §4 items 2-3 | Add a short `docs/` policy section (who reviews reports, retention of photos/locations, deletion-on-request) |
| **G-08** | 🟢 Low | Deleted-item history lives only in memory — the admin trash empties on reload. | `App.jsx:44` (`useState([])`, never persisted) | Persist trash to Firestore or versioned localStorage |
| **G-09** | 🟢 Low | Large JS bundles: main chunk 1,038 kB (~201 kB gzip), Firebase 534 kB, Leaflet 297 kB. Vite warns about chunk size. | `npm run build` output | Lazy-load `AdminPortal`, Leaflet map and Firebase; split vendor chunks |
| **G-10** | 🟢 Low | Doc drift: README describes the duplicate threshold as `<40m` while the engine default is 35 m (the call site passes 40). | `matchingEngine.js:26-28` vs `README.md` | Align the default and the docs |
| **G-11** | 🟡 Medium | `npm audit` reports 24 advisories (17 moderate, 5 high, 1 critical). The critical/high entries are `next@16.3.2` → `sharp@0.35.3`, pulled in **transitively by `@edgestore/react@0.2.2`** — neither package is imported or shipped in this app's client bundle. Remaining ones sit in the server/ toolchain path (`qs` via `express`, `cookie`, `esbuild` via `vite`, `brace-expansion`, `fast-uri`). | `npm audit`, `npm ls next sharp qs esbuild` | Run `npm audit fix`, then confirm EdgeStore still works; consider pinning/overriding `next`/`sharp` out of the tree if unused |

---

## 4. Verification log

| Date | Check | Result |
| :--- | :--- | :--- |
| 2026-09-30 | `npm ci` | ✅ Clean install from lockfile |
| 2026-09-30 | `npm audit` | ⚠️ 24 advisories (1 low, 17 moderate, 5 high, 1 critical) — see G-11; 19 remain when dev-only packages are excluded |
| 2026-09-30 | `npm run build` | ✅ Passes in 6.11 s; PWA service worker generated (`dist/sw.js`, 20 precache entries) |
| 2026-09-30 | Empty-start promise audit | ✅ `INITIAL_CIVIC_ISSUES`/`INITIAL_LOST_FOUND` are `[]`; storage keys bumped to `_v4` with legacy purge |
| 2026-09-30 | Campus places count | ✅ 50 entries in `bbitPlaces.json` — matches README claim |
| 2026-09-30 | Automated test run | ❌ Not possible — no test suite exists (G-04) |
| 2026-09-30 | Staff access review | 🔴 Portal renders unlocked by default (G-01) |

Not yet exercised in this environment: live Firebase reads/writes, EdgeStore uploads, Google sign-in popup, Vercel deploy, and real-device PWA install — all require credentials or a deployment target.

---

## 5. Next up (prioritised)

1. 🔴 **Lock down the staff portal** — remove the `useState(true)` default, delete hardcoded passcodes, gate on a Firebase Auth role/claim (G-01).
2. 🔴 **Introduce Vitest** and cover the pure logic modules first: `matchingEngine`, `spamDetector`, campus bounds, storage purge (G-04).
3. 🟡 **Submission feedback** — success/failure toasts and a retry path on write errors (G-02).
4. 🟡 **Offline outbox** with reconnect flush so no report is silently lost (G-03).
5. 🟡 **`.env.example` + `firestore.rules`** committed and referenced from the README (G-05, G-06).
6. 🟢 Persist admin trash, split heavy bundles, fix the 35 m/40 m doc drift (G-08, G-09, G-10).
7. 🟡 Clear the dependency advisories with `npm audit fix` and re-verify the EdgeStore route (G-11).

---

## 6. Session log

| Date | Summary |
| :--- | :--- |
| 2026-09-30 | Created this tracker. Audited the codebase against `planning.md`; verified the production build; opened 10 tracked gaps. No application code changed. |
| _2026-08 (prior session)_ | PR #1 merged: empty-start storage (`_v4` keys + legacy purge), Firestore realtime sync with offline cache, staff operations portal, spam heuristics, smart matching, PWA setup, Express + Vercel serving. |

---

### How to keep this file useful

- Update **Last updated**, the status board and the verification log whenever behaviour changes.
- Gaps get an ID, a severity and a **next action** — close them by moving the row out of §3 and recording the evidence in §4.
- Add one row per work session to §6; keep it to what changed and what was verified.
