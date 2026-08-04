# Real AI Insights Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the fully-mocked DevAdmin "AI Insights" feature (hardcoded health score, fabricated deep-scan results, a fake success `alert()`) with a rule-based orphaned-reference audit and a health score computed from real database state.

**Architecture:** A new generic orphan-detection module (`backend/utils/orphanCheck.js`) checks 8 configured foreign-key relationships for dangling references using a two-query set-diff (no N+1 populate calls). `aiController.js`'s two existing endpoints (`getSystemAudit`, `runDeepScan`) are rewritten to consume it alongside the already-real user/school counts, with the exact same route paths and response field names as today. The frontend needs one deletion: a hardcoded `alert()` that fires regardless of actual scan results.

**Tech Stack:** Node.js/Express/Mongoose (backend), vanilla JS (frontend), `node:test` + `mongodb-memory-server` (tests, already set up in this project — no new dependencies).

## Global Constraints

- Rule-based only — no LLM, no external API, no new dependency (per the approved spec: `docs/superpowers/specs/2026-08-04-ai-insights-design.md`).
- Same route paths and same top-level response field names as today (`GET /api/ai/audit`, `POST /api/ai/db-check`) — no upstream caller besides `dev-ai-insights.js` needs to change.
- `integrityScore` and `lastBackup` are dropped from `runDeepScan`'s response — both were fake and `lastBackup` isn't computable without MongoDB Atlas API access this project doesn't have.
- TDD throughout: write the failing test, watch it fail for the right reason, write minimal code, watch it pass, commit.
- Backend tests run with `npm test --prefix backend` (already wired to `node --experimental-test-module-mocks --test --test-concurrency=1`); this feature's tests don't touch Firebase, so no `mock.module()` needed here.
- No new frontend test (per spec: frontend test coverage in this project is reserved for pure functions, not DOM-rendering logic).

---

### Task 1: `backend/utils/orphanCheck.js` — dangling-reference detector

**Files:**
- Create: `backend/utils/orphanCheck.js`
- Create: `backend/test/orphanCheck.test.js`

**Interfaces:**
- Produces: `findDanglingRefs({ model, field, refModel }) => Promise<Document[]>` — returns the raw (unpopulated) documents from `model` where `field` is set but doesn't resolve to a real document in `refModel`. A document where `field` is `null`/`undefined` is never included (that's a legitimately-unset optional reference, not dangling).
- Produces: `ORPHAN_CHECKS` — array of `{ model, field, refModel, label }`, one entry per relationship being audited.
- Produces: `runOrphanAudit() => Promise<{ total: number, breakdown: { label: string, count: number }[] }>` — runs `findDanglingRefs` for every entry in `ORPHAN_CHECKS` via `Promise.all`, returns the total dangling-reference count and a breakdown containing only relationships with `count > 0`.

- [ ] **Step 1: Write the failing tests for `findDanglingRefs`**

Create `backend/test/orphanCheck.test.js`:

