# 🎓 PinPoint BBIT — Defense Q&A Handbook

**Everything you may be asked about PinPoint, and how to answer it confidently and honestly**

| | |
| :--- | :--- |
| **Document** | Defense Preparation & Question Bank |
| **Version** | 1.0 |
| **Last updated** | 30 September 2026 |
| **Use it for** | Project viva, review panel, hackathon judging, faculty demo, team onboarding |
| **Companion documents** | [Planning](planning.md) · [Deployment](deployment.md) · [QA report](_qa.md) · [QA checklist](_qa-checklist.md) · [Progress](progress.md) |

> **How to use this handbook**
> §1–§3 give you the pitch and the numbers. §4–§8 are topic-by-topic answers. §9 is the demo script. **§10 contains the hard questions** — rehearse those out loud. §11 is a one-page cheat sheet for the last five minutes before you walk in.
>
> **Golden rule for every answer:** state what works, state the limitation plainly, then state the plan. Panels respect a team that knows its own gaps far more than one that bluffs.

---

## 1. The 30-second pitch (memorise this)

> "PinPoint is a single campus platform for two problems that today live in scattered WhatsApp messages: **civic infrastructure hazards** and **lost-and-found possessions**.
> A student reports a pothole or a broken light in under a minute — photo, category, and a pin on a satellite map of the BBIT campus. What makes it more than a form is what happens next: the app **detects that the same issue was already reported within about 40 metres** and nudges the student to support the existing report instead of filing a duplicate. Lost items get a **multi-factor matching engine** that compares titles, categories, colours, brands, distance and time, and shows a confidence percentage with human-readable reasons.
> On the other side, the facilities team gets a staff portal with a four-stage pipeline — Reported, Acknowledged, In Progress, Resolved — plus an **automated spam and scam detector** that scores every submission before a human ever looks at it.
> It is a React PWA on Firebase with 64 automated tests, and the campus data behind the map is **50 hand-curated BBIT locations**."

---

## 2. The one-line answers (quick recall)

| Question | One-line answer |
| :--- | :--- |
| What is it? | A unified campus app for reporting civic hazards and recovering lost possessions. |
| Why does it exist? | Campus problems and lost items are handled in scattered chats — no shared record, no location precision, no visible progress. |
| What is novel? | The **proximity duplicate detector** and the **explainable lost-and-found match engine** — both are app logic, not just a database form. |
| Who is it for? | BBIT students (reporters), facility staff (resolvers), institute administration (visibility). |
| What is the tech stack? | React 18 + Vite, Tailwind, Leaflet, Firebase Firestore + Auth, EdgeStore storage, Express/Vercel, Vitest. |
| How big is it? | ~9,100 lines of application source, 758 lines of tests, 50 campus places, 2 Firestore collections, 64 automated tests. |
| Does it work? | Yes — full flow from report to resolution, verified by 64 passing unit tests plus a manual checklist of every screen. |
| What is missing? | Real staff authentication, Firestore security rules, a save-confirmation toast, and an offline retry queue. |
| Is it original? | The platform concept is ours and campus-specific; the underlying libraries are open source and credited. |
| Is it ready for students? | Not yet — the staff portal is protected only by a placeholder passcode. That is our number-one blocker and we can state exactly how we will fix it. |

---

## 3. Numbers cheat sheet

Rehearse these — panels love specifics.

