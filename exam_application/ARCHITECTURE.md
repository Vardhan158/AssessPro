# ARCHITECTURE.md — System Architecture

## 1. High-Level Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                         CLIENTS                                │
│  ┌──────────────────────┐   ┌──────────────────────────────┐   │
│  │  Student Portal      │   │  Admin Dashboard             │   │
│  │  React + RTK Query   │   │  React + RTK Query           │   │
│  └──────────┬───────────┘   └──────────────┬───────────────┘   │
└─────────────┼─────────────────────────────-┼───────────────────┘
              │ HTTPS (TLS 1.3)              │
┌─────────────▼──────────────────────────────▼───────────────────┐
│                         NGINX                                   │
│   - TLS termination    - Static file serving                    │
│   - Rate limit headers - Security headers (CSP, HSTS, etc.)    │
└─────────────────────────────┬──────────────────────────────────┘
                              │ HTTP (internal)
┌─────────────────────────────▼──────────────────────────────────┐
│                     EXPRESS API SERVER                          │
│                                                                 │
│  Middleware chain (in order):                                   │
│  1. Helmet (security headers)                                   │
│  2. CORS (whitelist only)                                       │
│  3. Morgan HTTP logger                                          │
│  4. express-rate-limit (Redis store)                            │
│  5. Body parser (JSON, size limit 1MB)                          │
│  6. Cookie parser                                               │
│  7. authenticate (verify JWT access token)                      │
│  8. Route handler                                               │
│  9. authorize (role + ownership check)                          │
│  10. Zod schema validator                                       │
│  11. Business logic / service layer                             │
│  12. Global error handler                                       │
│                                                                 │
│  Route groups:                                                  │
│  /api/v1/auth        - Login, refresh, logout, MFA             │
│  /api/v1/admin/*     - Admin-only operations                    │
│  /api/v1/student/*   - Student-only operations                  │
│  /api/v1/shared/*    - Common authenticated routes              │
└──────────┬──────────────────┬──────────────────────────────────┘
           │                  │
    ┌──────▼──────┐   ┌───────▼───────┐
    │  MongoDB 7  │   │  Redis         │
    │  Replica Set│   │  - Rate limit  │
    │  (3 nodes)  │   │  - Refresh     │
    └─────────────┘   │    token store │
                      │  - Temp locks  │
                      └───────────────┘
```

---

## 2. Folder Structure

```
exam-platform/
├── server/                          # Node.js + Express backend
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.ts                # MongoDB connection + replica set
│   │   │   ├── redis.ts             # Redis client (ioredis)
│   │   │   ├── env.ts               # Validated env vars via Zod
│   │   │   └── logger.ts            # Winston logger config
│   │   ├── middleware/
│   │   │   ├── authenticate.ts      # JWT access-token verification
│   │   │   ├── authorize.ts         # Role-based + ownership check
│   │   │   ├── rateLimiter.ts       # Configurable rate limiters
│   │   │   ├── validate.ts          # Zod request schema validator
│   │   │   ├── errorHandler.ts      # Global error handler
│   │   │   └── auditLogger.ts       # Middleware to write AuditLog entries
│   │   ├── models/
│   │   │   ├── User.ts              # Admin + Student base model
│   │   │   ├── Student.ts           # Extended student profile
│   │   │   ├── Assessment.ts        # Assessment + lifecycle state
│   │   │   ├── Question.ts          # Question bank entity
│   │   │   ├── PaperTemplate.ts     # Blueprint for paper generation
│   │   │   ├── PaperVersion.ts      # Immutable snapshot of a paper
│   │   │   ├── Attempt.ts           # Student attempt + state machine
│   │   │   ├── Answer.ts            # Incremental autosave answers
│   │   │   ├── ImportBatch.ts       # Excel import metadata
│   │   │   ├── Incident.ts          # Browser integrity events
│   │   │   ├── AuditLog.ts          # Immutable admin/security audit
│   │   │   └── Export.ts            # Export job metadata
│   │   ├── routes/
│   │   │   ├── auth.routes.ts
│   │   │   ├── admin/
│   │   │   │   ├── assessment.routes.ts
│   │   │   │   ├── candidate.routes.ts
│   │   │   │   ├── question.routes.ts
│   │   │   │   ├── import.routes.ts
│   │   │   │   ├── incident.routes.ts
│   │   │   │   ├── result.routes.ts
│   │   │   │   └── export.routes.ts
│   │   │   └── student/
│   │   │       ├── dashboard.routes.ts
│   │   │       ├── attempt.routes.ts
│   │   │       └── result.routes.ts
│   │   ├── services/
│   │   │   ├── auth.service.ts
│   │   │   ├── assessment.service.ts
│   │   │   ├── question.service.ts
│   │   │   ├── attempt.service.ts    # State machine + autosave + scoring
│   │   │   ├── scoring.service.ts    # Pure server-side scoring
│   │   │   ├── import.service.ts     # Excel parse + validation
│   │   │   ├── export.service.ts     # Excel generation (SheetJS)
│   │   │   ├── incident.service.ts
│   │   │   ├── email.service.ts
│   │   │   └── audit.service.ts
│   │   ├── validators/
│   │   │   ├── auth.schema.ts
│   │   │   ├── assessment.schema.ts
│   │   │   ├── question.schema.ts
│   │   │   ├── import.schema.ts
│   │   │   └── attempt.schema.ts
│   │   ├── utils/
│   │   │   ├── token.ts             # JWT sign/verify helpers
│   │   │   ├── crypto.ts            # bcrypt, random token helpers
│   │   │   ├── pagination.ts        # Cursor-based pagination helper
│   │   │   └── sanitize.ts          # Output sanitisation helpers
│   │   ├── jobs/
│   │   │   └── attemptTimeout.job.ts # Cron: auto-submit expired attempts
│   │   └── app.ts                   # Express app factory
│   ├── server.ts                    # Entry point + graceful shutdown
│   ├── tsconfig.json
│   └── package.json
│
├── client/                          # React + Vite frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── store.ts             # Redux store
│   │   │   └── rootReducer.ts
│   │   ├── features/
│   │   │   ├── auth/
│   │   │   ├── admin/
│   │   │   │   ├── assessments/
│   │   │   │   ├── candidates/
│   │   │   │   ├── questions/
│   │   │   │   ├── incidents/
│   │   │   │   └── reports/
│   │   │   └── student/
│   │   │       ├── dashboard/
│   │   │       ├── exam/            # Exam engine + autosave + timer
│   │   │       └── results/
│   │   ├── components/
│   │   │   ├── ui/                  # shadcn/ui base components
│   │   │   ├── layout/              # AppShell, Sidebar, Navbar
│   │   │   ├── exam/                # QuestionCard, Timer, SaveIndicator
│   │   │   └── shared/              # DataTable, FilePicker, StatusBadge
│   │   ├── hooks/
│   │   │   ├── useExamTimer.ts      # Server-sync countdown timer
│   │   │   ├── useAutosave.ts       # Debounced answer save
│   │   │   ├── useTabMonitor.ts     # visibilitychange + fullscreen events
│   │   │   └── useCamera.ts         # getUserMedia permission + snapshots
│   │   ├── lib/
│   │   │   ├── api.ts               # Axios instance with interceptors
│   │   │   └── utils.ts
│   │   ├── pages/
│   │   │   ├── auth/
│   │   │   ├── admin/
│   │   │   └── student/
│   │   ├── router/
│   │   │   └── index.tsx            # React Router v6 + route guards
│   │   └── main.tsx
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
│
├── docker-compose.yml               # Local dev: API + MongoDB + Redis
├── docker-compose.prod.yml          # Production
├── nginx/
│   └── nginx.conf
├── .github/
│   └── workflows/
│       ├── ci.yml                   # Test + lint on PR
│       └── deploy.yml               # Deploy on merge to main
└── README.md
```

---

## 3. Assessment State Machine

```
         [Admin creates]
               │
               ▼
           DRAFT ──(admin validates & publishes)──► SCHEDULED
               │                                        │
               │                                (within access window)
               │                                        │
               │                                        ▼
               └──────────────────────────────────── OPEN
                                                        │
                                               (admin pauses)
                                                        │
                                                        ▼
                                                    PAUSED
                                                        │
                                               (admin resumes)
                                                        │
                                                        ▼
                                                     OPEN
                                                        │
                                    (access window ends OR admin closes)
                                                        │
                                                        ▼
                                                    CLOSED
                                                        │
                                               (admin publishes)
                                                        │
                                                        ▼
                                                  RESULTS_PUBLISHED
```

## 4. Attempt State Machine

```
                 [Student starts]
                        │
                        ▼
                   IN_PROGRESS ──(autosave on each answer)──►
                        │
             ┌──────────┼──────────┐
             │          │          │
        [Student    [Timer     [Admin closes
         submits]   expires]    assessment*]
             │          │          │
             ▼          ▼          ▼
         SUBMITTED  TIMED_OUT  FORCE_SUBMITTED
             │          │          │
             └──────────┴──────────┘
                        │
                   [Server scores]
                        │
                        ▼
                     SCORED
                        │
                 [Admin publishes]
                        │
                        ▼
                   RESULT_VISIBLE

  * Force-submitted only for IN_PROGRESS attempts at assessment close
  * ABANDONED: created but never started (no attempt_started event)
```

---

## 5. Security Layers (Defence in Depth)

| Layer | Control |
|-------|---------|
| Network | TLS 1.3, HSTS, Nginx rate limit |
| Application | Helmet, CORS whitelist, CSRF tokens (non-SPA forms) |
| Auth | JWT + httpOnly refresh token, TOTP MFA for admins |
| Authorisation | Every handler checks role + resource ownership |
| Input | Zod validation on all request bodies/params/queries |
| Output | JSON only; no stack traces in prod; sanitise formula chars |
| Data | bcrypt passwords; no plaintext secrets in DB or logs |
| File upload | MIME sniff, extension whitelist, size limit, virus scan hook |
| Rate limiting | Per-IP + per-user login, import, and API endpoints |
| Audit | Every sensitive action logged to AuditLog (no delete) |
| Monitoring | Winston JSON logs → Elasticsearch/Loki (prod) |
