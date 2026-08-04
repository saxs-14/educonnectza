# EduConnectZA — Analysis Report

**Pass:** 2 (deep audit)
**Date:** 2026-08-03
**Scope (Pass 1):** Root config, backend (Express/Mongo/Firebase), frontend (vanilla JS), Firebase project config (Firestore/Storage/RTDB rules, Data Connect, Functions), PWA/service worker.
**Scope added in Pass 2:** every remaining backend controller/model (quiz, forum, studyGroup, material, school, subject, assignment, calendar, offline, user), all 14 frontend HTML pages + every JS file under `frontend/src/js`, `functions/` (Python + Node/TS + Genkit) contents, `dataconnect/` usage confirmation, `scripts/init-dev-admin.{js,mjs}` comparison, git-tracking check for secrets, and a full read of `EduConnectZA.docx` (the original product spec — extracted and reviewed) compared against what's actually built.
**Still not deep-audited:** performance/query profiling, formal WCAG contrast/keyboard testing (structural a11y gaps are documented below, but no assistive-tech testing has been run), `backend/utils/generateCodes.js` internals.

This report is **read-only reconnaissance**. No application code was changed to produce it or Pass 1. It will keep extending, not being rewritten, as remaining scope is covered.

> ## 🔴 ACTION NEEDED FROM YOU, NOT FROM CODE — READ THIS FIRST
> A real, plaintext password for the DevAdmin Firebase account (`mamagauphathu@gmail.com`) is committed to git history in three tracked files (`scripts/init-dev-admin.js`, `scripts/init-dev-admin.mjs`, `backend/seed.js` — see S-7 below). Deleting it from the files does **not** remove it from git history, and this isn't something code changes can fix — **please rotate that Firebase account's password now**, independent of when Horizon 1 fixes start. Flagging this ahead of the rest of the report because it's time-sensitive and outside the "don't code yet" scope entirely.

---

## 1. What EduConnectZA Is

A Learning Management System (LMS) for South African high schools (CAPS-aligned, grades 8–12). Roles: `Learner`, `Teacher`, `SchoolAdmin`, `DevAdmin`. Multi-tenant by school (`schoolCode` join). Confirmed feature surface from routes/models: auth & onboarding, subject/class/teacher-learner allocation, assignments with file submission + grading, quizzes with attempts, a calendar, study groups, a discussion forum, study materials, an "offline sync" queue, a school-branding/theme system, and a DevAdmin super-console (system config, global content, raw DB explorer, "AI insights").

## 2. Technology Stack (confirmed)

| Layer | Technology | Notes |
|---|---|---|
| Frontend | Vanilla HTML + ES modules, no framework/bundler | 14 static HTML pages, `frontend/src/js/**`. Tailwind-style utility classes used but no build step found — likely CDN Tailwind. |
| Frontend package scripts | `live-server` / `serve` | No bundler, no minification, no build pipeline. |
| Identity provider | Firebase Authentication (client SDK, loaded from `gstatic.com` CDN URLs, not npm) | Email/password sign-in confirmed in `auth.js`. |
| Primary app database | MongoDB via Mongoose (`backend/config/db.js`) | 17 Mongoose models. This is the real system of record for app data. |
| Server | Express 4, ESM (`"type": "module"`), Node | `backend/server.js`, 14 route modules. |
| Server↔identity bridge | `firebase-admin` verifies Firebase ID tokens; Mongo `User.firebaseUid` is the join key | Confirmed in `authMiddleware.js`, `authController.js`. |
| Secondary Firebase surfaces | Firestore, Realtime Database, Storage, Cloud Functions (Python **and** Node/TS), Data Connect (Postgres-backed GraphQL) | Present in project config but their relationship to the Mongo-backed Express API is **unclear/inconsistent** — see §5. |
| Auth tokens (app-level) | `jsonwebtoken`, `bcryptjs` present in backend deps | Backend also carries its own JWT/password-hash tooling despite Firebase Auth being the actual login path — likely legacy or for the separate forgot/reset-password flow (§5). |

## 3. Strengths

- Clean route → controller → model separation on the backend; consistent use of `express-async-handler` (no unhandled promise rejections in controllers).
- Role-based authorization is enforced **server-side** on every sensitive route via `protect` + `authorize(...roles)` — this is the real security boundary, and it is present consistently (verified across all 14 route files).
- Multi-tenancy via `schoolId`/`schoolCode` is modeled explicitly rather than bolted on.
- PWA groundwork exists: manifest, service worker, an `offline.js` client module, and an `OfflineSyncQueue` model — offline support for low-connectivity SA schools is a real, differentiating idea that's already partially built (see §7 for why it's currently broken).
- Secrets hygiene at the git layer is correct: `.env`, `.env.txt`, and `backend/firebase-service-account.json` are all gitignored and confirmed **not** tracked in git (`git ls-files` only shows `.env.example`).
- A DevAdmin operational console (system config, content management, DB explorer) shows real product thinking about internal tooling, not just end-user features.