| Fact | Value |
| :--- | :--- |
| Automated tests | **64 passing** in ~1 second (`npm test`) |
| Test breakdown | matching engine 25 · spam detector 21 · campus data/geometry 16 · integrity guard 2 |
| Curated BBIT campus places | **50** (15 categories: academic, hostel, mess, library, sports, health, ATM, …) |
| Campus boundary box | lat `22.4570 – 22.4618`, lng `88.1658 – 88.1710` (≈ 755 m diagonal) |
| Map centre / default zoom | `22.4589, 88.1695` at zoom 17 |
| Duplicate detection radius | service default **35 m**; the report form passes **40 m** |
| Duplicate confidence | 95 % same category · 75 % different category |
| Match engine cap | **98 %**; high confidence at ≥ 50 %; minimum suggestion floor 45 % |
| Match score weights | title 45 · category 25 · keywords 25 · location 15 · time 10 |
| Proximity tiers (matching) | ≤ 50 m +15 · ≤ 200 m +10 · ≤ 500 m +5 |
| Time tiers (matching) | ≤ 24 h +10 · ≤ 72 h +5 |
| Spam item weights | title ×1.2 · description ×1.0 · reporter ×0.8 · contact ×1.5 · reward ×1.2 |
| Spam risk levels | ≥ 60 critical · ≥ 35 high · ≥ 20 medium · > 0 low · 0 clean |
| Photo limits | images 10 MB (jpeg/png/webp/gif) · files 20 MB |
| Status pipeline | 4 civic stages + *Reunited* for lost & found |
| Map tiles | Esri World Imagery + Carto label overlay |
| Backend routes | `/api/health`, `/api/edgestore/*`, SPA fallback |

---

## 4. Questions about the problem and the idea

**Q: What exactly is the problem you are solving?**
Five concrete failure modes: (1) no shared record, so the same pothole is reported many times; (2) vague locations — "near the canteen" — that waste maintenance trips; (3) no visible progress, so students stop reporting; (4) found items never get reunited with owners; (5) spam and scam posts with no guard rails. PinPoint answers each one directly: a shared live record, a strict campus geofence, a four-stage pipeline, an explainable match engine, and automated spam scoring.

**Q: Why not just use a WhatsApp group or Google Form?**
Three reasons. A chat has no state — you cannot see whether something was fixed. A form has no location precision and no duplicate awareness. Neither gives staff a triage queue or gives the institute data on resolution times. PinPoint turns a conversation into a system of record.

**Q: What is genuinely novel here?**
Two pieces of domain logic that a plain CRUD app would not have:
1. **Proximity duplicate detection** — Haversine distance against active reports, with a confidence value that depends on category agreement, and a design decision to *warn but not block*.
2. **Explainable lost-and-found matching** — a weighted scoring model that produces not just a percentage but the reasons ("identical title", "matching keywords: blue, milton", "within 32 m").
Neither is a library call; both are implemented and unit-tested in our own code.

**Q: Who benefits and how do you know they want it?**
Students get a one-minute reporting flow and transparency; staff get a prioritised queue with severity upvotes and a moderation tool; the administration gets resolution-time evidence. The design came from walking through the campus workflow — which category a warden actually triages first, and what a student needs to see to believe a report mattered.

**Q: What is deliberately out of scope?**
Native mobile apps, notifications, chat, rewards, multi-campus tenancy, localisation, and ERP integration. We would rather ship two verticals that work than five that half-work. The PWA covers mobile, and the roadmap lists the rest.

---

## 5. Questions about architecture and technology

**Q: Walk me through the architecture.**
A React 18 SPA built with Vite. Four layers:
- **Presentation** — components under `src/components/`, Tailwind styling, Leaflet map.
- **Domain logic** — pure functions in `matchingEngine.js`, `spamDetector.js` and the campus geometry helpers in `types/index.js`. No I/O, which is exactly why they are unit-testable.
- **Data access** — `firebase.js` (Firestore with persistent multi-tab cache + Google Auth), `storage.js` (localStorage mirror), `edgestore.jsx` (signed uploads).
- **Serving** — `server.js` (Express: EdgeStore handler, health endpoint, SPA fallback) for self-hosting, and `api/*` serverless functions with `vercel.json` rewrites for Vercel.

**Q: Why React and Vite?**
React gives component reuse across the two report types — the map picker, uploader and modals are shared. Vite gives near-instant HMR and a tiny config surface. We rejected Next.js because we need a single SPA talking to Firestore directly; server-side rendering adds nothing for an authenticated campus app.

**Q: Why Firebase rather than your own database?**
Firestore's `onSnapshot` gives realtime multi-user updates for free — when one student reports a hazard, everyone else's map updates without polling. It also ships offline persistence and Google sign-in, which removed three pieces of backend work. Our Express layer exists only for EdgeStore uploads and health checks; there is no server-side business logic that could bottleneck.

