import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { connectTestDb, clearTestDb, disconnectTestDb } from '../testUtils/setupDb.js';
import { mockRes, mockNext } from '../testUtils/httpMocks.js';
import School from '../models/School.js';
import Subject from '../models/Subject.js';
import User from '../models/User.js';
import Quiz from '../models/Quiz.js';
import TeacherAllocation from '../models/TeacherAllocation.js';
import { createQuiz, getQuizById, takeQuiz, submitQuiz } from '../controllers/quizController.js';

before(connectTestDb);
after(disconnectTestDb);
beforeEach(clearTestDb);

async function seedQuizInSchoolA() {
  const schoolA = await School.create({ name: 'School A', uniqueCode: 'AA100GP', province: 'GP' });
  const schoolB = await School.create({ name: 'School B', uniqueCode: 'BB100GP', province: 'GP' });
  const subject = await Subject.create({ schoolId: schoolA._id, name: 'Maths', grade: 9 });
  const teacher = await User.create({
    schoolId: schoolA._id, userCode: 'AA100T1GP', firebaseUid: 'AA100T1GP-uid', role: 'Teacher', fullNames: 'Teach', surname: 'One',
    idNumber: '8001015800087', dateOfBirth: '1980-01-01', email: 'teacher@a.com',
  });
  const quiz = await Quiz.create({
    teacherId: teacher._id,
    subjectId: subject._id,
    title: 'Algebra Quiz',
    questions: [{ type: 'mcq', text: '1+1?', options: ['1', '2'], correctAnswer: '2', points: 1 }],
  });
  const learnerA = await User.create({
    schoolId: schoolA._id, userCode: 'AA1001234', firebaseUid: 'AA1001234-uid', role: 'Learner', fullNames: 'Learn', surname: 'Aa',
    idNumber: '0501015800087', dateOfBirth: '2005-01-01', grade: 9, email: 'learner@a.com',
  });
  const learnerB = await User.create({
    schoolId: schoolB._id, userCode: 'BB1001234', firebaseUid: 'BB1001234-uid', role: 'Learner', fullNames: 'Learn', surname: 'Bb',
    idNumber: '0501015800088', dateOfBirth: '2005-01-01', grade: 9, email: 'learner@b.com',
  });
  return { schoolA, schoolB, subject, quiz, learnerA, learnerB };
}

test('getQuizById denies a learner from a different school', async () => {
  const { quiz, learnerB } = await seedQuizInSchoolA();
  const req = { params: { id: quiz._id.toString() }, user: learnerB };
  const res = mockRes();
  const next = mockNext();

  await getQuizById(req, res, next);

  assert.equal(next.calls.length, 1);
  assert.equal(res.statusCode, 403);
});

test('getQuizById allows a learner from the same school', async () => {
  const { quiz, learnerA } = await seedQuizInSchoolA();
  const req = { params: { id: quiz._id.toString() }, user: learnerA };
  const res = mockRes();
  const next = mockNext();

  await getQuizById(req, res, next);

  assert.equal(next.calls.length, 0, `unexpected error: ${next.calls[0]}`);
  assert.equal(res.body.title, 'Algebra Quiz');
});

test('takeQuiz denies a learner from a different school', async () => {
  const { quiz, learnerB } = await seedQuizInSchoolA();
  const req = { params: { id: quiz._id.toString() }, user: learnerB };
  const res = mockRes();
  const next = mockNext();

  await takeQuiz(req, res, next);

  assert.equal(next.calls.length, 1);
  assert.equal(res.statusCode, 403);
});

