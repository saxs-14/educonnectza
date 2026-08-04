import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { connectTestDb, clearTestDb, disconnectTestDb } from '../testUtils/setupDb.js';
import { mockRes, mockNext } from '../testUtils/httpMocks.js';
import School from '../models/School.js';
import User from '../models/User.js';
import Quiz from '../models/Quiz.js';
import { getSystemAudit, runDeepScan } from '../controllers/aiController.js';

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
      fullNames: 'Learn', surname: `L${i}`, idNumber: `05010158000${String(i).padStart(2, '0')}`, dateOfBirth: '2005-01-01', grade: 9, email: `learner${i}@th.com`,
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

test('getSystemAudit flags a critical staffing gap when there are active learners but zero active teachers, and deducts 15 points', async () => {
  const school = await School.create({ name: 'Test High', uniqueCode: 'TH100GP', province: 'GP' });
  for (let i = 0; i < 3; i++) {
    await User.create({
      schoolId: school._id, userCode: `TH1001${String(i).padStart(3, '0')}`, firebaseUid: `TH1001${i}-uid`, role: 'Learner', isActive: true,
      fullNames: 'Learn', surname: `L${i}`, idNumber: `05010158000${String(i).padStart(2, '0')}`, dateOfBirth: '2005-01-01', grade: 9, email: `learner${i}@th.com`,
    });
  }
  const req = {};
  const res = mockRes();
  const next = mockNext();

  await getSystemAudit(req, res, next);

  assert.equal(next.calls.length, 0, `unexpected error: ${next.calls[0]}`);
  const insight = res.body.insights.find((i) => i.message.includes('no active teachers'));
  assert.ok(insight, 'expected a no-active-teachers insight');
  assert.equal(insight.type, 'critical');
  assert.equal(insight.action, 'Scale Resources');
  assert.equal(insight.message, '3 active learner(s) but no active teachers.');
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
