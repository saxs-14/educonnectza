import { test, before, after } from 'node:test';
import assert from 'node:assert';
import mongoose from 'mongoose';
import { connectTestDb, clearTestDb, disconnectTestDb } from '../testUtils/setupDb.js';
import User from '../models/User.js';
import School from '../models/School.js';
import Subject from '../models/Subject.js';
import TeacherAllocation from '../models/TeacherAllocation.js';
import LearnerEnrollment from '../models/LearnerEnrollment.js';
import { allocateTeacherBulk, enrollLearnerBulk } from '../controllers/allocationController.js';

let schoolA, schoolB;
let adminA;
let teacherB, learnerB;
let subjectA, subjectB;

before(async () => {
  await connectTestDb();

  schoolA = await School.create({ name: 'School Alpha', uniqueCode: 'SCH-A-GP', province: 'GP', status: 'Active' });
  schoolB = await School.create({ name: 'School Beta', uniqueCode: 'SCH-B-GP', province: 'GP', status: 'Active' });

  adminA = await User.create({
    firebaseUid: 'admin-a-uid',
    userCode: 'ADM-A-001',
    fullNames: 'Admin Alpha',
    surname: 'User',
    idNumber: '8001015800087',
    dateOfBirth: new Date('1980-01-01'),
    email: 'admin.a@alpha.edu.za',
    role: 'SchoolAdmin',
    schoolId: schoolA._id,
  });

  teacherB = await User.create({
    firebaseUid: 'teacher-b-uid',
    userCode: 'TCH-B-001',
    fullNames: 'Teacher Beta',
    surname: 'User',
    idNumber: '8201015800087',
    dateOfBirth: new Date('1982-01-01'),
    email: 'teacher.b@beta.edu.za',
    role: 'Teacher',
    schoolId: schoolB._id,
  });

  learnerB = await User.create({
    firebaseUid: 'learner-b-uid',
    userCode: 'LRN-B-001',
    fullNames: 'Learner Beta',
    surname: 'User',
    idNumber: '0501015800087',
    dateOfBirth: new Date('2005-01-01'),
    email: 'learner.b@beta.edu.za',
    role: 'Learner',
    schoolId: schoolB._id,
    grade: 11,
  });

  subjectA = await Subject.create({
    name: 'Mathematics',
    code: 'MATH11-A',
    grade: 11,
    schoolId: schoolA._id,
  });

  subjectB = await Subject.create({
    name: 'Physical Sciences',
    code: 'PHYS11-B',
    grade: 11,
    schoolId: schoolB._id,
  });
});

after(async () => {
  await disconnectTestDb();
});

test('allocateTeacherBulk rejects cross-school teacher and subject allocations', async () => {
  let jsonResponse = null;

  const req = {
    user: adminA,
    body: {
      allocations: [
        // Attempt 1: Teacher from School B to Subject from School A
        { teacherId: teacherB._id, subjectId: subjectA._id, classId: '11A' },
        // Attempt 2: Teacher from School B to Subject from School B
        { teacherId: teacherB._id, subjectId: subjectB._id, classId: '11A' },
      ],
    },
  };

  const res = {
    status() {
      return this;
    },
    json(data) {
      jsonResponse = data;
      return this;
    },
  };

  await allocateTeacherBulk(req, res);

  assert.strictEqual(jsonResponse.created, 0);
  assert.strictEqual(jsonResponse.errorsCount, 2);
  assert.ok(jsonResponse.errors[0].error.includes('another school'));

  const count = await TeacherAllocation.countDocuments({});
  assert.strictEqual(count, 0);
});

test('enrollLearnerBulk rejects cross-school learner and subject enrollments', async () => {
  let jsonResponse = null;

  const req = {
    user: adminA,
    body: {
      enrollments: [
        // Attempt 1: Learner from School B into Subject from School A
        { learnerId: learnerB._id, subjectId: subjectA._id, classId: '11A' },
        // Attempt 2: Learner from School B into Subject from School B
        { learnerId: learnerB._id, subjectId: subjectB._id, classId: '11A' },
      ],
    },
  };

  const res = {
    status() {
      return this;
    },
    json(data) {
      jsonResponse = data;
      return this;
    },
  };

  await enrollLearnerBulk(req, res);

  assert.strictEqual(jsonResponse.created, 0);
  assert.strictEqual(jsonResponse.errorsCount, 2);
  assert.ok(jsonResponse.errors[0].error.includes('another school'));

  const count = await LearnerEnrollment.countDocuments({});
  assert.strictEqual(count, 0);
});
