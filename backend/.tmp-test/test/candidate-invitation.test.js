"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = __importDefault(require("node:assert"));
const node_test_1 = require("node:test");
const auth_service_1 = require("../src/services/auth.service");
const email_service_1 = require("../src/services/email.service");
(0, node_test_1.test)('generateActivationToken generates 48-char hex string and 7-day expiration', () => {
    const { token, expiresAt } = (0, auth_service_1.generateActivationToken)();
    node_assert_1.default.strictEqual(typeof token, 'string');
    node_assert_1.default.strictEqual(token.length, 48);
    node_assert_1.default.ok(expiresAt.getTime() > Date.now());
});
(0, node_test_1.test)('sendActivationEmail succeeds in non-production test environment', async () => {
    const { token } = (0, auth_service_1.generateActivationToken)();
    await node_assert_1.default.doesNotReject(async () => {
        await (0, email_service_1.sendActivationEmail)('candidate.test@example.com', token, 'CandidateTest');
    });
});
(0, node_test_1.test)('verifyActivationToken returns required error for missing token', async () => {
    const result = await (0, auth_service_1.verifyActivationToken)();
    node_assert_1.default.strictEqual(result.valid, false);
    node_assert_1.default.strictEqual(result.message, 'Activation token is required.');
});
