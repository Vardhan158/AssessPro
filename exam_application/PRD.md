# Product Requirements Document
# Secure Online Interview Assessment Platform

**Version:** 1.0  
**Status:** Build-ready product definition  
**Primary users:** Students, Administrators, Super Administrators  
**Technology baseline:** React + TypeScript, Node.js 20 + Express + TypeScript, MongoDB, Redis, Docker, Nginx

## 1. Product vision

Provide a secure, auditable platform for organizations to run first-round technical interview assessments. Administrators define assessments, questions, candidates, eligibility, timing, integrity rules, and result publication. Students complete controlled MCQ exams. Super administrators govern the platform, users, security, and operational configuration.

The browser is never authoritative. The server owns identity, eligibility, assessment state, paper assignment, deadlines, answers, scoring, submission, result visibility, and audit history.

## 2. Goals and non-goals

### Goals

- Run scheduled, timed, repeat-safe MCQ assessments.
- Support candidate onboarding by XLSX import or manual entry.
- Support a reusable, versioned question bank and immutable paper versions.
- Provide autosave, resume after disconnection, server-synchronised timers, and idempotent submission.
- Record integrity events such as tab switches and fullscreen exits without automatically declaring misconduct.
- Calculate scores only from server-side answer keys and saved answers.
- Let administrators review incidents, publish results, export reports, and inspect audit history.
- Provide strong authentication, role-based access control, rate limiting, secure sessions, validation, and operational recovery.

### Out of scope for v1

- Subjective/free-text answers, coding execution, or live interview video calls.
- AI-based proctoring or automatic misconduct verdicts.
- Native mobile applications.
- Payments, subscriptions, public candidate registration, social login, and multi-tenant billing.
- Real-time chat or human invigilation workflow.

## 3. Roles and permissions

### Student

Can activate and manage their own account, view their own profile and eligible assessments, start or resume one permitted attempt, answer questions, receive integrity warnings, submit, and view results only after publication and according to visibility settings. Cannot access answer keys, other students, admin routes, or another student’s attempt.

### Administrator

Can create and manage assessments, candidates, eligibility, questions, paper versions, incidents, results, exports, and operational audit views. Admin actions are limited to the organization’s assessment workflow. Every state-changing action is audited.

### Super Administrator

Has all administrator capabilities plus platform governance: create, activate, suspend, or reset administrators; enforce administrator MFA; configure global security, rate limits, retention, and feature settings; inspect platform-wide audit logs and health; manage role assignments; and perform controlled recovery or support actions. Super-admin actions require explicit audit entries and must not expose student answer keys unnecessarily.

The current source implementation seeds a super-admin optionally, but the data model and route contract should be extended with explicit super-admin management endpoints before production.

## 4. Core domain objects

- **User:** email, password hash, role, status, names, phone, activation/reset tokens, lockout counters, timestamps.
- **StudentProfile:** one-to-one with User; unique student ID, institution, branch, year, phone, eligibility tags.
- **Assessment:** title, code, description, access window, duration, max attempts, marks, negative marking, result visibility, integrity policy, eligibility rules, lifecycle status.
- **Question:** versionable MCQ with options, correct option, explanation, topic, difficulty, marks, active/retired state.
- **PaperVersion:** immutable snapshot of questions/options/answers assigned to an assessment; no edits after creation.
- **Attempt:** one student’s execution of a paper; start/deadline, status, submission, score, percentage, pass flag, finalisation reason.
- **Answer:** one autosaved answer per attempt/question; selected option, marked-for-review flag, timestamps.
- **Incident:** integrity event, event time, metadata, severity/review status, reviewer and review note.
- **ImportBatch:** uploaded file, preview/commit state, row counts, validation errors, creator, assessment association.
- **AuditLog:** append-only actor/action/resource/before-after/reason/time record; never update or delete through the app.
- **RefreshToken:** hashed, revocable, expiring session token record.

## 5. Assessment lifecycle

Required state machine:

`DRAFT → SCHEDULED/OPEN → PAUSED → OPEN → CLOSED → RESULTS_PUBLISHED`

Allowed transitions must be validated server-side. Invalid transitions return `409 CONFLICT` and create no state change. Drafts may be edited or soft-deleted. Once open, closed, or published, configuration that affects fairness must be locked; corrections require a new assessment or controlled super-admin intervention. Every transition records actor, reason, prior state, new state, and timestamp.

An assessment cannot open unless it has a valid paper version and configured rules. The access window determines eligibility to start; the attempt deadline is calculated as `startedAt + durationMinutes`, bounded by the assessment close time according to the business rule selected by the product owner.

## 6. Student user journey

### 6.1 Account activation and authentication

