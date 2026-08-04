import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { connectTestDb, clearTestDb, disconnectTestDb } from '../testUtils/setupDb.js';
import { mockRes, mockNext } from '../testUtils/httpMocks.js';
import School from '../models/School.js';
import User from '../models/User.js';
import CalendarEvent from '../models/CalendarEvent.js';
import { createEvent, updateEvent, deleteEvent } from '../controllers/calendarController.js';

before(connectTestDb);
after(disconnectTestDb);
beforeEach(clearTestDb);

async function seedSchoolsAndUsers() {
  const schoolA = await School.create({ name: 'School A', uniqueCode: 'AA100GP', province: 'GP' });
  const schoolB = await School.create({ name: 'School B', uniqueCode: 'BB100GP', province: 'GP' });
  const learnerA = await User.create({
    schoolId: schoolA._id, userCode: 'AA1001234', firebaseUid: 'AA1001234-uid', role: 'Learner', fullNames: 'Learn', surname: 'Aa',
    idNumber: '0501015800087', dateOfBirth: '2005-01-01', grade: 9, email: 'learner@a.com',
  });
  const adminA = await User.create({
    schoolId: schoolA._id, userCode: 'AA100SA1', firebaseUid: 'AA100SA1-uid', role: 'SchoolAdmin', fullNames: 'Admin', surname: 'Aa',
    idNumber: '8001015800087', dateOfBirth: '1980-01-01', email: 'admin@a.com',
  });
  const adminB = await User.create({
    schoolId: schoolB._id, userCode: 'BB100SA1', firebaseUid: 'BB100SA1-uid', role: 'SchoolAdmin', fullNames: 'Admin', surname: 'Bb',
    idNumber: '8001015800088', dateOfBirth: '1980-01-01', email: 'admin@b.com',
  });
  return { schoolA, schoolB, learnerA, adminA, adminB };
}

test('createEvent denies a Learner from creating a calendar event', async () => {
  const { learnerA } = await seedSchoolsAndUsers();
  const req = {
    user: learnerA,
    body: { title: 'Fake system alert', eventType: 'system', startDate: new Date(), endDate: new Date() },
  };
  const res = mockRes();
  const next = mockNext();

  await createEvent(req, res, next);

  assert.equal(next.calls.length, 1);
  assert.equal(res.statusCode, 403);
  const count = await CalendarEvent.countDocuments({});
  assert.equal(count, 0, 'no event should have been created');
});

test('createEvent allows a SchoolAdmin to create a school event', async () => {
  const { adminA } = await seedSchoolsAndUsers();
  const req = {
    user: adminA,
    body: { title: 'Parent meeting', eventType: 'school', startDate: new Date(), endDate: new Date() },
  };
  const res = mockRes();
  const next = mockNext();

  await createEvent(req, res, next);

  assert.equal(next.calls.length, 0, `unexpected error: ${next.calls[0]}`);
  assert.equal(res.statusCode, 201);
});

test('updateEvent denies a SchoolAdmin from a different school', async () => {
  const { schoolA, adminA, adminB } = await seedSchoolsAndUsers();
  const event = await CalendarEvent.create({
    schoolId: schoolA._id, creatorId: adminA._id, creatorRole: 'SchoolAdmin',
    title: 'Exam', startDate: new Date(), endDate: new Date(), eventType: 'school',
  });
  const req = { params: { id: event._id.toString() }, user: adminB, body: { title: 'Hijacked' } };
  const res = mockRes();
  const next = mockNext();

  await updateEvent(req, res, next);

  assert.equal(next.calls.length, 1);
  assert.equal(res.statusCode, 403);
});

test('deleteEvent denies a SchoolAdmin from a different school', async () => {
  const { schoolA, adminA, adminB } = await seedSchoolsAndUsers();
  const event = await CalendarEvent.create({
    schoolId: schoolA._id, creatorId: adminA._id, creatorRole: 'SchoolAdmin',
    title: 'Exam', startDate: new Date(), endDate: new Date(), eventType: 'school',
  });
  const req = { params: { id: event._id.toString() }, user: adminB };
  const res = mockRes();
  const next = mockNext();

  await deleteEvent(req, res, next);

  assert.equal(next.calls.length, 1);
  assert.equal(res.statusCode, 403);
  const stillExists = await CalendarEvent.findById(event._id);
  assert.ok(stillExists);
});
