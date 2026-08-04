import { test, before, after, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { connectTestDb, clearTestDb, disconnectTestDb } from '../testUtils/setupDb.js';
import { mockRes, mockNext } from '../testUtils/httpMocks.js';
import School from '../models/School.js';
import User from '../models/User.js';

let verifyIdTokenImpl;

mock.module('../config/firebase.js', {
  exports: {
    auth: {
      verifyIdToken: async (...args) => verifyIdTokenImpl(...args),
    },
    default: {},
  },
});

const { protect, authorize } = await import('../middleware/authMiddleware.js');

before(connectTestDb);
after(disconnectTestDb);
beforeEach(() => {
  verifyIdTokenImpl = async () => {
    throw new Error('no verifyIdToken implementation set for this test');
  };
  return clearTestDb();
});

test('protect rejects a request with no Authorization header', async () => {
  const req = { headers: {} };
  const res = mockRes();
  const next = mockNext();

  await protect(req, res, next);

  assert.equal(next.calls.length, 1);
  assert.equal(res.statusCode, 401);
  assert.match(next.calls[0].message, /no token/i);
});

test('protect rejects a request with an invalid or expired Firebase token', async () => {
  verifyIdTokenImpl = async () => {
    throw new Error('Firebase ID token has expired');
  };
  const req = { headers: { authorization: 'Bearer some-invalid-token' } };
  const res = mockRes();
  const next = mockNext();

  await protect(req, res, next);

  assert.equal(next.calls.length, 1);
  assert.equal(res.statusCode, 401);
});

test('protect rejects a valid Firebase token with no matching Mongo user profile', async () => {
  verifyIdTokenImpl = async () => ({ uid: 'fb-uid-with-no-mongo-profile' });
  const req = { headers: { authorization: 'Bearer some-valid-token' } };
  const res = mockRes();
  const next = mockNext();

  await protect(req, res, next);

  assert.equal(next.calls.length, 1);
  assert.equal(res.statusCode, 401);
});

test('protect accepts a valid token with a matching Mongo user and attaches it to req.user', async () => {
  const school = await School.create({ name: 'Test High', uniqueCode: 'TH100GP', province: 'GP' });
  const learner = await User.create({
    schoolId: school._id, userCode: 'TH1001234', firebaseUid: 'fb-uid-real', role: 'Learner',
    fullNames: 'Thabo', surname: 'Nkosi', idNumber: '0101015800087', dateOfBirth: '2010-01-01',
    grade: 9, email: 'thabo@example.com',
  });
  verifyIdTokenImpl = async () => ({ uid: 'fb-uid-real' });
  const req = { headers: { authorization: 'Bearer some-valid-token' } };
  const res = mockRes();
  const next = mockNext();

  await protect(req, res, next);

  assert.equal(next.calls.length, 1);
  assert.equal(next.calls[0], undefined, 'next() should be called with no error on success');
  assert.equal(req.user._id.toString(), learner._id.toString());
});

test('authorize rejects a role not in the allowed list', () => {
  const middleware = authorize('Teacher', 'SchoolAdmin');
  const req = { user: { role: 'Learner' } };
  const res = mockRes();
  const next = mockNext();

  assert.throws(() => middleware(req, res, next), /Forbidden/);
  assert.equal(res.statusCode, 403);
});

test('authorize calls next() for a role in the allowed list', () => {
  const middleware = authorize('Teacher', 'SchoolAdmin');
  const req = { user: { role: 'Teacher' } };
  const res = mockRes();
  const next = mockNext();

  middleware(req, res, next);

  assert.equal(next.calls.length, 1);
  assert.equal(next.calls[0], undefined);
});
