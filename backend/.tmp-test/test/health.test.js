"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importDefault(require("node:test"));
const supertest_1 = __importDefault(require("supertest"));
const app_1 = __importDefault(require("../src/app"));
(0, node_test_1.default)('health endpoint responds without starting a listening server', async () => {
    const response = await (0, supertest_1.default)(app_1.default).get('/health');
    strict_1.default.equal(response.status, 200);
    strict_1.default.equal(response.body.status, 'OK');
});
