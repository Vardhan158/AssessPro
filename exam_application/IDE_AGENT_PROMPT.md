# IDE AGENT PROMPT — Copy and paste this entire block into your AI IDE

---

## TASK: Build a Secure Online Interview Assessment Platform (MERN Stack)

You are an expert full-stack engineer. Your task is to build a complete, production-grade, secure online MCQ assessment platform. Follow every instruction in this prompt exactly, in order, without skipping steps.

---

## REFERENCE DOCUMENTS (Read these first, in order)

Before writing any code, read the following markdown files:

1. `ARCHITECTURE.md` — System architecture, folder structure, state machines
2. `DATA_MODELS.md` — All Mongoose schemas (copy them exactly as written)
3. `API_SPEC.md` — All REST endpoints, payloads, error codes
4. `IMPLEMENTATION_GUIDE.md` — Sequential build phases (your primary build document)
5. `SECURITY_CHECKLIST.md` — Security controls to implement
6. `TESTING_STRATEGY.md` — Tests to write per phase
7. `DEPLOYMENT_GUIDE.md` — Docker + production config

> **Critical**: The documents define the authoritative specification. Do not deviate without documenting why.

---

## TECHNOLOGY STACK

- **Backend**: Node.js 20 + Express 5 + TypeScript
- **Database**: MongoDB 7 (Mongoose 8) with replica set (required for transactions)
- **Cache / Rate limiting**: Redis 7 (ioredis)
- **Frontend**: React 18 + Vite + TypeScript + Redux Toolkit + React Router v6
- **Auth**: JWT (15 min access) + httpOnly refresh token (7 days) + TOTP MFA for admins
- **Validation**: Zod (backend) + React Hook Form + Zod (frontend)
- **File handling**: Multer + xlsx (SheetJS)
- **Testing**: Vitest + Supertest + Playwright
- **Containerisation**: Docker + Docker Compose + Nginx

---

## IMPLEMENTATION ORDER

Follow `IMPLEMENTATION_GUIDE.md` phases exactly:

### Phase 0 — Prerequisites
- Verify Node 20, MongoDB 7 replica set, Redis 7 are available
- Create root `exam-platform/` monorepo directory
- Set up `.gitignore` (node_modules, dist, .env, *.log, coverage)

### Phase 1 — Project Initialisation
- `server/` — npm init, install all deps, create `tsconfig.json`
- `client/` — `npm create vite@latest client -- --template react-ts`, install deps
- Create `docker-compose.yml` with MongoDB replica set + Redis services
- Create `server/.env.example` with all required env variables

### Phase 2 — Backend Foundation
- `server/src/config/env.ts` — Zod-validated env (exit process if invalid)
- `server/src/config/db.ts` — MongoDB connection with error handling
- `server/src/config/redis.ts` — Redis client (ioredis)
- `server/src/config/logger.ts` — Winston structured JSON logger
- `server/src/app.ts` — Express factory with Helmet, CORS, Morgan, rate limiter, routes, error handler
- `server/src/middleware/errorHandler.ts` — AppError class + global handler (no stack traces in prod)

### Phase 3 — All Mongoose Models
Copy schemas from `DATA_MODELS.md` verbatim into `server/src/models/`:
- `User.ts`, `StudentProfile.ts`, `Assessment.ts`, `Question.ts`
- `PaperVersion.ts`, `Attempt.ts`, `Answer.ts`, `Incident.ts`
- `ImportBatch.ts`, `AuditLog.ts`, `RefreshToken.ts`

**IMPORTANT**: `PaperVersion.questions.correctOptionId` must have `select: false` — never auto-included in queries.

### Phase 4 — Authentication System
- `server/src/utils/token.ts` — signAccessToken, verifyAccessToken, generateRefreshToken, hashToken
- `server/src/middleware/authenticate.ts` — JWT bearer token middleware
- `server/src/middleware/authorize.ts` — Role-based access control factory
- `server/src/middleware/rateLimiter.ts` — Redis-backed rate limiters (loginLimiter, mfaLimiter, globalRateLimiter)
- `server/src/middleware/validate.ts` — Zod schema validation middleware
- `server/src/middleware/auditLogger.ts` — Middleware to write AuditLog entries
- `server/src/services/audit.service.ts` — AuditLog.create wrapper
- `server/src/services/auth.service.ts` — login, verifyMFA, issueRefreshToken, refreshAccessToken, logout, activateAccount
- `server/src/validators/auth.schema.ts` — Zod schemas: loginSchema, mfaSchema, activateSchema, resetSchema
- `server/src/routes/auth.routes.ts` — All auth routes