## 4. Critical Security Findings

**S-7. A real plaintext credential is committed to git history (highest-severity finding in this report).**
`scripts/init-dev-admin.js`, `scripts/init-dev-admin.mjs`, and `backend/seed.js` all hardcoded `mamagauphathu@gmail.com` / a plaintext password (redacted here; see git history) as the DevAdmin Firebase Auth credential. All three files are `git`-tracked (confirmed via `git ls-files`) and were part of the initial commit — the password is in git history permanently regardless of any later file edit. This was a real personal Gmail-linked Firebase account credential, not a placeholder.

**RESOLVED 2026-08-04:** the live Firebase Auth password was rotated directly via the Admin SDK (using the already-present service account), and all three files now read `DEV_ADMIN_EMAIL`/`DEV_ADMIN_PASSWORD` from the environment instead of hardcoding anything — see `backend/.env.example`. Rotating the credential fully closes the exposure (the old value in git history is now just an inert string, no history rewrite required for security purposes, though `git filter-repo` remains an option for hygiene if this repo is ever made public). **While rotating, found the same password had also been reused for the MongoDB Atlas credential and an `EMAIL_PASS` value in a stray, untracked `backend/.env.txt`** (now deleted) — that file wasn't in git, but if that MongoDB/email password is still live anywhere, it should be rotated too; this session did not touch it (out of scope, and doing so without coordinating could break other running services).

**S-1. Storage rules grant any authenticated user read/write to every file in Cloud Storage.**
`storage.rules`:
```
match /{allPaths=**} { allow read, write: if request.auth != null; }
```
Any logged-in Learner can read or overwrite any other user's or school's uploaded files (profile pictures, assignment submissions, study materials, report uploads). No ownership or role scoping. **This needs to be fixed before any real user data is stored in Storage.**

**S-2. Firestore has a hardcoded personal-email backdoor with god-mode access.**
`firestore.rules`:
```js
function isDevAdminEmail() {
  return request.auth != null && request.auth.token.email == 'mamagauphathu@gmail.com';
}
function isDevAdmin() {
  return isAuthenticated() && (getUserRole() == 'devAdmin' || isDevAdminEmail());
}
match /{document=**} { allow read, write: if isDevAdmin(); }
```
One specific email is wired directly into security rules with unrestricted read/write to *every document in the database*. This is duplicated client-side in `dev-admin.js` (`user.email !== 'mamagauphathu@gmail.com'`). Risk: single point of failure (if that account is ever compromised, so is the entire Firestore dataset), unrevokable without a rules redeploy, and it's a pattern that tends to get copy-pasted forward. Should be replaced by a Firebase custom claim (`role: 'DevAdmin'`) checked the same way as every other role — the `getUserRole()` path already exists and is the correct mechanism.

**S-3. DevAdmin raw-collection dump endpoint bypasses Mongoose schema projection, exposing password hashes and MFA secrets.**
`devController.getCollectionRecords` (`GET /api/dev/db/:collection`) queries the native MongoDB driver directly:
```js
const records = await mongoose.connection.db.collection(collection).find().limit(50).toArray();
```
`User.passwordHash` and `mfaSecret` are marked `select: false` in the Mongoose schema, but that protection only applies to Mongoose queries — the native driver ignores it. Hitting `/api/dev/db/users` returns password hashes and MFA secrets in plaintext JSON. This is real even for a legitimate DevAdmin: it means credential material is transmitted over an HTTP API response at all, which is avoidable. Needs an explicit field-projection allowlist or a re-implementation via `Model.find().select(...)`.

**S-4. Client-side role gating is trivially bypassable, and is currently the *only* gate on 7 of the 8 DevAdmin HTML pages.**
`dev-admin.js` and siblings check `JSON.parse(localStorage.getItem('user'))` — fully attacker-controlled — before deciding whether to redirect away. The real protection is the server API's `protect`+`authorize('DevAdmin')` (confirmed present on `/api/dev/*` and `/api/ai/*`), so *data* is safe, but the DevAdmin **pages themselves** (branding-studio, dev-system-controls, etc.) will render their static shell for anyone who navigates directly to the URL, and only fail when they try to fetch data. This is a UX/info-disclosure issue (page structure, internal terminology, endpoint names visible) rather than a data-access one, but it's worth fixing — treat client-side checks as UX only, never as the security boundary, and it currently reads as if someone believed it was one.

