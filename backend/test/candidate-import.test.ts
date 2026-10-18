import assert from 'node:assert';
import { test } from 'node:test';
import { parseCSV, parseFileBuffer, validateCandidateRows } from '../src/services/student-import.service';
import * as XLSX from 'xlsx';

test('parseCSV parses candidate CSV lines correctly', () => {
  const csv = `First Name,Last Name,Email,Phone,College Name,Branch,Year of Study
Rohan,Verma,rohan.verma@example.com,9876543210,National Institute,CSE,4th Year
Ananya,Roy,ananya.roy@example.com,9876543211,State Tech,ECE,3rd Year`;

  const rows = parseCSV(csv);
  assert.strictEqual(rows.length, 2);
  assert.strictEqual(rows[0].firstName, 'Rohan');
  assert.strictEqual(rows[0].email, 'rohan.verma@example.com');
  assert.strictEqual(rows[1].firstName, 'Ananya');
});

test('parseFileBuffer parses Excel .xlsx buffer correctly', () => {
  const data = [
    ['First Name', 'Last Name', 'Email', 'Phone', 'College Name', 'Branch', 'Year of Study'],
    ['Vikram', 'Singh', 'vikram.singh@example.com', '9988776655', 'IIT Delhi', 'CS', 'Final Year']
  ];
  const worksheet = XLSX.utils.aoa_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Candidates');
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  const rows = parseFileBuffer(buffer, 'students.xlsx');
  assert.strictEqual(rows.length, 1);
  assert.strictEqual(rows[0].firstName, 'Vikram');
  assert.strictEqual(rows[0].email, 'vikram.singh@example.com');
});

test('validateCandidateRows identifies invalid email formats and duplicates', async () => {
  const inputRows = [
    { firstName: 'Valid', lastName: 'User', email: 'valid.user@example.com' },
    { firstName: 'Invalid', lastName: 'Email', email: 'invalid-email-format' },
    { firstName: 'Duplicate', lastName: 'User', email: 'valid.user@example.com' }
  ];

  const results = await validateCandidateRows(inputRows);
  assert.strictEqual(results.length, 3);
  assert.strictEqual(results[0].status, 'VALID');
  assert.strictEqual(results[1].status, 'INVALID');
  assert.strictEqual(results[2].status, 'DUPLICATE');
});
