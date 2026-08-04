# EduConnectZA — Project Plan (Living Document)

> **Update ritual:** Before every coding session, re-read this file and `TASK_PROGRESS.md`, confirm the current phase is still correct, and adjust priorities if something changed. After every completed task, go update `TASK_PROGRESS.md` (not this file, unless the roadmap itself changed). This file changes when the *plan* changes; `TASK_PROGRESS.md` changes when *work happens*.

**Last updated:** 2026-08-04 · **Current phase:** Phase 1 — Horizon 1 **committed** (`5e6aef6`, branch `new-update`, not yet pushed) except S-7 (owner must rotate a committed credential — not fixable in-session). README written, test coverage extended, and a dedicated security review found and fixed one High-severity authorization bug in this session's own work (81 tests passing total, two review passes). See `TASK_PROGRESS.md` for the live checklist and `ANALYSIS_REPORT.md` §14 for what changed and why. Next: decide on pushing, rotate S-7, then start Horizon 2 (product features).

---

## 1. Mission

EduConnectZA is a CAPS-aligned Learning Management System for South African high schools, serving Learners, Teachers, School Admins, and (internally) platform DevAdmins. The long-term goal stated by the project owner: build this into a **flagship, production-quality portfolio project** that could plausibly compete with modern EdTech products — not a demo, not a hackathon prototype.

## 2. Non-Negotiable Operating Rules

These apply to every future session, regardless of which task is being worked:

1. **Understand before you touch.** No file gets rewritten "from scratch" without first confirming what currently depends on it.
2. **No regressions.** Every existing working feature must keep working. If a change breaks something, fix it before moving on — don't leave two broken things.
3. **Nothing gets deleted unless confirmed dead** (see `ANALYSIS_REPORT.md` §5–6 for current dead-code candidates) **and** replacing it is an architectural improvement, not just tidiness.
4. **Every feature must map to a real educational problem.** No feature gets added because it sounds impressive. See §5 for the filter each roadmap item must pass.
5. **Testing policy:** a task is not "done" until it has test coverage appropriate to what it touches, and existing tests still pass. Given the current baseline is **zero tests** (`ANALYSIS_REPORT.md` §7), the first substantial engineering work should establish the test harness itself, not be blocked waiting for one to appear.
6. **Git policy:** never `git add`/`commit`/`push`/`merge`/`tag`, and never open a PR, without being explicitly asked in that session. When a chunk of work is verified (builds, lints, tests pass, no known regression), the correct closing move is to *ask* the project owner: "Everything has been verified. Would you like me to create the commit?" — never assume yes.
7. **Workflow cycle per task:** Analyze → Plan → Explain → Implement → Test → Verify → Refactor → Test again → Validate → Update `TASK_PROGRESS.md`. Don't skip steps to go faster.

## 3. Current Architecture (summary — full detail in `ANALYSIS_REPORT.md`)

- **Frontend:** vanilla HTML/ES-modules, no framework, no bundler. 14 pages across Learner/Teacher/SchoolAdmin/DevAdmin roles.
- **Identity:** Firebase Authentication (email/password).
- **App database:** MongoDB via Mongoose — the real system of record.
- **API:** Express (ESM), role-gated via `protect`+`authorize`, verified consistently across all routes.
- **Firebase side-surfaces in an unclear state:** Firestore (partially used for security-rule role lookups), Realtime Database (locked/unused), Data Connect (unused scaffold), two Cloud Functions directories (one likely dead). See `ANALYSIS_REPORT.md` §5 — this needs a decision before it needs more code.
- **PWA/offline:** scaffolded (manifest, service worker, sync queue model) but currently non-functional due to a stale filename reference (`ANALYSIS_REPORT.md` B-1).
- **Known critical security gaps to close early:** open Storage rules, a hardcoded-email Firestore backdoor, a DevAdmin endpoint that leaks password hashes, open CORS. Full detail: `ANALYSIS_REPORT.md` §4.

## 4. Product Review — Why This Should Exist

*`EduConnectZA.docx` has now been reviewed (`ANALYSIS_REPORT.md` §13) — it turned out to be the original build spec, not a design doc, which confirms most of the hypotheses below directly rather than just inferring them from the code.*

