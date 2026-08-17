import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert';
import mongoose from 'mongoose';
import { connectTestDb, clearTestDb, disconnectTestDb } from '../testUtils/setupDb.js';
import { getLiveness, getReadiness } from '../controllers/healthController.js';

before(connectTestDb);
after(disconnectTestDb);
beforeEach(clearTestDb);

test('getLiveness returns 200 OK with status UP', () => {
  let statusCode = null;
  let jsonResponse = null;

  const req = {};
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      jsonResponse = data;
      return this;
    },
  };

  getLiveness(req, res);

  assert.strictEqual(statusCode, 200);
  assert.strictEqual(jsonResponse.status, 'UP');
  assert.ok(jsonResponse.timestamp);
});

test('getReadiness returns 200 OK when database is connected', () => {
  let statusCode = null;
  let jsonResponse = null;

  const req = {};
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      jsonResponse = data;
      return this;
    },
  };

  getReadiness(req, res);

  assert.strictEqual(statusCode, 200);
  assert.strictEqual(jsonResponse.status, 'UP');
  assert.strictEqual(jsonResponse.components.database.status, 'UP');
});
