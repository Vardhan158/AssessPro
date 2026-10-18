# API_SPEC.md — REST API Specification

> **Base URL**: `/api/v1`
> **Content-Type**: `application/json` (all requests & responses)
> **Auth**: `Authorization: Bearer <access_token>` on every protected route
> **Version**: All routes versioned under `/v1/`

---

## Global Response Envelope

```json
// Success
{
  "success": true,
  "data": { ... },
  "meta": { "page": 1, "total": 100 }   // optional, pagination
}

// Error
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable message",
    "details": [ ... ]                   // optional, field-level errors
  }
}
```

## Standard Error Codes

| Code | HTTP Status | Meaning |
|------|------------|---------|
| `VALIDATION_ERROR` | 400 | Zod schema failure |
| `UNAUTHORIZED` | 401 | Missing / invalid / expired token |
| `FORBIDDEN` | 403 | Authenticated but not permitted |
| `NOT_FOUND` | 404 | Resource does not exist |
| `CONFLICT` | 409 | Duplicate or state conflict |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server fault (no internal detail in prod) |

---

## 1. Auth Routes `/api/v1/auth`

### POST `/auth/login`
**Rate limit**: 10 requests/15 min per IP
```json
// Request
{ "email": "admin@example.com", "password": "Secret1234!" }

// Response 200 — MFA not enabled
{
  "success": true,
  "data": {
    "accessToken": "<jwt>",
    "user": { "id": "...", "email": "...", "role": "ADMIN", "firstName": "..." }
  }
}

// Response 200 — MFA required
{ "success": true, "data": { "mfaRequired": true, "tempToken": "<short-lived-jwt>" } }
```

### POST `/auth/mfa/verify`
**Rate limit**: 5 requests/5 min per IP
```json
// Request
{ "tempToken": "<short-lived-jwt>", "code": "123456" }

// Response 200
{ "success": true, "data": { "accessToken": "<jwt>" } }
// Sets httpOnly refresh token cookie: Set-Cookie: refreshToken=<token>; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth/refresh
```

### POST `/auth/refresh`
No body required. Reads `refreshToken` from httpOnly cookie.
```json
// Response 200
{ "success": true, "data": { "accessToken": "<new-jwt>" } }
```

### POST `/auth/logout`
**Auth required**. Revokes refresh token in DB + clears cookie.
```json
// Response 200
{ "success": true, "data": { "message": "Logged out" } }
```

### POST `/auth/activate`
One-time account activation for newly-created students.
```json
// Request
{ "token": "<activation-token>", "newPassword": "NewPass1234!" }

// Response 200
{ "success": true, "data": { "message": "Account activated" } }
```

### POST `/auth/forgot-password`
**Rate limit**: 3 requests/hour per email
```json
// Request
{ "email": "student@example.com" }

// Response 200 (always — do not reveal account existence)
{ "success": true, "data": { "message": "If an account exists, a reset link was sent." } }
```

### POST `/auth/reset-password`
```json
// Request
{ "token": "<reset-token>", "newPassword": "NewPass1234!" }
// Response 200
{ "success": true, "data": { "message": "Password reset successful" } }
```

---

## 2. Admin — Assessment Routes `/api/v1/admin/assessments`
**Auth**: ADMIN or SUPER_ADMIN

### GET `/admin/assessments`
Query params: `?status=OPEN&page=1&limit=20`
```json
// Response 200
{
  "success": true,
  "data": [ { "id": "...", "title": "...", "status": "OPEN", ... } ],
  "meta": { "page": 1, "limit": 20, "total": 5 }
}
```

### POST `/admin/assessments`
```json
// Request
{
  "title": "Backend Round 1",
  "description": "...",
  "accessWindowStart": "2026-11-01T09:00:00Z",
  "accessWindowEnd": "2026-11-01T12:00:00Z",
  "durationMinutes": 60,
  "maxAttempts": 1,
  "totalMarks": 50,
  "negativeMarking": { "enabled": true, "penaltyPerQuestion": 0.25 },
  "resultVisibility": { "showScore": true, "showAnswers": false },
  "integrityPolicy": {
    "tabSwitchWarningAt": 1,
    "tabSwitchFlagAt": 2,
    "tabSwitchAutoSubmitAt": 3,
    "requireCamera": true,
    "cameraSnapshotIntervalMinutes": 2
  }
}
// Response 201 — created assessment
```

### GET `/admin/assessments/:id`
Full assessment detail including eligibleStudentIds count.

### PATCH `/admin/assessments/:id`
Partial update. **Not allowed** if status is OPEN/CLOSED/RESULTS_PUBLISHED.
```json
// Request — any updatable fields
{ "title": "Updated Title", "durationMinutes": 90 }
```

