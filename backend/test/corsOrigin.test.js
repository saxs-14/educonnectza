import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildOriginChecker } from '../utils/corsOrigin.js';

test('allows a request whose Origin header is in the allowlist', () => {
  const check = buildOriginChecker(['http://localhost:3000']);
  let result;
  check('http://localhost:3000', (err, allowed) => { result = [err, allowed]; });
  assert.equal(result[0], null);
  assert.equal(result[1], true);
});

test('rejects a request whose Origin header is not in the allowlist', () => {
  const check = buildOriginChecker(['http://localhost:3000']);
  let result;
  check('http://evil.example.com', (err, allowed) => { result = [err, allowed]; });
  assert.ok(result[0] instanceof Error);
  assert.equal(result[1], undefined);
});

test('allows requests with no Origin header (same-origin, curl, mobile clients)', () => {
  const check = buildOriginChecker(['http://localhost:3000']);
  let result;
  check(undefined, (err, allowed) => { result = [err, allowed]; });
  assert.equal(result[0], null);
  assert.equal(result[1], true);
});
