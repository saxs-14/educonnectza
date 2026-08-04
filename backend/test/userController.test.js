import { test, before, after, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { connectTestDb, clearTestDb, disconnectTestDb } from '../testUtils/setupDb.js';
import { mockRes, mockNext } from '../testUtils/httpMocks.js';
import School from '../models/School.js';
import User from '../models/User.js';

let createUserCalls;
let deleteUserCalls;
let updateUserCalls;
let firebaseCreateUserImpl;

mock.module('../config/firebase.js', {
  exports: {
    auth: {
      createUser: async (...args) => {
        createUserCalls.push(args);
        return firebaseCreateUserImpl(...args);
      },
      deleteUser: async (...args) => {
        deleteUserCalls.push(args);
      },
      updateUser: async (...args) => {
        updateUserCalls.push(args);
      },
    },
    default: {},
  },
});

const { createUser, resetUserPassword, deleteUser } = await import('../controllers/userController.js');

before(connectTestDb);
after(disconnectTestDb);
beforeEach(() => {
  createUserCalls = [];
  deleteUserCalls = [];
  updateUserCalls = [];
  firebaseCreateUserImpl = async ({ email }) => ({ uid: `fb-uid-${email}` });
  return clearTestDb();
});

const makeSchool = () =>
  School.create({ name: 'Test High School', uniqueCode: 'TH100GP', province: 'GP' });

test('createUser provisions a Firebase account and stores its uid as firebaseUid', async () => {
  const school = await makeSchool();
  const req = {
    user: { role: 'SchoolAdmin', schoolId: school._id },
    body: {
      role: 'Learner',
      fullNames: 'Thabo',
      surname: 'Nkosi',
      idNumber: '0101015800087',
      dateOfBirth: '2010-01-01',
      grade: 9,
      email: 'thabo@example.com',
      password: 'correct horse battery staple',
    },
    file: undefined,
  };
  const res = mockRes();
  const next = mockNext();

  await createUser(req, res, next);

  assert.equal(next.calls.length, 0, `unexpected error: ${next.calls[0]}`);
  assert.equal(createUserCalls.length, 1);
  assert.equal(createUserCalls[0][0].email, 'thabo@example.com');

  const stored = await User.findOne({ email: 'thabo@example.com' }).select('+passwordHash');
  assert.equal(stored.firebaseUid, 'fb-uid-thabo@example.com');
  assert.notEqual(stored.passwordHash, 'correct horse battery staple');
  assert.equal(await bcrypt.compare('correct horse battery staple', stored.passwordHash), true);
});

test('createUser surfaces a clean error when Firebase account creation fails, and creates no Mongo user', async () => {
  firebaseCreateUserImpl = async () => {
    throw new Error('EMAIL_EXISTS');
  };
  const school = await makeSchool();
  const req = {
    user: { role: 'SchoolAdmin', schoolId: school._id },
    body: {
      role: 'Learner',
      fullNames: 'Thabo',
      surname: 'Nkosi',
      idNumber: '0101015800087',
      dateOfBirth: '2010-01-01',
      grade: 9,
      email: 'thabo@example.com',
      password: 'correct horse battery staple',
    },
    file: undefined,
  };
  const res = mockRes();
  const next = mockNext();

  await createUser(req, res, next);

  assert.equal(next.calls.length, 1);
  assert.equal(res.statusCode, 400);
  const stored = await User.findOne({ email: 'thabo@example.com' });
  assert.equal(stored, null);
});

test('createUser rolls back the Firebase account if the Mongo profile fails to save', async () => {
  const school = await makeSchool();
  const req = {
    user: { role: 'SchoolAdmin', schoolId: school._id },
    body: {
      role: 'Learner',
      fullNames: 'T', // fails User schema minlength(2) validation -> Mongo save fails
      surname: 'Nkosi',
      idNumber: '0101015800087',
      dateOfBirth: '2010-01-01',
      grade: 9,
      email: 'thabo@example.com',
      password: 'correct horse battery staple',
    },
    file: undefined,
  };
  const res = mockRes();
  const next = mockNext();

  await createUser(req, res, next);

  assert.equal(next.calls.length, 1);
  assert.equal(deleteUserCalls.length, 1, 'Firebase account should be rolled back');
  assert.equal(deleteUserCalls[0][0], 'fb-uid-thabo@example.com');
});

test('resetUserPassword updates the password in Firebase, not just Mongo (Mongo passwordHash is never read for login)', async () => {
  const school = await makeSchool();
  const learner = await User.create({
    schoolId: school._id, userCode: 'TH1001234', firebaseUid: 'fb-uid-existing', role: 'Learner',
    fullNames: 'Thabo', surname: 'Nkosi', idNumber: '0101015800087', dateOfBirth: '2010-01-01',
    grade: 9, email: 'thabo@example.com',
  });
  const req = {
    params: { id: learner._id.toString() },
    user: { role: 'SchoolAdmin', schoolId: school._id },
    body: { newPassword: 'a-brand-new-password' },
  };
  const res = mockRes();
  const next = mockNext();

  await resetUserPassword(req, res, next);

  assert.equal(next.calls.length, 0, `unexpected error: ${next.calls[0]}`);
  assert.equal(updateUserCalls.length, 1);
  assert.equal(updateUserCalls[0][0], 'fb-uid-existing');
  assert.equal(updateUserCalls[0][1].password, 'a-brand-new-password');
});

test('deleteUser removes the Firebase account along with the Mongo profile', async () => {
  const school = await makeSchool();
  const learner = await User.create({
    schoolId: school._id, userCode: 'TH1001234', firebaseUid: 'fb-uid-existing', role: 'Learner',
    fullNames: 'Thabo', surname: 'Nkosi', idNumber: '0101015800087', dateOfBirth: '2010-01-01',
    grade: 9, email: 'thabo@example.com',
  });
  const req = { params: { id: learner._id.toString() } };
  const res = mockRes();
  const next = mockNext();

  await deleteUser(req, res, next);

  assert.equal(next.calls.length, 0, `unexpected error: ${next.calls[0]}`);
  assert.equal(deleteUserCalls.length, 1);
  assert.equal(deleteUserCalls[0][0], 'fb-uid-existing');
  const stored = await User.findById(learner._id);
  assert.equal(stored, null);
});
