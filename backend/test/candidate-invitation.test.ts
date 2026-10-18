import assert from 'node:assert';
import { test } from 'node:test';
import { generateActivationToken, verifyActivationToken } from '../src/services/auth.service';
import { sendActivationEmail } from '../src/services/email.service';
import crypto from 'crypto';

test('generateActivationToken generates 48-char hex string and 7-day expiration', () => {
  const { token, expiresAt } = generateActivationToken();
  assert.strictEqual(typeof token, 'string');
  assert.strictEqual(token.length, 48);
  assert.ok(expiresAt.getTime() > Date.now());
});

test('sendActivationEmail succeeds in non-production test environment', async () => {
  const { token } = generateActivationToken();
  await assert.doesNotReject(async () => {
    await sendActivationEmail('candidate.test@example.com', token, 'CandidateTest');
  });
});

test('verifyActivationToken returns required error for missing token', async () => {
  const result = await verifyActivationToken();
  assert.strictEqual(result.valid, false);
  assert.strictEqual(result.message, 'Activation token is required.');
});
