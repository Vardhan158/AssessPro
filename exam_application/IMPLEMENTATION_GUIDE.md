# IMPLEMENTATION_GUIDE.md — Step-by-Step Build Instructions

> **Instructions**: Follow phases in order. Complete all checklist items per phase. Run tests after each phase. Do not skip a phase.

---

## Phase 0 — Prerequisites & Tooling

### Required versions
```
Node.js    >= 20.11.0 (LTS)
npm        >= 10.x
MongoDB    >= 7.0    (replica set, even in dev — needed for transactions)
Redis      >= 7.2
Docker     >= 24.x
Git        >= 2.40
```

### Install global CLI tools
```bash
npm install -g typescript tsx nodemon
```

---

## Phase 1 — Project Initialisation

### 1.1 Create monorepo structure
```bash
mkdir exam-platform
cd exam-platform
git init
echo "node_modules/\ndist/\n.env\n*.log\ncoverage/" > .gitignore
```

### 1.2 Initialise backend
```bash
mkdir server
cd server
npm init -y
npm install express mongoose ioredis jsonwebtoken bcryptjs zod nodemailer multer xlsx otplib morgan helmet cors express-rate-limit rate-limit-redis cookie-parser winston uuid crypto-js
npm install --save-dev typescript @types/node @types/express @types/jsonwebtoken @types/bcryptjs @types/nodemailer @types/multer @types/morgan @types/cors @types/cookie-parser vitest supertest @types/supertest ts-node
```

Create `server/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  },
  "include": ["src/**/*", "server.ts"],
  "exclude": ["node_modules", "dist"]
}
```

Create `server/package.json` scripts section:
```json
{
  "scripts": {
    "dev": "nodemon --watch src --ext ts --exec tsx src/app.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint src --ext .ts"
  }
}
```

### 1.3 Initialise frontend
```bash
cd ..
npm create vite@latest client -- --template react-ts
cd client
npm install @reduxjs/toolkit react-redux react-router-dom axios react-hook-form @hookform/resolvers zod date-fns
npm install --save-dev @types/node vitest @testing-library/react @testing-library/user-event jsdom
```

### 1.4 Docker Compose for local dev
Create `docker-compose.yml` in root:
```yaml
version: '3.9'
services:
  mongo1:
    image: mongo:7
    command: ["--replSet", "rs0", "--bind_ip_all"]
    ports: ["27017:27017"]
    volumes: ["mongo1_data:/data/db"]
    healthcheck:
      test: ["CMD","mongosh","--eval","db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      retries: 5

  mongo-init:
    image: mongo:7
    depends_on:
      mongo1:
        condition: service_healthy
    command: >
      mongosh --host mongo1:27017 --eval
      "rs.initiate({ _id: 'rs0', members: [{ _id: 0, host: 'mongo1:27017' }] })"
    restart: "no"

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    command: ["redis-server", "--appendonly", "yes"]
    volumes: ["redis_data:/data"]

  api:
    build:
      context: ./server
      dockerfile: Dockerfile.dev
    ports: ["5000:5000"]
    depends_on:
      - mongo1
      - redis
    environment:
      - NODE_ENV=development
    env_file:
      - ./server/.env
    volumes:
      - ./server/src:/app/src

  client:
    build:
      context: ./client
      dockerfile: Dockerfile.dev
    ports: ["5173:5173"]
    depends_on:
      - api
    volumes:
      - ./client/src:/app/src

volumes:
  mongo1_data:
  redis_data:
```

---

## Phase 2 — Backend Foundation

### 2.1 Environment validation (`server/src/config/env.ts`)
```typescript
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  PORT: z.coerce.number().default(5000),
  MONGODB_URI: z.string().url(),
  REDIS_URL: z.string(),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  BCRYPT_ROUNDS: z.coerce.number().default(12),
  SMTP_HOST: z.string(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string(),
  SMTP_PASS: z.string(),
  SMTP_FROM: z.string(),
  CLIENT_ORIGIN: z.string().url(),
  MFA_ENCRYPTION_KEY: z.string().min(32),  // for encrypting TOTP secret at rest
  MAX_FILE_SIZE_MB: z.coerce.number().default(10),
  UPLOAD_DIR: z.string().default('./uploads'),
});

export type Env = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.format());
  process.exit(1);
}
export const env = parsed.data;
```

### 2.2 MongoDB connection (`server/src/config/db.ts`)
```typescript
import mongoose from 'mongoose';
import { env } from './env';
import { logger } from './logger';

export async function connectDB(): Promise<void> {
  mongoose.set('strictQuery', true);
  try {
    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 10,
    });
    logger.info('MongoDB connected');
  } catch (err) {
    logger.error('MongoDB connection failed', { error: err });
    process.exit(1);
  }
}
```

### 2.3 Logger (`server/src/config/logger.ts`)
```typescript
import winston from 'winston';
import { env } from './env';

export const logger = winston.createLogger({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    env.NODE_ENV === 'production'
      ? winston.format.json()
      : winston.format.prettyPrint()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});
```

