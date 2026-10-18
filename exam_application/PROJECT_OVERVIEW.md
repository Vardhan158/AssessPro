# PROJECT_OVERVIEW.md — Secure Online Interview Assessment Platform

## 1. Project Summary
Build a **production-grade, auditable, secure MCQ assessment platform** for first-round technical interviews. Administrators manage the full lifecycle; students complete proctored online tests. All authority lives **server-side**; the browser is treated as untrusted.

---

## 2. Technology Stack (Decided)

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | React 18 + Vite + TypeScript | Type safety, hot reload, SPA |
| State | Redux Toolkit + RTK Query | Predictable state, auto caching |
| UI | shadcn/ui + Tailwind CSS v3 | Consistent, accessible components |
| Backend | Node.js 20 LTS + Express 5 | Wide ecosystem, non-blocking I/O |
| Language | TypeScript (both ends) | Type safety, refactor-safe |
| Database | MongoDB 7 + Mongoose 8 | Flexible schema, replica set for transactions |
| Auth | JWT (access 15 min) + Refresh token (7 days, httpOnly cookie) | Stateless API, XSS-safe refresh |
| MFA | TOTP via `otplib` (Admin only) | RFC 6238 compliant |
| File Handling | Multer + xlsx (SheetJS) | Excel import/export |
| Email | Nodemailer + SMTP | Account activation, OTP delivery |
| Logging | Winston + Morgan | Structured JSON logs |
| Audit Trail | MongoDB `AuditLog` collection | Immutable event record |
| Rate Limiting | express-rate-limit + Redis | Distributed throttling |
| Cache | Redis (ioredis) | Session store, rate limit state |
| File Storage | Local (dev) / AWS S3 (prod) | Evidence & exports |
| Validation | Zod (backend) + React Hook Form + Zod (frontend) | Single source of truth |
| Testing | Vitest + Supertest + Playwright | Unit, API, E2E |
| Containerisation | Docker + Docker Compose | Reproducible environments |
| CI/CD | GitHub Actions | Automated test + deploy |
| Reverse Proxy | Nginx | TLS termination, static serving |
| Process Manager | PM2 (inside container) | Zero-downtime restarts |
| Secrets | `.env` + GitHub Secrets | Never hardcoded |

---

## 3. Roles & Permissions

### 3.1 Administrator
- Full CRUD on assessments, question bank, candidates, users
- Import candidates from Excel; add/correct individual records
- Open / pause / close assessments
- Review flagged incidents; approve/reject with reason
- Publish results and export Excel reports
- View all audit logs
- **Requires TOTP MFA** (NIST SP 800-63 Rev 4 AAL2)

### 3.2 Student
- View own profile, eligibility, assessment status
- Start exam only when: eligible + assessment is OPEN + within access window + attempt limit not exceeded
- Answer questions; incremental autosave
- Submit or be auto-submitted on timer expiry
- View own results (if released) — score and optionally question breakdown

### 3.3 Super Admin (optional seed)
- Manage admin accounts; view system-level audit logs

---

## 4. Pre-Development Decisions (Resolved)

| Decision | Resolution |
|----------|-----------|
| Device type | Candidates use their own devices (BYOD) |
| Browser enforcement | Standard browser (no LockDown Browser initially); architecture remains integration-ready |
| Camera/Microphone | Camera required for readiness check; periodic snapshot every 2 minutes |
| Tab switch policy | Warning at 1st switch; flag + notify admin; auto-submit at 3 tab switches |
| Exam duration | Configurable per assessment (e.g., 60 min) |
| Access window | Configurable start + end datetime per assessment |
| Attempt limit | 1 attempt per student per assessment (configurable to max 3) |
| Network resume | Student may resume if attempt is IN_PROGRESS and timer not expired; max 5 disconnects logged |
| Negative marking | Configurable per assessment: default 0, optional −0.25 |
| Score visibility | Configurable: score only / score + answers / none (admin decides) |
| Result release | Controlled by admin: publish after review |
| Incident review | Named reviewer; neutral terms (flagged/reviewed); no auto-verdict |
| Data retention | Student records: 2 years; logs: 1 year; recordings: 90 days |
| Concurrency target | 500 simultaneous candidates |
| Accessibility | WCAG 2.1 AA minimum |

---

## 5. Non-Goals (Explicitly Out of Scope v1)
- Facial recognition or emotion AI
- Full OS lock-down (requires Safe Exam Browser — future phase)
- Automatic misconduct verdict from browser events alone
- Payment gateway
- Multi-language i18n (English only v1)
- Legal compliance certification (counsel review required separately)

---

## 6. Core Design Principles
1. **Server is the authority** — timing, scoring, eligibility, state transitions.
2. **Deny by default** — every route requires explicit role + resource check.
3. **Audit everything** — admin actions and security events leave immutable records.
4. **Idempotent submission** — retrying submit cannot create duplicate results.
5. **Fail safe** — autosave prevents data loss; timer is server-calculated.
6. **Privacy by design** — collect minimum; restrict access; define retention.