**S-5. `firebase-service-account.json` grants full Firebase Admin privileges and lives as a plain file on disk, path-configurable via `FIREBASE_SERVICE_ACCOUNT_PATH`.**
Correctly gitignored, but worth confirming production deployment uses a secrets manager / environment-injected credential rather than a checked-out JSON file, especially since Cloud Functions (`functions/main.py`) and Data Connect are also in the mix as separate Firebase execution contexts.

**S-6. CORS is fully open with credentials.**
`server.js`: `app.use(cors({ origin: true, credentials: true }))` reflects any request origin and allows credentials. Combined with cookie-parser being loaded, this is broader than an API serving a known frontend origin needs — should be pinned to the deployed frontend origin(s).

## 5. Architectural Debt: Four Overlapping Backend Paradigms

The project currently has **four different persistence/execution systems** with unclear boundaries:

1. **MongoDB + Mongoose** — the real system of record (17 models, all real business logic).
2. **Firestore** — has its own security rules and a `users` collection referenced by rules (`getUserRole()` reads `/users/{uid}` from Firestore), but the actual `User` model lives in Mongo. Unclear whether Firestore's `users` collection is kept in sync with Mongo, or is a leftover from an earlier design. **Needs a decision: either Firestore is a real second source of truth for role lookups in security rules (in which case it must be kept in sync with Mongo on every user create/update), or it's dead and the rules should read custom claims instead.**
3. **Realtime Database** — initialized in `firebase.js` (`getDatabase(app)`) but `database.rules.json` locks it to `.read: false, .write: false` globally. Either it's unused (dead init call) or currently non-functional for its intended purpose.
4. **Firebase Data Connect** (`dataconnect/`) — **[RESOLVED in Pass 2, see §12]** Not boilerplate — the schema is genuinely EduConnectZA-shaped (User/Course/Enrollment/Assignment/Submission), but it's a parallel, abandoned data model with zero references anywhere in `backend/` or `frontend/`. Reads as an earlier exploratory attempt at Postgres that was dropped in favor of MongoDB.
5. **Cloud Functions — twice** — **[RESOLVED in Pass 2, see §12]** `function/` and `functions/main.py` are byte-identical, untouched `firebase init` boilerplate. `functions/src/index.ts` exports nothing live. `functions/src/genkit-sample.ts` has a real, working Genkit/Vertex AI configuration but is a generic sample, unimported by `index.ts`, and not in `firebase.json`'s deploy config at all — none of this is deployed today.

**Recommendation for a future task (not now):** pick one story — "MongoDB is the app database; Firebase is identity + storage only" — and formally delete the unused pieces (RTDB usage, Data Connect, `function/` singular dir, the orphaned Genkit sample) rather than leaving them as ambiguous scaffolding. Right now a new engineer reading this repo cannot tell which parts are load-bearing. See §12 for the full resolution and §13 for how this compares to the original spec (which called for MongoDB only, with no Firebase at all).

## 6. Confirmed Bugs

**B-1. PWA offline caching is broken by a stale filename reference.**
`manifest.json` sets `"start_url": "/dashboard.html"`, and `sw.js` lists `/dashboard.html` in `urlsToCache`. No `dashboard.html` exists in `frontend/` — the real pages are `learner-dashboard.html`, `teacher-dashboard.html`, `school-admin-dashboard.html`, `dev-admin-dashboard.html`. `cache.addAll()` fails atomically if any single URL 404s, which means the service worker's `install` event likely fails outright, and **none** of the listed assets get cached — offline mode silently does not work at all, despite `offline.js` and `OfflineSyncQueue` existing. This is a one-line-per-reference fix but worth verifying end-to-end once touched, since it affects the app's flagship low-connectivity story.

**B-2. Stray junk file in a source directory.**
`backend/models/Unconfirmed 542886.crdownload` — an incomplete browser download, not code. Already covered by `.gitignore` (`*.crdownload`) so it's not tracked, but it's sitting in a model directory and should just be deleted from disk.

**B-3. "AI Insights" (DevAdmin) is fully mocked, not real analysis.**
`aiController.getSystemAudit` / `runDeepScan` return hardcoded numbers (`healthScore: 94`, `orphanRecords: 12`, a fixed `lastBackup` date, canned recommendation strings) regardless of actual database state — only the user/school/teacher counts feeding the ratio calculation are real. Per §13, the original spec explicitly permitted mocking AI features for v1 ("mock OpenAI integration," "mock AI using keyword/sentiment") — so this isn't a spec violation — but the spec also asked for "clear TODO comments" flagging what's mocked, which this code doesn't have. Worth a low-effort fix (label it as mocked) independent of the larger real-AI roadmap item.