**Q: Why is your domain logic separated from your components?**
Because untestable logic is unverifiable logic. `calculateDistanceInMeters`, `findNearbyCivicDuplicates`, `calculateLostFoundSimilarity`, `findMatchesForPost` and `evaluateSpamRisk` are pure functions with no Firebase or DOM dependency. That is why 64 tests run in one second in a plain Node environment. If they were buried inside a React component we could only test them by clicking.

**Q: How does the app behave if Firebase is not configured?**
Gracefully. `firebase.js` checks for missing or placeholder credentials and falls back to local-only mode against `localStorage`, logging an informational message instead of crashing. This makes the project reviewable by anyone, anywhere, with no accounts — a deliberate decision for demos and offline review.

**Q: What about the map? Why not Google Maps?**
Esri World Imagery via Leaflet is free at our scale and gives genuinely high-resolution satellite imagery, which matters for pinpointing a pothole. We overlay Carto's label layer so places stay readable. Google Maps would add billing and API-key friction for no accuracy gain at campus scale. We also hand-curated 50 BBIT places instead of relying on generic geocoding, because geocoding's idea of "BBIT" is not precise enough for a geofenced app.

**Q: Why did you curate campus places in a JSON file rather than querying a map service?**
Two reasons: accuracy and cost. Fifty reviewed entries with names, coordinates and category labels give exact results and zero network dependency. It also enforces the design rule that **reference campus data is separate from user-generated reports**.

---

## 6. Deep-dive questions about the algorithms

*These are the questions that distinguish your team. Know the mechanics, not just the names.*

### 6.1 Duplicate detection

**Q: How does the duplicate detection actually work?**
Three steps. First, `calculateDistanceInMeters` computes the Haversine great-circle distance between the new report and every existing report. Second, we filter out resolved issues and anything beyond the threshold — the service default is 35 m and the report form passes 40 m. Third, each remaining candidate is scored for confidence: 95 % when the category matches exactly, 75 % otherwise, and the list is sorted closest-first. The UI then shows a warning.

**Q: Why Haversine and not simple Euclidean distance on lat/lng?**
Because degrees are not a unit of length — longitude shrinks with latitude. Haversine gives true great-circle distance in metres, and the error against a full Vincenty ellipsoid calculation is negligible over tens of metres. It is also cheap enough to run on every pin drag.

**Q: Why 35–40 metres? Thresholds are arbitrary.**
The threshold is a product decision tuned to campus scale, and we made it a parameter (`thresholdMeters`) rather than a magic number — tests exercise both the 35 m default and a custom value. Forty metres is roughly a building-width at BBIT: close enough that two reports are almost certainly the same hazard, loose enough to tolerate GPS drift, which on a phone is typically 5–20 m.

**Q: What if GPS drift makes two different potholes look like duplicates?**
That is precisely why we **warn but do not block**. The duplicate panel surfaces the existing report and offers "upvote this instead", but the student can still submit their own after acknowledging the warning. A false positive costs one dismissed prompt; a false negative means the same pothole is reported five times.

**Q: Why does the confidence drop to 75 % for a different category?**
Because two reports at the same spot are probably still the same physical location problem, but we are less certain they are the same issue — a "broken light" and a "blocked drain" can coexist at the same corner. The lower figure communicates that uncertainty honestly rather than asserting a match.

**Q: Does the duplicate check run on the server too?**
Today it runs client-side over the live Firestore snapshot, which is fast and gives instant feedback as the pin moves. The client filters to non-resolved issues and validates coordinates before comparing, and the spam detector independently re-checks that a location is inside campus bounds. Server-side enforcement is on the roadmap.

### 6.2 Lost-and-found matching engine

**Q: How does the match score work?**
It is a weighted additive model, capped at 98 %:

| Signal | Points |
| :--- | :--- |
| Title identical (normalised) | **45** |
| Title one contains the other | **35** |
| Same category | **25** |
| Keyword/brand/colour overlap — Jaccard similarity × 40, capped | **up to 25** |
| GPS within 50 / 200 / 500 m | **15 / 10 / 5** |
| Location *name* overlap when GPS is absent | **12** |
| Reported within 24 h / 72 h | **10 / 5** |

