import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { connectTestDb, clearTestDb, disconnectTestDb } from '../testUtils/setupDb.js';
import { mockRes, mockNext } from '../testUtils/httpMocks.js';
import School from '../models/School.js';
import Subject from '../models/Subject.js';
import User from '../models/User.js';
import StudyMaterial from '../models/StudyMaterial.js';
import ForumTopic from '../models/ForumTopic.js';
import { getTopics, createTopic, createReply, getReplies } from '../controllers/forumController.js';
import { getMaterialsBySubject, deleteMaterial, createMaterial } from '../controllers/materialController.js';

before(connectTestDb);
after(disconnectTestDb);
beforeEach(clearTestDb);

async function seedSubjectInSchoolA() {
  const schoolA = await School.create({ name: 'School A', uniqueCode: 'AA100GP', province: 'GP' });
  const schoolB = await School.create({ name: 'School B', uniqueCode: 'BB100GP', province: 'GP' });
  const subject = await Subject.create({ schoolId: schoolA._id, name: 'Maths', grade: 9 });
  const learnerA = await User.create({
    schoolId: schoolA._id, userCode: 'AA1001234', firebaseUid: 'AA1001234-uid', role: 'Learner', fullNames: 'Learn', surname: 'Aa',
    idNumber: '0501015800087', dateOfBirth: '2005-01-01', grade: 9, email: 'learner@a.com',
  });
  const learnerB = await User.create({
    schoolId: schoolB._id, userCode: 'BB1001234', firebaseUid: 'BB1001234-uid', role: 'Learner', fullNames: 'Learn', surname: 'Bb',
    idNumber: '0501015800088', dateOfBirth: '2005-01-01', grade: 9, email: 'learner@b.com',
  });
  return { schoolA, schoolB, subject, learnerA, learnerB };
}

test('getTopics denies a learner reading a different school\'s subject forum', async () => {
  const { subject, learnerB } = await seedSubjectInSchoolA();
  const req = { params: { subjectId: subject._id.toString() }, user: learnerB };
  const res = mockRes();
  const next = mockNext();

  await getTopics(req, res, next);

  assert.equal(next.calls.length, 1);
  assert.equal(res.statusCode, 403);
});

test('getTopics allows a learner from the same school', async () => {
  const { subject, learnerA } = await seedSubjectInSchoolA();
  const req = { params: { subjectId: subject._id.toString() }, user: learnerA };
  const res = mockRes();
  const next = mockNext();

  await getTopics(req, res, next);

  assert.equal(next.calls.length, 0, `unexpected error: ${next.calls[0]}`);
});

test('createTopic denies a learner posting into a different school\'s subject forum', async () => {
  const { subject, learnerB } = await seedSubjectInSchoolA();
  const req = { body: { title: 'Hi', content: 'Hello', subjectId: subject._id.toString() }, user: learnerB };
  const res = mockRes();
  const next = mockNext();

  await createTopic(req, res, next);

  assert.equal(next.calls.length, 1);
  assert.equal(res.statusCode, 403);
});

test('getMaterialsBySubject denies a learner from a different school', async () => {
  const { subject, learnerB } = await seedSubjectInSchoolA();
  const req = { params: { subjectId: subject._id.toString() }, user: learnerB };
  const res = mockRes();
  const next = mockNext();

  await getMaterialsBySubject(req, res, next);

  assert.equal(next.calls.length, 1);
  assert.equal(res.statusCode, 403);
});