```js
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { connectTestDb, clearTestDb, disconnectTestDb } from '../testUtils/setupDb.js';
import School from '../models/School.js';
import Subject from '../models/Subject.js';
import User from '../models/User.js';
import Quiz from '../models/Quiz.js';
import Assignment from '../models/Assignment.js';
import StudyGroup from '../models/StudyGroup.js';
import { findDanglingRefs, runOrphanAudit } from '../utils/orphanCheck.js';

before(connectTestDb);
after(disconnectTestDb);
beforeEach(clearTestDb);

async function seedSchoolSubjectTeacher() {
  const school = await School.create({ name: 'Test High', uniqueCode: 'TH100GP', province: 'GP' });
  const subject = await Subject.create({ schoolId: school._id, name: 'Maths', grade: 9 });
  const teacher = await User.create({
    schoolId: school._id, userCode: 'TH100T1GP', firebaseUid: 'TH100T1GP-uid', role: 'Teacher',
    fullNames: 'Teach', surname: 'One', idNumber: '8001015800087', dateOfBirth: '1980-01-01', email: 'teacher@th.com',
  });
  return { school, subject, teacher };
}

test('findDanglingRefs returns docs whose reference field points at a nonexistent document', async () => {
  const { subject, teacher } = await seedSchoolSubjectTeacher();
  await Quiz.create({ teacherId: teacher._id, subjectId: subject._id, title: 'Valid Quiz', questions: [] });
  const danglingSubjectId = new mongoose.Types.ObjectId();
  const danglingQuiz = await Quiz.create({ teacherId: teacher._id, subjectId: danglingSubjectId, title: 'Orphaned Quiz', questions: [] });

  const dangling = await findDanglingRefs({ model: Quiz, field: 'subjectId', refModel: Subject });

  assert.equal(dangling.length, 1);
  assert.equal(dangling[0]._id.toString(), danglingQuiz._id.toString());
});

test('findDanglingRefs returns an empty array when every reference resolves', async () => {
  const { subject, teacher } = await seedSchoolSubjectTeacher();
  await Quiz.create({ teacherId: teacher._id, subjectId: subject._id, title: 'Valid Quiz', questions: [] });

  const dangling = await findDanglingRefs({ model: Quiz, field: 'subjectId', refModel: Subject });

  assert.equal(dangling.length, 0);
});

test('findDanglingRefs never flags a legitimately unset (null) reference field', async () => {
  const { school } = await seedSchoolSubjectTeacher();
  const creator = await User.create({
    schoolId: school._id, userCode: 'TH1001111', firebaseUid: 'TH1001111-uid', role: 'Learner',
    fullNames: 'Learn', surname: 'One', idNumber: '0501015800087', dateOfBirth: '2005-01-01', grade: 9, email: 'learner@th.com',
  });
  await StudyGroup.create({ name: 'No Subject Group', schoolId: school._id, createdBy: creator._id, members: [creator._id] });

  const dangling = await findDanglingRefs({ model: StudyGroup, field: 'subjectId', refModel: Subject });

  assert.equal(dangling.length, 0);
});

test('runOrphanAudit reports a per-relationship breakdown and total across multiple relationships', async () => {
  const { subject, teacher } = await seedSchoolSubjectTeacher();
  const danglingSubjectId = new mongoose.Types.ObjectId();
  await Quiz.create({ teacherId: teacher._id, subjectId: danglingSubjectId, title: 'Orphan Quiz 1', questions: [] });
  await Quiz.create({ teacherId: teacher._id, subjectId: danglingSubjectId, title: 'Orphan Quiz 2', questions: [] });
  await Assignment.create({ teacherId: teacher._id, subjectId: danglingSubjectId, title: 'Orphan Assignment', dueDate: new Date() });
  await Quiz.create({ teacherId: teacher._id, subjectId: subject._id, title: 'Valid Quiz', questions: [] });

  const { total, breakdown } = await runOrphanAudit();

  assert.equal(total, 3);
  const quizEntry = breakdown.find((b) => b.label === 'Quiz → Subject');
  const assignmentEntry = breakdown.find((b) => b.label === 'Assignment → Subject');
  assert.equal(quizEntry.count, 2);
  assert.equal(assignmentEntry.count, 1);
});

test('runOrphanAudit returns a zero total and empty breakdown for a clean database', async () => {
  const { total, breakdown } = await runOrphanAudit();

  assert.equal(total, 0);
  assert.deepEqual(breakdown, []);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test --prefix backend -- test/orphanCheck.test.js` (from repo root) or `cd backend && node --experimental-test-module-mocks --test test/orphanCheck.test.js`
Expected: FAIL with `Cannot find module '../utils/orphanCheck.js'` (or similar module-not-found error) — the file doesn't exist yet.

- [ ] **Step 3: Write the implementation**

Create `backend/utils/orphanCheck.js`:

