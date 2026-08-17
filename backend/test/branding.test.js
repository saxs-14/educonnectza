import { test } from 'node:test';
import assert from 'node:assert';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { calculateContrastRatio, verifyContrast } from '../utils/colorContrast.js';
import SchoolBranding from '../models/SchoolBranding.js';

test('calculateContrastRatio calculates correct W3C contrast ratios', () => {
  // Black text on white background = 21:1 ratio
  const ratio1 = calculateContrastRatio('#ffffff', '#000000');
  assert.strictEqual(ratio1, 21);

  // Accessible blue on white = > 4.5:1 ratio
  const ratio2 = calculateContrastRatio('#ffffff', '#1e3a8a');
  assert.ok(ratio2 >= 4.5);

  // Inaccessible light grey text on white background
  const ratio3 = calculateContrastRatio('#ffffff', '#e2e8f0');
  assert.ok(ratio3 < 4.5);
});

test('verifyContrast returns warning when text fails WCAG 2.1 AA', () => {
  const accessible = verifyContrast('#ffffff', '#1e3a8a');
  assert.strictEqual(accessible.isAccessible, true);
  assert.strictEqual(accessible.warning, undefined);

  const inaccessible = verifyContrast('#ffffff', '#cccccc');
  assert.strictEqual(inaccessible.isAccessible, false);
  assert.ok(inaccessible.warning.includes('fails WCAG 2.1 AA'));
});
