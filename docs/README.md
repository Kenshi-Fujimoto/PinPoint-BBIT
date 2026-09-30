# 📚 PinPoint BBIT — Documentation Index

Everything about PinPoint lives in this folder. Start here, then jump to the document you need.

| Document | Audience | What it covers |
| :--- | :--- | :--- |
| [`planning.md`](planning.md) | Project team, faculty | Project plan & solution design — the problem, users, scope (in/out), feature requirements with priorities and honest status, Firestore data model, architecture diagram, tech decisions and why, delivery phases, risk register, measurable release gates, roadmap |
| [`deployment.md`](deployment.md) | Anyone deploying | Deployment guide — prerequisites, Firebase + EdgeStore setup, the full environment-variable table, four hosting options (local, Express, Vercel, Docker + Nginx), 13-step post-deploy verification, production-readiness checklist with starter Firestore rules, updates/rollback, troubleshooting, command reference |
| [`defense-qa.md`](defense-qa.md) | Presenters, viva panel | Defense Q&A handbook — 30-second pitch, one-line answers, numbers cheat sheet, algorithm deep-dives (duplicate detection, match scoring, spam detection), security & privacy answers, 5-minute demo script, hard questions, last-five-minutes cheat sheet |
| [`_qa.md`](_qa.md) | Everyone | Plain-language testing & quality report — what the app does, how it was tested, what is verified, and what is honestly not finished |
| [`_qa-checklist.md`](_qa-checklist.md) | QA / team | Detailed step-by-step manual test checklist — 11 sections covering smoke tests, every functional flow, non-functional checks, compatibility, known issues, test data, bug template and release sign-off |
| [`progress.md`](progress.md) | Everyone | Honest progress report — what works right now, what is not finished, how the work was checked, and what happens next |

---

## Suggested reading order

1. **New to the project?** → [`planning.md`](planning.md), then [`progress.md`](progress.md)
2. **Running or hosting it?** → [`deployment.md`](deployment.md), then [`_qa-checklist.md`](_qa-checklist.md) §4 smoke tests
3. **Presenting or defending it?** → [`defense-qa.md`](defense-qa.md), then [`_qa.md`](_qa.md)
4. **Reviewing quality?** → [`_qa.md`](_qa.md), then [`_qa-checklist.md`](_qa-checklist.md)

---

## Known release blockers

Both are documented in the planning risk register and the deployment readiness checklist:

| # | Blocker | Documented in |
| :--- | :--- | :--- |
| 1 | Staff portal uses a placeholder passcode — needs real Firebase Auth with a staff role claim | [planning §11](planning.md) · [deployment §9](deployment.md) · [progress §4](progress.md) |
| 2 | Firestore security rules not yet deployed | [deployment §9](deployment.md) · [progress §4](progress.md) |

Nothing fake or sample is ever shown in the app — that promise is enforced by an automated test (`src/appIntegrity.test.js`), not by convention.