1. Student is created by import or manual admin registration.
2. Student receives a one-time activation link/token.
3. Student sets a strong password; token becomes unusable.
4. Student logs in with email/password.
5. Server returns a short-lived access token and sets a secure, HTTP-only refresh cookie.
6. On expiry, the client silently refreshes; logout revokes the refresh token and clears the cookie.
7. Forgot-password always returns the same response whether the email exists.

Screens: login, activation, forgot password, reset password, session-expired/error states.

### 6.2 Student dashboard

After login, show:

- Student name, ID, email, institution, branch, year, and account status.
- Assessment cards with title, code, schedule, duration, marks, status, eligibility, attempt usage, and action.
- Actions: Start, Resume, View Results, or disabled reason.
- Clear status for upcoming, open, paused, closed, submitted, timed out, and ineligible assessments.

The API must calculate eligibility and attempt status from database state. The UI must not infer permission solely from hidden buttons.

### 6.3 Pre-exam flow

1. Student selects an eligible open assessment.
2. Show instructions, duration, marks, negative marking, attempt policy, integrity policy, camera/microphone requirements, and privacy notice.
3. Request camera/microphone permission when required over HTTPS.
4. Student confirms readiness.
5. Server atomically creates or returns the existing in-progress attempt.
6. Server returns a paper snapshot without `correctOptionId`, a server time, deadline, and saved answers.

### 6.4 Exam-taking flow

- Show one-question or paginated MCQ interface with question navigator.
- Support select option, clear option, mark for review, next/previous, and progress indicators.
- Debounce answer autosave and display Saved, Saving, or Save failed state.
- Send heartbeat every 30 seconds.
- Calculate the visible timer using server time/deadline, not the client clock.
- Warn before deadline and preserve answers during reconnect/resume.
- Record tab switches, fullscreen exits, camera status changes, and other configured integrity events.
- Apply policy thresholds: warning, flag/review, and optional auto-submit.

### 6.5 Submission and timeout

1. Student chooses Submit.
2. UI shows a confirmation with answered/unanswered counts.
3. Server validates ownership, status, and deadline.
4. Server computes the result from the immutable paper and saved answers.
5. Submission is idempotent; repeated requests return the same final state.
6. Timeout job, expired heartbeat, or integrity auto-submit finalises the attempt with a reason.
7. Student sees a submission receipt; score is shown only if allowed.

### 6.6 Results

Student may see results only when the assessment is published and visibility permits it:

- Score only: score, maximum, percentage, pass/fail, status, submission time.
- Score and answers: permitted question breakdown, selected answer, correct answer, and correctness.
- Hidden/not published: status and publication message only.

Never return answer keys on exam-start, dashboard, heartbeat, autosave, or unpublished-result responses.

## 7. Administrator journey

### 7.1 Admin authentication and home

Admin logs in, completes MFA when enabled, and lands on an operational dashboard showing assessment counts, active attempts, pending incidents, completion rates, recent activity, and system warnings.

### 7.2 Create and configure an assessment

Admin creates a draft with:

- Title, description, unique code.
- Access start/end and timezone policy.
- Duration and max attempts.
- Total marks, pass threshold, negative marking.
- Result visibility and publication mode.
- Integrity settings: tab-switch warning/flag/auto-submit thresholds, camera requirement, microphone requirement, snapshot interval, fullscreen policy.
- Eligibility tags or explicit candidate assignment.

Admin saves draft, previews configuration, and cannot open until validation passes.

### 7.3 Question bank and paper creation

Admin can search/filter questions by topic, difficulty, status, and page. Create/edit/retire questions with four options, correct option, explanation, marks, and metadata. If a question is used by an active paper, editing creates a new version rather than mutating the historical content.

Admin selects the required question set, configures question/option shuffling, previews the paper, and generates an immutable PaperVersion. The system must validate that all questions are active, unique, complete, and compatible with the assessment.

### 7.4 Candidate import and eligibility

Import workflow:

1. Upload XLSX within file-size/type limits.
2. Validate magic bytes, headers, row count, required fields, email format, duplicate email/student ID, and formula injection.
3. Show valid, duplicate, and invalid row counts plus downloadable row-level errors.
4. Admin confirms commit.
5. Create or reconcile users and student profiles, assign assessment eligibility, and send activation invitations.
6. Make commit idempotent and preserve batch audit history.

Manual registration requires student ID, name, and email, with optional institution details and reason. Admin can toggle assessment eligibility with a required reason.

### 7.5 Open and operate the assessment

Admin reviews readiness checklist: paper exists, candidates assigned, dates valid, duration valid, integrity settings valid, and notification plan complete. Admin changes status with a reason. During operation, the dashboard shows registered, started, active, submitted, timed out, flagged, completion rate, average score, and score distribution.

