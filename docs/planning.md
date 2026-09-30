# 📍 PinPoint BBIT — Project Plan

**A unified community platform for BBIT civic infrastructure hazards & lost-and-found possessions**

| | |
| :--- | :--- |
| **Institution** | Budge Budge Institute of Technology (BBIT), Kolkata |
| **Document** | Project Plan & Solution Design |
| **Version** | 2.0 |
| **Last updated** | 30 September 2026 |
| **Companion documents** | [Testing & QA report](_qa.md) · [QA checklist](_qa-checklist.md) · [Deployment guide](deployment.md) · [Defense Q&A](defense-qa.md) · [Progress report](progress.md) |

**How to read the status marks used in this document:** ✅ Done · 🟡 In progress · ⬜ Not started

---

## 1. Our goal

PinPoint is a simple campus app for BBIT students and staff. Students can report campus problems and post lost or found items. Staff can review reports and update their progress.

The app should always start with empty report lists. Reports appear only when people submit them.

**In one sentence:** *one map, one pipeline — every campus problem and every lost possession in a single place, with the community and the facilities team working from the same live picture.*

---

## 2. The problem we are solving

Today, campus problems at BBIT travel through informal channels — WhatsApp groups, word of mouth, notice boards, and individual complaints. That causes five recurring problems:

| # | Problem today | Consequence |
| :--- | :--- | :--- |
| 1 | **No shared record** of what has been reported | The same pothole is reported five times by five people; nobody knows what is already known |
| 2 | **No location precision** | "The road near the canteen" is ambiguous; maintenance teams waste trips |
| 3 | **No visible progress** | A student reports a broken light and never learns whether anything happened |
| 4 | **Lost items never come home** | Found items sit unclaimed because the owner never sees an announcement that describes them well enough |
| 5 | **Misuse has no guard rails** | Spam, fake reports and "pay me to return your phone" scams erode trust in the channel |

PinPoint is designed directly against these five problems: a shared live record, a strict campus geofence, a four-stage status pipeline, a smart lost-and-found matching engine, and an automated spam/scam detector feeding a staff moderation queue.

---

## 3. Who uses it

| Actor | Needs | How PinPoint serves them |
| :--- | :--- | :--- |
| **Students (primary)** | Report a hazard in under a minute; find a lost item; see whether it was fixed | Google sign-in, photo + map pin report flow, duplicate warning, match suggestions with confidence % |
| **Lost-item owner** | Recover a possession without handing it to the first claimant | Secret-question verification on the found item |
| **Facility staff / wardens** | Triage, dispatch, and close work; remove junk | Staff portal: filters, search, status pipeline, bulk moderation with reasons |
| **Institute administration** | Evidence of issues and response times | Persistent record of every report with timestamps, severity upvotes and resolution state |
| **Developer team (us)** | Ship safely, keep the data honest | Vitest suite, integrity guard against mock data, versioned docs |

---

## 4. Scope

### 4.1 In scope for v1.0

- Two report types: **civic infrastructure hazards** and **lost/found possessions**
- Strict **campus geofencing** for all reports (BBIT boundary box, lat `22.4570–22.4618`, lng `88.1658–88.1710`)
- **Interactive satellite map** with 50 curated BBIT campus places
- **Proximity duplicate detection** for civic reports (~35 m threshold)
- **Multi-factor smart matching** between lost and found posts with a confidence score and plain-language reasons
- **Secret-question claim verification** for found items
- **Community urgency upvotes** (1–5 severity) on civic issues
- **Four-stage status pipeline**: Reported → Acknowledged → In Progress → Resolved (lost items end at *Reunited*)
- **Photo attachments** through EdgeStore cloud buckets
- **Google sign-in** for identity
- **Staff moderation portal** with spam-risk scoring, filters, search and bulk deletion with reasons
- **Installable PWA** with offline-tolerant startup
- **Automated unit-test suite** covering all pure logic

### 4.2 Out of scope for v1.0

- No native iOS/Android app (the PWA covers mobile)
- No push notifications (email/SMS alerting to staff)
- No chat or comment threads between users
- No in-app rewards, points or leaderboards
- No multi-campus / multi-institute tenancy
- No Hindi or Bengali localisation (English only in v1.0)
- No integration with the institute's ERP/maintenance ticketing system

---

## 5. What we plan to do

### 5.1 Keep the app safe and reliable

- Make sure old or sample reports do not reappear when the app starts.
- Make sign-in and staff access secure.
- Clearly tell users when a report was saved—or when something went wrong.
- Check that reports work properly when the internet connection is weak or unavailable.

