import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml } from '../src/js/utils.js';

test('escapeHtml neutralizes a script tag', () => {
  const result = escapeHtml('<script>alert(1)</script>');
  assert.equal(result, '&lt;script&gt;alert(1)&lt;/script&gt;');
});

test('escapeHtml neutralizes an onerror image-injection payload', () => {
  const result = escapeHtml('<img src=x onerror=alert(1)>');
  assert.ok(!result.includes('<img'), 'raw <img tag must not survive escaping');
});

test('escapeHtml escapes quotes so attribute-breakout is not possible', () => {
  const result = escapeHtml(`" onmouseover="alert(1)`);
  assert.ok(!result.includes('"'), 'double quotes must be escaped');
});

test('escapeHtml leaves plain text untouched', () => {
  assert.equal(escapeHtml('Grade 10A Mathematics'), 'Grade 10A Mathematics');
});

test('escapeHtml handles null/undefined by returning an empty string', () => {
  assert.equal(escapeHtml(null), '');
  assert.equal(escapeHtml(undefined), '');
});
