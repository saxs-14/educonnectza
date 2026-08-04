import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { connectTestDb, clearTestDb, disconnectTestDb } from '../testUtils/setupDb.js';
import { mockRes, mockNext } from '../testUtils/httpMocks.js';
import School from '../models/School.js';
import User from '../models/User.js';
import StudyGroup from '../models/StudyGroup.js';
import { getGroupById, joinGroup, deleteGroup } from '../controllers/studyGroupController.js';

before(connectTestDb);
after(disconnectTestDb);
beforeEach(clearTestDb);

async function seedGroupInSchoolA() {
  const schoolA = await School.create({ name: 'School A', uniqueCode: 'AA100GP', province: 'GP' });
  const schoolB = await School.create({ name: 'School B', uniqueCode: 'BB100GP', province: 'GP' });
  const creator = await User.create({
    schoolId: schoolA._id, userCode: 'AA1001111', firebaseUid: 'AA1001111-uid', role: 'Learner', fullNames: 'Create', surname: 'One',
    idNumber: '0501015800081', dateOfBirth: '2005-01-01', grade: 9, email: 'creator@a.com',
  });
  const group = await StudyGroup.create({
    name: 'Maths Study Group', schoolId: schoolA._id, createdBy: creator._id, members: [creator._id], maxMembers: 5,
  });
  const learnerA = await User.create({
    schoolId: schoolA._id, userCode: 'AA1002222', firebaseUid: 'AA1002222-uid', role: 'Learner', fullNames: 'Learn', surname: 'Aa',
    idNumber: '0501015800087', dateOfBirth: '2005-01-01', grade: 9, email: 'learner@a.com',
  });
  const learnerB = await User.create({
    schoolId: schoolB._id, userCode: 'BB1002222', firebaseUid: 'BB1002222-uid', role: 'Learner', fullNames: 'Learn', surname: 'Bb',
    idNumber: '0501015800088', dateOfBirth: '2005-01-01', grade: 9, email: 'learner@b.com',
  });
  const teacherB = await User.create({
    schoolId: schoolB._id, userCode: 'BB100T1GP', firebaseUid: 'BB100T1GP-uid', role: 'Teacher', fullNames: 'Teach', surname: 'Bb',
    idNumber: '8001015800089', dateOfBirth: '1980-01-01', email: 'teacher@b.com',
  });
  return { schoolA, schoolB, group, creator, learnerA, learnerB, teacherB };
}

test('getGroupById denies a learner from a different school', async () => {
  const { group, learnerB } = await seedGroupInSchoolA();
  const req = { params: { id: group._id.toString() }, user: learnerB };
  const res = mockRes();
  const next = mockNext();

  await getGroupById(req, res, next);

  assert.equal(next.calls.length, 1);
  assert.equal(res.statusCode, 403);
});

test('getGroupById allows a learner from the same school', async () => {
  const { group, learnerA } = await seedGroupInSchoolA();
  const req = { params: { id: group._id.toString() }, user: learnerA };
  const res = mockRes();
  const next = mockNext();

  await getGroupById(req, res, next);

  assert.equal(next.calls.length, 0, `unexpected error: ${next.calls[0]}`);
  assert.equal(res.body.name, 'Maths Study Group');
});

test('joinGroup denies a learner from a different school', async () => {
  const { group, learnerB } = await seedGroupInSchoolA();
  const req = { params: { id: group._id.toString() }, user: learnerB };
  const res = mockRes();
  const next = mockNext();

  await joinGroup(req, res, next);

  assert.equal(next.calls.length, 1);
  assert.equal(res.statusCode, 403);
  const reloaded = await StudyGroup.findById(group._id);
  assert.equal(reloaded.members.length, 1, 'learner from another school must not be added as a member');
});

test('deleteGroup denies a Teacher from a different school', async () => {
  const { group, teacherB } = await seedGroupInSchoolA();
  const req = { params: { id: group._id.toString() }, user: teacherB };
  const res = mockRes();
  const next = mockNext();

  await deleteGroup(req, res, next);

  assert.equal(next.calls.length, 1);
  assert.equal(res.statusCode, 403);
  const stillExists = await StudyGroup.findById(group._id);
  assert.ok(stillExists, 'group must not be deleted by a Teacher from a different school');
});