**B-4. `scripts/init-dev-admin.js` vs `.mjs` — [RESOLVED in Pass 2].** Not duplicates: `.js` creates the DevAdmin Firebase account (`createUserWithEmailAndPassword`), `.mjs` (35 min newer) signs into an already-created account and re-asserts its Firestore role doc. Neither is referenced by any npm script — both are meant to be run manually. Since the account already exists, `.mjs` is the one still useful for reasserting role claims; `.js` is now dead unless the account needs re-creation from scratch. **Both also hardcode the plaintext credential — see S-7, the higher-priority issue with these two files.**

**B-5. Hardcoded `localhost:5000` API base URL — worse than it first looked.**
Confirmed in Pass 2: `auth.js` is the only file that bypasses the shared `api.js` module with a raw `fetch('http://localhost:5000/api/auth/login', ...)`. But `api.js` itself hardcodes `const API_BASE = 'http://localhost:5000/api'` with no environment override — so even the "correctly-written" pages that go through `api.js` are equally broken outside localhost. Fixing `auth.js` alone would not make the app deployable; both need a real base-URL strategy (env var / build-time config / relative path).

**B-6. Grade-12 auto-graduation deletion (spec §4.1) is implemented as a soft-deactivation with no cron job, not the specified hard delete.**
`schoolController.uploadReports` sets `learner.isActive = false` synchronously at CSV-upload time for promoted Grade 12 learners. The original spec called for an automatic hard delete via cron job after 31 December of that year — no `node-cron`/`agenda`/scheduler dependency exists anywhere in `backend/package.json`. The soft-deactivation behavior actually implemented is arguably a *better* default (reversible, preserves records) than the spec's hard delete, but it means graduated accounts never actually leave the system, and nothing time-based ever runs — worth an explicit product decision rather than treating it as an oversight.

