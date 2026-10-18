"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = __importDefault(require("node:assert"));
const node_test_1 = require("node:test");
const student_import_service_1 = require("../src/services/student-import.service");
const XLSX = __importStar(require("xlsx"));
(0, node_test_1.test)('parseCSV parses candidate CSV lines correctly', () => {
    const csv = `First Name,Last Name,Email,Phone,College Name,Branch,Year of Study
Rohan,Verma,rohan.verma@example.com,9876543210,National Institute,CSE,4th Year
Ananya,Roy,ananya.roy@example.com,9876543211,State Tech,ECE,3rd Year`;
    const rows = (0, student_import_service_1.parseCSV)(csv);
    node_assert_1.default.strictEqual(rows.length, 2);
    node_assert_1.default.strictEqual(rows[0].firstName, 'Rohan');
    node_assert_1.default.strictEqual(rows[0].email, 'rohan.verma@example.com');
    node_assert_1.default.strictEqual(rows[1].firstName, 'Ananya');
});
(0, node_test_1.test)('parseFileBuffer parses Excel .xlsx buffer correctly', () => {
    const data = [
        ['First Name', 'Last Name', 'Email', 'Phone', 'College Name', 'Branch', 'Year of Study'],
        ['Vikram', 'Singh', 'vikram.singh@example.com', '9988776655', 'IIT Delhi', 'CS', 'Final Year']
    ];
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Candidates');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    const rows = (0, student_import_service_1.parseFileBuffer)(buffer, 'students.xlsx');
    node_assert_1.default.strictEqual(rows.length, 1);
    node_assert_1.default.strictEqual(rows[0].firstName, 'Vikram');
    node_assert_1.default.strictEqual(rows[0].email, 'vikram.singh@example.com');
});
(0, node_test_1.test)('validateCandidateRows identifies invalid email formats and duplicates', async () => {
    const inputRows = [
        { firstName: 'Valid', lastName: 'User', email: 'valid.user@example.com' },
        { firstName: 'Invalid', lastName: 'Email', email: 'invalid-email-format' },
        { firstName: 'Duplicate', lastName: 'User', email: 'valid.user@example.com' }
    ];
    const results = await (0, student_import_service_1.validateCandidateRows)(inputRows);
    node_assert_1.default.strictEqual(results.length, 3);
    node_assert_1.default.strictEqual(results[0].status, 'VALID');
    node_assert_1.default.strictEqual(results[1].status, 'INVALID');
    node_assert_1.default.strictEqual(results[2].status, 'DUPLICATE');
});