### Phase 5 — Assessment & Question Engine (Admin)
- `server/src/services/assessment.service.ts` — CRUD + state machine transitions + forceSubmitAllActive + getDashboard
- `server/src/services/question.service.ts` — CRUD + publish + retire + createPaperVersion (with option shuffle)
- `server/src/services/email.service.ts` — sendActivationEmail, sendPasswordReset
- Admin routes in `server/src/routes/admin/`:
  - `assessment.routes.ts` (all assessment CRUD + status + dashboard)
  - `question.routes.ts` (question bank CRUD)
  - `candidate.routes.ts` (eligibility management)
  - `import.routes.ts` (preview + commit)
  - `incident.routes.ts` (list + review)
  - `result.routes.ts` (list + publish)
  - `export.routes.ts` (generate + download)
  - `audit.routes.ts` (read-only log viewer)

### Phase 6 — Exam Attempt Engine (Critical Security Phase)
- `server/src/services/attempt.service.ts` — startAttempt (atomic, idempotent), saveAnswer (server validates deadline + ownership + questionId), submitAttempt (idempotent), timeoutAttempt
- `server/src/services/scoring.service.ts` — scoreAttempt (pure server-side; reads correctOptionId from PaperVersion directly; never from client)
- Student routes in `server/src/routes/student/`:
  - `attempt.routes.ts` (start, answer, submit, heartbeat, incident)
  - `dashboard.routes.ts`
  - `result.routes.ts`

**SECURITY RULES FOR ATTEMPT ENGINE**:
1. Never send `correctOptionId` in any student-facing API response
2. Server calculates `deadlineAt = startedAt + durationMinutes * 60s`
3. On saveAnswer: verify `attempt.userId === req.user.sub` AND verify `questionId` belongs to `attempt.paperVersionId`
4. On submit: use MongoDB session + transaction; idempotent (return existing result if already submitted)
5. Score is calculated from DB-stored answers against DB-stored correctOptionId — never from client input

### Phase 7 — Proctoring & Incident System
- `server/src/services/incident.service.ts` — recordIncident, reviewIncident
- TAB_SWITCH logic: increment `attempt.totalTabSwitches`; return warning/flag/auto-submit based on `assessment.integrityPolicy`
- Auto-submit triggers `attemptService.submitAttempt` server-side

### Phase 8 — Import / Export
- `server/src/services/import.service.ts` — previewImport (row validation, formula injection sanitisation, DB duplicate check, create ImportBatch with PREVIEW status), commitImport (create User + StudentProfile + send activation email + update assessment eligibility)
- `server/src/services/export.service.ts` — generateResultsExport (SheetJS, 3 worksheets: Candidate_Results, Incident_Review, Export_Metadata; formula injection protection)
- File upload: Multer with `fileFilter` (accept .xlsx/.xls only), size limit from env, storage to `UPLOAD_DIR`

### Phase 9 — Timeout Cron Job
- `server/src/jobs/attemptTimeout.job.ts` — node-cron every minute; find `IN_PROGRESS` attempts where `deadlineAt <= now`; update status to TIMED_OUT; call scoringService.scoreAttempt

### Phase 10 — Frontend Foundation
- `client/src/lib/api.ts` — Axios instance with JWT interceptor + silent refresh with queue
- `client/src/app/store.ts` — Redux store with RTK Query auth + exam slices
- `client/src/router/index.tsx` — React Router with RequireAuth guards (ADMIN / STUDENT roles)
- `client/src/hooks/useExamTimer.ts` — Server-offset countdown timer
- `client/src/hooks/useAutosave.ts` — Debounced answer save (800ms)
- `client/src/hooks/useTabMonitor.ts` — visibilitychange + fullscreen exit events → POST to incident API
- `client/src/hooks/useCamera.ts` — getUserMedia, periodic snapshot every N minutes

