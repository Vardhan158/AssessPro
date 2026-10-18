# SECURITY_CHECKLIST.md — OWASP ASVS 5.0 + Top 10:2025 Checklist

> **Rule**: A checklist item is DONE only when evidence exists (test result, config review, or documented decision). Mark status as ✅ DONE | ⬜ PENDING | ❌ FAILED

---

## 1. Authentication (ASVS V2)

| # | Control | Test Method | Status |
|---|---------|-------------|--------|
| 1.1 | Passwords hashed with bcrypt rounds ≥ 12 | Code review `BCRYPT_ROUNDS` env | ⬜ |
| 1.2 | Login throttled: 5 failures → 15-min lock | Automate 6 rapid login attempts | ⬜ |
| 1.3 | IP-based rate limit on `/auth/login` (10/15 min) | Send 11 requests; expect 429 | ⬜ |
| 1.4 | Account activation via one-time expiring token | Activate twice with same token | ⬜ |
| 1.5 | Password reset token: SHA-256 stored, expires 1 hour | Request reset; use token after expiry | ⬜ |
| 1.6 | Admin MFA (TOTP) required after password login | Log in as admin without TOTP | ⬜ |
| 1.7 | Forgot-password never reveals account existence | Compare response for valid/invalid emails | ⬜ |
| 1.8 | Refresh token stored as SHA-256 hash (not plaintext) | DB inspection | ⬜ |
| 1.9 | Logout revokes refresh token | Use old refresh cookie after logout | ⬜ |
| 1.10 | Access token expires in ≤ 15 minutes | Decode JWT and check `exp` | ⬜ |
| 1.11 | Student passwords not derived from name/phone/roll number | Code review import service | ⬜ |

---

## 2. Session Management (ASVS V3)

| # | Control | Test Method | Status |
|---|---------|-------------|--------|
| 2.1 | Refresh token cookie: `HttpOnly`, `Secure`, `SameSite=Strict` | Browser DevTools → Application → Cookies | ⬜ |
| 2.2 | Access token in memory / sessionStorage only (not localStorage) | DevTools → Local Storage check | ⬜ |
| 2.3 | No session fixation: new tokens issued on login | Compare token before/after login | ⬜ |
| 2.4 | Concurrent session detection (optional): max 1 active per user | Log in from 2 browsers | ⬜ |

---

## 3. Access Control (ASVS V4)

| # | Control | Test Method | Status |
|---|---------|-------------|--------|
| 3.1 | Every API route has explicit role check server-side | Try calling `/admin/*` with student token | ⬜ |
| 3.2 | Student cannot access another student's attempt | Call `GET /student/attempts/:otherId` | ⬜ |
| 3.3 | Student cannot read answer keys via API | Call `GET /admin/questions/:id` with student token | ⬜ |
| 3.4 | IDOR test: student cannot submit another student's attempt | POST submit with forged attemptId | ⬜ |
| 3.5 | Ineligible student cannot start exam even via direct API | Register student without eligibility; call start | ⬜ |
| 3.6 | Score accepted only server-side; no client score accepted | POST submit with injected `score` field in body | ⬜ |
| 3.7 | Admin cannot view another admin's audit logs (super admin only) | Test role hierarchy | ⬜ |
| 3.8 | Assessment state transition enforced server-side | PATCH status CLOSED → OPEN directly | ⬜ |

---

## 4. Input Validation (ASVS V5)

| # | Control | Test Method | Status |
|---|---------|-------------|--------|
| 4.1 | All request bodies validated with Zod schema | Send extra/missing fields; expect 400 | ⬜ |
| 4.2 | Query params validated and sanitised | Send `?page=-1`, `?limit=999999` | ⬜ |
| 4.3 | MongoDB injection prevented (Mongoose typing + Zod) | Send `{ "$gt": "" }` as password | ⬜ |
| 4.4 | XSS: all user-supplied text sanitised on output | Store `<script>alert(1)</script>` as name; view in UI | ⬜ |
| 4.5 | No stack traces exposed in production error responses | Trigger 500; check response body | ⬜ |

---

## 5. Cryptography (ASVS V6)

| # | Control | Test Method | Status |
|---|---------|-------------|--------|
| 5.1 | JWT signed with HS256 and secret ≥ 256 bits | Code review + env check | ⬜ |
| 5.2 | TOTP secrets encrypted at rest using `MFA_ENCRYPTION_KEY` | DB inspection: no plaintext secret | ⬜ |
| 5.3 | TLS 1.2+ enforced; TLS 1.0/1.1 disabled | `openssl s_client` or SSL Labs test | ⬜ |
| 5.4 | HSTS header present with `max-age ≥ 31536000` | Check response headers | ⬜ |

---

## 6. File Upload (OWASP File Upload Cheat Sheet)

