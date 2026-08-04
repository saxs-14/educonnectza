# EduConnectZA

A Learning Management System (LMS) for South African high schools (Grades 8–12), built for four roles — Learner, Teacher, SchoolAdmin, and DevAdmin.

> **Project status:** this repo is under active remediation, not a finished product. Before making changes, read `ANALYSIS_REPORT.md` (architecture, security findings, what's real vs. mocked), `PROJECT_PLAN.md` (vision, roadmap, operating rules), and `TASK_PROGRESS.md` (the live task list — check "Next Session Should Start Here" first). Those three files are the source of truth for what's actually done vs. outstanding; this README covers setup and day-to-day commands only.

## Tech Stack

- **Frontend:** vanilla HTML + ES modules (no framework, no bundler) — served as static files.
- **Backend:** Node.js + Express (ESM).
- **Database:** MongoDB via Mongoose — the real system of record for all app data.
- **Identity:** Firebase Authentication (email/password). The backend verifies Firebase ID tokens and links them to a MongoDB user profile via `firebaseUid`.
- **Other Firebase services** (Firestore, Realtime Database, Cloud Functions, Data Connect) exist in the project config but are **not load-bearing** — see `ANALYSIS_REPORT.md` §5/§12 before touching them.

## Prerequisites

- Node.js 20+ (developed against Node 24; the backend test suite uses a Node test-runner flag that needs Node 22.3+).
- A MongoDB instance — local (`mongodb://localhost:27017`) or [Atlas](https://www.mongodb.com/atlas) (`mongodb+srv://...`).
- A Firebase project with **Authentication → Email/Password** enabled.
- A Firebase Admin service account key for that project (Project Settings → Service Accounts → Generate new private key).

## Setup

1. **Clone and install dependencies** (three separate `package.json`s — root, backend, frontend):
   ```bash
   npm install                # root (installs `concurrently`, used by `npm run dev`)
   npm install --prefix backend
   npm install --prefix frontend
   ```

2. **Configure the backend environment.** Copy the example file and fill in real values:
   ```bash
   cp backend/.env.example backend/.env
   ```
   | Variable | Meaning |
   |---|---|
   | `PORT` | Port the Express API listens on. Defaults to `5000`. |
   | `MONGO_URI` | MongoDB connection string (local or Atlas `mongodb+srv://`). |
   | `FIREBASE_SERVICE_ACCOUNT_PATH` | Path to the Firebase Admin service account JSON (see step 3). Defaults to `./firebase-service-account.json` relative to `backend/`. |
   | `CLIENT_URL` | Comma-separated list of origins the API accepts CORS requests from. Defaults to `http://localhost:3000,http://127.0.0.1:3000` if unset — only override this for a non-default frontend URL (e.g. a deployed origin). |

3. **Add the Firebase service account key.** Download it from the Firebase console and save it as `backend/firebase-service-account.json` (or wherever `FIREBASE_SERVICE_ACCOUNT_PATH` points). **Never commit this file** — it's already covered by `.gitignore`. Without it, the backend logs a warning on startup and every Firebase-dependent request (login, registration, admin user management) fails.

4. **Frontend Firebase config** is already committed in `frontend/src/js/firebase.js` — this is expected. Firebase *web* API keys are meant to be public; the project's actual security boundary is the backend's `protect`/`authorize` middleware plus the Firestore/Storage rules files at the repo root, not secrecy of that config object. If you're pointing this repo at your own Firebase project, replace that config block with your project's values.

5. **Seed a DevAdmin account** (one-time, after your Firebase project and `.env` are set up):
   ```bash
   node scripts/init-dev-admin.mjs
   ```
   This assumes the DevAdmin's Firebase Auth account already exists (created via `scripts/init-dev-admin.js` the very first time, or manually in the Firebase console) and just (re-)writes its `role: devAdmin` marker in Firestore.

## Running Locally

From the repo root:
```bash
npm run dev
```
This runs the backend (`node server.js` on `PORT`, default 5000) and frontend (`live-server` on port 3000) concurrently. Or run them separately:
```bash
npm start --prefix backend     # API on http://localhost:5000
npm start --prefix frontend    # static site on http://localhost:3000
```

## Running Tests

Both `backend/` and `frontend/` have their own test suite using Node's built-in test runner (`node:test`) — no separate test framework dependency for the runner itself.

```bash
npm test --prefix backend
npm test --prefix frontend
```

The backend suite uses [`mongodb-memory-server`](https://github.com/typegoose/mongodb-memory-server) to spin up a real, ephemeral MongoDB instance per test file — tests exercise real Mongoose queries, not mocks. Firebase Admin SDK calls (`auth.createUser`, `auth.verifyIdToken`, etc.) are stubbed per-file with Node's built-in module mocking (`node:test`'s `mock.module()`), which is why the backend `test` script includes `--experimental-test-module-mocks` — no test ever creates, reads, or modifies anything in the real Firebase project. The first run downloads a `mongod` binary (cached afterward, so it's a one-time cost, not a per-run one).

`firestore.rules` and `storage.rules` are **not** covered by this suite — testing them requires the Firebase Local Emulator Suite (`firebase emulators:start`) and `@firebase/rules-unit-testing`, neither of which is set up in this repo yet. Review those two files by hand, and verify against the emulator before deploying a change to either.

## Project Structure

```
educonnectza/
├── backend/                 Express API
│   ├── controllers/         Route handlers (business logic)
│   ├── models/               Mongoose schemas
│   ├── routes/                Express routers (auth + role gating via middleware/authMiddleware.js)
│   ├── middleware/           protect/authorize, error handling, file uploads
│   ├── utils/                  Small pure helpers (hashPassword, isSameSchool, corsOrigin, generateCodes...)
│   ├── config/                db.js (Mongo), firebase.js (Firebase Admin SDK)
│   └── test/, testUtils/    node:test suite + shared test helpers
├── frontend/                 Static site (no bundler)
│   ├── *.html                  One HTML file per page/dashboard
│   ├── src/js/                  ES modules: api.js (backend client), firebase.js (client SDK config),
│   │                            auth.js/signup.js/etc. (per-page logic), pages/ (DevAdmin console pages)
│   └── test/                    node:test suite
├── functions/                Firebase Cloud Functions - not currently deployed (no `functions` block in firebase.json)
├── dataconnect/               Firebase Data Connect scaffold - not currently used by the app
├── firestore.rules, storage.rules, database.rules.json, firebase.json
├── ANALYSIS_REPORT.md        Architecture/security/bug audit (living document)
├── PROJECT_PLAN.md            Vision, roadmap, operating rules (living document)
└── TASK_PROGRESS.md           Live task checklist - read this first when resuming work
```

## Deployment

`firebase.json` configures Firebase **Hosting** for `frontend/` (serves it as an SPA with a catch-all rewrite to `index.html`) plus the Firestore/Realtime-Database/Storage rules files. It does **not** configure Cloud Functions or Data Connect — deploying with `firebase deploy` as currently configured only touches hosting + rules.

The **backend** (Express API + MongoDB) is not part of the Firebase deploy config at all — it needs to be hosted separately (a Node host of your choice) with `backend/.env` configured for that environment, and the frontend's API base URL (`frontend/src/js/api.js`, currently hardcoded to `http://localhost:5000/api`) updated to point at it. That hardcoded API base URL is a known gap — see `TASK_PROGRESS.md`.
