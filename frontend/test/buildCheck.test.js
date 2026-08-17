import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';

test('Frontend source files do not hardcode localhost:5000 API_BASE string', () => {
  const apiFile = path.resolve(process.cwd(), 'frontend/src/js/api.js');
  if (fs.existsSync(apiFile)) {
    const content = fs.readFileSync(apiFile, 'utf-8');
    assert.strictEqual(
      content.includes("const API_BASE = 'http://localhost:5000/api'"),
      false,
      'frontend/src/js/api.js must not contain hardcoded API_BASE'
    );
  }
});