### 2.4 Express App Factory (`server/src/app.ts`)
```typescript
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { logger } from './config/logger';
import { globalRateLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin';
import studentRoutes from './routes/student';

export function createApp() {
  const app = express();

  // Security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'"],
        mediaSrc: ["'self'", 'blob:'],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  }));

  // CORS
  app.use(cors({
    origin: env.CLIENT_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  // Request logging
  app.use(morgan('combined', {
    stream: { write: (msg) => logger.http(msg.trim()) }
  }));

  // Body parsing
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));
  app.use(cookieParser());

  // Global rate limiter
  app.use('/api', globalRateLimiter);

  // Health check (no auth)
  app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

  // Routes
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/admin', adminRoutes);
  app.use('/api/v1/student', studentRoutes);

  // 404 handler
  app.use((_req, res) => {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } });
  });

  // Global error handler (must be last)
  app.use(errorHandler);

  return app;
}
```

### 2.5 Global Error Handler (`server/src/middleware/errorHandler.ts`)
```typescript
import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../config/logger';

export class AppError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number = 400,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: err.errors,
      },
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message, details: err.details },
    });
    return;
  }

  // Unexpected error — log full details, return generic response
  logger.error('Unexpected error', { error: err.message, stack: err.stack });
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
  });
}
```

---

## Phase 3 — Authentication System

### 3.1 JWT Utilities (`server/src/utils/token.ts`)
```typescript
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { IUser } from '../models/User';
import crypto from 'crypto';

export interface JWTPayload {
  sub: string;          // userId
  role: string;
  email: string;
  iat?: number;
  exp?: number;
}

export function signAccessToken(user: Pick<IUser, '_id' | 'role' | 'email'>): string {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role, email: user.email },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRES_IN, algorithm: 'HS256' }
  );
}

export function verifyAccessToken(token: string): JWTPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as JWTPayload;
}

export function generateRefreshToken(): string {
  return crypto.randomBytes(40).toString('hex');
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
```

### 3.2 Authenticate Middleware (`server/src/middleware/authenticate.ts`)
```typescript
import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JWTPayload } from '../utils/token';
import { AppError } from './errorHandler';

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AppError('UNAUTHORIZED', 'Authentication required', 401);
  }
  const token = authHeader.slice(7);
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    throw new AppError('UNAUTHORIZED', 'Invalid or expired token', 401);
  }
}
```

### 3.3 Authorize Middleware (`server/src/middleware/authorize.ts`)
```typescript
import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';
import { UserRole } from '../models/User';

export function authorize(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw new AppError('UNAUTHORIZED', 'Not authenticated', 401);
    if (!roles.includes(req.user.role as UserRole)) {
      throw new AppError('FORBIDDEN', 'Insufficient permissions', 403);
    }
    next();
  };
}
```

### 3.4 Auth Service (`server/src/services/auth.service.ts`)
```typescript
import bcrypt from 'bcryptjs';
import { authenticator } from 'otplib';
import { User } from '../models/User';
import { RefreshToken } from '../models/RefreshToken';
import { StudentProfile } from '../models/StudentProfile';
import { signAccessToken, generateRefreshToken, hashToken } from '../utils/token';
import { AppError } from '../middleware/errorHandler';
import { env } from '../config/env';
import { auditService } from './audit.service';

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME_MINUTES = 15;

export const authService = {
  async login(email: string, password: string, ip: string, userAgent: string) {
    const user = await User.findOne({ email })
      .select('+passwordHash +mfaEnabled +mfaSecret +loginAttempts +lockUntil');
    
    if (!user) {
      // Prevent timing attack: hash anyway
      await bcrypt.compare(password, '$2b$12$invalidhashtopreventtiming');
      throw new AppError('UNAUTHORIZED', 'Invalid credentials', 401);
    }

    if (user.isLocked) {
      throw new AppError('UNAUTHORIZED', 'Account temporarily locked. Try again later.', 401);
    }

    if (!user.isActive) {
      throw new AppError('UNAUTHORIZED', 'Account not yet activated', 401);
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      user.loginAttempts += 1;
      if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
        user.lockUntil = new Date(Date.now() + LOCK_TIME_MINUTES * 60 * 1000);
      }
      await user.save();
      throw new AppError('UNAUTHORIZED', 'Invalid credentials', 401);
    }

    // Reset login attempts on success
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    user.lastLoginAt = new Date();
    await user.save();

    if (user.mfaEnabled) {
      // Issue short-lived temp token for MFA step
      const tempToken = signAccessToken({ _id: user._id, role: 'MFA_PENDING', email: user.email } as never);
      return { mfaRequired: true, tempToken };
    }

    const accessToken = signAccessToken(user);
    const refreshToken = await this.issueRefreshToken(user._id.toString(), ip, userAgent);

    await auditService.log({
      actor: user._id.toString(),
      actorRole: user.role,
      action: 'USER_LOGIN',
      resourceType: 'User',
      resourceId: user._id.toString(),
      outcome: 'SUCCESS',
      ipAddress: ip,
      userAgent,
    });

    return { accessToken, refreshToken, user: { id: user._id, email: user.email, role: user.role, firstName: user.firstName } };
  },

  async verifyMFA(tempToken: string, code: string, ip: string, userAgent: string) {
    // Verify tempToken (role === 'MFA_PENDING') — implemented similarly to authenticate
    // Then verify TOTP code using otplib
    // Issue proper access + refresh tokens
  },

  async issueRefreshToken(userId: string, ip: string, userAgent: string): Promise<string> {
    const rawToken = generateRefreshToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await RefreshToken.create({ userId, tokenHash, expiresAt, ipAddress: ip, userAgent });
    return rawToken;
  },

  async refreshAccessToken(rawRefreshToken: string) {
    const tokenHash = hashToken(rawRefreshToken);
    const stored = await RefreshToken.findOne({ tokenHash }).select('+tokenHash');
    if (!stored || stored.isRevoked || stored.expiresAt < new Date()) {
      throw new AppError('UNAUTHORIZED', 'Invalid or expired refresh token', 401);
    }
    const user = await User.findById(stored.userId);
    if (!user || !user.isActive) {
      throw new AppError('UNAUTHORIZED', 'User account invalid', 401);
    }
    return signAccessToken(user);
  },

  async logout(rawRefreshToken: string) {
    const tokenHash = hashToken(rawRefreshToken);
    await RefreshToken.updateOne({ tokenHash }, { isRevoked: true });
  },

  async activateAccount(token: string, newPassword: string) {
    const tokenHash = hashToken(token);
    const user = await User.findOne({ activationToken: tokenHash, activationExpires: { $gt: new Date() } })
      .select('+activationToken +activationExpires');
    if (!user) throw new AppError('NOT_FOUND', 'Invalid or expired activation token', 404);
    
    user.passwordHash = await bcrypt.hash(newPassword, env.BCRYPT_ROUNDS);
    user.isActive = true;
    user.activationToken = undefined;
    user.activationExpires = undefined;
    user.passwordChangedAt = new Date();
    await user.save();
  },
};
```