### DELETE `/admin/assessments/:id`
Only allowed if status is DRAFT. Soft-delete.

### PATCH `/admin/assessments/:id/status`
```json
// Request
{ "status": "OPEN", "reason": "Starting assessment" }
// Validates state machine transition; writes AuditLog
```

### GET `/admin/assessments/:id/dashboard`
```json
// Response 200
{
  "registered": 150,
  "started": 120,
  "submitted": 95,
  "active": 25,
  "timedOut": 10,
  "flagged": 3,
  "completionRate": 79.2,
  "averageScore": 32.5,
  "scoreDistribution": { "0-10": 5, "11-20": 12, ... }
}
```

---

## 3. Admin — Candidate Routes `/api/v1/admin/candidates`

### POST `/admin/candidates/import/preview`
**Multipart form-data**. Field: `file` (xlsx), `assessmentId`.
**Rate limit**: 5 uploads/hour per admin
```json
// Response 200
{
  "success": true,
  "data": {
    "batchId": "...",
    "totalRows": 150,
    "validRows": 145,
    "duplicateRows": 3,
    "errorRows": 2,
    "errors": [
      { "row": 14, "field": "email", "message": "Invalid email format" },
      { "row": 27, "field": "studentId", "message": "Duplicate studentId" }
    ]
  }
}
```

### POST `/admin/candidates/import/commit`
Commits a PREVIEW batch after admin confirmation.
```json
// Request
{ "batchId": "..." }
// Response 200 — creates user accounts, sends activation emails
```

### GET `/admin/candidates/import/error-report/:batchId`
Returns row-level error report as downloadable JSON.

### POST `/admin/candidates/manual`
Add single candidate manually.
```json
// Request
{
  "assessmentId": "...",
  "firstName": "Rahul", "lastName": "Sharma",
  "email": "rahul@example.com", "studentId": "CS2024001",
  "collegeName": "NIT Trichy", "branch": "CSE",
  "reason": "Missed initial import due to typo in roll number"
}
// Response 201
```

### GET `/admin/candidates`
Query: `?assessmentId=...&page=1&limit=50&search=rahul`

### PATCH `/admin/candidates/:studentProfileId/eligibility`
Toggle eligibility for a specific assessment.
```json
// Request
{ "assessmentId": "...", "eligible": false, "reason": "Withdrawn from process" }
```

---

## 4. Admin — Question Bank `/api/v1/admin/questions`

### GET `/admin/questions`
Query: `?status=ACTIVE&topic=Arrays&difficulty=MEDIUM&page=1&limit=50`

### POST `/admin/questions`
```json
// Request
{
  "questionText": "What is the time complexity of binary search?",
  "options": [
    { "id": "A", "text": "O(n)" },
    { "id": "B", "text": "O(log n)" },
    { "id": "C", "text": "O(n log n)" },
    { "id": "D", "text": "O(1)" }
  ],
  "correctOptionId": "B",
  "explanation": "Binary search halves the search space at each step.",
  "topic": "Algorithms",
  "difficulty": "EASY",
  "marksIfCorrect": 1
}
// Response 201
```

### GET `/admin/questions/:id`
Full question including `correctOptionId` (admin only).

### PATCH `/admin/questions/:id`
Creates a new version if used in an active paper. Retires old version.

### PATCH `/admin/questions/:id/status`
```json
{ "status": "RETIRED" }
```

### POST `/admin/assessments/:id/paper-versions`
Generate and save a PaperVersion (assigns question set to assessment).
```json
// Request
{
  "questionIds": ["id1", "id2", "..."],  // exactly 50 IDs
  "versionLabel": "SET-A",
  "shuffleOptions": true
}
// Response 201 — PaperVersion created (immutable from this point)
```

---

## 5. Admin — Incident Review `/api/v1/admin/incidents`

### GET `/admin/incidents`
Query: `?assessmentId=...&reviewStatus=PENDING&page=1&limit=50`

### GET `/admin/incidents/:id`
Full incident detail including metadata.

### PATCH `/admin/incidents/:id/review`
```json
// Request
{
  "reviewStatus": "REVIEWED_FLAGGED",
  "reviewNote": "Student was clearly on another tab. Warning issued."
}
// Response 200 — writes AuditLog
```

---

## 6. Admin — Results & Export `/api/v1/admin/results`

### GET `/admin/results/:assessmentId`
Full results list for an assessment (admin only).
Query: `?page=1&limit=100&status=SCORED`

### PATCH `/admin/results/:assessmentId/publish`
Releases results to students.
```json
{ "showScore": true, "showAnswers": false }
```