- **Learners** need a single place to see what's due, revise efficiently, and get help outside classroom hours — especially where private tutoring isn't affordable. The existing quiz/assignment/study-group/forum foundation already points at this; it's currently disconnected pieces rather than a guided experience.
- **Teachers** need less admin overhead: allocation, grading, and content distribution already exist as features — the value-add is making grading and insight-generation actually save time, not just digitize paperwork.
- **Parents** need visibility and trust: right now there is no parent-facing surface at all. Confirmed as explicit original scope (spec §9, "Parent Portal") that was never built — not a hypothesis anymore, a real gap against the project's own brief.
- **School Admins** need oversight without needing to trust a black box — the DevAdmin console shows the right instinct (operational visibility) but currently fakes the "AI insights" it shows (`ANALYSIS_REPORT.md` B-3). Worth noting: the original spec explicitly allowed AI features to be mocked for v1 ("mock OpenAI integration") — so this isn't a broken promise, but it does mean "make AI insights real" is a clearly-scoped upgrade from a documented placeholder, not new invention.
- **Government/university/investor angle:** CAPS alignment, an APS calculator, and real (not mocked) analytics are what turn "a school project" into "a platform with policy and funding relevance" for South Africa specifically. The spec's own §8.4 ("Career Guidance Module," university/TVET requirements, bursary search) already names this angle — it's original intent, not a bolt-on. This is the differentiation angle worth protecting — don't dilute it by chasing generic EdTech features unrelated to the SA curriculum context.
- **Portfolio angle:** the most convincing thing a reviewer can see is not feature count, it's evidence of judgment — a fixed security posture, real tests, a coherent single-database story instead of four half-integrated ones, and one or two genuinely working "smart" features (real AI insight, not a mocked one) rather than ten shallow ones.
- **Compliance angle, newly surfaced in Pass 2:** the spec explicitly required POPIA parental consent for under-18 learners (§8.6) and modeled it (`User.parentConsent`), but no registration flow actually collects it (`ANALYSIS_REPORT.md` B-7). Given the userbase is almost entirely minors, this is a real legal-adjacent gap worth surfacing to any school evaluating the platform, not just a UI nicety.

**Architecture history worth knowing before deciding Horizon 1's database question:** the original spec called for MongoDB + custom JWT auth only — no Firebase anywhere. At some point the project pivoted to Firebase Authentication (fully wired, working end-to-end today) and, alongside that pivot, explored Firestore/Realtime Database/Data Connect for other purposes, then abandoned that exploration mid-integration (`ANALYSIS_REPORT.md` §5, §12). Pass 2 confirmed none of Functions/Genkit/Data Connect are deployed or referenced anywhere today, which makes this a low-risk cleanup decision rather than a live-integration one. The pragmatic default, consistent with what's actually working: **keep Firebase Auth + MongoDB, formally retire the rest** — but this is the project owner's call to confirm, not an automatic conclusion.

## 5. Innovation Roadmap

**Filter for every item below:** *what specific, real problem does this solve, for which role, and is there already partial infrastructure for it in the codebase?* Items with existing partial infrastructure are sequenced earlier — they're cheaper and reduce dead code at the same time.

### Horizon 1 — Fix the foundation (prerequisite to everything else)
*Full itemized checklist with severity now lives in `TASK_PROGRESS.md` (expanded after deep-audit Pass 2) — this table stays at theme level.*

| Item | Real problem it solves | Existing hook |
|---|---|---|
| Close the security gaps (Pass 1 + Pass 2, `ANALYSIS_REPORT.md` §4/§10/§11) — including a committed plaintext credential, plaintext password storage on user creation, systemic cross-tenant data access on ~7 controllers, and live stored-XSS in the DevAdmin console | Can't responsibly hold real student data otherwise; Pass 2 found these are worse and more numerous than Pass 1's initial 6 | N/A — must happen first |
| Establish a test harness + first coverage pass on auth/authorization/grade-promotion | Zero tests today means every future change is a guess; the original spec explicitly named these two areas as the minimum required coverage | N/A |
| Resolve the multi-backend architecture question (Firebase Auth + Mongo vs. the abandoned Firestore/RTDB/Data Connect exploration) | New engineers (and future-you) can't currently tell what's load-bearing — Pass 2 confirmed none of it is actually deployed, so this is now cleanup, not integration risk | §5/§12 of analysis |
| Decide the frontend's canonical UI system (orphaned SPA vs. served static mockups) | Pass 2 found two fully disconnected frontend implementations coexisting — fixing bugs in the wrong one wastes effort | `ANALYSIS_REPORT.md` §11 |
| Fix PWA offline caching (stale filename bug) | Low-connectivity SA schools is the stated differentiator (and explicit spec requirement, §8.1); it's currently silently broken | `sw.js`, `offline.js`, `OfflineSyncQueue` already exist |
| Add a real README + env/setup docs + API reference | Nobody (including future sessions) can onboard to this repo right now; also an explicit spec deliverable that was never produced | N/A |
| Add POPIA parental-consent capture to signup | Modeled but never collected (`ANALYSIS_REPORT.md` B-7) — the userbase is almost entirely minors | `User.parentConsent` field already exists |

