# AssessPro — Secure Online Interview Assessment Platform

**AssessPro** is an enterprise-grade, secure web-based online assessment platform engineered for technical interview screening, candidate evaluation, and automated recruitment shortlisting.

It provides three distinct, role-isolated user experiences (**Super Admin**, **Admin**, and **Student/Candidate**) authenticated through a unified, secure access portal.

---

## 🌟 Key Architecture & Capabilities

* **Modern Tech Stack:**
  * **Frontend:** React (JSX/Hooks) + Tailwind CSS + Vite + Lucide Icons
  * **Backend:** Node.js + Express + TypeScript + Mongoose (MongoDB)
  * **Authentication:** Stateless JWT Access/Refresh token rotation + HTTP-only cookies + bcrypt password hashing (10 rounds) + 15-min account lockouts.
* **Core Roles & Workflows:**
  * 👑 **Super Admin:** Global platform configuration, administrator account creation & permissions, account suspension, MFA enforcement, system readiness checks, non-intrusive operational oversight, and immutable audit logs.
  * 🛡️ **Admin:** Candidate onboarding (Option A: CSV/Excel bulk import with pre-flight dry-run row validation & Option B: manual registration), central Question Bank manager (MCQs with options A/B/C/D, difficulty levels, subject tags), 5-step Assessment Creation Wizard, time-gated scheduling, live exam telemetry monitoring, proctoring incident decision review (**Clear**, **Document**, **Escalate**), score publishing controls (**Score Only** vs **Score + Answer Key**), and one-click recruitment CSV/Excel report exporting.
  * 🎓 **Student / Candidate:** Email activation invitation token -> account activation & password setup -> Candidate Dashboard -> pre-exam guidelines & system readiness checks (browser compatibility, ping latency, live webcam feed preview) -> timed MCQ exam engine with **Free Question Navigation**, ~800ms debounced background autosave, server-synced countdown timer (`deadlineAt`), proctoring warning notices (tab switch & fullscreen exit tracking), pre-submission summary popup, locked submission receipt, and authorized scorecard results.
* **Data Integrity & Protection:**
  * **Immutable Paper Version Snapshots (`PaperVersion`):** Test questions are frozen upon launch so past candidate attempts are evaluated against frozen paper keys.
  * **Protected Answer Keys:** Correct answer option keys (`correctOptionId`) are excluded from active test payloads (`select: false`).
  * **Spreadsheet Formula Injection Prevention:** CSV/Excel exports sanitize leading `= + - @` characters to prevent formula injection attacks.

---

## 📁 Repository Structure

```
vardhan/
├── backend/                  # Node.js + Express + TypeScript API
│   ├── src/
│   │   ├── config/           # Database, environment validation (Zod), logger
│   │   ├── middleware/       # JWT auth, RBAC authorize, rate limiter, error handler
│   │   ├── models/           # Mongoose schemas (User, Profile, Assessment, Attempt, etc.)
│   │   ├── routes/           # Auth, Admin, and Student API endpoints
│   │   ├── services/         # Scoring, attempt, import, and email dispatch services
│   │   ├── app.ts            # Express application setup
│   │   └── server.ts         # Server entrypoint
│   ├── test/                 # Health, import, and invitation unit tests
│   ├── server.js             # Deployment wrapper for Render/Cloud hosts
│   ├── render.yaml           # Backend Render cloud deployment configuration
│   ├── package.json
│   └── tsconfig.json
├── frontend/                 # React + Vite + Tailwind CSS Frontend
│   ├── src/
│   │   ├── context/          # AuthContext for session management
│   │   ├── hooks/            # useAuth custom hook
│   │   ├── pages/
│   │   │   ├── admin/        # AdminDashboard.jsx & SuperAdminDashboard.jsx
│   │   │   ├── student/      # StudentDashboard.jsx, ExamEngine.jsx, Results.jsx, etc.
│   │   │   ├── ActivateAccount.jsx
│   │   │   ├── ForgotPassword.jsx
│   │   │   ├── Login.jsx
│   │   │   └── ResetPassword.jsx
│   │   ├── services/         # Axios API client instance with interceptors
│   │   └── App.jsx           # Main routing & ProtectedRoute wrappers
│   ├── render.yaml           # Frontend Render static site deployment configuration
│   ├── vite.config.js
│   └── package.json
└── README.md
```

---

## 🚀 Quick Start — Local Installation & Setup

### Prerequisites
* **Node.js:** v20.x or v22.x or higher
* **npm:** v10.x or higher
* **MongoDB:** A running local MongoDB instance or MongoDB Atlas cluster connection URI

---

### Step 1: Backend Setup & Server Launch