### 3.5 Auth Routes (`server/src/routes/auth.routes.ts`)
```typescript
import { Router } from 'express';
import { authService } from '../services/auth.service';
import { loginLimiter, mfaLimiter } from '../middleware/rateLimiter';
import { validate } from '../middleware/validate';
import { loginSchema, mfaSchema, activateSchema } from '../validators/auth.schema';
import { authenticate } from '../middleware/authenticate';

const router = Router();

router.post('/login', loginLimiter, validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const ip = req.ip ?? '';
    const ua = req.headers['user-agent'] ?? '';
    const result = await authService.login(email, password, ip, ua);
    
    if ('mfaRequired' in result) {
      return res.json({ success: true, data: result });
    }
    
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/v1/auth/refresh',
    });
    
    res.json({ success: true, data: { accessToken: result.accessToken, user: result.user } });
  } catch (err) { next(err); }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) throw new Error('No refresh token');
    const accessToken = await authService.refreshAccessToken(token);
    res.json({ success: true, data: { accessToken } });
  } catch (err) { next(err); }
});

router.post('/logout', authenticate, async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken;
    if (token) await authService.logout(token);
    res.clearCookie('refreshToken', { path: '/api/v1/auth/refresh' });
    res.json({ success: true, data: { message: 'Logged out' } });
  } catch (err) { next(err); }
});

router.post('/activate', validate(activateSchema), async (req, res, next) => {
  try {
    await authService.activateAccount(req.body.token, req.body.newPassword);
    res.json({ success: true, data: { message: 'Account activated' } });
  } catch (err) { next(err); }
});

export default router;
```

---

## Phase 4 — Assessment Engine

### 4.1 Assessment Service (`server/src/services/assessment.service.ts`)

Implement the following methods:
- `createAssessment(data, adminUserId)` — creates with DRAFT status, writes AuditLog
- `updateAssessment(id, data, adminUserId)` — validates allowed fields, validates state allows edit
- `transitionStatus(id, newStatus, adminUserId, reason)` — enforces state machine:
  - DRAFT → SCHEDULED (valid only if paper version attached + eligible students > 0)
  - SCHEDULED → OPEN (valid only within access window)
  - OPEN → PAUSED
  - PAUSED → OPEN
  - OPEN/PAUSED → CLOSED (triggers force-submit of IN_PROGRESS attempts)
  - CLOSED → RESULTS_PUBLISHED
  - All transitions write AuditLog
- `forceSubmitAllActive(assessmentId)` — called on CLOSED; scores all IN_PROGRESS attempts
- `getDashboard(assessmentId)` — aggregation pipeline for metrics

### 4.2 Question Service (`server/src/services/question.service.ts`)

Implement:
- `createQuestion(data, adminUserId)` — validates unique text (fuzzy check), saves as DRAFT
- `publishQuestion(id)` — status DRAFT → ACTIVE
- `retireQuestion(id)` — status ACTIVE → RETIRED (cannot retire if in active paper)
- `createPaperVersion(assessmentId, questionIds, versionLabel, shuffleOptions, adminUserId)`
  - Validates: all questionIds exist and are ACTIVE
  - Shuffles option order per question if shuffleOptions=true, recording original map
  - Copies question text and options into immutable PaperVersion document
  - Does NOT copy correctOptionId to browser-facing fields
  - Returns saved PaperVersion (correctOptionId field excluded from response)

---

## Phase 5 — Exam Attempt Engine (Critical)

### 5.1 Attempt Service (`server/src/services/attempt.service.ts`)

