import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { connectTestDb, clearTestDb, disconnectTestDb } from '../testUtils/setupDb.js';
import { mockRes, mockNext } from '../testUtils/httpMocks.js';
import School from '../models/School.js';
import User from '../models/User.js';
import { uploadReports } from '../controllers/schoolController.js';

before(connectTestDb);
after(disconnectTestDb);
beforeEach(clearTestDb);

function writeTempCsv(rows) {
  const header = 'learnerCode,promoted';
  const lines = rows.map((r) => `${r.learnerCode},${r.promoted}`);
  const filePath = path.join(os.tmpdir(), `grade-promotion-${Date.now()}-${Math.random().toString(36).slice(2)}.csv`);
  fs.writeFileSync(filePath, [header, ...lines].join('\n'));
  return filePath;
}

async function makeLearner(school, overrides = {}) {
  return User.create({
    schoolId: school._id,
    userCode: overrides.userCode,
    firebaseUid: `fb-${overrides.userCode}`,
    role: 'Learner',
    fullNames: 'Test',
    surname: 'Learner',
    idNumber: '0101015800087',
    dateOfBirth: '2010-01-01',
    grade: overrides.grade,
    email: `${overrides.userCode}@example.com`,
    isActive: true,
  });
}

test('promotes a Grade 8-11 learner marked promoted=true by incrementing their grade', async () => {
  const school = await School.create({ name: 'Test High', uniqueCode: 'TH100GP', province: 'GP' });
  const learner = await makeLearner(school, { userCode: 'TH1001111', grade: 11 });
  const filePath = writeTempCsv([{ learnerCode: 'TH1001111', promoted: 'true' }]);
  const req = { file: { path: filePath }, user: { schoolId: school._id } };
  const res = mockRes();
  const next = mockNext();

  await uploadReports(req, res, next);

  assert.equal(next.calls.length, 0, `unexpected error: ${next.calls[0]}`);
  const reloaded = await User.findById(learner._id);
  assert.equal(reloaded.grade, 12);
  assert.equal(reloaded.isActive, true);
});

test('graduates (deactivates, does not delete) a Grade 12 learner marked promoted=true', async () => {
  const school = await School.create({ name: 'Test High', uniqueCode: 'TH100GP', province: 'GP' });
  const learner = await makeLearner(school, { userCode: 'TH1002222', grade: 12 });
  const filePath = writeTempCsv([{ learnerCode: 'TH1002222', promoted: 'true' }]);
  const req = { file: { path: filePath }, user: { schoolId: school._id } };
  const res = mockRes();
  const next = mockNext();

  await uploadReports(req, res, next);

  assert.equal(next.calls.length, 0, `unexpected error: ${next.calls[0]}`);
  const reloaded = await User.findById(learner._id);
  assert.equal(reloaded.grade, 12, 'grade is not changed on graduation, only deactivated');
  assert.equal(reloaded.isActive, false);
});

test('leaves a learner marked promoted=false unchanged', async () => {
  const school = await School.create({ name: 'Test High', uniqueCode: 'TH100GP', province: 'GP' });
  const learner = await makeLearner(school, { userCode: 'TH1003333', grade: 9 });
  const filePath = writeTempCsv([{ learnerCode: 'TH1003333', promoted: 'false' }]);
  const req = { file: { path: filePath }, user: { schoolId: school._id } };
  const res = mockRes();
  const next = mockNext();

  await uploadReports(req, res, next);

  assert.equal(next.calls.length, 0, `unexpected error: ${next.calls[0]}`);
  const reloaded = await User.findById(learner._id);
  assert.equal(reloaded.grade, 9);
  assert.equal(reloaded.isActive, true);
});

test('ignores a learner code that belongs to a different school (no cross-school promotion)', async () => {
  const schoolA = await School.create({ name: 'School A', uniqueCode: 'AA100GP', province: 'GP' });
  const schoolB = await School.create({ name: 'School B', uniqueCode: 'BB100GP', province: 'GP' });
  const learnerInB = await makeLearner(schoolB, { userCode: 'BB1004444', grade: 9 });
  const filePath = writeTempCsv([{ learnerCode: 'BB1004444', promoted: 'true' }]);
  // Uploader is a SchoolAdmin for School A, uploading a code that actually belongs to School B.
  const req = { file: { path: filePath }, user: { schoolId: schoolA._id } };
  const res = mockRes();
  const next = mockNext();

  await uploadReports(req, res, next);

  assert.equal(next.calls.length, 0, `unexpected error: ${next.calls[0]}`);
  const reloaded = await User.findById(learnerInB._id);
  assert.equal(reloaded.grade, 9, 'a learner from another school must not be promoted by this upload');
});

test('deletes the uploaded CSV file after processing', async () => {
  const school = await School.create({ name: 'Test High', uniqueCode: 'TH100GP', province: 'GP' });
  await makeLearner(school, { userCode: 'TH1005555', grade: 9 });
  const filePath = writeTempCsv([{ learnerCode: 'TH1005555', promoted: 'false' }]);
  const req = { file: { path: filePath }, user: { schoolId: school._id } };
  const res = mockRes();
  const next = mockNext();

  await uploadReports(req, res, next);

  assert.equal(next.calls.length, 0, `unexpected error: ${next.calls[0]}`);
  assert.equal(fs.existsSync(filePath), false, 'uploaded CSV should be cleaned up after processing');
});