test('createReply denies access when the topic\'s subjectId is a dangling reference', async () => {
  const { schoolB } = await seedSubjectInSchoolA();
  const author = await User.create({
    schoolId: schoolB._id, userCode: 'BB1002222', firebaseUid: 'BB1002222-uid', role: 'Learner', fullNames: 'Author', surname: 'Bb',
    idNumber: '0501015800090', dateOfBirth: '2005-01-01', grade: 9, email: 'author@b.com',
  });
  const danglingSubjectId = new mongoose.Types.ObjectId();
  const topic = await ForumTopic.create({ title: 'Orphaned Topic', content: 'hi', subjectId: danglingSubjectId, author: author._id });
  const outsider = await User.create({
    schoolId: schoolB._id, userCode: 'BB1003333', firebaseUid: 'BB1003333-uid', role: 'Learner', fullNames: 'Out', surname: 'Sider',
    idNumber: '0501015800091', dateOfBirth: '2005-01-01', grade: 9, email: 'outsider@b.com',
  });
  const req = { params: { id: topic._id.toString() }, user: outsider, body: { content: 'reply' } };
  const res = mockRes();
  const next = mockNext();

  await createReply(req, res, next);

  assert.equal(next.calls.length, 1);
  assert.notEqual(res.statusCode, 201, 'a dangling subject reference must never resolve to "anyone may reply"');
});

test('getReplies denies access when the topic\'s subjectId is a dangling reference', async () => {
  const { schoolB } = await seedSubjectInSchoolA();
  const author = await User.create({
    schoolId: schoolB._id, userCode: 'BB1004444', firebaseUid: 'BB1004444-uid', role: 'Learner', fullNames: 'Author', surname: 'Bb',
    idNumber: '0501015800092', dateOfBirth: '2005-01-01', grade: 9, email: 'author2@b.com',
  });
  const danglingSubjectId = new mongoose.Types.ObjectId();
  const topic = await ForumTopic.create({ title: 'Orphaned Topic 2', content: 'hi', subjectId: danglingSubjectId, author: author._id });
  const outsider = await User.create({
    schoolId: schoolB._id, userCode: 'BB1005555', firebaseUid: 'BB1005555-uid', role: 'Learner', fullNames: 'Out', surname: 'Sider',
    idNumber: '0501015800093', dateOfBirth: '2005-01-01', grade: 9, email: 'outsider2@b.com',
  });
  const req = { params: { id: topic._id.toString() }, user: outsider };
  const res = mockRes();
  const next = mockNext();

  await getReplies(req, res, next);

  assert.equal(next.calls.length, 1);
  assert.notEqual(res.statusCode, 200);
});

test('deleteMaterial denies a SchoolAdmin from a different school', async () => {
  const { schoolB, subject } = await seedSubjectInSchoolA();
  const teacherA = await User.create({
    schoolId: subject.schoolId, userCode: 'AA100T1GP', firebaseUid: 'AA100T1GP-uid', role: 'Teacher', fullNames: 'Teach', surname: 'One',
    idNumber: '8001015800080', dateOfBirth: '1980-01-01', email: 'teacher@a.com',
  });
  const adminB = await User.create({
    schoolId: schoolB._id, userCode: 'BB100SA1', firebaseUid: 'BB100SA1-uid', role: 'SchoolAdmin', fullNames: 'Admin', surname: 'Bb',
    idNumber: '8001015800081', dateOfBirth: '1980-01-01', email: 'admin@b.com',
  });
  const material = await StudyMaterial.create({
    title: 'Notes', subjectId: subject._id, teacherId: teacherA._id,
  });
  const req = { params: { id: material._id.toString() }, user: adminB };
  const res = mockRes();
  const next = mockNext();

  await deleteMaterial(req, res, next);

  assert.equal(next.calls.length, 1);
  assert.equal(res.statusCode, 403);
  const stillExists = await StudyMaterial.findById(material._id);
  assert.ok(stillExists);
});