```typescript
import mongoose from 'mongoose';
import { Attempt } from '../models/Attempt';
import { Answer } from '../models/Answer';
import { Assessment } from '../models/Assessment';
import { PaperVersion } from '../models/PaperVersion';
import { StudentProfile } from '../models/StudentProfile';
import { AppError } from '../middleware/errorHandler';
import { scoringService } from './scoring.service';
import { auditService } from './audit.service';

export const attemptService = {
  async startAttempt(userId: string, assessmentId: string, ip: string, userAgent: string) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const assessment = await Assessment.findById(assessmentId).session(session);
      if (!assessment) throw new AppError('NOT_FOUND', 'Assessment not found', 404);
      if (assessment.status !== 'OPEN') throw new AppError('CONFLICT', 'Assessment is not open', 409);
      
      const now = new Date();
      if (now < assessment.accessWindowStart || now > assessment.accessWindowEnd) {
        throw new AppError('CONFLICT', 'Outside assessment access window', 409);
      }

      const student = await StudentProfile.findOne({ userId }).session(session);
      if (!student) throw new AppError('NOT_FOUND', 'Student profile not found', 404);
      
      // Eligibility check
      const isEligible = assessment.eligibleStudentIds.some(id => id.equals(student._id));
      if (!isEligible) throw new AppError('FORBIDDEN', 'Not eligible for this assessment', 403);

      // Attempt limit check
      const existingAttemptCount = await Attempt.countDocuments({
        assessmentId, studentId: student._id,
        status: { $in: ['SUBMITTED', 'TIMED_OUT', 'FORCE_SUBMITTED', 'SCORED'] }
      }).session(session);
      if (existingAttemptCount >= assessment.maxAttempts) {
        throw new AppError('CONFLICT', 'Attempt limit reached', 409);
      }

      // Idempotency: return existing IN_PROGRESS attempt if it exists
      const existing = await Attempt.findOne({
        assessmentId, studentId: student._id, status: 'IN_PROGRESS'
      }).session(session);
      
      if (existing) {
        const paper = await PaperVersion.findById(existing.paperVersionId)
          .select('-questions.correctOptionId').session(session);
        const savedAnswers = await Answer.find({ attemptId: existing._id }).session(session);
        await session.abortTransaction();
        return { attempt: existing, paper, savedAnswers, isResume: true };
      }

      // Randomly assign a paper version
      const versions = assessment.publishedPaperVersions;
      if (versions.length === 0) throw new AppError('CONFLICT', 'No paper versions available', 409);
      const randomVersion = versions[Math.floor(Math.random() * versions.length)];
      
      const startedAt = new Date();
      const deadlineAt = new Date(startedAt.getTime() + assessment.durationMinutes * 60 * 1000);

      const [attempt] = await Attempt.create([{
        assessmentId,
        studentId: student._id,
        userId,
        paperVersionId: randomVersion,
        status: 'IN_PROGRESS',
        startedAt,
        deadlineAt,
        maxScore: assessment.totalMarks,
        ipAddress: ip,
        userAgent,
      }], { session });

      await session.commitTransaction();
      
      const paper = await PaperVersion.findById(randomVersion).select('-questions.correctOptionId');
      return { attempt, paper, savedAnswers: [], isResume: false };
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  },

  async saveAnswer(attemptId: string, userId: string, questionId: string, selectedOptionId: string | null) {
    const attempt = await Attempt.findById(attemptId);
    if (!attempt) throw new AppError('NOT_FOUND', 'Attempt not found', 404);
    if (attempt.userId.toString() !== userId) throw new AppError('FORBIDDEN', 'Not your attempt', 403);
    if (attempt.status !== 'IN_PROGRESS') throw new AppError('CONFLICT', 'Attempt not in progress', 409);
    if (new Date() > attempt.deadlineAt) {
      await this.timeoutAttempt(attemptId);
      throw new AppError('CONFLICT', 'Exam time has expired', 409);
    }

    // Validate questionId belongs to this attempt's paper
    const paper = await PaperVersion.findById(attempt.paperVersionId);
    const validQuestion = paper?.questions.some(q => q.questionId.toString() === questionId);
    if (!validQuestion) throw new AppError('FORBIDDEN', 'Question not in your paper', 403);

    // Upsert answer
    const savedAt = new Date();
    await Answer.findOneAndUpdate(
      { attemptId, questionId },
      { selectedOptionId, savedAt },
      { upsert: true, new: true }
    );
    return { savedAt };
  },

  async submitAttempt(attemptId: string, userId: string) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const attempt = await Attempt.findById(attemptId).session(session);
      if (!attempt) throw new AppError('NOT_FOUND', 'Attempt not found', 404);
      if (attempt.userId.toString() !== userId) throw new AppError('FORBIDDEN', 'Not your attempt', 403);

      // Idempotency: already submitted
      if (['SUBMITTED', 'TIMED_OUT', 'FORCE_SUBMITTED', 'SCORED'].includes(attempt.status)) {
        await session.abortTransaction();
        return { status: attempt.status, submittedAt: attempt.submittedAt };
      }

      attempt.status = 'SUBMITTED';
      attempt.submittedAt = new Date();
      await attempt.save({ session });

      const result = await scoringService.scoreAttempt(attemptId, session);
      await session.commitTransaction();
      return { status: 'SUBMITTED', submittedAt: attempt.submittedAt, score: result };
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  },

  async timeoutAttempt(attemptId: string) {
    // Used by cron job and by answer-save check
    await Attempt.findByIdAndUpdate(attemptId, {
      status: 'TIMED_OUT',
      submittedAt: new Date(),
    });
    await scoringService.scoreAttempt(attemptId, undefined);
  },
};
```