Admin may pause or close according to the state machine. Closing must not corrupt in-progress attempts; the configured deadline/finalisation rule must be applied consistently and audited.

### 7.6 Incident review

Admin filters incidents by assessment, type, severity, status, student, and time. Detail view includes event metadata, count progression, attempt context, and prior incidents. Admin marks pending incidents reviewed/flagged/cleared and adds a note. The system must not automatically make a misconduct verdict from a browser event alone.

### 7.7 Results, publication, and export

Admin reviews scored attempts, statuses, scores, pass/fail, submission reasons, and incident indicators. Admin publishes results with explicit score/answer visibility. Publication is audited and should be irreversible or require a super-admin controlled correction workflow.

Admin requests an Excel export containing candidate results, incident review, and export metadata. Export generation, download, actor, filters, and timestamps are audited. Files are protected and not publicly served.

### 7.8 Audit log

Admin can search permitted audit records by action, actor, resource, date range, assessment, and student. Sensitive values such as passwords, tokens, and unnecessary PII must never be logged.

## 8. Super-administrator journey

### 8.1 Platform administration

Super admin can:

- View platform health, API/database/Redis status, job status, latency, errors, and capacity.
- Create, edit, activate, suspend, unlock, or reset administrator accounts.
- Assign or revoke ADMIN/SUPER_ADMIN roles with reason and confirmation.
- Require MFA for all administrators and rotate platform secrets through deployment configuration.
- Configure global rate limits, allowed origins, upload limits, retention periods, and feature flags.
- View platform-wide assessments, candidates, attempts, incidents, exports, and audit events.

### 8.2 Controlled recovery

Super admin may unlock a user, correct a candidate-to-assessment assignment, rerun a failed import, or trigger a safe operational job. These operations require reason, before/after values, actor identity, and elevated confirmation. Direct score or answer editing is prohibited; corrections require an auditable reprocessing/versioned workflow.

### 8.3 Governance and production readiness

Before a real exam, super admin confirms security checklist completion, privacy notice approval, named business/assessment/technical owners, backups and recovery test, monitoring/alerting, rotated secrets, production mode, and scoring verification against a hand-calculated paper.

## 9. Functional requirements

### Authentication and security

- JWT access token expiry no longer than 15 minutes.
- Refresh tokens stored hashed, revocable, expiring, and delivered only in secure HTTP-only SameSite cookies.
- Passwords hashed with bcrypt/Argon2; failed-login lockout after configured threshold.
- Optional/required TOTP MFA for administrators; encrypt MFA secrets at rest.
- Explicit role and resource authorization on every protected route.
- Zod validation, NoSQL-injection defense, output encoding, secure headers, strict production CORS, CSRF protection where cookie-authenticated actions require it.
- Rate limits: login 10/15m/IP, MFA 5/5m/IP, password recovery 3/hour/email, import 5/hour/admin, attempt start 3/5m/student, answer save 60/min/student, incident 30/min/attempt, other authenticated 200/min/user.

### Exam integrity

- Unique attempt constraint per student/assessment/max-attempt rule.
- Server deadline and authoritative time.
- Idempotent start, autosave retry, submit, timeout, and import commit.
- No `correctOptionId` in student payloads.
- Immutable PaperVersion and server-side scoring.
- Background timeout sweep at least every minute; current implementation uses a 30-second sweep.
- Incident rate limiting and append-only incident history.

### Files and exports

- Accept only XLSX/XLS with magic-byte validation and maximum 10 MB default.
- Store uploads outside the public web root.
- Sanitize spreadsheet formula injection on import/export.
- Export must include candidate results, incident review, and metadata, with access-controlled download.

## 10. API contract

Base URL: `/api/v1`. Success envelope: `{ success, data, meta? }`. Error envelope: `{ success: false, error: { code, message, details? } }`.

Required route groups:

- `/auth`: login, MFA verify, refresh, logout, activate, forgot password, reset password.
- `/admin/assessments`: list/create/detail/update/delete/status/dashboard.
- `/admin/candidates`: import preview/commit/error report, manual registration, list, eligibility.
- `/admin/questions`: list/create/detail/update/status and assessment paper-version generation.
- `/admin/incidents`: list/detail/review.
- `/admin/results`: list and publish.
- `/admin/export`: generate/download.
- `/admin/audit`: filtered audit search.
- `/student/dashboard`, `/student/profile`.
- `/student/attempts`: start, answer, submit, heartbeat, incident.
- `/student/results/:assessmentId`.
- `/health` for operational health checks.

