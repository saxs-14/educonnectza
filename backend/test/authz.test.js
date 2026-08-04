import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isSameSchool } from '../utils/authz.js';

test('isSameSchool: DevAdmin can access a resource from any school', () => {
  const user = { role: 'DevAdmin', schoolId: 'schoolA' };
  assert.equal(isSameSchool(user, 'schoolB'), true);
});

test('isSameSchool: a global/unscoped resource (null schoolId) is accessible to anyone', () => {
  const user = { role: 'Teacher', schoolId: 'schoolA' };
  assert.equal(isSameSchool(user, null), true);
  assert.equal(isSameSchool(user, undefined), true);
});

test('isSameSchool: non-DevAdmin user matching the resource school is allowed', () => {
  const user = { role: 'Learner', schoolId: 'schoolA' };
  assert.equal(isSameSchool(user, 'schoolA'), true);
});

test('isSameSchool: non-DevAdmin user from a different school is denied', () => {
  const user = { role: 'Teacher', schoolId: 'schoolA' };
  assert.equal(isSameSchool(user, 'schoolB'), false);
});

test('isSameSchool: matches ObjectId-like values compared as strings', () => {
  const user = { role: 'SchoolAdmin', schoolId: { toString: () => 'schoolA' } };
  assert.equal(isSameSchool(user, { toString: () => 'schoolA' }), true);
  assert.equal(isSameSchool(user, { toString: () => 'schoolB' }), false);
});

test('isSameSchool: a non-DevAdmin user with no schoolId is denied access to a scoped resource', () => {
  const user = { role: 'Teacher', schoolId: null };
  assert.equal(isSameSchool(user, 'schoolA'), false);
});