Anything ≥ 50 % is flagged high confidence; `findMatchesForPost` only surfaces suggestions at ≥ 45 % and sorts them best-first.

**Q: Why those specific weights?**
The weights encode what actually identifies a possession. A title is the strongest evidence — "Blue Milton bottle" versus "Milton bottle blue" is almost certainly the same object, so title dominates at 45. Category (25) is a strong prior but weak evidence on its own: half the campus owns a bottle. Descriptive keywords — colour, brand, model — are what distinguish two bottles, so they contribute up to 25. Location and time are corroborating signals, not identifiers, so they are capped at 15 and 10. The ordering reflects confidence, not convenience.

**Q: How do you compare text? Why not use fuzzy string matching or an LLM?**
We normalise text — lowercase, strip punctuation, expand "&" to "and" — then tokenise with a stop-word list (`the`, `lost`, `found`, `please`, `near`, …) and compute **Jaccard similarity**: the size of the intersection over the union of token sets. It is deterministic, explainable, free, and runs instantly offline. `"iphone 15"` vs `"iphone 15 pro"` correctly scores as a partial match through the containment branch. An embedding model or LLM would be more flexible, but it introduces network latency, cost, non-determinism, and — most importantly — it cannot tell a student *why* two items matched. Explainability is a feature here, not a nice-to-have. Levenshtein was considered and rejected as too brittle on word reordering; Jaccard over token sets handles reordering naturally.

**Q: What stops stop-words from inflating a match?**
That is a tested behaviour (`MAT-07` in the suite): two posts that share only stop-words score zero. Tokenisation filters the stop-word list and single characters before any similarity is computed.

**Q: Why is the score capped at 98 % instead of 100 %?**
Because a heuristic can never be certain. Two identical descriptions can describe two identical-looking water bottles — 100 % would overclaim. The cap leaves room for the secret-question step, which is the actual human verification, and it keeps the interface honest: this is a suggestion to check, not a verdict.

**Q: Can two lost items match each other?**
No — the engine returns zero immediately if both posts share a type. Matching is only meaningful across lost and found, and `findMatchesForPost` filters to opposite types and excludes anything already reunited.

**Q: How does the secret question fit in?**
Matching suggests candidates; the secret question verifies them. The found item carries a question only the true owner can answer, and the claim flow asks for it before contact details are revealed. The algorithm narrows the field; a human fact closes it. That is a deliberate two-layer design.

**Q: Did you test the algorithm, or just eyeball it?**
Twenty-five tests cover it: the 98 % cap on identical items, the partial-title case ("iPhone 15" vs "iPhone 15 Pro"), zero for unrelated items, each distance tier (≤ 50/200/500 m), the location-name fallback when GPS is missing, each time tier (24 h / 72 h / older), the stop-word guard, cross-type filtering, reunite exclusion, custom confidence floors, and robustness against missing posts or non-array input.

### 6.3 Spam and scam detection

**Q: How does the spam detector work?**
It is a weighted heuristic, not a black box. It runs 25 regex families across five fields — title, description, reporter name, contact details and any reward text — with the highest weight on contact information (×1.5) and the lowest on the reporter name (×0.8). Scam patterns (Telegram/WhatsApp handles, crypto terms, "free money", advance-fee phrasing, shorteners like `bit.ly`, lottery/casino, phishing keywords) add **35** each; junk/troll patterns ("lorem ipsum", "asdfghjk", test posts, "ha ha ha") add **30** each. It then adds structural signals: outside-campus coordinates **+25**, a suspicious contact channel in a lost-and-found post **+40**, more than 70 % uppercase in text over 20 letters **+15**, character repetition like `aaaaaaa` **+15**, and text under five characters **+10**.

**Q: So how do you decide what is spam?**
The total maps to a risk level: ≥ 60 critical, ≥ 35 high, ≥ 20 medium, anything above zero low, and zero clean. Everything at medium or above is flagged for **human review** in the staff portal — the detector never auto-deletes. False positives on a campus app would silence a legitimate report, which is a worse failure than a spam post surviving to moderation.

