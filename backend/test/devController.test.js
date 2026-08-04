import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { connectTestDb, clearTestDb, disconnectTestDb } from '../testUtils/setupDb.js';
import { mockRes, mockNext } from '../testUtils/httpMocks.js';
import School from '../models/School.js';
import User from '../models/User.js';
import { hashPassword } from '../utils/hashPassword.js';
import { getCollectionRecords } from '../controllers/devController.js';

before(connectTestDb);
after(disconnectTestDb);
beforeEach(clearTestDb);

test('getCollectionRecords never exposes passwordHash or mfaSecret, even for a raw native-driver dump of the users collection', async () => {
  const school = await School.create({ name: 'Test High', uniqueCode: 'TH100GP', province: 'GP' });
  await User.create({
    schoolId: school._id,
    userCode: 'TH1001234',
    firebaseUid: 'uid-1',
    role: 'Learner',
    fullNames: 'Thabo',
    surname: 'Nkosi',
    idNumber: '0101015800087',
    dateOfBirth: '2010-01-01',
    grade: 9,
    email: 'thabo@example.com',
    passwordHash: await hashPassword('super-secret'),
    mfaSecret: 'TOTP-SECRET-VALUE',
  });

  const req = { params: { collection: 'users' } };
  const res = mockRes();
  const next = mockNext();

  await getCollectionRecords(req, res, next);

  assert.equal(next.calls.length, 0, `unexpected error: ${next.calls[0]}`);
  assert.equal(res.body.length, 1);
  assert.equal(res.body[0].passwordHash, undefined, 'passwordHash must never appear in the dev DB explorer response');
  assert.equal(res.body[0].mfaSecret, undefined, 'mfaSecret must never appear in the dev DB explorer response');
  assert.equal(res.body[0].email, 'thabo@example.com', 'non-sensitive fields should still be returned');
});
