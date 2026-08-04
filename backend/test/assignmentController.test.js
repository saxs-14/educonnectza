import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { connectTestDb, clearTestDb, disconnectTestDb } from '../testUtils/setupDb.js';
import { mockRes, mockNext } from '../testUtils/httpMocks.js';
import School from '../models/School.js';
import Subject from '../models/Subject.js';
import User from '../models/User.js';
import Assignment from '../models/Assignment.js';
import Submission from '../models/Submission.js';
import TeacherAllocation from '../models/TeacherAllocation.js';
import { createAssignment, getAssignmentById, submitAssignment } from '../controllers/assignmentController.js';

before(connectTestDb);
after(disconnectTestDb);
beforeEach(clearTestDb);

async function seedAssignmentInSchoolA() {
  const schoolA = await School.create({ name: 'School A', uniqueCode: 'AA100GP', province: 'GP' });
  const schoolB = await School.create({ name: 'School B', uniqueCode: 'BB100GP', province: 'GP' });
  const subject = await Subject.create({ schoolId: schoolA._id, name: 'Maths', grade: 9 });
  const teacher = await User.create({
    schoolId: schoolA._id, userCode: 'AA100T1GP', firebaseUid: 'AA100T1GP-uid', role: 'Teacher', fullNames: 'Teach', surname: 'One',
    idNumber: '8001015800087', dateOfBirth: '1980-01-01', email: 'teacher@a.com',
  });
  const assignment = await Assignment.create({
    teacherId: teacher._id,
    subjectId: subject._id,
    title: 'Essay 1',
    dueDate: new Date(Date.now() + 86400000),
  });
  const learnerB = await User.create({
    schoolId: schoolB._id, userCode: 'BB1001234', firebaseUid: 'BB1001234-uid', role: 'Learner', fullNames: 'Learn', surname: 'Bb',
    idNumber: '0501015800088', dateOfBirth: '2005-01-01', grade: 9, email: 'learner@b.com',
  });
  const learnerA = await User.create({
    schoolId: schoolA._id, userCode: 'AA1001234', firebaseUid: 'AA1001234-uid', role: 'Learner', fullNames: 'Learn', surname: 'Aa',
    idNumber: '0501015800087', dateOfBirth: '2005-01-01', grade: 9, email: 'learner@a.com',
  });
  return { schoolA, schoolB, subject, assignment, learnerA, learnerB };
}

test('getAssignmentById denies a learner from a different school', async () => {
  const { assignment, learnerB } = await seedAssignmentInSchoolA();
  const req = { params: { id: assignment._id.toString() }, user: learnerB };
  const res = mockRes();
  const next = mockNext();

  await getAssignmentById(req, res, next);

  assert.equal(next.calls.length, 1);
  assert.equal(res.statusCode, 403);
});

test('getAssignmentById allows a learner from the same school', async () => {
  const { assignment, learnerA } = await seedAssignmentInSchoolA();
  const req = { params: { id: assignment._id.toString() }, user: learnerA };
  const res = mockRes();
  const next = mockNext();

  await getAssignmentById(req, res, next);

  assert.equal(next.calls.length, 0, `unexpected error: ${next.calls[0]}`);
  assert.equal(res.body.title, 'Essay 1');
});

test('submitAssignment rejects a submission for a nonexistent assignment', async () => {
  const { learnerA } = await seedAssignmentInSchoolA();
  const fakeId = '507f1f77bcf86cd799439011';
  const req = { params: { id: fakeId }, user: learnerA, body: { textAnswer: 'hi' }, file: undefined };
  const res = mockRes();
  const next = mockNext();

  await submitAssignment(req, res, next);

  assert.equal(next.calls.length, 1);
  assert.equal(res.statusCode, 404);
  const count = await Submission.countDocuments({});
  assert.equal(count, 0, 'no submission should have been created for a nonexistent assignment');
});

test('submitAssignment denies a learner from a different school', async () => {
  const { assignment, learnerB } = await seedAssignmentInSchoolA();
  const req = { params: { id: assignment._id.toString() }, user: learnerB, body: { textAnswer: 'hi' }, file: undefined };
  const res = mockRes();
  const next = mockNext();

  await submitAssignment(req, res, next);

  assert.equal(next.calls.length, 1);
  assert.equal(res.statusCode, 403);
});

