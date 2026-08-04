import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { connectTestDb, clearTestDb, disconnectTestDb } from '../testUtils/setupDb.js';
import { mockRes, mockNext } from '../testUtils/httpMocks.js';
import School from '../models/School.js';
import Subject from '../models/Subject.js';
import User from '../models/User.js';
import Class from '../models/Class.js';
import TeacherAllocation from '../models/TeacherAllocation.js';
import LearnerEnrollment from '../models/LearnerEnrollment.js';
import { allocateTeacher, enrollLearner } from '../controllers/allocationController.js';

before(connectTestDb);
after(disconnectTestDb);
beforeEach(clearTestDb);

async function seedSchoolWithTeacherAndLearner() {
  const school = await School.create({ name: 'Test High', uniqueCode: 'TH100GP', province: 'GP' });
  const teacher = await User.create({
    schoolId: school._id, userCode: 'TH100T1GP', firebaseUid: 'TH100T1GP-uid', role: 'Teacher', fullNames: 'Teach', surname: 'One',
    idNumber: '8001015800087', dateOfBirth: '1980-01-01', email: 'teacher@th.com',
  });
  const learner = await User.create({
    schoolId: school._id, userCode: 'TH1001234', firebaseUid: 'TH1001234-uid', role: 'Learner', fullNames: 'Learn', surname: 'One',
    idNumber: '0501015800087', dateOfBirth: '2005-01-01', grade: 9, email: 'learner@th.com',
  });
  const admin = { schoolId: school._id, role: 'SchoolAdmin' };
  return { school, teacher, learner, admin };
}

test('allocateTeacher rejects a subjectId that does not correspond to a real Subject', async () => {
  const { teacher, admin } = await seedSchoolWithTeacherAndLearner();
  const req = {
    user: admin,
    body: { teacherId: teacher._id.toString(), subjectId: new mongoose.Types.ObjectId().toString(), classId: null, isClassOwner: false },
  };
  const res = mockRes();
  const next = mockNext();

  await allocateTeacher(req, res, next);

  assert.equal(next.calls.length, 1);
  assert.equal(res.statusCode, 404);
  const count = await TeacherAllocation.countDocuments({});
  assert.equal(count, 0, 'no allocation should be created against a nonexistent subject');
});

test('allocateTeacher succeeds for a real subject', async () => {
  const { school, teacher, admin } = await seedSchoolWithTeacherAndLearner();
  const subject = await Subject.create({ schoolId: school._id, name: 'Maths', grade: 9 });
  const req = {
    user: admin,
    body: { teacherId: teacher._id.toString(), subjectId: subject._id.toString(), classId: null, isClassOwner: false },
  };
  const res = mockRes();
  const next = mockNext();

  await allocateTeacher(req, res, next);

  assert.equal(next.calls.length, 0, `unexpected error: ${next.calls[0]}`);
  assert.equal(res.statusCode, 201);
});

test('enrollLearner rejects a subjectId that does not correspond to a real Subject', async () => {
  const { school, learner, admin } = await seedSchoolWithTeacherAndLearner();
  const klass = await Class.create({ schoolId: school._id, grade: 9, classId: 'A' });
  const req = {
    user: admin,
    body: { learnerId: learner._id.toString(), subjectId: new mongoose.Types.ObjectId().toString(), classId: klass._id.toString() },
  };
  const res = mockRes();
  const next = mockNext();

  await enrollLearner(req, res, next);

  assert.equal(next.calls.length, 1);
  assert.equal(res.statusCode, 404);
  const count = await LearnerEnrollment.countDocuments({});
  assert.equal(count, 0, 'no enrollment should be created against a nonexistent subject');
});

test('enrollLearner succeeds for a real subject', async () => {
  const { school, learner, admin } = await seedSchoolWithTeacherAndLearner();
  const subject = await Subject.create({ schoolId: school._id, name: 'Maths', grade: 9 });
  const klass = await Class.create({ schoolId: school._id, grade: 9, classId: 'A' });
  const req = {
    user: admin,
    body: { learnerId: learner._id.toString(), subjectId: subject._id.toString(), classId: klass._id.toString() },
  };
  const res = mockRes();
  const next = mockNext();

  await enrollLearner(req, res, next);

  assert.equal(next.calls.length, 0, `unexpected error: ${next.calls[0]}`);
  assert.equal(res.statusCode, 201);
});