### 5.2 Scoring Service (`server/src/services/scoring.service.ts`)
```typescript
import { ClientSession } from 'mongoose';
import { Attempt } from '../models/Attempt';
import { Answer } from '../models/Answer';
import { PaperVersion } from '../models/PaperVersion';
import { Assessment } from '../models/Assessment';

export const scoringService = {
  async scoreAttempt(attemptId: string, session?: ClientSession) {
    const attempt = await Attempt.findById(attemptId).session(session ?? null);
    const paper = await PaperVersion.findById(attempt!.paperVersionId)
      // Include correctOptionId for scoring (never sent to browser)
      .session(session ?? null);
    const assessment = await Assessment.findById(attempt!.assessmentId).session(session ?? null);
    const answers = await Answer.find({ attemptId }).session(session ?? null);

    const negativeMarking = assessment!.negativeMarking;
    let score = 0;
    let correct = 0;
    let incorrect = 0;
    let unanswered = 0;

    const answerMap = new Map(answers.map(a => [a.questionId.toString(), a.selectedOptionId]));

    for (const q of paper!.questions) {
      const selected = answerMap.get(q.questionId.toString());
      if (!selected) {
        unanswered++;
        // Update answer record
        await Answer.findOneAndUpdate(
          { attemptId, questionId: q.questionId },
          { isCorrect: false, marksAwarded: 0, selectedOptionId: null, savedAt: new Date() },
          { upsert: true, session }
        );
        continue;
      }
      if (selected === q.correctOptionId) {
        correct++;
        score += q.marksIfCorrect;
        await Answer.findOneAndUpdate(
          { attemptId, questionId: q.questionId },
          { isCorrect: true, marksAwarded: q.marksIfCorrect },
          { session }
        );
      } else {
        incorrect++;
        const penalty = negativeMarking.enabled ? negativeMarking.penaltyPerQuestion : 0;
        score = Math.max(0, score - penalty);
        await Answer.findOneAndUpdate(
          { attemptId, questionId: q.questionId },
          { isCorrect: false, marksAwarded: -penalty },
          { session }
        );
      }
    }

    await Attempt.findByIdAndUpdate(attemptId, {
      status: 'SCORED',
      score,
      correctCount: correct,
      incorrectCount: incorrect,
      unansweredCount: unanswered,
      scoredAt: new Date(),
    }, { session });

    return { score, correct, incorrect, unanswered };
  },
};
```

---

## Phase 6 — Proctoring & Incident Management

### 6.1 Incident Service (`server/src/services/incident.service.ts`)

```typescript
import { Incident } from '../models/Incident';
import { Attempt } from '../models/Attempt';
import { Assessment } from '../models/Assessment';
import { AppError } from '../middleware/errorHandler';
import { attemptService } from './attempt.service';

export const incidentService = {
  async recordIncident(attemptId: string, userId: string, type: string, occurredAt: Date, metadata: object) {
    const attempt = await Attempt.findById(attemptId);
    if (!attempt || attempt.userId.toString() !== userId) {
      throw new AppError('FORBIDDEN', 'Not your attempt', 403);
    }
    if (attempt.status !== 'IN_PROGRESS') return null;

    const assessment = await Assessment.findById(attempt.assessmentId);
    const policy = assessment!.integrityPolicy;

    const incident = await Incident.create({
      attemptId,
      studentId: attempt.studentId,
      assessmentId: attempt.assessmentId,
      type,
      occurredAt,
      metadata,
    });

    let response: { warning?: string; shouldAutoSubmit: boolean; tabSwitchCount?: number } = {
      shouldAutoSubmit: false,
    };

    if (type === 'TAB_SWITCH') {
      attempt.totalTabSwitches += 1;
      await attempt.save();

      response.tabSwitchCount = attempt.totalTabSwitches;

      if (attempt.totalTabSwitches >= policy.tabSwitchAutoSubmitAt) {
        response.shouldAutoSubmit = true;
        await attemptService.submitAttempt(attemptId, userId);
      } else if (attempt.totalTabSwitches >= policy.tabSwitchFlagAt) {
        response.warning = `Warning: ${attempt.totalTabSwitches} tab switches detected. Next will auto-submit.`;
      } else {
        response.warning = `Warning: Tab switch detected (${attempt.totalTabSwitches}/${policy.tabSwitchWarningAt}).`;
      }
    }

    return response;
  },

  async reviewIncident(incidentId: string, reviewerId: string, reviewStatus: string, reviewNote: string) {
    // Admin only — validated by authorize middleware
    const updated = await Incident.findByIdAndUpdate(incidentId, {
      reviewStatus,
      reviewNote,
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
    }, { new: true });
    if (!updated) throw new AppError('NOT_FOUND', 'Incident not found', 404);
    return updated;
  },
};
```

---

## Phase 7 — Excel Import / Export

### 7.1 Import Service (`server/src/services/import.service.ts`)

