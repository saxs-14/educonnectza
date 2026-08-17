import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { uploadFile, deleteFile, isR2Configured } from '../utils/storageService.js';

test('isR2Configured returns false when process.env variables are missing', () => {
  const originalAccountId = process.env.R2_ACCOUNT_ID;
  delete process.env.R2_ACCOUNT_ID;
  assert.strictEqual(isR2Configured(), false);
  if (originalAccountId) process.env.R2_ACCOUNT_ID = originalAccountId;
});

test('uploadFile falls back to local storage when R2 is unconfigured', async () => {
  const testBuffer = Buffer.from('test content');
  const result = await uploadFile({
    buffer: testBuffer,
    filename: 'test-document.txt',
    mimeType: 'text/plain',
    schoolId: 'school-123',
    category: 'materials'
  });

  assert.strictEqual(result.provider, 'local');
  assert.ok(result.url.startsWith('/uploads/school-123/materials/'));
  assert.ok(result.key.startsWith('school-123/materials/'));

  // Clean up
  await deleteFile(result.key);
});