### Horizon 2 — Make the existing features actually good
*Parent Dashboard, APS Calculator/Career Guidance, and Bursary Finder below are confirmed original spec scope (`ANALYSIS_REPORT.md` §13, spec §8.4/§9), not invented ideas — they were part of the original brief and never built.*
| Item | Real problem it solves | Existing hook |
|---|---|---|
| Replace mocked "AI Insights" with real analysis (start rule-based on real Mongo aggregates, then LLM-backed for narrative insight) | SchoolAdmin/DevAdmin currently sees fabricated numbers | `aiController.js`, unused `genkit-sample.ts` |
| Parent Dashboard (read-only: attendance-adjacent data, grades, assignments due) | No parent-facing surface exists at all today | `User.role` enum already extensible; School/Learner relationship exists |
| Study Planner + Smart Revision (uses existing Quiz/Assignment/StudyMaterial data to suggest what to review) | Learners have data scattered across quizzes/materials/assignments with nothing tying it together | Quiz, QuizAttempt, StudyMaterial, Assignment models already exist |
| APS Calculator + CAPS-aligned subject guidance | Directly ties to SA university admissions — high real-world utility, low build cost | Subject/grade data model already exists |
| Notification Center (assignment due, quiz graded, forum reply) | Currently no cross-cutting notification surface despite many event sources (forum, grading, calendar) | ForumReply, Submission grading, CalendarEvent already emit relevant events |

### Horizon 3 — Differentiate
*Gamification and Bursary/Scholarship finder below are also confirmed original spec scope (spec §9), not invented ideas.*
| Item | Real problem it solves | Existing hook |
|---|---|---|
| Adaptive quiz difficulty / gap-targeted revision | Generic quizzes don't address individual weak spots | QuizAttempt history exists |
| Gamification (XP, streaks, badges) scoped to actual learning behavior, not vanity metrics | Sustained engagement, especially for self-directed revision | None yet — build deliberately, avoid it becoming decoration |
| Bursary/Scholarship finder tied to grade + subject profile | Real barrier for SA learners; ties naturally to APS calculator once built | Depends on Horizon 2 APS work |
| Teacher analytics: class-level performance trends, at-risk learner flags | Turns raw grading data teachers already enter into decisions they can act on | Submission, QuizAttempt data already captured |

### Explicitly deferred until justified
- Realtime chat/voice AI/speech features — interesting, but no existing infrastructure and no confirmed demand signal yet; revisit after Horizon 2 ships and there's a concrete use case (e.g., accessibility need) rather than "it's a modern EdTech feature."
- Full UI framework migration (React/Vue/etc.) — the current vanilla JS approach works and a rewrite is exactly the kind of "rebuild from scratch" the project brief explicitly rules out. If the UI redesign (§6) reveals the vanilla approach is genuinely blocking, revisit as its own justified decision, not a default.

## 6. UI/UX Direction

Redesign visually without removing functionality: modern, clean, accessible (WCAG), fast, responsive, with proper empty/loading/error/success states, consistent typography and spacing, and dark mode. This starts only after Horizon 1 is done — a visual redesign on top of unresolved security/architecture issues would be wasted effort if underlying data flows change.

## 7. Database Direction

No migration to PostgreSQL is planned by default. MongoDB is already the system of record with 17 working models; a migration is only justified if a specific requirement (e.g., relational integrity needs Data Connect can't get cheaper another way) demands it. If that case emerges, it gets its own Migration Plan / Data Mapping / Rollback Plan / verification scripts before any migration work starts, per the project owner's standing instruction — no migration happens speculatively.

## 8. Docker Direction

Not yet evaluated in depth. Worth revisiting once the 4-database architecture question (Horizon 1) is resolved — containerizing an ambiguous architecture just launders the ambiguity into a Dockerfile. Revisit after Horizon 1.

## 9. Definition of Done (applies to every roadmap item)

- Builds cleanly, lints clean, type-checks clean (where typing applies).
- Has test coverage for the new/changed behavior.
- Existing test suite still passes (once one exists).
- No known regression in previously working features.
- Security-reviewed if it touches auth, data access, or file handling.
- Accessibility-checked if it touches UI.
- Documentation updated (README/API docs/env vars as applicable).
- Reported to the project owner with what changed and why — commit only after explicit approval.

---
*This is a living document. Revise Horizon assignments as real usage/feedback emerges — this roadmap is a starting hypothesis, not a locked contract.*