All list endpoints require pagination and bounded limits. Error codes are `VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `RATE_LIMITED`, and `INTERNAL_ERROR`.

## 11. User interface requirements

### Shared

Responsive desktop-first UI, accessible keyboard navigation, visible loading/error/empty states, confirmation for destructive or irreversible actions, toast plus inline validation, session expiry handling, and role-aware navigation.

### Student screens

Login, activation, forgot/reset password, dashboard, profile, assessment instructions, camera/mic readiness, exam workspace, incident warning, submit confirmation, submission receipt, and results.

### Admin screens

Admin dashboard, assessment list/detail/wizard, question bank/editor, paper builder/preview, candidate list/import preview/manual form, eligibility management, live assessment dashboard, incident queue/detail/review, results table/publication, export center, and audit explorer.

### Super-admin screens

Platform dashboard, administrator management, role/MFA controls, global settings, system health/jobs, platform-wide audit log, retention/backup status, and controlled recovery tools.

## 12. Non-functional requirements

- Target at least 500 concurrent students with p95 API latency below 500 ms and error rate below 1% during load test.
- Use MongoDB replica set in production, Redis for rate limiting/queues, Docker multi-stage builds, Nginx TLS termination, and graceful shutdown.
- Daily MongoDB backups, 30-day retention, off-host/S3 sync, and tested restore procedure.
- Structured logs, health checks, metrics, alerts for error rate/latency/disk/database/Redis/job failures.
- HTTPS/TLS 1.2+, HSTS, CSP, X-Frame-Options/frame-ancestors, nosniff, strict referrer policy.
- Camera/snapshot access restricted to authorized administrators; retention and deletion policy must be documented and enforced.

## 13. Acceptance criteria

### Student

- Student can activate, login, see only eligible assessments, and cannot access admin data or answer keys.
- Starting twice returns one attempt; refresh/reconnect resumes the same attempt and saved answers.
- Timer remains correct when client clock changes.
- Autosave retry does not create duplicate answers.
- Submit twice returns the same final result.
- Timeout and configured incident threshold finalise the attempt safely.
- Results are unavailable before publication and obey score/answer visibility.

### Admin

- Admin can create a complete assessment, import candidates with preview/commit, build an immutable paper, open/close it, review live metrics, review incidents, publish results, export results, and inspect audit history.
- Draft-only deletion and state transition rules are enforced server-side.
- Invalid imports identify exact rows/fields and do not partially commit without confirmation.

### Super admin

- Super admin can govern admin accounts, roles, MFA, global settings, health, and platform-wide audit data.
- Elevated recovery operations require a reason and immutable audit record.
- No role can directly mutate historical answers, paper versions, scores, or audit logs.

## 14. Test plan and release gate

Build approximately 150 unit tests, 80 API/integration tests, and 20 Playwright E2E scenarios. Cover auth, lockout, MFA, access control/IDOR, scoring, state machines, import validation, formula injection, file validation, exam lifecycle, incidents, race-safe submission, reconnect/resume, clock skew, answer-key leakage, rate limits, and production security headers. Run OWASP ZAP baseline, JWT tampering, load tests, backup restore, and a privacy/security review before launch.

Release is blocked until all security checklist items pass, independent or qualified internal penetration review is complete, privacy notice is approved, owners sign off, backups restore successfully, monitoring is active, secrets are rotated, production mode is verified, and scoring matches a hand-calculated reference paper.

## 15. Recommended implementation order

1. Monorepo, environment validation, logging, errors, database, Redis, Docker.
2. Models, indexes, migrations, seed data, and audit foundation.
3. Auth, sessions, MFA, role guards, and rate limits.
4. Assessment state machine, question bank, paper versions, and admin APIs.
5. Attempt creation, answer autosave, timer, scoring, submission, timeout worker.
6. Incident service and integrity UI.
7. Import/export services and admin workflows.
8. Student UI and exam workspace.
9. Admin UI and super-admin UI.
10. Automated tests, security review, load test, deployment, monitoring, and operational runbook.

## 16. Source reconciliation decisions

- The documents use both `server/client` and the repository’s current `backend/frontend` naming. The implementation should use the actual repository names while retaining the logical separation.
- The API examples use both `accessWindowStart/accessWindowEnd` and the current model’s `openAt/closeAt`; choose one public contract and map it consistently.
- The source model uses `studentId`; remove any legacy `registrationNumber` database index through a migration.
- The source documents describe ADMIN and SUPER_ADMIN permissions but provide fewer super-admin routes. Implement the super-admin governance module explicitly before production.
- The source references Redis and optional snapshot/proctoring infrastructure; local development may stub these, but production must provide the controls and retention policy.