test('createQuiz rejects a subjectId that does not correspond to a real Subject, even with a matching allocation', async () => {
  const schoolA = await School.create({ name: 'School A', uniqueCode: 'AA100GP', province: 'GP' });
  const teacher = await User.create({
    schoolId: schoolA._id, userCode: 'AA100T1GP', firebaseUid: 'AA100T1GP-uid', role: 'Teacher', fullNames: 'Teach', surname: 'One',
    idNumber: '8001015800087', dateOfBirth: '1980-01-01', email: 'teacher@a.com',
  });
  const danglingSubjectId = new mongoose.Types.ObjectId();
  // Simulates a fabricated/legacy allocation referencing a subject that no longer exists.
  await TeacherAllocation.create({ teacherId: teacher._id, subjectId: danglingSubjectId });
  const req = {
    user: teacher,
    body: { subjectId: danglingSubjectId.toString(), title: 'Fake Quiz', questions: [] },
  };
  const res = mockRes();
  const next = mockNext();

  await createQuiz(req, res, next);

  assert.equal(next.calls.length, 1);
  assert.equal(res.statusCode, 404);
  const count = await Quiz.countDocuments({});
  assert.equal(count, 0, 'no quiz should be created against a nonexistent subject');
});

async function seedQuizWithDanglingSubject() {
  const schoolA = await School.create({ name: 'School A', uniqueCode: 'AA100GP', province: 'GP' });
  const schoolB = await School.create({ name: 'School B', uniqueCode: 'BB100GP', province: 'GP' });
  const teacher = await User.create({
    schoolId: schoolA._id, userCode: 'AA100T1GP', firebaseUid: 'AA100T1GP-uid', role: 'Teacher', fullNames: 'Teach', surname: 'One',
    idNumber: '8001015800087', dateOfBirth: '1980-01-01', email: 'teacher@a.com',
  });
  // subjectId points at an ObjectId that was never a real Subject document -
  // simulates a dangling reference (e.g. the Subject was deleted, or an
  // upstream endpoint failed to validate it existed).
  const danglingSubjectId = new mongoose.Types.ObjectId();
  const quiz = await Quiz.create({
    teacherId: teacher._id,
    subjectId: danglingSubjectId,
    title: 'Orphaned Quiz',
    questions: [{ type: 'mcq', text: '1+1?', options: ['1', '2'], correctAnswer: '2', points: 1 }],
  });
  const outsider = await User.create({
    schoolId: schoolB._id, userCode: 'BB1009999', firebaseUid: 'BB1009999-uid', role: 'SchoolAdmin', fullNames: 'Out', surname: 'Sider',
    idNumber: '8001015800088', dateOfBirth: '1980-01-01', email: 'outsider@b.com',
  });
  return { quiz, outsider };
}

test('getQuizById denies access when subjectId is a dangling reference (does not treat it as a global resource)', async () => {
  const { quiz, outsider } = await seedQuizWithDanglingSubject();
  const req = { params: { id: quiz._id.toString() }, user: outsider };
  const res = mockRes();
  const next = mockNext();

  await getQuizById(req, res, next);

  assert.equal(next.calls.length, 1);
  assert.notEqual(res.statusCode, 200, 'a dangling subject reference must never resolve to "anyone may access"');
});

test('takeQuiz denies access when subjectId is a dangling reference', async () => {
  const { quiz, outsider } = await seedQuizWithDanglingSubject();
  const req = { params: { id: quiz._id.toString() }, user: outsider };
  const res = mockRes();
  const next = mockNext();

  await takeQuiz(req, res, next);

  assert.equal(next.calls.length, 1);
  assert.notEqual(res.statusCode, 200);
});

test('submitQuiz denies a learner from a different school', async () => {
  const { quiz, learnerB } = await seedQuizInSchoolA();
  const req = {
    params: { id: quiz._id.toString() },
    user: learnerB,
    body: { answers: [{ questionIndex: 0, answer: '2' }] },
  };
  const res = mockRes();
  const next = mockNext();

  await submitQuiz(req, res, next);

  assert.equal(next.calls.length, 1);
  assert.equal(res.statusCode, 403);
});

test('submitQuiz denies access when subjectId is a dangling reference', async () => {
  const { quiz, outsider } = await seedQuizWithDanglingSubject();
  const req = {
    params: { id: quiz._id.toString() },
    user: outsider,
    body: { answers: [{ questionIndex: 0, answer: '2' }] },
  };
  const res = mockRes();
  const next = mockNext();

  await submitQuiz(req, res, next);

  assert.equal(next.calls.length, 1);
  assert.notEqual(res.statusCode, 200);
});