1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```

2. Install backend dependencies:
   ```bash
   npm install
   ```

3. Create or update `backend/.env`:
   ```env
   NODE_ENV=development
   PORT=5000
   CLIENT_ORIGIN=http://localhost:5173
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/assessment_platform
   MONGODB_TEST_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/secure_assessment_e2e_test
   JWT_ACCESS_SECRET=super_secret_access_key_1234567890_32bytes
   JWT_REFRESH_SECRET=super_secret_refresh_key_0987654321_32bytes
   BREVO_API_KEY=your_optional_brevo_api_key
   BREVO_FROM_EMAIL=your_sender_email@domain.com
   EMAIL_FROM_NAME="AssessPro Admin"
   SUPER_ADMIN_EMAIL=superadmin@gmail.com
   SUPER_ADMIN_PASSWORD=Superadmin123
   ADMIN_EMAIL=admin@gmail.com
   ADMIN_PASSWORD=Admin12345
   ```

4. Compile and launch backend in development mode:
   ```bash
   npm run dev
   ```
   *The API server will run on `http://localhost:5000/api/v1`.*

---

### Step 2: Frontend Setup & Web Launch

1. Open a new terminal and navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```

2. Install frontend dependencies:
   ```bash
   npm install
   ```

3. Create or update `frontend/.env`:
   ```env
   VITE_API_BASE_URL=http://localhost:5000/api/v1
   ```

4. Launch Vite development server:
   ```bash
   npm run dev
   ```
   *The React web client will open on `http://localhost:5173`.*

---

## 🔑 Initial System Credentials

When the database initializes, the platform seeds initial administrative accounts:

* **Super Admin Portal (`/login` -> `/super-admin/dashboard`):**
  * **Email:** `superadmin@gmail.com`
  * **Password:** `Superadmin123`
* **Admin Portal (`/login` -> `/admin/dashboard`):**
  * **Email:** `admin@gmail.com`
  * **Password:** `Admin12345`

---

## 📡 Complete API Reference

All API requests are prefixed with `/api/v1`. Protected routes require a valid JWT Access Token (`Authorization: Bearer <token>`).

### 1. Authentication Routes (`/auth`)

| Method | Endpoint | Access | Purpose |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/login` | Public | Authenticates credentials and returns JWT tokens & user role |
| `POST` | `/auth/logout` | Authenticated | Clears cookies and revokes refresh session |
| `POST` | `/auth/activate` | Public | Verifies activation token and sets account password |
| `POST` | `/auth/forgot-password` | Public | Generates a 1-hour time-limited password reset token |
| `POST` | `/auth/reset-password` | Public | Completes password reset and revokes existing sessions |
| `POST` | `/auth/refresh` | Public (Cookie) | Rotates refresh token and issues a new access token |
| `GET` | `/auth/me` | Authenticated | Retrieves current authenticated session user profile |

---

### 2. Super Admin Platform Routes (`/admin/platform`)

| Method | Endpoint | Access | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/admin/platform/overview` | Super Admin | Fetches live database counts (Admins, Students, Exams, Attempts) |
| `GET` | `/admin/platform/readiness` | Super Admin | Fetches database connectivity and service readiness checks |
| `GET` | `/admin/platform/users` | Super Admin | Retrieves list of all administrator accounts |
| `POST` | `/admin/platform/users` | Super Admin | Provisions new Administrator account & sends activation link |
| `PATCH` | `/admin/platform/users/:id/status` | Super Admin | Suspends (`SUSPENDED`) or Reactivates (`ACTIVE`) an Admin |
| `POST` | `/admin/platform/users/:id/reset-access` | Super Admin | Re-issues administrator access activation/reset link |
| `GET` | `/admin/platform/settings` | Super Admin | Retrieves global system security policies (`SystemSettings`) |
| `PUT` | `/admin/platform/settings` | Super Admin | Updates global security settings (Password, MFA, Session Timeout) |
| `GET` | `/admin/platform/audit` | Super Admin | Retrieves paginated administrative audit logs (`AuditLog`) |

---

### 3. Admin Operations & Assessment Routes (`/admin`)