```typescript
import xlsx from 'xlsx';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { User } from '../models/User';
import { StudentProfile } from '../models/StudentProfile';
import { ImportBatch } from '../models/ImportBatch';
import { Assessment } from '../models/Assessment';
import { emailService } from './email.service';
import { env } from '../config/env';

const REQUIRED_COLUMNS = ['studentId', 'firstName', 'lastName', 'email', 'collegeName', 'branch'];
const MAX_ROWS = 500;

export const importService = {
  async previewImport(filePath: string, originalFilename: string, assessmentId: string, adminId: string) {
    // 1. Validate file
    const workbook = xlsx.readFile(filePath, { type: 'file', cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: Record<string, unknown>[] = xlsx.utils.sheet_to_json(sheet, { defval: '' });

    if (rows.length === 0) throw new Error('Empty spreadsheet');
    if (rows.length > MAX_ROWS) throw new Error(`Too many rows (max ${MAX_ROWS})`);

    // 2. Check required columns
    const headers = Object.keys(rows[0]);
    const missing = REQUIRED_COLUMNS.filter(c => !headers.includes(c));
    if (missing.length > 0) throw new Error(`Missing columns: ${missing.join(', ')}`);

    // 3. Validate each row
    const errors: object[] = [];
    const valid: typeof rows = [];
    const seenIds = new Set<string>();
    const seenEmails = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowErrors: string[] = [];
      const rowNum = i + 2; // Excel row number (1 = header)

      const studentId = String(row.studentId ?? '').trim().toUpperCase();
      const email = String(row.email ?? '').toLowerCase().trim();
      const firstName = String(row.firstName ?? '').trim();
      const lastName = String(row.lastName ?? '').trim();

      // Sanitise formula injection: prefix with ' if starts with = + - @
      for (const key of Object.keys(row)) {
        const val = String(row[key] ?? '');
        if (/^[=+\-@]/.test(val)) {
          (row as Record<string, unknown>)[key] = `'${val}`;
        }
      }

      if (!studentId) rowErrors.push('Missing studentId');
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) rowErrors.push('Invalid email');
      if (!firstName) rowErrors.push('Missing firstName');
      if (!lastName) rowErrors.push('Missing lastName');
      if (seenIds.has(studentId)) rowErrors.push('Duplicate studentId in this file');
      if (seenEmails.has(email)) rowErrors.push('Duplicate email in this file');

      seenIds.add(studentId);
      seenEmails.add(email);

      if (rowErrors.length > 0) {
        errors.push({ row: rowNum, studentId, email, errors: rowErrors });
      } else {
        valid.push(row);
      }
    }

    // 4. Check DB duplicates
    const existingStudentIds = await StudentProfile.find({ studentId: { $in: [...seenIds] } }).select('studentId');
    const existingDbIds = new Set(existingStudentIds.map(s => s.studentId));
    const dbDuplicates = valid.filter(r => existingDbIds.has(String(r.studentId).toUpperCase()));
    const cleanValid = valid.filter(r => !existingDbIds.has(String(r.studentId).toUpperCase()));

    const batch = await ImportBatch.create({
      assessmentId,
      uploadedBy: adminId,
      originalFilename,
      storagePath: filePath,
      status: 'PREVIEW',
      totalRows: rows.length,
      validRows: cleanValid.length,
      duplicateRows: dbDuplicates.length,
      errorRows: errors.length,
      errorReport: [...errors, ...dbDuplicates.map((r, i) => ({ row: `dup-${i}`, studentId: r.studentId, errors: ['Already exists in DB'] }))],
    });

    return {
      batchId: batch._id,
      totalRows: rows.length,
      validRows: cleanValid.length,
      duplicateRows: dbDuplicates.length,
      errorRows: errors.length,
      errors: batch.errorReport,
    };
  },

  async commitImport(batchId: string, adminId: string) {
    const batch = await ImportBatch.findById(batchId);
    if (!batch || batch.uploadedBy.toString() !== adminId) throw new Error('Batch not found');
    if (batch.status !== 'PREVIEW') throw new Error('Batch already committed');

    // Re-parse stored file
    const workbook = xlsx.readFile(batch.storagePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: Record<string, string>[] = xlsx.utils.sheet_to_json(sheet, { defval: '' });

    const assessment = await Assessment.findById(batch.assessmentId);
    const createdStudentProfileIds: string[] = [];

    for (const row of rows) {
      const studentId = String(row.studentId).trim().toUpperCase();
      const email = String(row.email).toLowerCase().trim();

      // Skip duplicates silently (idempotency)
      const exists = await StudentProfile.findOne({ studentId });
      if (exists) continue;

      // Generate activation token
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      const user = await User.create({
        email,
        passwordHash: await bcrypt.hash(crypto.randomBytes(16).toString('hex'), env.BCRYPT_ROUNDS),
        role: 'STUDENT',
        firstName: String(row.firstName).trim(),
        lastName: String(row.lastName).trim(),
        isActive: false,
        activationToken: tokenHash,
        activationExpires: new Date(Date.now() + 72 * 60 * 60 * 1000),
      });

      const profile = await StudentProfile.create({
        userId: user._id,
        studentId,
        collegeName: String(row.collegeName ?? '').trim(),
        branch: String(row.branch ?? '').trim(),
        importBatchId: batchId,
      });

      createdStudentProfileIds.push(profile._id.toString());

      // Send activation email with rawToken
      await emailService.sendActivationEmail(email, user.firstName, rawToken);
    }

    // Add to assessment eligibility
    await Assessment.findByIdAndUpdate(batch.assessmentId, {
      $addToSet: { eligibleStudentIds: { $each: createdStudentProfileIds } }
    });

    batch.status = 'COMMITTED';
    batch.committedAt = new Date();
    await batch.save();

    return { committed: createdStudentProfileIds.length };
  },
};
```

### 7.2 Export Service (`server/src/services/export.service.ts`)

```typescript
import xlsx from 'xlsx';
import path from 'path';
import { Attempt } from '../models/Attempt';
import { StudentProfile } from '../models/StudentProfile';
import { User } from '../models/User';
import { Incident } from '../models/Incident';
import { env } from '../config/env';

