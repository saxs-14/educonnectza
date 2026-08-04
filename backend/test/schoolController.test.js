import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { connectTestDb, clearTestDb, disconnectTestDb } from '../testUtils/setupDb.js';
import { mockRes, mockNext } from '../testUtils/httpMocks.js';
import School from '../models/School.js';
import User from '../models/User.js';
import { getSchoolById, updateSchoolTheme } from '../controllers/schoolController.js';

before(connectTestDb);
after(disconnectTestDb);
beforeEach(clearTestDb);

async function seedTwoSchools() {
  const schoolA = await School.create({ name: 'School A', uniqueCode: 'AA100GP', province: 'GP' });
  const schoolB = await School.create({ name: 'School B', uniqueCode: 'BB100GP', province: 'GP' });
  const adminA = await User.create({
    schoolId: schoolA._id, userCode: 'AA100SA1', firebaseUid: 'AA100SA1-uid', role: 'SchoolAdmin', fullNames: 'Admin', surname: 'Aa',
    idNumber: '8001015800087', dateOfBirth: '1980-01-01', email: 'admin@a.com',
  });
  const adminB = await User.create({
    schoolId: schoolB._id, userCode: 'BB100SA1', firebaseUid: 'BB100SA1-uid', role: 'SchoolAdmin', fullNames: 'Admin', surname: 'Bb',
    idNumber: '8001015800088', dateOfBirth: '1980-01-01', email: 'admin@b.com',
  });
  const devAdmin = await User.create({
    schoolId: schoolA._id, userCode: 'DEV0001', firebaseUid: 'DEV0001-uid', role: 'DevAdmin', fullNames: 'Dev', surname: 'Admin',
    idNumber: '8001015800089', dateOfBirth: '1980-01-01', email: 'dev@edu.com',
  });
  return { schoolA, schoolB, adminA, adminB, devAdmin };
}

test('getSchoolById denies a SchoolAdmin from a different school', async () => {
  const { schoolA, adminB } = await seedTwoSchools();
  const req = { params: { id: schoolA._id.toString() }, user: adminB };
  const res = mockRes();
  const next = mockNext();

  await getSchoolById(req, res, next);

  assert.equal(next.calls.length, 1);
  assert.equal(res.statusCode, 403);
});

test('getSchoolById allows a SchoolAdmin from that school', async () => {
  const { schoolA, adminA } = await seedTwoSchools();
  const req = { params: { id: schoolA._id.toString() }, user: adminA };
  const res = mockRes();
  const next = mockNext();

  await getSchoolById(req, res, next);

  assert.equal(next.calls.length, 0, `unexpected error: ${next.calls[0]}`);
  assert.equal(res.body.name, 'School A');
});

test('getSchoolById allows a DevAdmin to view any school', async () => {
  const { schoolB, devAdmin } = await seedTwoSchools();
  const req = { params: { id: schoolB._id.toString() }, user: devAdmin };
  const res = mockRes();
  const next = mockNext();

  await getSchoolById(req, res, next);

  assert.equal(next.calls.length, 0, `unexpected error: ${next.calls[0]}`);
  assert.equal(res.body.name, 'School B');
});

test('updateSchoolTheme denies a SchoolAdmin from overwriting a different school\'s theme', async () => {
  const { schoolA, adminB } = await seedTwoSchools();
  const req = { params: { id: schoolA._id.toString() }, user: adminB, body: { primaryColor: '#000000' }, file: undefined };
  const res = mockRes();
  const next = mockNext();

  await updateSchoolTheme(req, res, next);

  assert.equal(next.calls.length, 1);
  assert.equal(res.statusCode, 403);
  const reloaded = await School.findById(schoolA._id);
  assert.notEqual(reloaded.theme.primaryColor, '#000000');
});