```js
import Subject from '../models/Subject.js';
import Assignment from '../models/Assignment.js';
import Quiz from '../models/Quiz.js';
import StudyMaterial from '../models/StudyMaterial.js';
import ForumTopic from '../models/ForumTopic.js';
import TeacherAllocation from '../models/TeacherAllocation.js';
import LearnerEnrollment from '../models/LearnerEnrollment.js';
import Submission from '../models/Submission.js';
import QuizAttempt from '../models/QuizAttempt.js';

/**
 * Finds documents in `model` whose `field` is set but doesn't resolve to a
 * real document in `refModel`. A document where `field` is null/undefined is
 * never included - that's a legitimately unset optional reference, not a
 * dangling one. Uses a two-query set-diff instead of populate() per document,
 * so this stays cheap regardless of collection size.
 */
export const findDanglingRefs = async ({ model, field, refModel }) => {
  const docs = await model.find({ [field]: { $ne: null } }).select(field);
  if (docs.length === 0) return [];

  const referencedIds = docs.map((doc) => doc[field]);
  const existingIds = new Set(
    (await refModel.find({ _id: { $in: referencedIds } }).select('_id')).map((doc) => doc._id.toString())
  );

  return docs.filter((doc) => !existingIds.has(doc[field].toString()));
};

export const ORPHAN_CHECKS = [
  { model: Quiz, field: 'subjectId', refModel: Subject, label: 'Quiz → Subject' },
  { model: Assignment, field: 'subjectId', refModel: Subject, label: 'Assignment → Subject' },
  { model: StudyMaterial, field: 'subjectId', refModel: Subject, label: 'StudyMaterial → Subject' },
  { model: ForumTopic, field: 'subjectId', refModel: Subject, label: 'ForumTopic → Subject' },
  { model: TeacherAllocation, field: 'subjectId', refModel: Subject, label: 'TeacherAllocation → Subject' },
  { model: LearnerEnrollment, field: 'subjectId', refModel: Subject, label: 'LearnerEnrollment → Subject' },
  { model: Submission, field: 'assignmentId', refModel: Assignment, label: 'Submission → Assignment' },
  { model: QuizAttempt, field: 'quizId', refModel: Quiz, label: 'QuizAttempt → Quiz' },
];

export const runOrphanAudit = async () => {
  const results = await Promise.all(
    ORPHAN_CHECKS.map(async (check) => {
      const dangling = await findDanglingRefs(check);
      return { label: check.label, count: dangling.length };
    })
  );
  const breakdown = results.filter((r) => r.count > 0);
  const total = breakdown.reduce((sum, r) => sum + r.count, 0);
  return { total, breakdown };
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && node --experimental-test-module-mocks --test test/orphanCheck.test.js`
Expected: PASS, all 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add backend/utils/orphanCheck.js backend/test/orphanCheck.test.js
git commit -m "Add generic orphaned-reference detector for AI Insights"
```

---

### Task 2: `aiController.getSystemAudit` — real health score and insights

**Files:**
- Modify: `backend/controllers/aiController.js` (full file rewrite — imports and `getSystemAudit`; `runDeepScan` stays untouched until Task 3)
- Test: `backend/test/aiController.test.js` (new file — `runDeepScan` tests added in Task 3)

**Interfaces:**
- Consumes: `runOrphanAudit()` from Task 1 (`backend/utils/orphanCheck.js`), returns `{ total, breakdown }`.
- Produces: `getSystemAudit` — an `asyncHandler`-wrapped Express handler, unchanged signature `(req, res)`, unchanged response shape: `{ healthScore: number, lastScan: Date, insights: { type, message, action }[] }`.

Current `backend/controllers/aiController.js` in full (for reference — Task 2 replaces the whole file; Task 3 then only touches `runDeepScan`):

```js
import asyncHandler from 'express-async-handler';
import User from '../models/User.js';
import School from '../models/School.js';
import Subject from '../models/Subject.js';
import Quiz from '../models/Quiz.js';