export const exportService = {
  async generateResultsExport(assessmentId: string): Promise<string> {
    const attempts = await Attempt.find({ assessmentId }).lean();
    const wb = xlsx.utils.book_new();

    // Sheet 1: Candidate_Results
    const resultsData = await Promise.all(attempts.map(async (att) => {
      const profile = await StudentProfile.findById(att.studentId).lean();
      const user = await User.findById(att.userId).select('firstName lastName email').lean();
      return {
        'Student ID': profile?.studentId ?? '',
        'Name': `${user?.firstName} ${user?.lastName}`,
        'Email': user?.email ?? '',
        'Branch': profile?.branch ?? '',
        'College': profile?.collegeName ?? '',
        'Status': att.status,
        'Started At': att.startedAt?.toISOString() ?? '',
        'Submitted At': att.submittedAt?.toISOString() ?? '',
        'Score': att.score ?? '',
        'Max Score': att.maxScore,
        'Percentage': att.score != null ? ((att.score / att.maxScore) * 100).toFixed(2) : '',
        'Correct': att.correctCount ?? '',
        'Incorrect': att.incorrectCount ?? '',
        'Unanswered': att.unansweredCount ?? '',
        'Tab Switches': att.totalTabSwitches,
      };
    }));

    const ws1 = xlsx.utils.json_to_sheet(resultsData);
    xlsx.utils.book_append_sheet(wb, ws1, 'Candidate_Results');

    // Sheet 2: Incident_Review
    const incidents = await Incident.find({ assessmentId }).lean();
    const incidentData = incidents.map(inc => ({
      'Attempt ID': inc.attemptId.toString(),
      'Student ID': inc.studentId.toString(),
      'Type': inc.type,
      'Occurred At': inc.occurredAt.toISOString(),
      'Review Status': inc.reviewStatus,
      'Review Note': inc.reviewNote ?? '',
    }));
    const ws2 = xlsx.utils.json_to_sheet(incidentData);
    xlsx.utils.book_append_sheet(wb, ws2, 'Incident_Review');

    // Sheet 3: Export_Metadata
    const meta = [{ 'Generated At': new Date().toISOString(), 'Assessment ID': assessmentId, 'Status': 'FINAL' }];
    xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(meta), 'Export_Metadata');

    const filename = `export_${assessmentId}_${Date.now()}.xlsx`;
    const filePath = path.join(env.UPLOAD_DIR, filename);
    xlsx.writeFile(wb, filePath);
    return filePath;
  },
};
```

---

## Phase 8 — Timeout Cron Job

### 8.1 Attempt Timeout Job (`server/src/jobs/attemptTimeout.job.ts`)
```typescript
import cron from 'node-cron';
import { Attempt } from '../models/Attempt';
import { scoringService } from '../services/scoring.service';
import { logger } from '../config/logger';

// Run every minute
export function startAttemptTimeoutJob() {
  cron.schedule('* * * * *', async () => {
    try {
      const expired = await Attempt.find({
        status: 'IN_PROGRESS',
        deadlineAt: { $lte: new Date() },
      }).select('_id');

      for (const att of expired) {
        try {
          await Attempt.findByIdAndUpdate(att._id, {
            status: 'TIMED_OUT',
            submittedAt: new Date(),
          });
          await scoringService.scoreAttempt(att._id.toString(), undefined);
          logger.info('Auto-timed-out attempt', { attemptId: att._id });
        } catch (err) {
          logger.error('Failed to timeout attempt', { attemptId: att._id, error: err });
        }
      }
    } catch (err) {
      logger.error('Timeout job error', { error: err });
    }
  });
}
```

---

## Phase 9 — Frontend Foundation

### 9.1 Axios Instance (`client/src/lib/api.ts`)
```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api/v1',
  withCredentials: true,
  timeout: 15000,
});

let isRefreshing = false;
let failedQueue: { resolve: (v: string) => void; reject: (e: Error) => void }[] = [];

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        });
      }
      original._retry = true;
      isRefreshing = true;
      try {
        const { data } = await api.post('/auth/refresh');
        const newToken = data.data.accessToken;
        sessionStorage.setItem('accessToken', newToken);
        failedQueue.forEach(p => p.resolve(newToken));
        failedQueue = [];
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch (e) {
        failedQueue.forEach(p => p.reject(e as Error));
        failedQueue = [];
        sessionStorage.removeItem('accessToken');
        window.location.href = '/login';
        return Promise.reject(e);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(err);
  }
);

export default api;
```

### 9.2 Tab Monitor Hook (`client/src/hooks/useTabMonitor.ts`)
```typescript
import { useEffect, useRef } from 'react';
import api from '../lib/api';

interface UseTabMonitorOptions {
  attemptId: string;
  onAutoSubmit: () => void;
  onWarning: (msg: string) => void;
}

export function useTabMonitor({ attemptId, onAutoSubmit, onWarning }: UseTabMonitorOptions) {
  const isActive = useRef(true);

  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.hidden) {
        isActive.current = false;
        try {
          const { data } = await api.post(`/student/attempts/${attemptId}/incident`, {
            type: 'TAB_SWITCH',
            occurredAt: new Date().toISOString(),
            metadata: {},
          });
          if (data.data.shouldAutoSubmit) {
            onAutoSubmit();
          } else if (data.data.warning) {
            onWarning(data.data.warning);
          }
        } catch { /* handle gracefully */ }
      } else {
        isActive.current = true;
      }
    };

    const handleFullscreenChange = async () => {
      if (!document.fullscreenElement) {
        try {
          await api.post(`/student/attempts/${attemptId}/incident`, {
            type: 'FULLSCREEN_EXIT',
            occurredAt: new Date().toISOString(),
            metadata: {},
          });
        } catch { /* handle gracefully */ }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    // Disable right-click and copy
    const preventDefault = (e: Event) => e.preventDefault();
    document.addEventListener('contextmenu', preventDefault);
    document.addEventListener('copy', preventDefault);
    document.addEventListener('cut', preventDefault);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('contextmenu', preventDefault);
      document.removeEventListener('copy', preventDefault);
      document.removeEventListener('cut', preventDefault);
    };
  }, [attemptId, onAutoSubmit, onWarning]);
}
```

### 9.3 Autosave Hook (`client/src/hooks/useAutosave.ts`)
```typescript
import { useRef, useCallback } from 'react';
import api from '../lib/api';