**Q: Why heuristics and keyword rules instead of machine learning?**
Three reasons. First, training data — we have none, and we will not fabricate a dataset for a demo. Second, explainability — when we flag a post we can tell the moderator exactly which keyword and field triggered it, which a classifier would not. Third, cost and latency — this runs instantly on every submission with zero infrastructure. A learned model is the right upgrade once we have real moderated data; the heuristic architecture gives us the labelled feedback loop to build it on.

**Q: Can a spammer evade it?**
Yes, and we say so. Character substitution, another language, or an innocuous-looking message with the scam in an image will slip past a regex. That is why the design is defence-in-depth: automated scoring *plus* staff moderation with bulk deletion and five recorded reasons, *plus* campus-bound coordinate checks. We claim reduced moderator load, not immunity.

**Q: How do you know the detector does not flag real posts?**
The suite contains deliberately *honest* posts as counter-checks — ordinary items with normal descriptions — and asserts they stay below the suspicion threshold. Twenty-one tests cover both directions.

### 6.4 Geofencing and campus data

**Q: How strict is the campus boundary?**
Every report must fall inside lat `22.4570–22.4618`, lng `88.1658–88.1710`. `isInsideCampus` validates and `clampToCampus` snaps an out-of-range pin back to the nearest valid edge — so a student standing just outside the gate can still file against the boundary rather than getting a dead end. The spam detector independently penalises any stored coordinate outside those bounds by 25 points, so an off-campus post also raises a moderation flag.

**Q: What if the campus boundary changes?**
The bounds are exported constants in `src/types/index.js`, used by the validator, the clamping helper, the map, and the detector — one edit changes behaviour everywhere, and 16 tests in `index.test.js` assert that all 50 curated places fall inside the box.

**Q: What are the 50 places and how were they verified?**
Reviews of the BBIT campus covering academic blocks, the library, hostels, mess and canteen, sports and gym, health centre, ATM and landmark areas — 15 categories in total. Each is validated by test for a name, a numeric coordinate pair inside the campus bounds, and a category label, so a bad edit breaks the build rather than silently misplacing a pin.

### 6.5 Status pipeline and staff workflow

**Q: Describe the workflow.**
Four civic stages — Reported → Acknowledged → In Progress → Resolved — and lost & found ends at **Reunited**. The status drives the badge colour and dot colour consistently across the student views and the staff portal, because both read from the same `CIVIC_STATUSES` definition.

**Q: What can staff do in the portal?**
Filter and search both collections, update status, view spam risk with its reasons, delete with a recorded reason (five categories: spam/ads, fake/hoax, scam, duplicate/junk, inappropriate) and optional notes, and perform bulk deletions on a multi-selection. Every report also carries community severity upvotes from 1 to 5 so staff can prioritise by actual student impact.

**Q: Do students see status changes without refreshing?**
Yes — the Firestore `onSnapshot` subscription pushes updates to every connected client, so a status change appears live.

---

## 7. Security, privacy and ethics questions

**Q: How is the staff portal protected?**
**Honestly: not well enough yet.** It currently uses a client-side placeholder passcode — and it accepts blank input — which means anyone who reaches the route can read, edit or delete reports. This is our number-one release blocker and we are not hiding it. The fix is Firebase Auth with a staff role claim: the user signs in with Google, the server and the client check `request.auth.token.staff`, the placeholder passcode is removed entirely, and Firestore rules enforce the same check server-side. The reasoning is in our risk register (planning §11, R1) and it sits at the top of our roadmap.

**Q: A client-side passcode is not security at all. Why did you ship it?**
Because the portal needed to be reviewable before we had a staff account model, and the alternative — waiting — would have blocked all portal work. It was never intended as protection, and we wrote it down as a blocker rather than pretending it was done. What matters is that the *authorisation decision* is not baked into component internals: replacing the passcode gate with an auth claim is a contained change.