### GET `/admin/export/:assessmentId`
Triggers Excel export generation.
```json
// Response 200
{
  "success": true,
  "data": { "downloadUrl": "/api/v1/admin/export/download/exportJobId" }
}
```
Export audit log entry written automatically.

### GET `/admin/export/download/:exportId`
Streams the Excel file. Auth required. Logs download event.

---

## 7. Admin — Audit Logs `/api/v1/admin/audit`

### GET `/admin/audit`
Query: `?action=ASSESSMENT_STATUS_CHANGED&actorId=...&from=2026-10-01&to=2026-10-31&page=1&limit=50`

---

## 8. Student — Dashboard `/api/v1/student/dashboard`

### GET `/student/dashboard`
```json
// Response 200
{
  "success": true,
  "data": {
    "profile": { "firstName": "...", "studentId": "...", "branch": "..." },
    "assessments": [
      {
        "id": "...",
        "title": "Backend Round 1",
        "status": "OPEN",
        "accessWindowStart": "...",
        "accessWindowEnd": "...",
        "durationMinutes": 60,
        "eligibility": true,
        "attemptStatus": null,   // null if not started
        "canStart": true
      }
    ]
  }
}
```

---

## 9. Student — Exam Attempt `/api/v1/student/attempts`

### POST `/student/attempts/start`
**Atomically creates attempt; idempotent (returns existing IN_PROGRESS attempt).**
```json
// Request
{ "assessmentId": "..." }

// Response 201
{
  "success": true,
  "data": {
    "attemptId": "...",
    "deadlineAt": "2026-11-01T10:05:00Z",
    "serverTime": "2026-11-01T09:05:00Z",
    "paper": {
      "questions": [
        {
          "id": "questionId",
          "questionText": "...",
          "options": [ { "id": "A", "text": "..." }, ... ]
          // NOTE: correctOptionId is NEVER included here
        }
      ]
    },
    "savedAnswers": {}   // empty on fresh start, populated on resume
  }
}
```

### POST `/student/attempts/:attemptId/answer`
Autosave a single answer.
**Rate limit**: 60 requests/min per student (debounce on client too)
```json
// Request
{ "questionId": "...", "selectedOptionId": "B" }

// Response 200
{ "success": true, "data": { "savedAt": "2026-11-01T09:07:00Z" } }
```

### POST `/student/attempts/:attemptId/submit`
**Idempotent**: submitting an already-submitted attempt returns the existing result.
```json
// Request — no body required
// Response 200
{
  "success": true,
  "data": {
    "status": "SUBMITTED",
    "submittedAt": "2026-11-01T09:59:32Z",
    "message": "Your exam has been submitted successfully."
    // score/answers only if resultVisibility.showScore is true AND results published
  }
}
```

### POST `/student/attempts/:attemptId/heartbeat`
Called every 30 seconds to indicate student is active.
```json
// Request — no body
// Response 200
{ "success": true, "data": { "serverTime": "...", "deadlineAt": "..." } }
```

### POST `/student/attempts/:attemptId/incident`
Student-side event reporting (tab switch, fullscreen exit, etc.)
**Rate limit**: 30 requests/min per attempt
```json
// Request
{ "type": "TAB_SWITCH", "occurredAt": "2026-11-01T09:15:00Z", "metadata": {} }

// Response 200
{
  "success": true,
  "data": {
    "tabSwitchCount": 2,
    "warning": "Warning: You have switched tabs 2 times. Switching 1 more time will auto-submit your exam.",
    "shouldAutoSubmit": false
  }
}
```

---

## 10. Student — Results `/api/v1/student/results`

### GET `/student/results/:assessmentId`
Only returns data if assessment status is RESULTS_PUBLISHED and resultVisibility permits.
```json
// Response 200
{
  "success": true,
  "data": {
    "score": 38,
    "maxScore": 50,
    "percentage": 76,
    "status": "SUBMITTED",
    "submittedAt": "...",
    "breakdown": [                    // only if showAnswers: true
      { "questionId": "...", "selected": "B", "correct": "B", "isCorrect": true }
    ]
  }
}
```

---

## 11. Rate Limit Summary

| Endpoint Group | Limit |
|----------------|-------|
| POST `/auth/login` | 10 req / 15 min / IP |
| POST `/auth/mfa/verify` | 5 req / 5 min / IP |
| POST `/auth/forgot-password` | 3 req / hour / email |
| POST `/admin/candidates/import/preview` | 5 req / hour / admin |
| POST `/student/attempts/start` | 3 req / 5 min / student |
| POST `/student/attempts/:id/answer` | 60 req / min / student |
| POST `/student/attempts/:id/incident` | 30 req / min / attempt |
| All other authenticated routes | 200 req / min / user |
| All unauthenticated routes | 30 req / min / IP |
