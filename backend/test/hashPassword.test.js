import { test } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { hashPassword } from '../utils/hashPassword.js';

test('hashPassword returns a bcrypt hash, never the original password', async () => {
  const hash = await hashPassword('correct horse battery staple');
  assert.notEqual(hash, 'correct horse battery staple');
  assert.match(hash, /^\$2[aby]\$/);
});

test('hashPassword produces a hash that verifies against the original password', async () => {
  const hash = await hashPassword('hunter2');
  assert.equal(await bcrypt.compare('hunter2', hash), true);
  assert.equal(await bcrypt.compare('wrong-password', hash), false);
});
