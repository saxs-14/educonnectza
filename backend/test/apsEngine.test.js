import { test } from 'node:test';
import assert from 'node:assert';
import { getSubjectApsPoints, calculateAps } from '../utils/apsEngine.js';

test('getSubjectApsPoints correctly converts percentage marks to 1-7 scale', () => {
  assert.strictEqual(getSubjectApsPoints(85), 7);
  assert.strictEqual(getSubjectApsPoints(80), 7);
  assert.strictEqual(getSubjectApsPoints(75), 6);
  assert.strictEqual(getSubjectApsPoints(62), 5);
  assert.strictEqual(getSubjectApsPoints(55), 4);
  assert.strictEqual(getSubjectApsPoints(43), 3);
  assert.strictEqual(getSubjectApsPoints(33), 2);
  assert.strictEqual(getSubjectApsPoints(15), 1);
});

test('calculateAps excludes Life Orientation and calculates max 42 total score', () => {
  const subjects = [
    { subjectName: 'Mathematics', mark: 85 }, // 7
    { subjectName: 'Physical Sciences', mark: 82 }, // 7
    { subjectName: 'English Home Language', mark: 78 }, // 6
    { subjectName: 'Life Sciences', mark: 74 }, // 6
    { subjectName: 'Geography', mark: 68 }, // 5
    { subjectName: 'Accounting', mark: 65 }, // 5
    { subjectName: 'Life Orientation', mark: 90, isLifeOrientation: true }, // Should be excluded
  ];

  const result = calculateAps(subjects, 'generic');
  assert.strictEqual(result.totalAps, 36); // 7+7+6+6+5+5 = 36
  assert.strictEqual(result.maxPossible, 42);

  const loItem = result.subjectBreakdown.find((s) => s.subjectName === 'Life Orientation');
  assert.strictEqual(loItem.included, false);
});