// @desc    Get AI System Audit
export const getSystemAudit = asyncHandler(async (req, res) => {
  const totalUsers = await User.countDocuments();
  const activeLearners = await User.countDocuments({ role: 'Learner', isActive: true });
  const activeTeachers = await User.countDocuments({ role: 'Teacher', isActive: true });
  const schools = await School.find();
  const totalSchools = schools.length;

  const insights = [];

  if (totalSchools > 0) {
    const inactiveSchools = schools.filter(s => !s.isActive).length;
    if (inactiveSchools > 0) {
      insights.push({ type: 'warning', message: `${inactiveSchools} schools are currently pending approval.`, action: 'Review Schools' });
    }
  }

  const teacherRatio = activeTeachers > 0 ? (activeLearners / activeTeachers).toFixed(1) : 'N/A';
  if (teacherRatio > 40) {
    insights.push({ type: 'critical', message: `Critical teacher-to-learner ratio detected (${teacherRatio}:1). System strain predicted in Western Cape cluster.`, action: 'Scale Resources' });
  } else {
    insights.push({ type: 'info', message: `Healthy teacher-to-learner ratio: ${teacherRatio}:1 across all schools.`, action: 'Monitor' });
  }

  const dbSizeMock = (Math.random() * 50 + 150).toFixed(1);
  insights.push({ type: 'info', message: `Database storage utilization is at ${dbSizeMock}MB. Growth rate stable at 4% MoM.`, action: 'None' });

  res.json({ healthScore: 94, lastScan: new Date(), insights });
});

// @desc    Run Deep AI DB Scan
export const runDeepScan = asyncHandler(async (req, res) => {
  const subjects = await Subject.countDocuments();
  const quizzes = await Quiz.countDocuments();

  const scanResults = {
    status: 'success',
    timestamp: new Date(),
    summary: { integrityScore: 99.8, orphanRecords: 12, lastBackup: '2025-05-14T02:00:00Z' },
    recommendations: [
      "Prune 12 orphan records in 'LearnerEnrollment' collection.",
      "Optimize indexing for 'userCode' field in User collection.",
      "Backup required for 'AcademicContent' before next sync.",
    ],
  };

  res.json(scanResults);
});
```

- [ ] **Step 1: Write the failing tests**

Create `backend/test/aiController.test.js`:

```js
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { connectTestDb, clearTestDb, disconnectTestDb } from '../testUtils/setupDb.js';
import { mockRes, mockNext } from '../testUtils/httpMocks.js';
import School from '../models/School.js';
import User from '../models/User.js';
import Quiz from '../models/Quiz.js';
import { getSystemAudit } from '../controllers/aiController.js';

before(connectTestDb);
after(disconnectTestDb);
beforeEach(clearTestDb);

test('getSystemAudit returns healthScore 100 and a single clean insight when nothing is wrong', async () => {
  const req = {};
  const res = mockRes();
  const next = mockNext();

  await getSystemAudit(req, res, next);

  assert.equal(next.calls.length, 0, `unexpected error: ${next.calls[0]}`);
  assert.equal(res.body.healthScore, 100);
  assert.equal(res.body.insights.length, 1);
  assert.equal(res.body.insights[0].type, 'info');
  assert.equal(res.body.insights[0].message, 'No other issues detected.');
});

test('getSystemAudit deducts 5 points and adds a warning insight per pending school', async () => {
  await School.create({ name: 'Pending School', uniqueCode: 'PS100GP', province: 'GP', isActive: false });
  const req = {};
  const res = mockRes();
  const next = mockNext();

  await getSystemAudit(req, res, next);

  assert.equal(next.calls.length, 0, `unexpected error: ${next.calls[0]}`);
  assert.equal(res.body.healthScore, 95);
  const insight = res.body.insights.find((i) => i.message.includes('pending approval'));
  assert.ok(insight, 'expected a pending-approval insight');
  assert.equal(insight.type, 'warning');
  assert.equal(insight.action, 'Review Schools');
});

test('getSystemAudit caps the pending-school deduction at 20 points', async () => {
  for (let i = 0; i < 10; i++) {
    await School.create({ name: `Pending School ${i}`, uniqueCode: `PS10${i}GP`, province: 'GP', isActive: false });
  }
  const req = {};
  const res = mockRes();
  const next = mockNext();

  await getSystemAudit(req, res, next);

  assert.equal(next.calls.length, 0, `unexpected error: ${next.calls[0]}`);
  assert.equal(res.body.healthScore, 80);
});

