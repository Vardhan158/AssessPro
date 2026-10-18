# TESTING_STRATEGY.md — Testing Strategy & Acceptance Criteria

---

## 1. Test Pyramid

```
         ┌───────────────┐
         │   E2E Tests   │  ~20 scenarios (Playwright)
         ├───────────────┤
         │  API / Intg.  │  ~80 tests (Supertest + Vitest)
         ├───────────────┤
         │  Unit Tests   │  ~150 tests (Vitest)
         └───────────────┘
```

---

## 2. Unit Tests (Vitest)

### 2.1 Scoring Service
```typescript
// server/src/services/__tests__/scoring.service.test.ts
import { describe, it, expect, vi } from 'vitest';
// Mock Answer and PaperVersion models
// Test: all correct → full marks
// Test: all incorrect with negative marking → score = 0 (floor)
// Test: mixed → correct arithmetic
// Test: unanswered → no penalty
// Test: negative marking disabled → no deduction
```

**Acceptance criteria**:
- Score matches hand-calculated reference for all test cases
- Score never goes below 0

### 2.2 Auth Service
```typescript
// Test: valid credentials → access token + refresh token issued
// Test: wrong password → UNAUTHORIZED (no info about which field is wrong)
// Test: 5 bad attempts → account locked
// Test: locked account → UNAUTHORIZED with lock message
// Test: activation token reuse → error
// Test: expired activation token → error
```

### 2.3 Attempt State Machine
```typescript
// Test: start attempt → IN_PROGRESS
// Test: start again (idempotent) → same attempt returned
// Test: start when ineligible → FORBIDDEN
// Test: start when assessment CLOSED → CONFLICT
// Test: start after maxAttempts → CONFLICT
// Test: submit → SUBMITTED
// Test: double submit → idempotent, same result
// Test: submit after TIMED_OUT → returns TIMED_OUT status
```

### 2.4 Import Service — Row Validation
```typescript
// Test: valid row → no errors
// Test: missing email → error on that row
// Test: invalid email format → error
// Test: formula injection cell → prefixed with '
// Test: duplicate studentId within file → error
// Test: row count > 500 → error
```

---

## 3. API Integration Tests (Supertest + Vitest)

### Setup
```typescript
// server/src/test/setup.ts
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { connectDB } from '../config/db';
import { createApp } from '../app';
import request from 'supertest';

let replSet: MongoMemoryReplSet;

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  process.env.MONGODB_URI = replSet.getUri();
  await connectDB();
});

afterAll(async () => {
  await mongoose.disconnect();
  await replSet.stop();
});
```

### 3.1 Auth Flow
```typescript
describe('POST /api/v1/auth/login', () => {
  it('returns 401 for wrong password');
  it('returns 200 + accessToken for valid credentials');
  it('sets httpOnly refreshToken cookie');
  it('returns 429 after 10 rapid login attempts');
  it('does not reveal account existence in forgot-password');
});

describe('POST /api/v1/auth/refresh', () => {
  it('returns new accessToken with valid refresh cookie');
  it('returns 401 with revoked refresh token');
  it('returns 401 with expired refresh token');
});
```

### 3.2 Access Control Tests
```typescript
describe('Vertical privilege escalation', () => {
  it('student calling GET /admin/questions returns 403');
  it('student calling POST /admin/assessments returns 403');
  it('unauthenticated call to any /admin/* returns 401');
});

describe('Horizontal privilege escalation (IDOR)', () => {
  it('student A cannot GET student B\'s attempt');
  it('student A cannot POST to student B\'s attempt/submit');
  it('student cannot access another student\'s results');
});
```

### 3.3 Exam Flow
```typescript
describe('Full exam lifecycle', () => {
  let adminToken: string;
  let studentToken: string;
  let assessmentId: string;
  let attemptId: string;

  it('admin creates assessment');
  it('admin creates paper version with 50 questions');
  it('admin changes status to OPEN');
  it('student starts attempt — returns paper without correctOptionId');
  it('student saves answers incrementally');
  it('student submits — score calculated server-side');
  it('admin publishes results');
  it('student views own result');
  it('answer key not visible in student result API');
});
```

### 3.4 Import Flow
```typescript
describe('Excel import', () => {
  it('preview returns row-level errors for invalid rows');
  it('formula injection in name is sanitised');
  it('duplicate studentId across rows flagged');
  it('commit creates user accounts and sends activation emails');
  it('committing twice is idempotent');
  it('uploaded file > 10MB is rejected');
  it('.exe file disguised as .xlsx is rejected');
});
```

### 3.5 Incident & Auto-Submit
```typescript
describe('Tab switch incident', () => {
  it('1st tab switch records incident and returns warning');
  it('2nd tab switch records incident and returns flag warning');
  it('3rd tab switch triggers auto-submit');
  it('after auto-submit, attempt status is SUBMITTED');
});
```

---

## 4. End-to-End Tests (Playwright)

### 4.1 Test file structure
```
client/e2e/
  auth.spec.ts
  admin-assessment.spec.ts
  admin-import.spec.ts
  student-exam.spec.ts
  student-results.spec.ts
  proctoring.spec.ts
```