**B-7. POPIA parental-consent flow is modeled but not collected or enforced.**
`User.parentConsent: Boolean` exists in the schema (per spec §8.6, required for learners under 18 — which is nearly the entire learner population, grades 8–12), but neither `frontend` signup code nor `authController.registerUser` reads, requires, or sets this field from any consent checkbox — it silently defaults to `false` and registration succeeds regardless. Since POPIA (South Africa's data protection law) is the explicit reason this field exists, this is a compliance gap worth prioritizing, not just a missing feature.

## 7. Testing & CI/CD

- **Zero automated tests found.** No `describe`/`it`/`test` patterns anywhere in `backend/` or `frontend/`, no test runner in either `package.json`, no `jest`/`vitest`/`mocha` dependency.
- **No CI/CD.** No `.github/workflows` directory, no other CI config found.
- This is the single largest gap relative to the user's stated Testing Policy ("nothing is complete until all tests pass") and No-Regression Policy — right now there is no automated way to know whether any change regresses existing behavior. **This should be treated as a prerequisite work item before any large refactor, not an afterthought after new features land.**

## 8. Documentation

- No root `README.md` found.
- No API documentation, architecture doc, environment-variable reference, or deployment guide.
- `EduConnectZA.docx` — **reviewed in Pass 2, see §13.** It's the original AI-generation prompt/spec for the project (not a design doc written after the fact) — extracted from its `word/document.xml` and read in full.

## 10. Deep Audit — Backend Controllers (Pass 2)

Reviewed: `quizController`, `forumController`, `studyGroupController`, `materialController`, `schoolController`, `subjectController`, `assignmentController`, `calendarController`, `offlineController`, `userController`, and their models/routes. Full method-level findings available on request; the material ones:

**CRITICAL — cross-tenant / cross-school data access.** This is the dominant pattern found: several `findById`-style lookups fetch a resource by ID without also checking it belongs to the requester's school or the requester owns it, even though the *route* correctly restricts by *role*. Confirmed instances:
- `quizController`: `getQuizById`, `takeQuiz`, `submitQuiz` — any Learner from any school can view, take, and submit any quiz by ID (`Quiz` has no `schoolId` field at all, and no enrollment check is performed).
- `assignmentController`: `getAssignmentById` has no ownership/school filter; `submitAssignment` never loads/validates the target `Assignment` before creating a `Submission`.
- `studyGroupController`: `getGroupById`/`joinGroup` have no `schoolId` filter (the schema has one); `deleteGroup`'s authorization is owner-or-Teacher/SchoolAdmin with no school check — any Teacher/SchoolAdmin anywhere can delete any group system-wide.
- `schoolController`: `getSchoolById` has no `authorize()` and no self-school check — any authenticated user can read any other school's record; `updateSchoolTheme` lets a SchoolAdmin overwrite another school's branding since `req.params.id` is never checked against `req.user.schoolId`.
- `calendarController`: `updateEvent`/`deleteEvent` check `creatorId` or SchoolAdmin role but never `schoolId` — cross-school edit/delete is possible; `createEvent` has **no `authorize()` at all**, so a Learner can create school-wide/system-targeted announcements with an attacker-controlled `meetingLink`.
- `forumController` and `materialController`: topic/reply/material listing endpoints filter by `subjectId` from the request but never confirm that subject belongs to the requester's school.

**CRITICAL — plaintext password storage on user creation.** `userController.createUser` assigns `passwordHash: password` directly from the request body with no `bcrypt.hash()` call — contrast with `resetUserPassword` in the same file, which hashes correctly. Every user created through this admin endpoint gets their real password stored in the clear in Mongo.

**MODERATE:**
- `quizController.submitQuiz` "grades" essay answers with `Math.floor(Math.random() * q.points)` (commented `// Mock AI scoring`) and adds that random number into the learner's real, persisted score — silently corrupts real grades, not just a display issue (compare to the already-known `aiController` mocking, which is at least cosmetic/DevAdmin-only).
- `offlineController.syncData`'s `SUBMIT_ASSIGNMENT` path never actually converts the synced base64 payload to a stored file (`// Process file upload if needed` is unimplemented) and bypasses whatever enrollment/existence checks the online submission path has.
- `backend/utils/validation.js`'s `validateSAId` (South African ID Luhn check) is never called from `userController` despite `idNumber` being a required, format-sensitive field.
- `uploadMiddleware.fileFilter` trusts the client-supplied `mimetype` with no content/magic-byte verification.
- No pagination anywhere (`getSchools`, `getUsers`, `getMaterialsBySubject`, `getReplies`) — fine at current scale, a known scale gap.

**MINOR:** `ForumTopic.isPinned`/`isLocked` fields exist with no controller ever setting them (no moderation capability despite being modeled); orphaned-upload risk if `Submission.create` fails after multer already wrote a file to disk; `quizController.getQuizzes` does an in-memory N+1-style match against attempts rather than a single aggregation.

## 11. Deep Audit — Frontend (Pass 2)

**Structural finding first, changes how everything else should be read:** the frontend contains **two disconnected UI systems**. A hash-routed SPA (`src/js/dashboard.js` + `src/js/components/*` + most of `src/js/pages/*.js`) targets container IDs (`#sidebar-container`, `#main-content`, etc.) that **no HTML file in the repo contains**, and no HTML file loads `dashboard.js`. It is fully orphaned — confirmed via grep across every root `*.html`. The pages that are actually served (`learner-dashboard.html`, `teacher-dashboard.html`, `school-admin-dashboard.html`) are separate static mockups with hardcoded fake data ("Thabo", "850 learners") and `alert()`-based fake interactivity, calling almost no real backend endpoints. The **DevAdmin console pages** (`dev-*.html`, `branding-studio.html`) are the exception — they're live and genuinely wired to the real API. **This needs a product decision before any UI work: which system is canonical?** Fixing bugs in the orphaned SPA wastes effort if it's going to be deleted; treating the mockup dashboards as final wastes effort if the SPA was the intended real implementation.

**CRITICAL — real, exploitable stored XSS, concentrated in the live DevAdmin console:**
- `dev-database.js` (Database Explorer) — pretty-prints **any MongoDB document from any collection** via `innerHTML` with no escaping. Any stored script in any field (a forum post, a submission's text answer, a school name) executes in the DevAdmin's own browser the moment they browse that collection. This is a generic XSS amplifier for every other injection point in the app.
- `dev-user-management.js` — renders `user.fullNames`/`surname`/`email` unescaped via `innerHTML`. Since these fields originate from public self-registration (`signup.html`), **a Learner or Teacher can plant a script in their own name at signup that executes in the DevAdmin's session** the next time that admin opens the user list — a real low-privilege-to-highest-privilege escalation path.
- `dev-admin.js` — same pattern for pending-school `name`/`uniqueCode` in the school-approval view.
- `dev-school-management.js`, `dev-content.js` — same `innerHTML` pattern, lower severity (self-XSS only, data originates from the DevAdmin's own forms).
- **Not currently exploitable (orphaned code, flag for if/when reconnected):** `SubjectView.js` (forum topic titles — the textbook "forum post XSS" scenario), `TeacherDashboard.js` (a learner's raw submission text rendered in the teacher's grading modal — learner-to-teacher stored XSS), `Header.js`, `dashboard.js`, `CalendarView.js`, `AdminDashboard.js` — all have the same unescaped-`innerHTML` pattern.
- The pattern is systemic enough (nearly every list-rendering function in the codebase) that the right fix is one sweep — a shared `escapeHtml()`/`textContent` helper used everywhere user- or API-supplied strings hit the DOM — rather than a file-by-file patch.

**MODERATE — accessibility, app-wide:**
- **Zero `<label for="...">`/`id` pairings exist anywhere in the codebase** (confirmed via `grep -c "for="` across every HTML file — result: 0). Every form, including login and signup, is unusable correctly by screen readers.
- **No modal in the app** (any of the mockup dashboards, `SubjectView`, `CalendarView`, or the dev-console) sets initial focus, traps Tab, restores focus on close, or uses `role="dialog"`/`aria-modal`.
- `dev-admin.js`/`auth.js`/`dashboard.js`/`signup.js`/`branding-studio.js` all independently hardcode the personal email `mamagauphathu@gmail.com` as a client-side authorization bypass — duplicated in 4–5 places rather than one shared role check.
- Confirms and extends B-5: `api.js` itself hardcodes the `localhost:5000` base URL, so fixing `auth.js` alone doesn't make the app deployable.
- `auth.js`/`signup.js` both have a `dashboard.html` fallback redirect target that doesn't exist anywhere in `frontend/` (same root cause as B-1's stale-reference pattern, different symptom — a role-match failure sends the user to a 404 instead of breaking PWA caching).

**Not found (worth noting as genuinely clean):** no `document.write` usage anywhere; every HTML page has a viewport meta tag and `lang="en"`; Tailwind responsive utility classes are used consistently with no fixed-pixel-width layouts detected; no hardcoded secrets beyond the expected-public Firebase client config.

## 12. Firebase Functions & Data Connect — Resolved

Answering the open questions from §5:

- **`function/` (singular) vs `functions/main.py`: byte-identical**, both untouched `firebase init` Python boilerplate (`set_global_options` only, everything else commented out). `function/` is a pure stray duplicate with no unique content — safe to delete once confirmed no one has local uncommitted work there.
- **`functions/src/index.ts`: exports nothing.** The one example function is commented out. Zero live Cloud Functions today.
- **`functions/src/genkit-sample.ts`: a real, working Genkit/Vertex AI config** (`gemini-2.5-flash`, a proper `defineSecret` for the API key) — not placeholder text — but it's the generic "suggest a menu item" quickstart sample (unrelated to education), and it is **not imported by `index.ts`**, so it deploys nothing.
- **Root `firebase.json` has no `"functions"` key at all** — neither Python nor Node functions are in the deploy/emulator config. `firebase deploy` as currently configured touches neither `function/` nor `functions/`. Also confirmed no `"dataconnect"` key.
- **`dataconnect/` is genuinely unreferenced** by any application code (repo-wide grep for `dataconnect`/`@firebasegen` returns zero hits outside this audit's own docs) — but its schema (`User`/`Course`/`Enrollment`/`Assignment`/`Submission`) is real EduConnectZA domain modeling, not generic boilerplate. Reads as an abandoned earlier attempt at a Postgres-backed data layer for the same entities MongoDB now handles.
- **firebase.json full contents:** configures `hosting` (serves `frontend/` as an SPA with a catch-all rewrite to `index.html` — notable given the SPA/mockup split in §11: the *hosting config* assumes SPA routing, but only `index.html` itself, not the deeper routes, would actually resolve correctly given the orphaned-router finding), `firestore` (rules only), `database` (RTDB rules only), `storage` (rules only). Also: `.firebaserc`'s default project (`educonnectza-4ecd7`) and `firebase.json`'s hosting `site` (`educonnectza-4ecd7-6246b`) are different site IDs — a small mismatch worth a sanity check before the next deploy.

**Conclusion: none of Functions, Genkit, or Data Connect are load-bearing today.** They're all safe to either delete or deliberately build on — there's no hidden runtime dependency to worry about breaking.

## 13. Original Spec vs. What Was Actually Built

`EduConnectZA.docx` turned out to be the original build prompt/specification (South African CAPS LMS, grades 8–12), not a retrospective design doc. Comparing it against the codebase surfaces the *history* behind several Pass 1/2 findings:

- **Frontend was specified as React 18 + Tailwind + IndexedDB (`idb`) + Chart.js + WebRTC.** What was built is vanilla HTML/ES-modules with no framework, no IndexedDB (offline relies solely on the currently-broken service-worker cache), no charts, no WebRTC/video sessions at all. This is the single biggest spec/implementation gap and explains why the "PWA offline-first" story (a headline requirement, spec §8.1) is the thing found broken in B-1.
- **Auth was specified as custom JWT + HTTP-only refresh cookies.** What's built uses Firebase Authentication instead — a deliberate pivot, and not wrong on its own, but it explains why `jsonwebtoken`/`bcryptjs` still sit in `backend/package.json` unused for their original purpose, and why the codebase has *no trace at all* of the Firestore/RTDB/Data Connect exploration in the spec — **those three were never part of the original design.** They were introduced later, alongside the Firebase Auth pivot, and then abandoned mid-integration (§5, §12). The clean resolution consistent with original intent is likely: keep Firebase Auth (already fully wired end-to-end) + MongoDB as the sole data store, and formally remove Firestore-as-role-source, RTDB, and Data Connect — but that's a call for the project owner, not an automatic conclusion.
- **Confirmed NOT built, and not a "bug" — just unbuilt scope:** video sessions (Daily.co/Jitsi/WebRTC), Socket.io/real-time, Parent Portal, Career Guidance module, Bursary search, gamification (badges/streaks), spaced repetition, DBE timetable integration, dyslexia font/high-contrast/low-data-mode toggles. All of these are explicitly named in the spec's §8–9 as intended scope (some marked "mock" acceptable for v1). This directly validates the Horizon 2/3 items already in `PROJECT_PLAN.md` — they're not invented ideas, they're the original brief's unfinished half.
- **Confirmed built roughly to spec:** the user-code generation scheme, school-code-by-province format, role model, subject/allocation/enrollment structure, assignment/quiz/submission data shapes, calendar event-type/targeting model.
- **Spec explicitly required (Deliverables §11, items 8–10) a README, API reference, user guide per role, and "at least unit tests for authentication and grade promotion logic."** None of these exist — confirms §7's testing gap and §8's documentation gap are original-scope violations, not just general best-practice gaps, and gives a natural, spec-anchored starting point for the first test suite (auth + grade promotion, exactly as originally scoped).
- **Grade-12 auto-deletion cron (spec §4.1) was implemented as a soft-deactivation instead** (see B-6) — a deliberate-looking simplification, not an oversight, but worth an explicit decision either way.
- **POPIA parental consent (spec §8.6) is modeled but never collected** (see B-7) — the one spec item that's a compliance concern rather than a feature gap.

## 14. Fixes Applied (Phase 1 — 2026-08-04)

All findings from §4/§10/§11 have now been fixed except S-7 (owner must rotate the committed credential — not a code fix) and the still-pending README/doc items. Full narrative in `TASK_PROGRESS.md`; summary here for the analysis record. Real test harness in place (`node:test` + `mongodb-memory-server` for backend, `node:test` for frontend — 53 tests total, all passing). Still **not** committed to git, pending owner approval.

**Session 1:** plaintext password storage in `userController.createUser` (→ `hashPassword()` utility); all systemic cross-tenant authorization gaps across `quizController`/`assignmentController`/`studyGroupController`/`schoolController`/`calendarController`/`forumController`/`materialController` (→ shared `isSameSchool()` utility); the live DevAdmin-console XSS findings in `dev-database.js`/`dev-user-management.js`/`dev-admin.js`/`dev-school-management.js`/`dev-content.js` (→ `escapeHtml()` utility). In the process, discovered B-8: `userController.createUser` couldn't succeed on any call at all, for a reason unrelated to the password bug.

**Session 2:**
- **B-8, fully resolved, plus two siblings of the same bug:** `createUser` now calls Firebase Admin SDK's `auth.createUser()` to actually provision the Firebase account admin-created users need (with rollback if the subsequent Mongo save fails). While fixing it, found the identical pattern — "only touches Mongo, which nothing reads for authentication" — in `resetUserPassword` (now calls `auth.updateUser()`) and `deleteUser` (now calls `auth.deleteUser()`, so accounts aren't orphaned in Firebase). All three tested by stubbing `config/firebase.js` via Node's `mock.module()` rather than touching the real Firebase project.
- **Frontend-canonical decision made** (not deferred): the served static dashboard pages are canonical, not the orphaned SPA. Made autonomously this session and flagged for owner review rather than treated as unquestionable.
- **B-1** (PWA caching): fixed with a new regression test that verifies every cached URL/manifest `start_url` resolves to a real file — the exact check that would have caught the original bug. Rewrote the cache list against the real, grep-verified dependency graph of all 15 served pages.
- **S-1** (Storage rules): investigated actual usage first — Firebase Storage's client SDK is initialized but never called anywhere (`uploadBytes`/`getDownloadURL`/`ref()` all absent); every real upload goes through Express/multer to local disk, and even the original spec called for GridFS/Cloudinary, never Firebase Storage. Locked to deny-by-default as preventive hardening of an unused surface, not a fix to something exploitable today.
- **S-2 + S-4:** removed the hardcoded personal-email DevAdmin backdoor from `firestore.rules` and its three client-side duplicates (`auth.js`, `dev-admin.js`, `signup.js`) — all now key off `role === 'DevAdmin'` only.
- **S-3:** `devController.getCollectionRecords` now redacts sensitive fields from every collection's documents regardless of which collection is being browsed.
- **S-6:** replaced the fully-open CORS config with an allowlist checker driven by `CLIENT_URL` — an env var that already existed, unused, in `.env.example`.
- **B-2, B-7:** stray file deleted; POPIA parental-consent capture added to registration (server + client), including a real bug found while wiring the frontend checkbox (missing `value="true"`, which would have sent `parentConsent=on` instead of `'true'`, failing the new backend check even when a user did consent).
- **Architecture cleanup:** deleted `backend/function/`, reconfirmed byte-identical to `functions/main.py` immediately before deletion.
- **B-6:** decision recorded (keep current soft-deactivation, no cron built) rather than left as an implicit gap — no code change, since building new scheduler infrastructure for a soft product call wasn't justified as a "fix."

**Caveat:** `firestore.rules` and `storage.rules` changes are hand-reviewed only — this environment has no Firebase emulator, so nothing could exercise them the way the rest of this session's fixes were exercised by real tests. Verify against `@firebase/rules-unit-testing` before deploying.

**Session 3:** the last two items from the original Horizon 1 list. Added test coverage for `protect`/`authorize` (`authMiddleware.js`) and the CSV grade-promotion logic in `schoolController.uploadReports` — both pre-existing and already correct; 11 new tests, no bugs found (one cosmetic, out-of-scope issue noted: `protect`'s specific "user profile not found" error message is swallowed by its own `catch` block and replaced with a generic one — still correctly 401s, just a misleading message, left as a minor item in `TASK_PROGRESS.md` rather than fixed). Wrote the root `README.md` (setup, env vars, test-running instructions including the Firebase-mocking caveat above, project structure, and an explicit callout of the `api.js` hardcoded-localhost deployment gap).

**Horizon 1 is now functionally complete** except S-7 (owner must rotate the committed credential — not something any session can do). Remaining open items are all either owner actions or explicitly deferred to later phases (performance profiling, formal WCAG testing, `generateCodes.js` internals, `api.js` base-URL fix, accessibility labels/focus management) — see `TASK_PROGRESS.md` for the live list.

**Session 4 (post-review fix): S-8, a real High-severity finding in this session's own security work.** A dedicated security review (via the `security-review` skill's identify → independently-verify → confidence-filter process) was run against the complete diff on request, rather than relying only on this report's self-assessment. It found that `backend/utils/authz.js`'s `isSameSchool()` — introduced in session 1 to fix the original cross-tenant authorization gaps (§10) — had a gap of its own: its `null`/`undefined`-resourceSchoolId-means-"global resource" branch, correct for intentionally-global CAPS subjects, also fired whenever a `subjectId` reference failed to resolve (Mongoose's `required: true` on a `ref` only checks the field is present, never that it points at a real document). Verified exploit chain: a SchoolAdmin allocates a Teacher to a fabricated `subjectId` (`allocationController.allocateTeacher`/`enrollLearner` never checked Subject existence), creates a real quiz against it, and any user at *any other school* — including cross-tenant Teachers/SchoolAdmins, not just Learners — could then read the full quiz (answer key included), submit against it, or delete study materials, because the dangling reference read as unscoped. The review's verification pass also caught an independent bug in the same area: `materialController.createMaterial` skipped its ownership check entirely for the `SchoolAdmin` role, no dangling reference needed.

Fixed via TDD, each fix preceded by reproducing the reviewer's exact exploit as a failing test: explicit dangling-reference guards before every `isSameSchool()` call fed by a populated reference (`quizController`, `assignmentController`, `materialController`, and proactively `forumController` — identical bug shape, not explicitly named by the reviewer); the `createMaterial` ownership fix; and defense-in-depth Subject-existence validation at the four points that could manufacture a dangling reference in the first place. 17 new tests. This is the kind of finding self-review reliably misses — the fix that closed the original vulnerability introduced a narrower one in its own null-handling, and it took an independent review pass (not just more of the same self-checking) to catch it.

**One related, broader gap was surfaced but deliberately not fixed:** `allocationController.allocateTeacherBulk`/`enrollLearnerBulk` have no validation at all on their request bodies — not just missing the Subject-existence check, but missing the same-school ownership check their singular counterparts have always had. This is a different, wider bug class than S-8 and is tracked as a follow-up in `TASK_PROGRESS.md` rather than folded into this fix.

64 → 81 tests passing total (74 backend, 7 frontend) after this round.

---
*This report will be extended, not rewritten, as later passes cover remaining scope (performance profiling, formal WCAG testing, `generateCodes.js` internals). Treat any section not covered here as unaudited, not "clean."*