test('getSystemAudit flags a critical teacher-to-learner ratio above 40:1 and deducts 15 points', async () => {
  const school = await School.create({ name: 'Test High', uniqueCode: 'TH100GP', province: 'GP' });
  await User.create({
    schoolId: school._id, userCode: 'TH100T1GP', firebaseUid: 'TH100T1GP-uid', role: 'Teacher', isActive: true,
    fullNames: 'Teach', surname: 'One', idNumber: '8001015800087', dateOfBirth: '1980-01-01', email: 'teacher@th.com',
  });
  for (let i = 0; i < 41; i++) {
    await User.create({
      schoolId: school._id, userCode: `TH1001${String(i).padStart(3, '0')}`, firebaseUid: `TH1001${i}-uid`, role: 'Learner', isActive: true,
      fullNames: 'Learn', surname: `L${i}`, idNumber: `050101580${String(i).padStart(3, '0')}`, dateOfBirth: '2005-01-01', grade: 9, email: `learner${i}@th.com`,
    });
  }
  const req = {};
  const res = mockRes();
  const next = mockNext();

  await getSystemAudit(req, res, next);

  assert.equal(next.calls.length, 0, `unexpected error: ${next.calls[0]}`);
  const insight = res.body.insights.find((i) => i.message.includes('teacher-to-learner ratio'));
  assert.ok(insight);
  assert.equal(insight.type, 'critical');
  assert.equal(res.body.healthScore, 85);
});

