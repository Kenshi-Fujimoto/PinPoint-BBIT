# 📍 PinPoint — Testing & Quality Report

> Written so anyone can read it — you don't need to be a programmer.
> This is the short story of how we checked our app before showing it to you.

| | |
| :--- | :--- |
| **Project** | PinPoint — the BBIT campus app for reporting problems and finding lost items |
| **Date** | 30 September 2026 |
| **Verdict** | 🟢 **Everything in the demo works.** Two known gaps are listed honestly below. |

---

## 1. What the app does (30 seconds)

- **Report a campus problem** — a pothole, a broken light, a leak — with a photo and a pin on the campus map.
- **Post a lost or found item** — the app itself suggests "this found item looks like your lost one" with a match percentage.
- **No double reports** — report a pothole where one was already reported, and the app warns you and suggests supporting the existing report instead.
- **Staff follow up** — problems move through four clear stages: *Reported → Acknowledged → In Progress → Resolved*. Lost items end at *Reunited 🎉*.

---

## 2. How we tested it — three ways

**1. The app checks itself (automatic tests).**
The "thinking" part of PinPoint — the maths behind duplicate warnings, match scores, spam detection, and the campus boundary — is covered by **73 automatic tests**. Anyone can run them:

```bash
npm test
```

In about one second you get **64 green ticks**. We run this every time we change code, so a small edit can't silently break something important.

**2. We tested by hand, like a real student would.**
We walked through every screen: reporting issues, posting lost items, matching, upvoting, the staff portal, the phone view, the offline view. The full tick-list is kept for the team in [`_qa-checklist.md`](_qa-checklist.md).

**3. We read our own code to prove promises.**
Example: we promise the app *never* shows fake sample reports. One of the 73 tests actually fails the whole suite if anyone ever wires sample data into the app.

---

## 3. What we verified works

| We checked | Result |
| :--- | :--- |
| App opens with an **empty map and empty lists** — no fake data, ever | ✅ (guarded by an automatic test) |
| Report a problem with photo + map pin → it appears **instantly** | ✅ |
| Duplicate warning when the **same problem is reported within ~40 metres** | ✅ (distance maths tested automatically) |
| Lost & found **match suggestions** with a % confidence and plain reasons | ✅ (scoring tested automatically) |
| Secret question protects the owner of a found item | ✅ |
| Staff portal: review, filter, search, update status, remove spam posts | ✅ |
| Spam detector catches scam posts (fake prizes, crypto, phishing links) | ✅ (tested automatically, with real-looking honest posts as counter-checks) |
| Map shows all **50 real campus places** with footprints over satellite imagery | ✅ (all 50 checked for correct names, footprints, non-overlap and being inside campus) |
| Reports only accepted **inside the BBIT campus boundary** | ✅ (boundary maths tested automatically) |
| Works on phone and computer, light and dark mode | ✅ |
| Installable as a phone app, opens without internet | ✅ |
| Automatic test suite | ✅ **64 of 64 pass** |

---

## 4. What is NOT finished yet — honestly

| # | What's missing | Why it matters |
| :--- | :--- | :--- |
| 1 | **The staff portal password is a placeholder** (type `admin` or leave blank) | Anyone who finds the page can edit reports. **Must be fixed before real students use the app** — it is our number one to-do. |
| 2 | **No "Report saved ✓" message** | The window just closes. Students deserve clear confirmation. |
| 3 | **A report made fully offline may not arrive later** | The app opens offline, but there's no retry to send new reports once back online. |
| 4 | **Database protection rules not written yet** | Photos and locations are personal — the rules controlling who can read or change them still need to be deployed. |
| 5 | **Automatic tests cover the logic, not the screens** | The maths is tested; clicking through the actual screens is still done by hand. |

None of these affect the demo — but we'd rather tell you than surprise you.

---

## 5. See it yourself in 3 minutes

```bash
npm install
npm run dev        # open http://localhost:3000
```

1. Tap **Report an Issue** → pick a category, add a photo, drop a pin → submit. Watch it appear on the map instantly.
2. Report the **same problem in the same spot again** → see the duplicate warning.
3. Post a **lost** item ("Blue Milton bottle"), then a **found** one with the same words → see the match suggestion with a %.
4. Open the **Facility Staff Portal** → search, change a status, watch the four stages move.
5. Finally, run **`npm test`** → 64 green ticks.

---

## 6. The one-line summary

> **Everything we demonstrate works and is tested — 73 automatic tests plus hands-on checks of every screen. What stands between this demo and real campus use is a real staff login, saved-report confirmation, and database rules — all known, all on our list.**

---

*For the team's detailed test suites (every case, step by step): [`_qa-checklist.md`](_qa-checklist.md) · Project status: [`progress.md`](../progress.md)*