### Phase 11 — Admin UI Pages
- `/admin/login` — Email + password + TOTP MFA step
- `/admin/assessments` — List, create, edit, status management
- `/admin/assessments/:id/dashboard` — Live metrics dashboard
- `/admin/assessments/:id/candidates` — Eligibility management
- `/admin/assessments/:id/import` — Excel upload → preview → confirm
- `/admin/questions` — Question bank CRUD + bulk status
- `/admin/incidents` — Incident review panel
- `/admin/results/:id` — Results table + publish button
- `/admin/export/:id` — Export trigger + download
- `/admin/audit` — Audit log viewer

### Phase 12 — Student UI Pages
- `/login` — Student login
- `/activate` — Account activation (set password)
- `/student/dashboard` — Assessment status + Start Test button (enabled only when eligible + OPEN)
- `/student/instructions/:assessmentId` — Rules + privacy notice + readiness check (camera permission)
- `/student/exam/:attemptId` — Exam engine:
  - Timer (server-synced, red when < 5 min)
  - Question navigator sidebar
  - Question card with options
  - Autosave indicator ("Saved" / "Saving..." / "Save failed")
  - Submit button with confirmation dialog
  - Warning banners for tab switch incidents
  - Auto-submit flow when 3rd tab switch detected
- `/student/results/:assessmentId` — Score display (only if published and visibility permits)

### Phase 13 — Tests
Write tests as described in `TESTING_STRATEGY.md`:
- Unit tests for: scoringService, authService, attemptService state machine, importService row validation
- API integration tests for: auth flow, access control (vertical + horizontal), full exam lifecycle, import flow, incident auto-submit
- Playwright E2E for: full student exam flow, tab switch warning, answer key absence in source

### Phase 14 — Production Hardening
- Add Dockerfile (multi-stage) for server
- Add Dockerfile.prod for client (build + Nginx)
- Add `docker-compose.prod.yml`
- Add `nginx/nginx.conf` with TLS, HSTS, CSP, rate limits
- Add `.github/workflows/ci.yml` (lint + test + build on PR)
- Verify all security checklist items in `SECURITY_CHECKLIST.md`

---

## NON-NEGOTIABLE RULES

1. **Every protected API route** must call `authenticate` then `authorize` middleware — no exceptions
2. **Never send `correctOptionId`** in any student API response — use `select: false` and explicitly exclude
3. **All state transitions** (Assessment status, Attempt status) enforced server-side with validation
4. **MongoDB transactions** for: startAttempt (create attempt), submitAttempt (submit + score)
5. **AuditLog** entries for: login, admin status changes, result publish, export download, manual candidate add, incident review decisions
6. **No stack traces** in production error responses
7. **All secrets** from environment variables — no hardcoded values
8. **Zod validation** on every request body, query param, and route param
9. **Formula injection sanitisation** in import service and export service
10. **Idempotency**: startAttempt returns existing IN_PROGRESS attempt; submitAttempt is idempotent
11. **httpOnly cookies** for refresh tokens only; access token in memory/sessionStorage
12. **Timer is server-authoritative**: `deadlineAt` calculated server-side at attempt creation; client uses server offset
13. **Rate limits** implemented for all sensitive endpoints using Redis-backed store
14. **CORS** origin whitelist from env — no wildcard in production

---

## VALIDATION AFTER EACH PHASE

After completing each phase, verify:
- TypeScript compiles with `tsc --noEmit` (zero errors)
- All tests for that phase pass
- No `console.log` in production code (use `logger`)
- No hardcoded secrets or URLs

---

## DELIVERABLES

When complete, the application must:
1. Allow admin to: create assessment, import candidates, add paper version, open assessment
2. Allow student to: activate account, log in, start exam, answer questions (autosaved), submit
3. Auto-score server-side on submission or timeout
4. Record tab switch incidents; auto-submit on 3rd switch
5. Allow admin to: review incidents, publish results, export Excel report
6. Pass all unit + integration + security tests
7. Run with `docker-compose up` in development

Start with Phase 0 and proceed sequentially. Report completion status after each phase.
