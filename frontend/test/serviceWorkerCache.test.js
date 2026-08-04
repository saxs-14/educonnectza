import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readCachedUrls() {
  const swSource = readFileSync(path.join(frontendRoot, 'sw.js'), 'utf-8');
  const match = swSource.match(/const urlsToCache = \[([\s\S]*?)\];/);
  assert.ok(match, 'sw.js must define a urlsToCache array');
  return [...match[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

test('every URL in sw.js urlsToCache resolves to a real file (so cache.addAll cannot fail)', () => {
  const urls = readCachedUrls();
  assert.ok(urls.length > 0, 'urlsToCache should not be empty');
  for (const url of urls) {
    const relativePath = url === '/' ? 'index.html' : url.replace(/^\//, '');
    const fullPath = path.join(frontendRoot, relativePath);
    assert.ok(existsSync(fullPath), `${url} does not exist on disk (resolved to ${fullPath})`);
  }
});

test('manifest.json start_url points to a file that exists', () => {
  const manifest = JSON.parse(readFileSync(path.join(frontendRoot, 'manifest.json'), 'utf-8'));
  const relativePath = manifest.start_url.replace(/^\//, '');
  assert.ok(existsSync(path.join(frontendRoot, relativePath)), `manifest start_url ${manifest.start_url} does not exist on disk`);
});