**Q: What about Firestore security rules?**
Not yet deployed — that is blocker number two. Photos and location data are personal, so this is a genuine gap. Our deployment guide includes starter rules that allow public read on both collections, restrict creates to the submitting user, and restrict updates and deletes to the item owner or a user with the staff claim. Until those are live, we tell people the app is for demo use.

**Q: How do you protect user information?**
Several layers already exist: sign-in is delegated to Google, so **we never see or store passwords**; the EdgeStore access and secret keys are server-side only and never prefixed with `VITE_`, so they never enter the browser bundle; after deletion-sensitive flows the UI records a reason rather than silently removing data; and campus data is deliberately separated from user-generated content. What is missing is enforcement at the database layer, which is the rules work above.

**Q: Where is user data stored and who can see it?**
Reports live in the `civic_issues` and `lost_found_items` collections in Firebase Firestore and photos in EdgeStore buckets. Because both issues and lost items are inherently community-visible, the board is readable — but that makes the authorisation rules for *writing* the critical control, which is exactly why the rules gap is a blocker and not a nice-to-have.

**Q: Is there anything unethical about the matching engine?**
It is designed to *suggest*, not to *decide*. The score is capped below certainty, it always shows the reasons, and the secret question — not the algorithm — is what releases an item. We also deliberately avoided using contact details as a matching signal, since that would create a privacy leak: the engine compares object descriptions, never phone numbers or handles.

**Q: What about location privacy for the person reporting?**
Reports carry the hazard location, not the reporter's live position — the student places the pin on the object. Reports carry a display name from Google sign-in, and moderation actions are logged with reasons rather than performed silently.

---

## 8. Testing, deployment and operations questions

**Q: What is your testing strategy?**
Three layers. **Automated unit tests** — 64 Vitest cases over the pure domain logic, run in about a second with `npm test`. **Manual functional testing** — a detailed team checklist (`_qa-checklist.md`) walks every screen, covering 12 functional areas from reporting through PWA offline behaviour. **Structural integrity tests** — `appIntegrity.test.js` statically scans every shipped source file and the HTML entry point and fails the suite if anything ever imports the reference `mockData.js`. That last one is unusual and deliberate: our "no fake reports, ever" promise is enforced by the build, not by a promise.

**Q: Why do you have no UI or end-to-end tests?**
Two reasons, both stated openly. First, the highest-risk logic — distances, scoring, spam rules, geofence maths — is pure and was testable immediately; that is where bugs are most expensive. Second, UI testing needs a browser automation stack and a stable seeded backend, and our priority order put the security blockers ahead of it. The manual checklist covers the flows in the meantime, and component tests with React Testing Library are the next testing milestone.

**Q: Prove your tests actually pass.**
`npm test` — 64 passed across four files: 25 matching-engine, 21 spam-detector, 16 campus-geometry and data, 2 integrity. Total runtime under a second. The output is in the QA report, and anyone can reproduce it from a clean clone.

**Q: What is the test for your "no fake data" promise?**
`appIntegrity.test.js` recursively walks `src/` plus `index.html`, and if any non-test file matches an import, dynamic import, require or script tag referencing `mockData`, it fails with the offending file path. Test files are excluded because they are QA tooling, not shipped code.

**Q: How do you deploy?**
Four documented options: local Vite dev, the Express self-host (one process serving `dist/` plus the EdgeStore handler and health endpoint), Vercel — recommended, with `vercel.json` already configuring the API rewrites and the SPA fallback — and Docker behind Nginx for on-premise hosting. The deployment guide includes the full environment-variable table, third-party setup, a 13-step post-deploy verification table, rollback instructions and a troubleshooting matrix.

**Q: How would you know a deployment is healthy?**
`/api/health` returns app status plus whether EdgeStore and Firestore credentials are actually detected — so a missing environment variable is visible from a `curl` rather than discovered by a student whose photo failed to upload. The post-deploy table then walks the real flows: empty start, report, geofence, duplicate warning, upload, match, sign-in, offline, PWA install.