export function useAutosave(attemptId: string) {
  const saveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const DEBOUNCE_MS = 800;

  const saveAnswer = useCallback((questionId: string, selectedOptionId: string | null) => {
    const existing = saveTimers.current.get(questionId);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(async () => {
      try {
        await api.post(`/student/attempts/${attemptId}/answer`, {
          questionId,
          selectedOptionId,
        });
      } catch (err) {
        console.error('Autosave failed', err);
        // TODO: show persistent save-failed indicator to student
      }
    }, DEBOUNCE_MS);

    saveTimers.current.set(questionId, timer);
  }, [attemptId]);

  return { saveAnswer };
}
```

### 9.4 Server-Synced Timer Hook (`client/src/hooks/useExamTimer.ts`)
```typescript
import { useState, useEffect, useRef } from 'react';

export function useExamTimer(deadlineAt: string, serverTime: string, onExpire: () => void) {
  const serverOffset = useRef(new Date(serverTime).getTime() - Date.now());
  const [remaining, setRemaining] = useState(0);
  const expiredRef = useRef(false);

  useEffect(() => {
    const tick = () => {
      const now = Date.now() + serverOffset.current;
      const left = Math.max(0, new Date(deadlineAt).getTime() - now);
      setRemaining(left);
      if (left === 0 && !expiredRef.current) {
        expiredRef.current = true;
        onExpire();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadlineAt, onExpire]);

  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  return { remaining, display: `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}` };
}
```

---

## Phase 10 — Route Guards & Router

### 10.1 Protected Route Component (`client/src/router/index.tsx`)
```typescript
import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';

function RequireAuth({ roles }: { roles: string[] }) {
  const user = useSelector((state: any) => state.auth.user);
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/unauthorized" replace />;
  return <Outlet />;
}

// Use in router:
// <Route element={<RequireAuth roles={['ADMIN', 'SUPER_ADMIN']} />}>
//   <Route path="/admin/*" element={<AdminLayout />} />
// </Route>
// <Route element={<RequireAuth roles={['STUDENT']} />}>
//   <Route path="/student/*" element={<StudentLayout />} />
// </Route>
```

---

## Phase 11 — Validate & Launch

### 11.1 Environment file template (`server/.env.example`)
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/exam_platform?replicaSet=rs0
REDIS_URL=redis://localhost:6379
JWT_ACCESS_SECRET=change_me_min_32_chars_long_xxxxxxxxx
JWT_REFRESH_SECRET=change_me_min_32_chars_long_xxxxxxxxx
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
BCRYPT_ROUNDS=12
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=587
SMTP_USER=your_mailtrap_user
SMTP_PASS=your_mailtrap_pass
SMTP_FROM="Exam Platform <no-reply@example.com>"
CLIENT_ORIGIN=http://localhost:5173
MFA_ENCRYPTION_KEY=change_me_min_32_chars_long_xxxxxxxxx
MAX_FILE_SIZE_MB=10
UPLOAD_DIR=./uploads
```

### 11.2 Start development
```bash
# In root directory
docker-compose up -d mongo1 redis

# In server/
cp .env.example .env   # fill in values
npm run dev

# In client/
npm run dev
```

### 11.3 Seed super admin
```typescript
// server/src/scripts/seed.ts
import { connectDB } from '../config/db';
import { User } from '../models/User';
import bcrypt from 'bcryptjs';

async function seed() {
  await connectDB();
  const exists = await User.findOne({ email: 'admin@example.com' });
  if (!exists) {
    await User.create({
      email: 'admin@example.com',
      passwordHash: await bcrypt.hash('Admin@123456', 12),
      role: 'SUPER_ADMIN',
      firstName: 'Super',
      lastName: 'Admin',
      isActive: true,
      mfaEnabled: false,
    });
    console.log('Super admin created');
  }
  process.exit(0);
}
seed();
```
```bash
npx tsx src/scripts/seed.ts
```

---

## Phase Completion Checklist

- [ ] Phase 0: Node 20 + MongoDB 7 (replica) + Redis running
- [ ] Phase 1: Both projects compile without TS errors
- [ ] Phase 2: `GET /health` returns 200
- [ ] Phase 3: Login → access token → refresh → logout flow works
- [ ] Phase 4: Admin can create assessment, add paper version, change status
- [ ] Phase 5: Student can start, answer, submit; score computed server-side
- [ ] Phase 6: Tab switch creates Incident; 3rd switch auto-submits
- [ ] Phase 7: Excel import preview + commit + activation email sent
- [ ] Phase 8: Expired attempts timed out within 1 minute by cron
- [ ] Phase 9: Frontend compiles; protected routes working
- [ ] Phase 10: Full student flow E2E in browser
- [ ] Phase 11: All secrets rotated; no `.env` in git