### 5.2 Make the main features work well

- Help students report a campus problem with its location and a photo.
- Let students post lost and found items and see possible matches.
- Help users find similar nearby reports, while still allowing them to submit a new report when needed.
- Let staff update a problem's progress so students can see what is happening.
- Make the app easy to use on phones and computers.

### 5.3 Test before release

- Test the app with empty report lists and make sure sample reports never appear.
- Test report, lost-and-found, sign-in, and staff update features.
- Check that the app still works after a refresh or a connection problem.
- Fix problems found during testing before deployment.

### 5.4 Prepare for real use

- Provide clear setup instructions for the services the app needs.
- Protect user information, photos, and location details.
- Explain how reports are reviewed and managed.
- Check that the app can be deployed and updated reliably.

---

## 6. Feature requirements at a glance

Priority uses **MoSCoW** (Must / Should / Could / Won't in v1.0).

| ID | Requirement | Priority | Status | Where it lives |
| :--- | :--- | :--- | :--- | :--- |
| F1 | Report a civic hazard with category, description, photo and map pin | Must | ✅ | `CivicReportModal.jsx`, `MapLocationPickerModal.jsx` |
| F2 | Reject / clamp locations outside the BBIT campus bounds | Must | ✅ | `types/index.js` → `isInsideCampus`, `clampToCampus` |
| F3 | Warn when a similar active report exists within ~35 m, but still allow submission | Must | ✅ | `matchingEngine.js` → `findNearbyCivicDuplicates` |
| F4 | Community urgency upvotes (1–5 severity) | Should | ✅ | `CivicDetailModal.jsx`, `AdminPanel.jsx` |
| F5 | Four-stage status pipeline with visible history | Must | ✅ | `types/index.js` → `CIVIC_STATUS_STAGES` |
| F6 | Post lost or found items with category, colour, brand, location, contact | Must | ✅ | `LostFoundModal.jsx` |
| F7 | Suggest matches between lost and found posts with % confidence and reasons | Must | ✅ | `matchingEngine.js` → `calculateLostFoundSimilarity` |
| F8 | Secret-question verification before a claim is revealed | Should | ✅ | `LostFoundDetailModal.jsx` |
| F9 | Photo attachments stored in cloud buckets | Must | ✅ | `src/services/edgestore.jsx`, `api/edgestore/[...edgestore].js` |
| F10 | Staff portal: filter, search, update status, moderate | Must | ✅ | `AdminPortal.jsx`, `AdminPanel.jsx` |
| F11 | Automated spam / scam risk scoring on every submission | Should | ✅ | `spamDetector.js` → `evaluateSpamRisk` |
| F12 | 50 curated campus places on satellite imagery | Should | ✅ | `src/data/bbitPlaces.json` |
| F13 | Installable PWA that opens offline with cached data | Should | ✅ | `vite.config.js` (VitePWA), `storage.js` |
| F14 | Google sign-in for user identity | Must | ✅ | `firebase.js`, `AuthModal.jsx` |
| F15 | Explicit "Report saved ✓" confirmation toast | Should | 🟡 | Not yet — window closes silently |
| F16 | Guaranteed retry queue for reports created offline | Should | 🟡 | Not yet — no outbox/replay |
| F17 | Real staff authentication (role-based, not a shared passcode) | Must | ⬜ | **Main blocker** — placeholder passcode |
| F18 | Firestore security rules | Must | ⬜ | Not yet written |
| F19 | UI / end-to-end component tests | Could | ⬜ | Manual checklist only |

---

## 7. Data model

Two Firestore collections back the app. Local storage mirrors them for offline and unconfigured operation.

### `civic_issues`

| Field | Type | Notes |
| :--- | :--- | :--- |
| `id` | string | Document ID |
| `title`, `description` | string | Free text, scanned by the spam detector |
| `category` | string | e.g. pothole, lighting, drainage, sanitation |
| `location` | `{ lat, lng }` | Clamped to campus bounds before write |
| `locationName` | string | Nearest curated campus place |
| `photoUrl` | string | EdgeStore public URL (optional) |
| `severity` / `upvotes` | number | Community urgency score |
| `status` | enum | `reported` → `acknowledged` → `in_progress` → `resolved` |
| `reporterId`, `reporterName` | string | From Google sign-in |
| `timestamp` | ISO string | Creation time |
| `adminNotes`, `deleteReason` | string | Set by staff during moderation |

### `lost_found_items`

| Field | Type | Notes |
| :--- | :--- | :--- |
| `id` | string | Document ID |
| `type` | `lost` \| `found` | Matching only pairs opposite types |
| `title`, `description` | string | Used for title + keyword similarity |
| `category` | string | One of six item categories |
| `color`, `brand` | string | Strong match signals |
| `location`, `locationName` | same as civic | Where lost or found |
| `photoUrl` | string | EdgeStore public URL (optional) |
| `posterName`, `posterContact` | string | Contact channel — weighted heavily by the spam detector |
| `secretQuestion` | string | Asked of any claimant |
| `status` | enum | `open` → `reunited` (or `removed` by staff) |
| `timestamp` | ISO string | Used for time-proximity scoring |

**Design rule:** campus map data (`bbitPlaces.json`) is *reference data* and is deliberately kept separate from user-generated reports. `mockData.js` exists only as build-time reference material and is never imported by shipped code — enforced by `src/appIntegrity.test.js`.

---

## 8. System architecture

```
                       ┌──────────────────────────────────────────┐
                       │        Browser — React 18 SPA (Vite)     │
                       │  Civic view · Lost & Found view · Map    │
                       │  Staff portal · PWA service worker       │
                       └───────────────┬──────────────────────────┘
                                       │
              ┌────────────────────────┼─────────────────────────┐
              ▼                        ▼                         ▼
   ┌────────────────────┐  ┌───────────────────────┐  ┌────────────────────┐
   │  Firebase Firestore│  │  Express / Vercel API │  │     EdgeStore      │
   │  civic_issues      │  │  /api/health          │  │  publicImages /    │
   │  lost_found_items  │  │  /api/edgestore/*     │  │  file buckets      │
   │  realtime onSnapshot│ │  SPA fallback         │  │  (uploads + CDN)   │
   └────────────────────┘  └───────────────────────┘  └────────────────────┘
              ▲
              │  persistent multi-tab cache
   ┌────────────────────┐
   │  localStorage mirror│  ← offline-first fallback when Firebase is unconfigured
   └────────────────────┘
```

**Layers**

1. **Presentation** — React components under `src/components/`, Tailwind styling, Leaflet map.
2. **Domain logic (pure, tested)** — `matchingEngine.js`, `spamDetector.js`, and the campus geometry helpers in `types/index.js`. No I/O, so these are fast unit-test targets.
3. **Data access** — `firebase.js` (Firestore + Auth + persistence), `storage.js` (localStorage mirror), `edgestore.jsx` (upload hooks).
4. **Backend / serving** — `server.js` (Express: EdgeStore handler, health endpoint, SPA fallback), `api/*` (Vercel serverless equivalents), `vercel.json` rewrites.

**Key runtime behaviour:** if Firebase credentials are absent or malformed, the app does not crash — it logs an informational message and runs in local-only mode so demos and offline use still work.

---

## 9. Technology decisions and why

| Layer | Choice | Why / alternative rejected |
| :--- | :--- | :--- |
| Frontend | React 18 + Vite 5 | Fast HMR, smallest config surface; Next.js rejected as we need a single SPA, not SSR |
| Styling | Tailwind CSS 3 | Utility classes keep dark-mode and mobile variants consistent without a design system build |
| Mapping | Leaflet + react-leaflet, Esri World Imagery tiles + Carto label overlay | Free satellite imagery with a label layer; enables precise campus geotagging |
| Map data | 50 hand-curated BBIT places in JSON | Accurate campus landmarks beat generic geocoding for an institute-specific app |
| Database | Firebase Firestore | Realtime `onSnapshot` gives free live updates; offline persistence built in; no server to run |
| Auth | Firebase Auth with Google provider | Students already have Google accounts; no password storage burden |
| File storage | EdgeStore.dev buckets | Purpose-built signed-upload flow with Express and Vercel adapters |
| Backend | Node + Express (`server.js`) | Serves the built SPA and the EdgeStore handler from one process for self-hosting |
| Hosting | Vercel (`vercel.json`) | Zero-config static + serverless deploy with SPA rewrites |
| Testing | Vitest | Shares the Vite toolchain, boots a plain-node environment in under a second |
| PWA | vite-plugin-pwa / Workbox | Installable on phones and map-tile caching with a few lines of config |

---

## 10. Delivery phases

| Phase | Focus | Key deliverables | Exit criteria |
| :--- | :--- | :--- | :--- |
| **0 — Setup** | Foundations | Vite + React + Tailwind scaffold, routing, theme | App builds and runs locally |
| **1 — Core reporting** | The primary loop | Civic report modal, map picker, geofence, Firestore writes, live map | A student can report and see it appear instantly |
| **2 — Lost & found** | Second vertical | Lost/found posting, match engine, secret question, detail modals | A lost and a found post produce a match % with reasons |
| **3 — Staff tooling** | Operations | Admin portal, status pipeline, filters, bulk moderation, spam scoring | Staff can triage and close a report end-to-end |
| **4 — PWA & polish** | Field readiness | Service worker, offline cache, install banner, 50 campus places, dark mode | Installs on a phone and opens without connectivity |
| **5 — Assurance & release** | Trust | Vitest suite (64 tests), integrity guard, QA checklist, docs, Vercel deploy | 64/64 tests pass and the deployment guide is followed end-to-end on a clean machine |

**Current position:** Phases 0–4 are complete; Phase 5 is complete for logic-level testing and documentation. The remaining release blockers are F15–F18 in §6.

---

## 11. Risks and mitigations

| # | Risk | Impact | Likelihood | Mitigation |
| :--- | :--- | :--- | :--- | :--- |
| R1 | Staff portal protected only by a shared placeholder passcode | High — anyone could edit or delete reports | High (known) | **Release blocker.** Move to Firebase Auth + role/allow-list check, and gate writes with security rules |
| R2 | Firestore security rules not deployed | High — personal data readable/writable | Medium | Write and deploy rules for both collections before real use (see §12) |
| R3 | Reports created offline are not replayed | Medium — silent data loss | Medium | Add an outbox queue with retry-on-reconnect |
| R4 | Free map tile / EdgeStore quotas | Medium — images or map tiles fail | Low | Workbox caching, image size limits (10 MB images, 20 MB files), fallback messaging |
| R5 | Spam detector false positives | Medium — legitimate posts flagged | Medium | Three-tier risk levels, advisory scoring only, human review in the staff portal, honest-post counter-tests in the suite |
| R6 | Location spoofing / off-campus reports | Medium — noise in the dataset | Low | Server-side bounds re-check plus the detector's "outside campus bounds" penalty |
| R7 | Dependence on Google sign-in for identity | Low | Low | Local-only mode still allows reporting in degraded environments |
| R8 | Outdated transitive dependencies flagged by audit | Low–Medium | Known | Track and update in a dedicated maintenance pass (see progress report) |

---

## 12. How we will know it is ready

- New users see an empty app and can submit their own reports.
- Students can create and view campus reports and lost-and-found posts.
- Staff can securely review reports and update their progress.
- Users receive clear feedback when something succeeds or fails.
- The app works on both mobile and desktop and passes its key tests.

**Measurable release gate**

| Gate | Target |
| :--- | :--- |
| Automated unit tests | 64/64 passing (`npm test`) |
| Integrity guard | No shipped file imports mock data |
| Report submission | Valid report visible on the map within 2 s on campus Wi-Fi |
| Duplicate detection | Correct warning for same-category reports ≤ 35 m apart |
| Match engine | ≥ 50 % confidence flagged as high confidence with readable reasons |
| Staff workflow | Status change visible to a signed-in student without refresh |
| Offline | App opens and shows cached reports with the network disabled |
| Release blockers | F17 (staff auth) and F18 (security rules) closed |

---

## 13. Important promises

- No fake or sample reports are added automatically.
- Campus map information is kept separate from reports submitted by users.
- User information is handled carefully.
- Changes are tested before the app is released.

---

## 14. Roadmap beyond v1.0

1. **Secure staff identity** — Firebase Auth + staff role claim, retire the placeholder passcode.
2. **Firestore security rules** — per-collection read/write policy and field-level protection.
3. **Reliable offline submissions** — outbox queue with automatic replay and conflict handling.
4. **Explicit save confirmation** — success and failure toasts on every write.
5. **UI tests** — React Testing Library coverage for the reporting, matching and staff flows.
6. **Notifications** — alert facilities staff when a high-severity hazard is filed.
7. **Analytics dashboard** — average time-to-resolve per category for the institute.
8. **Localisation** — Bengali and Hindi interface options.
9. **Native wrapper** — optional Play Store / App Store packaging using the existing PWA.

---

*Related documents: [QA report](_qa.md) · [QA checklist](_qa-checklist.md) · [Deployment guide](deployment.md) · [Defense Q&A](defense-qa.md) · [Progress report](progress.md)*