test('getSystemAudit deducts 2 points per orphaned reference and reports the count', async () => {
  const school = await School.create({ name: 'Test High', uniqueCode: 'TH100GP', province: 'GP' });
  const teacher = await User.create({
    schoolId: school._id, userCode: 'TH100T1GP', firebaseUid: 'TH100T1GP-uid', role: 'Teacher',
    fullNames: 'Teach', surname: 'One', idNumber: '8001015800087', dateOfBirth: '1980-01-01', email: 'teacher@th.com',
  });
  const danglingSubjectId = new mongoose.Types.ObjectId();
  await Quiz.create({ teacherId: teacher._id, subjectId: danglingSubjectId, title: 'Orphan Quiz', questions: [] });

  const req = {};
  const res = mockRes();
  const next = mockNext();

  await getSystemAudit(req, res, next);

  assert.equal(next.calls.length, 0, `unexpected error: ${next.calls[0]}`);
  const insight = res.body.insights.find((i) => i.message.includes('orphaned reference'));
  assert.ok(insight);
  assert.equal(insight.action, 'Run Deep Scan');
  assert.equal(res.body.healthScore, 98);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && node --experimental-test-module-mocks --test test/aiController.test.js`
Expected: FAIL — `healthScore` will be `94` (hardcoded) instead of `100`/`95`/`80`/`85`/`98`, and the pending-school/orphan insights won't exist yet with the right `action`/count wording.

- [ ] **Step 3: Rewrite `getSystemAudit`**

Replace the full contents of `backend/controllers/aiController.js` with:

```js
import asyncHandler from 'express-async-handler';
import User from '../models/User.js';
import School from '../models/School.js';
import Subject from '../models/Subject.js';
import Quiz from '../models/Quiz.js';
import { runOrphanAudit } from '../utils/orphanCheck.js';

const PENDING_SCHOOL_DEDUCTION = 5;
const PENDING_SCHOOL_DEDUCTION_CAP = 20;
const BAD_RATIO_DEDUCTION = 15;
const BAD_RATIO_THRESHOLD = 40;
const ORPHAN_DEDUCTION_PER = 2;
const ORPHAN_DEDUCTION_CAP = 30;

// @desc    Get AI System Audit
// @route   GET /api/ai/audit
export const getSystemAudit = asyncHandler(async (req, res) => {
  const activeLearners = await User.countDocuments({ role: 'Learner', isActive: true });
  const activeTeachers = await User.countDocuments({ role: 'Teacher', isActive: true });
  const schools = await School.find();
  const pendingSchools = schools.filter((s) => !s.isActive).length;
  const teacherRatio = activeTeachers > 0 ? activeLearners / activeTeachers : 0;
  const { total: orphanTotal } = await runOrphanAudit();

  const insights = [];
  let healthScore = 100;

  if (pendingSchools > 0) {
    insights.push({
      type: 'warning',
      message: `${pendingSchools} school${pendingSchools === 1 ? '' : 's'} ${pendingSchools === 1 ? 'is' : 'are'} currently pending approval.`,
      action: 'Review Schools',
    });
    healthScore -= Math.min(pendingSchools * PENDING_SCHOOL_DEDUCTION, PENDING_SCHOOL_DEDUCTION_CAP);
  }

  if (teacherRatio > BAD_RATIO_THRESHOLD) {
    insights.push({
      type: 'critical',
      message: `Critical teacher-to-learner ratio detected (${teacherRatio.toFixed(1)}:1).`,
      action: 'Scale Resources',
    });
    healthScore -= BAD_RATIO_DEDUCTION;
  }

  if (orphanTotal > 0) {
    insights.push({
      type: 'warning',
      message: `${orphanTotal} orphaned reference${orphanTotal === 1 ? '' : 's'} found across the database.`,
      action: 'Run Deep Scan',
    });
    healthScore -= Math.min(orphanTotal * ORPHAN_DEDUCTION_PER, ORPHAN_DEDUCTION_CAP);
  }

  if (insights.length === 0) {
    insights.push({ type: 'info', message: 'No other issues detected.', action: 'None' });
  }

  res.json({
    healthScore: Math.max(healthScore, 0),
    lastScan: new Date(),
    insights,
  });
});

// @desc    Run Deep AI DB Scan
// @route   POST /api/ai/db-check
export const runDeepScan = asyncHandler(async (req, res) => {
  const subjects = await Subject.countDocuments();
  const quizzes = await Quiz.countDocuments();

  const scanResults = {
    status: 'success',
    timestamp: new Date(),
    summary: { integrityScore: 99.8, orphanRecords: 12, lastBackup: '2025-05-14T02:00:00Z' },
    recommendations: [
      "Prune 12 orphan records in 'LearnerEnrollment' collection.",
      "Optimize indexing for 'userCode' field in User collection.",
      "Backup required for 'AcademicContent' before next sync.",
    ],
  };

  res.json(scanResults);
});
```

Note: `runDeepScan` is left as the *original* mocked code here on purpose, with its `Subject`/`Quiz` imports kept alongside the new `Subject`/`Quiz`/`runOrphanAudit` imports above — it still works exactly as before, just not yet improved. Task 3 replaces it (and removes the now-unused `Subject`/`Quiz` imports) immediately next. This keeps the file in a fully working state after this task's commit, even though `runDeepScan` isn't upgraded until Task 3.

- [ ] **Step 4: Run tests to verify `getSystemAudit` now passes, and nothing else broke**

Run: `cd backend && node --experimental-test-module-mocks --test test/aiController.test.js`
Expected: PASS, all 5 `getSystemAudit` tests green (no `runDeepScan` tests exist yet — they're added in Task 3).

- [ ] **Step 5: Commit**

```bash
git add backend/controllers/aiController.js backend/test/aiController.test.js
git commit -m "Compute a real health score and insights in getSystemAudit"
```

---

### Task 3: `aiController.runDeepScan` — real orphan breakdown and recommendations

**Files:**
- Modify: `backend/controllers/aiController.js` (only `runDeepScan` and its imports)
- Modify: `backend/test/aiController.test.js` (add `runDeepScan` tests)

**Interfaces:**
- Consumes: `runOrphanAudit()` from Task 1, already imported into `aiController.js` by Task 2.
- Produces: `runDeepScan` — unchanged signature `(req, res)`, response shape: `{ status: 'success', timestamp: Date, summary: { orphanRecords: number, breakdown: { label, count }[] }, recommendations: string[] }`. `integrityScore` and `lastBackup` are gone.

- [ ] **Step 1: Write the failing tests**

Append to `backend/test/aiController.test.js` (add `runDeepScan` to the existing import line, then add these two tests at the end of the file):

Change:
```js
import { getSystemAudit } from '../controllers/aiController.js';
```
to:
```js
import { getSystemAudit, runDeepScan } from '../controllers/aiController.js';
```

Then append:
```js
test('runDeepScan returns a clean "no issues" recommendation when the database has no dangling references', async () => {
  const req = {};
  const res = mockRes();
  const next = mockNext();

  await runDeepScan(req, res, next);

  assert.equal(next.calls.length, 0, `unexpected error: ${next.calls[0]}`);
  assert.equal(res.body.status, 'success');
  assert.equal(res.body.summary.orphanRecords, 0);
  assert.deepEqual(res.body.summary.breakdown, []);
  assert.deepEqual(res.body.recommendations, ['No issues found — referential integrity looks healthy.']);
  assert.equal(res.body.summary.integrityScore, undefined);
  assert.equal(res.body.summary.lastBackup, undefined);
});

test('runDeepScan reports a real breakdown and recommendation text generated from actual findings', async () => {
  const school = await School.create({ name: 'Test High', uniqueCode: 'TH100GP', province: 'GP' });
  const teacher = await User.create({
    schoolId: school._id, userCode: 'TH100T1GP', firebaseUid: 'TH100T1GP-uid', role: 'Teacher',
    fullNames: 'Teach', surname: 'One', idNumber: '8001015800087', dateOfBirth: '1980-01-01', email: 'teacher@th.com',
  });
  const danglingSubjectId = new mongoose.Types.ObjectId();
  await Quiz.create({ teacherId: teacher._id, subjectId: danglingSubjectId, title: 'Orphan Quiz 1', questions: [] });
  await Quiz.create({ teacherId: teacher._id, subjectId: danglingSubjectId, title: 'Orphan Quiz 2', questions: [] });

  const req = {};
  const res = mockRes();
  const next = mockNext();

  await runDeepScan(req, res, next);

  assert.equal(next.calls.length, 0, `unexpected error: ${next.calls[0]}`);
  assert.equal(res.body.summary.orphanRecords, 2);
  assert.equal(res.body.summary.breakdown.length, 1);
  assert.equal(res.body.summary.breakdown[0].label, 'Quiz → Subject');
  assert.equal(res.body.summary.breakdown[0].count, 2);
  assert.equal(res.body.recommendations.length, 1);
  assert.match(res.body.recommendations[0], /2 Quiz record\(s\) have a dangling Subject reference/);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && node --experimental-test-module-mocks --test --test-name-pattern="runDeepScan" test/aiController.test.js`
Expected: FAIL — current `runDeepScan` still returns the hardcoded `integrityScore: 99.8`, `orphanRecords: 12`, and the three canned recommendation strings, none of which match the new tests' assertions.

- [ ] **Step 3: Rewrite `runDeepScan` and drop the now-unused imports**

In `backend/controllers/aiController.js`, remove the two imports that only `runDeepScan`'s old mocked version needed:

```js
import Subject from '../models/Subject.js';
import Quiz from '../models/Quiz.js';
```

(Neither `getSystemAudit` nor the new `runDeepScan` use `Subject` or `Quiz` directly — both go through `runOrphanAudit()` instead.)

Then replace the `runDeepScan` function (everything from `// @desc    Run Deep AI DB Scan` to its closing `});`) with:

```js
// @desc    Run Deep AI DB Scan
// @route   POST /api/ai/db-check
export const runDeepScan = asyncHandler(async (req, res) => {
  const { total, breakdown } = await runOrphanAudit();

  const recommendations = breakdown.length > 0
    ? breakdown.map(({ label, count }) => {
        const [fromModel, toModel] = label.split(' → ');
        return `${count} ${fromModel} record(s) have a dangling ${toModel} reference — review and reassign or delete them.`;
      })
    : ['No issues found — referential integrity looks healthy.'];

  res.json({
    status: 'success',
    timestamp: new Date(),
    summary: { orphanRecords: total, breakdown },
    recommendations,
  });
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && node --experimental-test-module-mocks --test test/aiController.test.js`
Expected: PASS, all 7 tests in the file green (5 from Task 2 + 2 new).

- [ ] **Step 5: Run the full backend suite to confirm no regressions**

Run: `cd backend && npm test`
Expected: PASS, all tests green (81 + these new ones).

- [ ] **Step 6: Commit**

```bash
git add backend/controllers/aiController.js backend/test/aiController.test.js
git commit -m "Compute real orphan breakdown and recommendations in runDeepScan"
```

---

### Task 4: Frontend — remove the fake success alert

**Files:**
- Modify: `frontend/src/js/pages/dev-ai-insights.js:83-101` (the `renderDeepResults` function)

**Interfaces:**
- Consumes: `data.recommendations` (array of strings) from `POST /api/ai/db-check`, produced by Task 3. No shape change from the frontend's perspective — it already just iterates `data.recommendations` generically, so a real array (including the one-item "No issues found" fallback) renders correctly with the existing loop, no new empty-state code needed.

Current `renderDeepResults` in `frontend/src/js/pages/dev-ai-insights.js`:

```js
function renderDeepResults(data) {
    recommendationsSection.classList.remove('hidden');
    recommendationsList.innerHTML = '';
    
    data.recommendations.forEach(rec => {
        const div = document.createElement('div');
        div.className = 'glass-card p-5 rounded-2xl border-l-4 border-l-indigo-600 flex items-center gap-4';
        div.innerHTML = `
            <div class="bg-indigo-100 text-indigo-600 w-10 h-10 rounded-full flex items-center justify-center shrink-0">
                <i class="fas fa-check"></i>
            </div>
            <p class="text-slate-700 font-medium text-sm">${rec}</p>
        `;
        recommendationsList.appendChild(div);
    });
    
    // Add a success alert
    alert('AI Deep Scan Complete. 0 critical security vulnerabilities found. 3 optimizations recommended.');
}
```

- [ ] **Step 1: Remove the fake alert**

Delete the trailing comment and `alert(...)` call, so the function ends right after the `forEach` loop:

```js
function renderDeepResults(data) {
    recommendationsSection.classList.remove('hidden');
    recommendationsList.innerHTML = '';
    
    data.recommendations.forEach(rec => {
        const div = document.createElement('div');
        div.className = 'glass-card p-5 rounded-2xl border-l-4 border-l-indigo-600 flex items-center gap-4';
        div.innerHTML = `
            <div class="bg-indigo-100 text-indigo-600 w-10 h-10 rounded-full flex items-center justify-center shrink-0">
                <i class="fas fa-check"></i>
            </div>
            <p class="text-slate-700 font-medium text-sm">${rec}</p>
        `;
        recommendationsList.appendChild(div);
    });
}
```

- [ ] **Step 2: Syntax-check**

Run: `node --check frontend/src/js/pages/dev-ai-insights.js`
Expected: no output (clean).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/js/pages/dev-ai-insights.js
git commit -m "Remove fake success alert from AI Insights deep scan"
```

---

### Task 5: Update living docs and final regression

**Files:**
- Modify: `ANALYSIS_REPORT.md` (mark B-3 resolved)
- Modify: `TASK_PROGRESS.md` (mark this Horizon 2 item done, update session log)
- Modify: `PROJECT_PLAN.md` (update Horizon 2 table row for this item)

**Interfaces:** None — documentation only.

- [ ] **Step 1: Run the full test suite one more time**

Run: `cd backend && npm test && cd ../frontend && npm test`
Expected: PASS, everything green.

- [ ] **Step 2: Update `ANALYSIS_REPORT.md`**

Find the B-3 finding (`"AI Insights" (DevAdmin) is fully mocked, not real analysis.`) and add a resolution note directly below it, following the same pattern used for prior resolved findings (S-7, S-8) in this file: state what changed (real health score computed from pending schools / teacher:learner ratio / orphaned references; real orphan-reference audit across 8 relationships in `backend/utils/orphanCheck.js`; no LLM used, per the approved design decision), and reference `docs/superpowers/specs/2026-08-04-ai-insights-design.md` for the full design.

- [ ] **Step 3: Update `TASK_PROGRESS.md`**

Update the "Last updated" line and "Current phase" line to reflect Horizon 2 item 1 (Real AI Insights) is done. Add a completed-work bullet describing what shipped (mirroring the style of prior session entries in this file: what changed, why, test count). Add a session log row.

- [ ] **Step 4: Update `PROJECT_PLAN.md`**

In the Horizon 2 table (§5), mark the "Replace mocked AI Insights..." row as done, or move it out of the pending table into a brief "done" note, consistent with how Horizon 1 items were tracked as they closed.

- [ ] **Step 5: Commit**

```bash
git add ANALYSIS_REPORT.md TASK_PROGRESS.md PROJECT_PLAN.md
git commit -m "Mark B-3 (fake AI Insights) resolved in living docs"
```