**Q: What happens if Firebase or EdgeStore goes down?**
The app is built to degrade rather than break. Missing Firebase credentials switch it to local-only mode; a missing EdgeStore key returns a `pending_configuration` payload instead of an exception, and uploads fall back gracefully. Firestore's persistent cache keeps the last known reports readable. What we do **not** have yet is a replay queue for reports composed while fully offline — that is a known gap we state openly.

**Q: How does the app update on users' phones?**
`vite-plugin-pwa` is configured with `registerType: 'autoUpdate'` and Workbox caching — five-megabyte cache ceiling, 30-day image cache, 14-day map-tile cache. A new build is picked up on the next reload; occasionally a second refresh is needed.

**Q: What about cost and quota limits?**
Everything sits on free tiers at campus scale: Firestore, EdgeStore (10 MB images, 20 MB files), and free map tiles. The realistic pressure points are tile requests and image storage, which is why we cache tiles for 14 days and enforce upload size limits.

---

## 9. The live demo script (5 minutes)

| # | Step | What to say while it happens |
| :--- | :--- | :--- |
| 1 | Open the app | "Notice it starts **completely empty** — no sample data anywhere. That is enforced by a test, not a promise." |
| 2 | Pan the satellite map | "Fifty hand-curated BBIT locations on high-resolution imagery, with clustering when reports are dense." |
| 3 | **Report an Issue** → category, photo, drop a pin | "Photo, category, pin. Location is clamped to campus — you physically cannot file an off-campus report." |
| 4 | Submit, watch the map | "Live on the map instantly — Firestore pushes it to every connected client, no refresh." |
| 5 | Report the same spot again | "Here is the core idea: it found the existing report in ~40 metres and is suggesting I support it instead. It warns — it never blocks, because GPS drift shouldn't stop a real complaint." |
| 6 | Post a **lost** item, then a **found** match | "Title, category, colour, brand, distance, time — weighted into a confidence score, with the reasons shown. It tells me *why*, not just *how much*." |
| 7 | Open the **Staff Portal** | "Four-stage pipeline: Reported, Acknowledged, In Progress, Resolved. Filters, search, severity upvotes, and every post carries an automated spam risk score with the triggering reasons." |
| 8 | Terminate with `npm test` | "Sixty-four automated tests, one second, all green — including the guard that fails the build if anyone ever wires fake data in." |

**If the internet fails during the demo:** the app still opens from cache and static assets are local. Continue on the map and the lost-and-found flow, and mention — truthfully — that offline-first is a design feature. Avoid live sign-in or photo upload as the demo's critical path.

**If sign-in fails:** say plainly that it needs the deployed domain to be whitelisted in Firebase Auth, then continue — reporting works in local-only mode without sign-in.

---

## 10. The hard questions (rehearse these)

**Q: "This is just a CRUD app with a map."**
The storage layer is CRUD — deliberately, because that part is a solved problem and Firestore gives us realtime and offline for free. The value is in the logic above it: a Haversine proximity engine with category-sensitive confidence to kill duplicate reports, a six-signal explainable matching model, a weighted spam-scoring pipeline, and a strict campus geofence. Those are roughly 600 lines of pure, tested domain logic — the matching engine (223), the spam detector (214) and the campus geometry helpers (151) — and that is the project.

**Q: "What happens if someone reports a fake emergency?"**
Three things. The spam detector scores fabrication patterns, off-campus coordinates and abnormal formatting before a human sees the post. Staff can delete it with a recorded reason, and community members can downweight severity or dispute it. What we do **not** do is auto-delete — a human decides. Deliberate misreporting at scale would need the escalation path in our roadmap.

**Q: "Your spam filter is regex — a first-year could write that."**
Writing the regexes is easy; the calibration is not. The interesting parts are the field weights (contact ×1.5 because that is how scams convert, reporter name ×0.8 because it is the least reliable signal), the combination of textual and structural signals, the four risk tiers with human review, and the counter-tests that prove honest posts stay unflagged. If you are asking whether we should learn these patterns from data, we agree — and the heuristic layer is what generates the labelled data to train it on.

**Q: "Anyone can open your staff page. How is this secure?"**
It is not, and it is our top release blocker. The current passcode is a placeholder, and it is documented as such in the progress report, the QA report and the risk register. The fix is Firebase Auth with a staff role claim and matching Firestore rules, which is contained, scoped work — and it is honest to say so rather than claim a page-gate is security.

