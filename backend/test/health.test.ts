import assert from 'node:assert/strict';
import test from 'node:test';
import request from 'supertest';
import app from '../src/app';

test('health endpoint responds without starting a listening server', async () => {
  const response = await request(app).get('/health');

  assert.equal(response.status, 200);
  assert.equal(response.body.status, 'OK');
});
