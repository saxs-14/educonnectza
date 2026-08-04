import { test, before, after, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { connectTestDb, clearTestDb, disconnectTestDb } from '../testUtils/setupDb.js';
import { mockRes, mockNext } from '../testUtils/httpMocks.js';
import School from '../models/School.js';
import User from '../models/User.js';

// authController imports { auth } from '../config/firebase.js', which initializes
// the real Firebase Admin SDK at import time. Stub it out BEFORE importing the
// controller so tests never touch the real Firebase project.
mock.module('../config/firebase.js', {
  exports: {
    auth: { getUser: async (uid) => ({ uid }) },
    default: {},
  },
});

const { registerUser } = await import('../controllers/authController.js');

before(connectTestDb);
after(disconnectTestDb);
beforeEach(clearTestDb);

const baseBody = (overrides = {}) => ({
  firebaseUid: 'fb-uid-1',
  schoolCode: 'TH100GP',
  role: 'Learner',
  fullNames: 'Thabo',
  surname: 'Nkosi',
  idNumber: '0101015800087',
  dateOfBirth: '2010-01-01',
  grade: 9,
  email: 'thabo@example.com',
  ...overrides,
});

test('registerUser rejects a Learner registration with no parental consent', async () => {
  await School.create({ name: 'Test High', uniqueCode: 'TH100GP', province: 'GP' });
  const req = { body: baseBody(), file: undefined };
  const res = mockRes();
  const next = mockNext();

  await registerUser(req, res, next);

  assert.equal(next.calls.length, 1);
  assert.match(next.calls[0].message, /consent/i);
  const stored = await User.findOne({ email: 'thabo@example.com' });
  assert.equal(stored, null, 'no user should be created without consent');
});

test('registerUser accepts a Learner registration with parental consent and records it', async () => {
  await School.create({ name: 'Test High', uniqueCode: 'TH100GP', province: 'GP' });
  const req = { body: baseBody({ parentConsent: 'true' }), file: undefined };
  const res = mockRes();
  const next = mockNext();

  await registerUser(req, res, next);

  assert.equal(next.calls.length, 0, `unexpected error: ${next.calls[0]}`);
  const stored = await User.findOne({ email: 'thabo@example.com' });
  assert.equal(stored.parentConsent, true);
});

test('registerUser does not require parental consent for a Teacher registration', async () => {
  await School.create({ name: 'Test High', uniqueCode: 'TH100GP', province: 'GP' });
  const req = { body: baseBody({ role: 'Teacher', email: 'teacher@example.com' }), file: undefined };
  const res = mockRes();
  const next = mockNext();

  await registerUser(req, res, next);

  assert.equal(next.calls.length, 0, `unexpected error: ${next.calls[0]}`);
});