| # | Control | Test Method | Status |
|---|---------|-------------|--------|
| 6.1 | File extension whitelist: only `.xlsx`, `.xls` | Upload `.exe` renamed as `.xlsx` | ⬜ |
| 6.2 | File content validated (magic bytes check) | Upload text file renamed to `.xlsx` | ⬜ |
| 6.3 | File size limit enforced (10 MB default) | Upload file > 10 MB | ⬜ |
| 6.4 | Uploaded files stored outside web root | Check `UPLOAD_DIR` is not publicly served | ⬜ |
| 6.5 | Client MIME type not trusted alone | Check server re-validates with file-type library | ⬜ |
| 6.6 | Spreadsheet formula injection prevented | Import cell `=HYPERLINK("http://evil.com","click")` | ⬜ |

---

## 7. Proctoring & Privacy

| # | Control | Test Method | Status |
|---|---------|-------------|--------|
| 7.1 | Camera/mic access only over HTTPS | Test on HTTP; expect browser rejection | ⬜ |
| 7.2 | Monitoring status visibly shown to student | UI review | ⬜ |
| 7.3 | No automatic misconduct verdict from events alone | Code review incident service | ⬜ |
| 7.4 | Camera snapshots stored with access control (admin only) | Try accessing snapshot URL as student | ⬜ |
| 7.5 | Retention policy documented and enforced | Code review data deletion scripts | ⬜ |
| 7.6 | Incident metadata never includes personal audio/video in logs | Code review Incident model | ⬜ |

---

## 8. Logging & Audit (OWASP Logging Cheat Sheet)

| # | Control | Test Method | Status |
|---|---------|-------------|--------|
| 8.1 | AuditLog collection has no delete or update from app code | Code search for `AuditLog.deleteOne` | ⬜ |
| 8.2 | No passwords, tokens, or PII in log files | Review a sample log file | ⬜ |
| 8.3 | Admin result exports are logged with actor + timestamp | Export; check AuditLog entry | ⬜ |
| 8.4 | Assessment status changes logged | Change status; check AuditLog | ⬜ |
| 8.5 | Failed login attempts logged (no password in log) | Attempt bad login; check logs | ⬜ |

---

## 9. CSRF & HTTP Security Headers

| # | Control | Test Method | Status |
|---|---------|-------------|--------|
| 9.1 | CORS origin whitelist — no `*` in production | Check `Access-Control-Allow-Origin` header | ⬜ |
| 9.2 | `Content-Security-Policy` header present and restrictive | Check response headers; run CSP evaluator | ⬜ |
| 9.3 | `X-Frame-Options: DENY` or `frame-ancestors 'none'` in CSP | Check response headers | ⬜ |
| 9.4 | `X-Content-Type-Options: nosniff` present | Check response headers | ⬜ |
| 9.5 | `Referrer-Policy: strict-origin-when-cross-origin` | Check response headers | ⬜ |

---

## 10. Rate Limiting & DoS Protection

| # | Control | Test Method | Status |
|---|---------|-------------|--------|
| 10.1 | Answer autosave limited (60/min/student) | Script 70 rapid saves | ⬜ |
| 10.2 | Import endpoint limited (5/hour/admin) | Upload 6 files in rapid succession | ⬜ |
| 10.3 | Login brute force tested with 100 requests | Automated script | ⬜ |
| 10.4 | Rate limits use Redis (survives API restart) | Restart API; verify limit count preserved | ⬜ |

---

## 11. Exam Integrity

| # | Control | Test Method | Status |
|---|---------|-------------|--------|
| 11.1 | `correctOptionId` never in API response to student | Inspect `/student/attempts/start` response | ⬜ |
| 11.2 | Server calculates deadline (not client-supplied) | Start exam; manipulate client clock by +1 hour | ⬜ |
| 11.3 | Duplicate attempt creation prevented (unique index) | Simultaneously POST start twice | ⬜ |
| 11.4 | Submission idempotent: double submit returns same result | POST submit twice | ⬜ |
| 11.5 | Score recalculated from saved answers; not browser-supplied | POST submit with `score: 9999` in body | ⬜ |
| 11.6 | Paper version immutable after creation | Attempt to update PaperVersion directly | ⬜ |
| 11.7 | Cron times out expired attempts within 2 minutes | Let timer expire; check status after 2 min | ⬜ |

---

## 12. Production Readiness Gate (must all be ✅ before real exam)

- [ ] All Sec Checklist items above are ✅
- [ ] Penetration test by independent tester (or internal qualified reviewer)
- [ ] Privacy notice approved by qualified counsel
- [ ] Named business owner, assessment owner, and technical reviewer have signed off
- [ ] Backup + recovery tested for MongoDB
- [ ] Monitoring and alerting configured (error rate, latency, disk)
- [ ] All `.env` secrets rotated from defaults
- [ ] `NODE_ENV=production` verified; debug routes disabled
- [ ] Scoring verified against hand-calculated reference paper