test('deleteMaterial denies access when subjectId is a dangling reference', async () => {
  const { schoolB } = await seedSubjectInSchoolA();
  const teacherA = await User.create({
    schoolId: schoolB._id, userCode: 'ZZ100T1GP', firebaseUid: 'ZZ100T1GP-uid', role: 'Teacher', fullNames: 'Some', surname: 'Teacher',
    idNumber: '8001015800082', dateOfBirth: '1980-01-01', email: 'someteacher@z.com',
  });
  const danglingSubjectId = new mongoose.Types.ObjectId();
  const material = await StudyMaterial.create({
    title: 'Orphaned Notes', subjectId: danglingSubjectId, teacherId: teacherA._id,
  });
  const adminB = await User.create({
    schoolId: schoolB._id, userCode: 'BB100SA2', firebaseUid: 'BB100SA2-uid', role: 'SchoolAdmin', fullNames: 'Admin', surname: 'Bb',
    idNumber: '8001015800083', dateOfBirth: '1980-01-01', email: 'admin2@b.com',
  });
  const req = { params: { id: material._id.toString() }, user: adminB };
  const res = mockRes();
  const next = mockNext();

  await deleteMaterial(req, res, next);

  assert.equal(next.calls.length, 1);
  assert.notEqual(res.statusCode, 200, 'a dangling subject reference must never resolve to "anyone may delete"');
  const stillExists = await StudyMaterial.findById(material._id);
  assert.ok(stillExists, 'a SchoolAdmin unconnected to the material\'s (nonexistent) subject must not be able to delete it');
});

test('createMaterial denies a SchoolAdmin from a different school (currently bypasses the ownership check entirely)', async () => {
  const { schoolB, subject } = await seedSubjectInSchoolA();
  const adminB = await User.create({
    schoolId: schoolB._id, userCode: 'BB100SA3', firebaseUid: 'BB100SA3-uid', role: 'SchoolAdmin', fullNames: 'Admin', surname: 'Bb',
    idNumber: '8001015800084', dateOfBirth: '1980-01-01', email: 'admin3@b.com',
  });
  const req = {
    user: adminB,
    body: { title: 'Hijacked Notes', description: '', subjectId: subject._id.toString(), topic: 'General' },
    file: undefined,
  };
  const res = mockRes();
  const next = mockNext();

  await createMaterial(req, res, next);

  assert.equal(next.calls.length, 1);
  assert.equal(res.statusCode, 403);
  const count = await StudyMaterial.countDocuments({ subjectId: subject._id });
  assert.equal(count, 0, 'a SchoolAdmin from another school must not be able to create material for this subject');
});

test('createMaterial denies creating material for a subject that does not exist', async () => {
  const { schoolA } = await seedSubjectInSchoolA();
  const adminA = await User.create({
    schoolId: schoolA._id, userCode: 'AA100SA1', firebaseUid: 'AA100SA1-uid', role: 'SchoolAdmin', fullNames: 'Admin', surname: 'Aa',
    idNumber: '8001015800085', dateOfBirth: '1980-01-01', email: 'admina@a.com',
  });
  const req = {
    user: adminA,
    body: { title: 'Notes', description: '', subjectId: new mongoose.Types.ObjectId().toString(), topic: 'General' },
    file: undefined,
  };
  const res = mockRes();
  const next = mockNext();

  await createMaterial(req, res, next);

  assert.equal(next.calls.length, 1);
  assert.equal(res.statusCode, 404);
});

test('createMaterial allows a SchoolAdmin from the same school as the subject', async () => {
  const { schoolA, subject } = await seedSubjectInSchoolA();
  const adminA = await User.create({
    schoolId: schoolA._id, userCode: 'AA100SA2', firebaseUid: 'AA100SA2-uid', role: 'SchoolAdmin', fullNames: 'Admin', surname: 'Aa',
    idNumber: '8001015800086', dateOfBirth: '1980-01-01', email: 'admina2@a.com',
  });
  const req = {
    user: adminA,
    body: { title: 'Notes', description: '', subjectId: subject._id.toString(), topic: 'General' },
    file: undefined,
  };
  const res = mockRes();
  const next = mockNext();

  await createMaterial(req, res, next);

  assert.equal(next.calls.length, 0, `unexpected error: ${next.calls[0]}`);
  assert.equal(res.statusCode, 201);
});