### 4.2 Student Exam E2E
```typescript
// client/e2e/student-exam.spec.ts
import { test, expect } from '@playwright/test';

test('complete exam flow', async ({ page }) => {
  // 1. Login as student
  await page.goto('/login');
  await page.fill('[id="email-input"]', 'student@example.com');
  await page.fill('[id="password-input"]', 'Test@123456');
  await page.click('[id="login-btn"]');
  await expect(page).toHaveURL('/student/dashboard');

  // 2. See available assessment
  await expect(page.locator('[id="assessment-card"]')).toBeVisible();

  // 3. Start exam — camera permission mock
  await page.context().grantPermissions(['camera', 'microphone']);
  await page.click('[id="start-exam-btn"]');
  await expect(page).toHaveURL(/\/student\/exam\//);

  // 4. Verify timer is visible
  await expect(page.locator('[id="exam-timer"]')).toBeVisible();

  // 5. Answer first question
  await page.click('[id="option-A"]');
  await expect(page.locator('[id="save-status"]')).toContainText('Saved');

  // 6. Submit exam
  await page.click('[id="submit-exam-btn"]');
  await page.click('[id="confirm-submit-btn"]');
  await expect(page.locator('[id="submission-confirmation"]')).toBeVisible();
});

test('tab switch triggers warning', async ({ page, context }) => {
  // ... setup ...
  // Open a second page (simulates tab switch via visibility API)
  const page2 = await context.newPage();
  await page2.goto('about:blank');
  await page.bringToFront();
  await expect(page.locator('[id="tab-switch-warning"]')).toBeVisible();
});

test('answer key not visible in page source', async ({ page }) => {
  // After exam starts, check page HTML does not contain 'correctOptionId'
  const html = await page.content();
  expect(html).not.toContain('correctOptionId');
});
```

---

## 5. Security Tests

### 5.1 Manual / Automated OWASP Tests
Run these before any real exam:

```bash
# OWASP ZAP baseline scan (Docker)
docker run -t ghcr.io/zaproxy/zaproxy:stable zap-baseline.py \
  -t http://localhost:5000 \
  -r zap-report.html

# Check for SQL/NoSQL injection in key endpoints
# Check for missing auth headers
# Check CORS misconfiguration
```

### 5.2 JWT Tampering Tests
```typescript
// Manually craft JWT with role: 'ADMIN' and student secret
// Expect 401 Unauthorized
```

### 5.3 Answer Key Extraction Tests
```typescript
// GET /api/v1/admin/questions/:id with student token → 403
// GET /api/v1/student/attempts/:id with admin token → check correctOptionId absent
// Inspect WebSocket/polling for correctOptionId leakage
```

---

## 6. Reliability Tests

### 6.1 Submission Race Condition
```typescript
// Simultaneously send 5 submit requests for same attemptId
// All must return same result; only one SUBMITTED entry in DB
```

### 6.2 Autosave + Network Failure
```typescript
// Student saves answer; server returns 500
// Retry must not create duplicate answer
// Student sees save-failed indicator
```

### 6.3 Exam Resume After Disconnect
```typescript
// Student starts exam; simulate network disconnect (intercept)
// Student reopens browser and logs back in
// GET /student/attempts/start (idempotent) → returns existing attempt with saved answers
// Timer is correct (server time - start time)
```

### 6.4 Clock Skew
```typescript
// Set client clock 30 minutes ahead
// Timer must use server-calculated deadlineAt (not client clock)
// Submission after real deadline must be rejected
```

---

## 7. Load Test (k6)

```javascript
// load-test/exam-concurrent.js
import http from 'k6/http';
import { sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 500 },  // target: 500 concurrent students
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],    // 95th percentile < 500ms
    http_req_failed:   ['rate<0.01'],    // error rate < 1%
  },
};

export default function () {
  // Simulate student autosave every 30 seconds
  http.post(`${__ENV.BASE_URL}/api/v1/student/attempts/${__ENV.ATTEMPT_ID}/answer`, 
    JSON.stringify({ questionId: 'q1', selectedOptionId: 'A' }),
    { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${__ENV.TOKEN}` } }
  );
  sleep(30);
}
```

Run: `k6 run --env BASE_URL=http://localhost:5000 --env TOKEN=<jwt> load-test/exam-concurrent.js`

---

## 8. CI Configuration (`.github/workflows/ci.yml`)

```yaml
name: CI
on:
  pull_request:
    branches: [main, develop]

jobs:
  test-server:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: cd server && npm ci
      - run: cd server && npm run lint
      - run: cd server && npm test
        env:
          NODE_ENV: test

  test-client:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: cd client && npm ci
      - run: cd client && npm run lint
      - run: cd client && npm run build   # validates TS compilation

  e2e:
    needs: [test-server, test-client]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: docker-compose -f docker-compose.test.yml up -d
      - run: cd client && npm ci && npx playwright install --with-deps
      - run: cd client && npx playwright test
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: client/playwright-report/
```