test('submitAssignment succeeds for a learner from the same school', async () => {
  const { assignment, learnerA } = await seedAssignmentInSchoolA();
  const req = { params: { id: assignment._id.toString() }, user: learnerA, body: { textAnswer: 'hi' }, file: undefined };
  const res = mockRes();
  const next = mockNext();

  await submitAssignment(req, res, next);

  assert.equal(next.calls.length, 0, `unexpected error: ${next.calls[0]}`);
  assert.equal(res.statusCode, 201);
});

test('createAssignment rejects a subjectId that does not correspond to a real Subject, even with a matching allocation', async () => {
  const schoolA = await School.create({ name: 'School A', uniqueCode: 'AA100GP', province: 'GP' });
  const teacher = await User.create({
    schoolId: schoolA._id, userCode: 'AA100T1GP', firebaseUid: 'AA100T1GP-uid', role: 'Teacher', fullNames: 'Teach', surname: 'One',
    idNumber: '8001015800087', dateOfBirth: '1980-01-01', email: 'teacher@a.com',
  });
  const danglingSubjectId = new mongoose.Types.ObjectId();
  await TeacherAllocation.create({ teacherId: teacher._id, subjectId: danglingSubjectId });
  const req = {
    user: teacher,
    body: { subjectId: danglingSubjectId.toString(), title: 'Fake Assignment', dueDate: new Date(Date.now() + 86400000) },
    files: undefined,
  };
  const res = mockRes();
  const next = mockNext();

  await createAssignment(req, res, next);

  assert.equal(next.calls.length, 1);
  assert.equal(res.statusCode, 404);
  const count = await Assignment.countDocuments({});
  assert.equal(count, 0, 'no assignment should be created against a nonexistent subject');
});

async function seedAssignmentWithDanglingSubject() {
  const schoolA = await School.create({ name: 'School A', uniqueCode: 'AA100GP', province: 'GP' });
  const schoolB = await School.create({ name: 'School B', uniqueCode: 'BB100GP', province: 'GP' });
  const teacher = await User.create({
    schoolId: schoolA._id, userCode: 'AA100T1GP', firebaseUid: 'AA100T1GP-uid', role: 'Teacher', fullNames: 'Teach', surname: 'One',
    idNumber: '8001015800087', dateOfBirth: '1980-01-01', email: 'teacher@a.com',
  });
  const danglingSubjectId = new mongoose.Types.ObjectId();
  const assignment = await Assignment.create({
    teacherId: teacher._id,
    subjectId: danglingSubjectId,
    title: 'Orphaned Assignment',
    dueDate: new Date(Date.now() + 86400000),
  });
  const outsider = await User.create({
    schoolId: schoolB._id, userCode: 'BB1009999', firebaseUid: 'BB1009999-uid', role: 'Learner', fullNames: 'Out', surname: 'Sider',
    idNumber: '0501015800089', dateOfBirth: '2005-01-01', grade: 9, email: 'outsider@b.com',
  });
  return { assignment, outsider };
}

test('getAssignmentById denies access when subjectId is a dangling reference', async () => {
  const { assignment, outsider } = await seedAssignmentWithDanglingSubject();
  const req = { params: { id: assignment._id.toString() }, user: outsider };
  const res = mockRes();
  const next = mockNext();

  await getAssignmentById(req, res, next);

  assert.equal(next.calls.length, 1);
  assert.notEqual(res.statusCode, 200, 'a dangling subject reference must never resolve to "anyone may access"');
});

test('submitAssignment denies access when subjectId is a dangling reference', async () => {
  const { assignment, outsider } = await seedAssignmentWithDanglingSubject();
  const req = { params: { id: assignment._id.toString() }, user: outsider, body: { textAnswer: 'hi' }, file: undefined };
  const res = mockRes();
  const next = mockNext();

  await submitAssignment(req, res, next);

  assert.equal(next.calls.length, 1);
  assert.notEqual(res.statusCode, 201);
  const count = await Submission.countDocuments({});
  assert.equal(count, 0, 'no submission should be created against a dangling-subject assignment');
});