**Q: "No security rules? Then my data is exposed."**
Correct for anyone running it in production today. Photos and locations are personal, which is exactly why we list missing Firestore rules as a blocker, ship starter rules in the deployment guide, and tell people the app is currently for demo use. Until those rules exist and the staff auth is real, we do not recommend real student data in this deployment.

**Q: "What if two people claim the same found item?"**
Matching narrows candidates; the secret question decides. Only someone who can answer it gets put in contact with the finder. Scam-pattern scoring also runs on claims, so a claimant who pushes advance payment or an external messaging channel is flagged for staff rather than passed through.

**Q: "How does this scale to 10,000 students?"**
Firestore scales horizontally, and reads are what grow — the app subscribes to two collections. At campus scale that is trivial; the real bottleneck would be rendering hundreds of markers, which is why the map already clusters. Beyond that, the roadmap adds server-side duplicate checking, pagination, and a moderation queue rather than a single snapshot.

**Q: "What happens when the campus boundary or map data is wrong?"**
The bounds and 50 places are exported constants with 16 tests asserting coordinates fall inside the boundary and that names and categories are present. A wrong edit breaks the test suite rather than silently misplacing pins — which is exactly why we keep campus reference data separate from user reports.

**Q: "Is this actually your work, or a template?"**
The platform concept, the duplicate detector, the matching model, the spam-scoring design, the campus dataset, the staff moderation flow and the test suite are ours. The foundations are open-source and credited in the README: React, Vite, Tailwind, Leaflet with Esri imagery and Carto labels, Firebase and EdgeStore. Using well-supported libraries is an engineering decision, not a shortcut — we built the parts that are specific to BBIT and did not rebuild a map renderer.

**Q: "What would you do differently if you started today?"**
Three things. One: build the staff authorisation model with Firebase role claims before writing the portal, so no placeholder passcode ever exists. Two: write Firestore rules alongside the first collection, not after. Three: add the offline outbox and save confirmation in the same sprint as the report form, because user-facing reliability should not be a follow-up. Every one of those is now in our roadmap — we learned the order the hard way.

**Q: "What is the single biggest risk to this project?"**
Adoption, not technology. If students report into it and nothing visibly changes, they go back to WhatsApp. That is why the four-stage pipeline is visible to students, why status changes push live, and why resolved items stay on the record. Defensible security and honest progress tracking are how we earn the second report from the same student.

**Q: "What is not finished?"**
Four known gaps, all in writing: real staff authentication, Firestore security rules, a save-confirmation toast, and a reliable offline retry queue. None of them break the demo; the first two block real use, and both are scheduled first in the roadmap.

---

## 11. Last-five-minutes cheat sheet

**Open with the pitch (§1).** Close with the honest summary below.

> "PinPoint takes two everyday campus problems and gives them a shared, geotagged, realtime record. Reporting a hazard or a lost item takes under a minute; duplicate reports get caught at about 40 metres; lost and found posts get an explainable match score; and staff get a four-stage pipeline with automated spam scoring in front of it. It is a React PWA on Firebase with 64 passing tests and 50 curated BBIT locations. Two things stand between this demo and real student use — real staff authentication and Firestore security rules — and both are documented blockers with a planned fix."

**Three phrases worth having ready**
- *"It warns; it never blocks."* — on duplicate detection
- *"It shows the reasons, not just the percentage."* — on matching
- *"A human always decides."* — on spam moderation

**Three things never to say**
- ✗ "It's completely secure." → ✅ "The mechanism is scoped; the remaining work is documented as a blocker."
- ✗ "It never gets a false positive." → ✅ "Honest posts are covered by counter-tests, and medium risk is reviewed by a human."
- ✗ "Offline works fully." → ✅ "It opens and reads offline; write replay is the next reliability item."

---

*Related documents: [Planning](planning.md) · [Deployment](deployment.md) · [QA report](_qa.md) · [QA checklist](_qa-checklist.md) · [Progress report](progress.md)*