| Method | Endpoint | Access | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/admin/candidates` | Admin / Super Admin | Lists registered candidates with account & invitation statuses |
| `POST` | `/admin/candidates/manual` | Admin / Super Admin | Manually registers a candidate & dispatches activation link |
| `POST` | `/admin/candidates/bulk-upload/preview` | Admin / Super Admin | Pre-flight validation preview for Excel (.xlsx) / CSV candidate file |
| `POST` | `/admin/candidates/bulk-upload/confirm` | Admin / Super Admin | Confirms valid candidate batch import into MongoDB |
| `POST` | `/admin/candidates/:id/resend-invitation` | Admin / Super Admin | Resends activation invitation email with 60s rate-limiting |
| `PATCH` | `/admin/candidates/:id/status` | Admin / Super Admin | Toggles student account status (`ACTIVE` / `SUSPENDED`) |
| `GET` | `/admin/candidates/template` | Admin / Super Admin | Downloads candidate import CSV template |
| `GET` | `/admin/question-bank` | Admin / Super Admin | Retrieves central Question Bank questions |
| `POST` | `/admin/question-bank` | Admin / Super Admin | Adds a new 4-option MCQ to Question Bank |
| `DELETE` | `/admin/question-bank/:id` | Admin / Super Admin | Removes question from Question Bank |
| `GET` | `/admin/assessments` | Admin / Super Admin | Lists all created assessments with metrics |
| `POST` | `/admin/assessments` | Admin / Super Admin | Creates new assessment (5-step wizard backend) |
| `GET` | `/admin/assessments/:id` | Admin / Super Admin | Fetches assessment details and rules |
| `PATCH` | `/admin/assessments/:id/status` | Admin / Super Admin | Changes assessment status (`DRAFT`, `OPEN`, `CLOSED`) |
| `PUT` | `/admin/assessments/:id/assignments` | Admin / Super Admin | Assigns candidate list to assessment |
| `POST` | `/admin/assessments/:id/import-from-bank` | Admin / Super Admin | Imports selected Question Bank questions into assessment paper |
| `GET` | `/admin/assessments/:id/live-monitoring` | Admin / Super Admin | Fetches real-time exam telemetry (Assigned, In Progress, Submitted) |
| `GET` | `/admin/incidents` | Admin / Super Admin | Lists logged candidate proctoring integrity events |
| `PATCH` | `/admin/incidents/:id/decision` | Admin / Super Admin | Records incident decision (**CLEARED**, **DOCUMENTED**, **ESCALATED**) |
| `GET` | `/admin/results` | Admin / Super Admin | Lists candidate assessment attempts & scorecards |
| `GET` | `/admin/results/attempt/:id/details` | Admin / Super Admin | Inspects student scorecard & incident audit timeline |
| `PATCH` | `/admin/results/:assessmentId/publish` | Admin / Super Admin | Publishes results to Student Portal (**Score Only** vs **Score + Key**) |

---

### 4. Student Candidate Routes (`/student`)

| Method | Endpoint | Access | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/student/dashboard` | Student | Fetches candidate profile and assigned assessment cards |
| `GET` | `/student/profile` | Student | Fetches candidate institutional profile details |
| `GET` | `/student/assessments/:id` | Student | Fetches assessment guidelines & rules for instructions page |
| `POST` | `/student/attempts/start` | Student | Starts new attempt or resumes existing active attempt |
| `GET` | `/student/attempts/:attemptId` | Student | Fetches active exam attempt workspace & paper questions |
| `POST` | `/student/attempts/:attemptId/answer` | Student | Incremental debounced background save (~800ms) for answer choices |
| `POST` | `/student/attempts/:attemptId/heartbeat` | Student | 30-second session ping verifying time & session vitality |
| `POST` | `/student/attempts/:attemptId/incident` | Student | Logs proctoring event (tab switch, fullscreen exit, network drop) |
| `POST` | `/student/attempts/:attemptId/submit` | Student | Confirms final submission, locks attempt, and triggers scoring |
| `GET` | `/student/submission/:attemptId` | Student | Fetches submission receipt details |
| `GET` | `/student/results/:assessmentId` | Student | Fetches authorized scorecard once results are published |

---

## 🧪 Testing & Verification Commands

To run automated unit, API, and validation test suites:

```bash
# Execute backend API health tests
npm --prefix backend run test:api

# Execute candidate import and Excel parsing unit tests
npx tsc --module commonjs --target ES2022 --esModuleInterop --skipLibCheck --outDir backend/.tmp-test backend/test/candidate-import.test.ts
node --test backend/.tmp-test/test/candidate-import.test.js

# Execute candidate invitation & token lifecycle unit tests
npx tsc --module commonjs --target ES2022 --esModuleInterop --skipLibCheck --outDir backend/.tmp-test backend/test/candidate-invitation.test.ts
node --test backend/.tmp-test/test/candidate-invitation.test.js
```

---

## 🌐 Production Cloud Deployment (Render)

This repository is configured for one-click deployment on Render using the provided `render.yaml` descriptors:

* **Backend Service (`backend/`):**
  * **Environment:** Node
  * **Build Command:** `npm install && npm run build`
  * **Start Command:** `npm start` (Executes `server.js` wrapper forwarding to `dist/server.js`)
* **Frontend Static Site (`frontend/`):**
  * **Build Command:** `npm install && npm run build` (Generates both `dist` and `build` output)
  * **Publish Directory:** `dist`
  * **SPA Rewrite Route:** `/*` -> `/index.html`

---

## 📄 License & Ownership

**AssessPro** — Developed for Secure Online Technical Assessment & Recruitment Evaluation.
All rights reserved.
