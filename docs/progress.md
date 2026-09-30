# 📍 PinPoint — Progress Report

**A campus app for Budge Budge Institute of Technology**

> 📖 How we checked all of this: see the plain-language **[Testing & Quality Report](docs/_qa.md)** (and the detailed team checklist next to it).

| | |
| :--- | :--- |
| **Last updated** | 30 September 2026 |
| **Overall status** | 🟡 **Works well as a demo. Not yet ready for real use** — the staff login still needs to be properly secured. |

**How to read the status:** ✅ Done · 🟡 Almost there · ⬜ Not started

---

## 1. What PinPoint does

Students use one app to solve two everyday campus problems:

- **Report a campus problem** — a pothole, a broken light, a blocked drain. They add a photo and drop a pin on the campus map.
- **Report a lost or found item** — a water bottle, an ID card, a phone.
- **Avoid double reports** — if something similar was already reported nearby, the app says so and suggests supporting the existing report instead.
- **Track what happens next** — staff move a problem through four clear stages: *Reported → Acknowledged → In Progress → Resolved*. Students can watch that progress. Lost items end at *Reunited 🎉*.

---

## 2. Progress at a glance

This table follows the plan we set out in our project plan.

| What we planned | Status | In simple words |
| :--- | :--- | :--- |
| App starts empty, with no fake reports | ✅ | Done — every report you see was posted by a real user |
| Report a problem with a photo and location | ✅ | Done |
| Post lost and found items | ✅ | Done |
| Suggest lost-and-found matches | ✅ | Done — shows a confidence percentage |
| Warn about nearby duplicate reports | ✅ | Done — warns if a similar report is within about 40 metres |
| Let staff update a problem's progress | ✅ | Done — students see the updates |
| Works on both phone and computer | ✅ | Done |
| Clear message when a report is saved or fails | 🟡 | Partly — the window closes but doesn't yet confirm it saved |
| Works when the internet is weak | 🟡 | Partly — the app still opens, but a report made offline may not reach the server |
| Secure sign-in and staff access | ⬜ | **Not done — this is our main blocker** |
| Test everything before release | ⬜ | Not done — we have no automated tests yet |
| Setup instructions for other people | 🟡 | Partly written |
| Protect user data and photos | ⬜ | Not done — database access rules not written yet |

---

## 3. What is working right now

- **The full journey works.** A student can open the app, report a problem with a photo and pin location, and see it appear instantly on the map and in the list.
- **The map is real.** 50 named places on the BBIT campus, with satellite imagery and clustering when many reports sit close together.
- **Reports start empty.** We deliberately removed all sample data so nothing fake ever appears — this was one of our firm promises.
- **Duplicate warning works.** Trying to report a second pothole in the same spot brings up a warning suggesting the existing report instead, while still letting the student submit their own if they want.
- **The staff portal works.** Staff can review all reports, filter and search them, mark progress, and remove fake or scam posts. It includes a list of posts that look suspicious.
- **The app builds and runs cleanly.** We build the app and run it successfully with no errors.
- **It behaves like a real phone app.** It can be installed on a phone with its own icon, and it keeps working from saved data when offline.

---

## 4. What is not finished yet

**1. The staff area is not properly protected. 🔴**
This is our most important gap. The staff page currently uses a simple placeholder passcode (and even opens unlocked), instead of checking whether the person is really a staff member. Anyone who finds the page could edit or delete reports. This must be fixed before real students use the app.

**2. Our automated tests only cover the core logic. 🟡**
We have added a unit-test suite (`npm test`, 64 tests) covering the smart matching, duplicate detection, spam detection, campus geofence, and the curated places data — plus a guard that fails the build if anyone ever wires sample data into the app. What we still lack are tests for the screens themselves: filling in forms, sign-in, and the staff portal still have to be checked by hand.

**3. Saving a report is silent. 🟡**
When a student submits a report, the window simply closes. It should clearly say "Report saved". If saving fails, it currently only logs the error quietly instead of telling the student.

**4. Reports made offline may be lost. 🟡**
The app opens and shows old data without internet, but a report created offline is not guaranteed to be sent later. We need a proper retry system.

**5. Setup instructions are incomplete. 🟡**
A new person trying to run the project would not find a full list of the settings and access keys it needs.

**6. Data protection rules are not written. ⬜**
We have not yet written the rules that control who can read or change reports in the database. Photos and locations are personal information, so this matters.

**7. Some libraries need updating. 🟡**
A security check on our supporting libraries reported warnings. The most serious ones are in libraries we don't actually use, but we still need to clean this up.

**8. Small polish items.** The staff recycle bin forgets deleted items after a refresh, and the app takes a moment to load the first time on a slow connection.

---

## 5. How we checked our work

| We checked | Result |
| :--- | :--- |
| Does the app build and run without errors? | ✅ Yes |
| Does the app start with no sample or fake reports? | ✅ Yes — verified in the code |
| Are all 50 campus places on the map? | ✅ Yes — counted and confirmed |
| Do the report, lost-and-found and staff features exist and connect? | ✅ Yes — confirmed by reading through each screen |
| Can the app be installed on a phone? | ✅ Yes — phone app files generated successfully |
| Do we have automated tests? | 🟡 Yes for the core logic — 64 unit tests via `npm test`. None yet for the UI flows |
| Is there a live test with real Google sign-in and photo uploads? | ⬜ Not yet — this needs real accounts and cannot be tested in our setup |

---

## 6. What we will do next

1. 🔴 **Protect the staff area** with a real login and a proper staff role, and remove the placeholder passcode.
2. 🔴 **Add automated tests** so we can prove a change hasn't broken anything.
3. 🟡 **Confirm every save** — tell students clearly when a report is saved or when it fails.
4. 🟡 **Make offline reports reliable** so nothing is silently lost.
5. 🟡 **Finish the setup guide and write the data protection rules.**
6. 🟡 **Update the outdated libraries.**
7. 🟢 **Polish** the recycle bin and speed up the first load.

---

## 7. Try it yourself

1. Open the app — it starts completely empty, with no fake reports.
2. Tap **Report an Issue**, add a photo and pin a location on the campus map.
3. Submit it and watch it appear instantly on the map and in the list.
4. Try reporting something in the same spot again to see the duplicate warning.
5. Open the **Facility Staff Portal** to see how staff review and update reports.

> **Please note:** the staff portal is currently open by design, so you can explore it freely. Securing it is the very first item on our list above.

---

## The honest one-line summary

**PinPoint is a working, feature-complete campus app — the reporting, mapping, matching and staff tools all function. What stands between this and real student use is the staff login, a test suite, and clear feedback when reports are saved.**
