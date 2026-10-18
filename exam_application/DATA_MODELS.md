# DATA_MODELS.md — MongoDB / Mongoose Schemas

> **Instructions for the IDE agent**: Implement each schema exactly as specified. Use TypeScript interfaces for every document. Add all specified indexes. Use `Schema.pre` hooks for `updatedAt`. Never store plaintext passwords or tokens.

---

## 1. User (Admin / SuperAdmin)

```typescript
// server/src/models/User.ts
import { Schema, model, Document } from 'mongoose';

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'STUDENT';

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  isActive: boolean;
  mfaEnabled: boolean;
  mfaSecret?: string;         // encrypted TOTP secret
  mfaBackupCodes?: string[];  // hashed backup codes
  loginAttempts: number;
  lockUntil?: Date;
  lastLoginAt?: Date;
  passwordChangedAt?: Date;
  activationToken?: string;   // hashed one-time activation token
  activationExpires?: Date;
  resetToken?: string;        // hashed password-reset token
  resetExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
  email:             { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
  passwordHash:      { type: String, required: true, select: false },
  role:              { type: String, enum: ['SUPER_ADMIN','ADMIN','STUDENT'], required: true },
  firstName:         { type: String, required: true, trim: true, maxlength: 100 },
  lastName:          { type: String, required: true, trim: true, maxlength: 100 },
  isActive:          { type: Boolean, default: false },
  mfaEnabled:        { type: Boolean, default: false },
  mfaSecret:         { type: String, select: false },
  mfaBackupCodes:    { type: [String], select: false },
  loginAttempts:     { type: Number, default: 0 },
  lockUntil:         { type: Date },
  lastLoginAt:       { type: Date },
  passwordChangedAt: { type: Date },
  activationToken:   { type: String, select: false },
  activationExpires: { type: Date },
  resetToken:        { type: String, select: false },
  resetExpires:      { type: Date },
}, { timestamps: true });

UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ lockUntil: 1 }, { expireAfterSeconds: 0 }); // TTL on lock

// Virtual: account is locked
UserSchema.virtual('isLocked').get(function () {
  return !!(this.lockUntil && this.lockUntil > new Date());
});

export const User = model<IUser>('User', UserSchema);
```

---

## 2. StudentProfile

```typescript
// server/src/models/StudentProfile.ts
import { Schema, model, Document, Types } from 'mongoose';

export interface IStudentProfile extends Document {
  userId: Types.ObjectId;       // ref User (role=STUDENT)
  studentId: string;            // org-assigned unique ID (e.g., roll number)
  phone?: string;               // optional, encrypted at rest in prod
  collegeName?: string;
  branch?: string;
  yearOfStudy?: number;
  importBatchId?: Types.ObjectId;
  addedManuallyBy?: Types.ObjectId; // admin userId
  addedManuallyReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const StudentProfileSchema = new Schema<IStudentProfile>({
  userId:                { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  studentId:             { type: String, required: true, unique: true, trim: true, uppercase: true, maxlength: 50 },
  phone:                 { type: String, trim: true, maxlength: 20 },
  collegeName:           { type: String, trim: true, maxlength: 200 },
  branch:                { type: String, trim: true, maxlength: 100 },
  yearOfStudy:           { type: Number, min: 1, max: 6 },
  importBatchId:         { type: Schema.Types.ObjectId, ref: 'ImportBatch' },
  addedManuallyBy:       { type: Schema.Types.ObjectId, ref: 'User' },
  addedManuallyReason:   { type: String, maxlength: 500 },
}, { timestamps: true });

StudentProfileSchema.index({ userId: 1 });
StudentProfileSchema.index({ studentId: 1 }, { unique: true });
StudentProfileSchema.index({ collegeName: 1, branch: 1 });

export const StudentProfile = model<IStudentProfile>('StudentProfile', StudentProfileSchema);
```

---

## 3. Assessment

```typescript
// server/src/models/Assessment.ts
import { Schema, model, Document, Types } from 'mongoose';

export type AssessmentStatus = 'DRAFT' | 'SCHEDULED' | 'OPEN' | 'PAUSED' | 'CLOSED' | 'RESULTS_PUBLISHED';

export interface NegativeMarkingConfig {
  enabled: boolean;
  penaltyPerQuestion: number; // e.g., 0.25
}

export interface ResultVisibility {
  showScore: boolean;
  showAnswers: boolean;
  releasedAt?: Date;
}

export interface IAssessment extends Document {
  title: string;
  description?: string;
  status: AssessmentStatus;
  accessWindowStart: Date;
  accessWindowEnd: Date;
  durationMinutes: number;
  maxAttempts: number;                  // default 1
  totalMarks: number;
  negativeMarking: NegativeMarkingConfig;
  resultVisibility: ResultVisibility;
  integrityPolicy: {
    tabSwitchWarningAt: number;         // warn at nth tab switch (default 1)
    tabSwitchFlagAt: number;            // flag at nth tab switch (default 2)
    tabSwitchAutoSubmitAt: number;      // auto-submit at nth (default 3)
    requireCamera: boolean;
    cameraSnapshotIntervalMinutes: number;
  };
  eligibleStudentIds: Types.ObjectId[]; // ref StudentProfile
  paperTemplateId?: Types.ObjectId;     // ref PaperTemplate
  publishedPaperVersions: Types.ObjectId[]; // ref PaperVersion (immutable)
  createdBy: Types.ObjectId;
  lastModifiedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AssessmentSchema = new Schema<IAssessment>({
  title:               { type: String, required: true, trim: true, maxlength: 200 },
  description:         { type: String, maxlength: 2000 },
  status:              { type: String, enum: ['DRAFT','SCHEDULED','OPEN','PAUSED','CLOSED','RESULTS_PUBLISHED'], default: 'DRAFT' },
  accessWindowStart:   { type: Date, required: true },
  accessWindowEnd:     { type: Date, required: true },
  durationMinutes:     { type: Number, required: true, min: 1, max: 480 },
  maxAttempts:         { type: Number, default: 1, min: 1, max: 3 },
  totalMarks:          { type: Number, required: true, min: 1 },
  negativeMarking: {
    enabled:             { type: Boolean, default: false },
    penaltyPerQuestion:  { type: Number, default: 0.25, min: 0, max: 1 },
  },
  resultVisibility: {
    showScore:    { type: Boolean, default: false },
    showAnswers:  { type: Boolean, default: false },
    releasedAt:   { type: Date },
  },
  integrityPolicy: {
    tabSwitchWarningAt:              { type: Number, default: 1 },
    tabSwitchFlagAt:                 { type: Number, default: 2 },
    tabSwitchAutoSubmitAt:           { type: Number, default: 3 },
    requireCamera:                   { type: Boolean, default: true },
    cameraSnapshotIntervalMinutes:   { type: Number, default: 2 },
  },
  eligibleStudentIds:       { type: [Schema.Types.ObjectId], ref: 'StudentProfile', default: [] },
  paperTemplateId:          { type: Schema.Types.ObjectId, ref: 'PaperTemplate' },
  publishedPaperVersions:   { type: [Schema.Types.ObjectId], ref: 'PaperVersion', default: [] },
  createdBy:                { type: Schema.Types.ObjectId, ref: 'User', required: true },
  lastModifiedBy:           { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

AssessmentSchema.index({ status: 1 });
AssessmentSchema.index({ accessWindowStart: 1, accessWindowEnd: 1 });
AssessmentSchema.index({ eligibleStudentIds: 1 });

export const Assessment = model<IAssessment>('Assessment', AssessmentSchema);
```

---

## 4. Question

```typescript
// server/src/models/Question.ts
import { Schema, model, Document, Types } from 'mongoose';

export type QuestionStatus = 'DRAFT' | 'ACTIVE' | 'RETIRED';
export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface IOption {
  id: string;       // 'A' | 'B' | 'C' | 'D'
  text: string;
}

export interface IQuestion extends Document {
  questionText: string;
  options: IOption[];
  correctOptionId: string;    // never sent to browser during exam
  explanation?: string;       // shown only after result release
  topic: string;
  difficulty: Difficulty;
  marksIfCorrect: number;
  status: QuestionStatus;
  version: number;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const QuestionSchema = new Schema<IQuestion>({
  questionText:   { type: String, required: true, maxlength: 5000 },
  options: [{
    id:   { type: String, required: true, enum: ['A','B','C','D'] },
    text: { type: String, required: true, maxlength: 1000 },
  }],
  correctOptionId: { type: String, required: true, enum: ['A','B','C','D'], select: false },
  explanation:     { type: String, maxlength: 2000 },
  topic:           { type: String, required: true, trim: true, maxlength: 100 },
  difficulty:      { type: String, enum: ['EASY','MEDIUM','HARD'], required: true },
  marksIfCorrect:  { type: Number, required: true, min: 0.5, max: 10 },
  status:          { type: String, enum: ['DRAFT','ACTIVE','RETIRED'], default: 'DRAFT' },
  version:         { type: Number, default: 1 },
  createdBy:       { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

QuestionSchema.index({ status: 1, topic: 1, difficulty: 1 });
QuestionSchema.index({ createdBy: 1 });

export const Question = model<IQuestion>('Question', QuestionSchema);
```

---

## 5. PaperVersion (Immutable snapshot assigned to attempts)

```typescript
// server/src/models/PaperVersion.ts
import { Schema, model, Document, Types } from 'mongoose';

export interface IPaperQuestion {
  questionId: Types.ObjectId;
  questionText: string;
  options: { id: string; text: string }[];  // shuffled option order
  correctOptionId: string;                  // stored here for scoring, NEVER exposed to browser
  marksIfCorrect: number;
  originalOptionOrder: string[];            // for audit: original A/B/C/D → shuffled index map
}

export interface IPaperVersion extends Document {
  assessmentId: Types.ObjectId;
  versionLabel: string;       // e.g., 'SET-A', 'v1'
  questions: IPaperQuestion[];
  totalMarks: number;
  isActive: boolean;          // soft-delete / retire old versions
  createdBy: Types.ObjectId;
  createdAt: Date;
}

const PaperVersionSchema = new Schema<IPaperVersion>({
  assessmentId: { type: Schema.Types.ObjectId, ref: 'Assessment', required: true },
  versionLabel: { type: String, required: true, trim: true, maxlength: 50 },
  questions: [{
    questionId:          { type: Schema.Types.ObjectId, ref: 'Question', required: true },
    questionText:        { type: String, required: true },
    options:             [{ id: String, text: String }],
    correctOptionId:     { type: String, required: true, select: false },
    marksIfCorrect:      { type: Number, required: true },
    originalOptionOrder: { type: [String] },
  }],
  totalMarks:   { type: Number, required: true },
  isActive:     { type: Boolean, default: true },
  createdBy:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: { createdAt: true, updatedAt: false } }); // immutable after creation

PaperVersionSchema.index({ assessmentId: 1 });

export const PaperVersion = model<IPaperVersion>('PaperVersion', PaperVersionSchema);
```

---

## 6. Attempt

```typescript
// server/src/models/Attempt.ts
import { Schema, model, Document, Types } from 'mongoose';

export type AttemptStatus = 'IN_PROGRESS' | 'SUBMITTED' | 'TIMED_OUT' | 'FORCE_SUBMITTED' | 'ABANDONED' | 'SCORED';

export interface IAttempt extends Document {
  assessmentId: Types.ObjectId;
  studentId: Types.ObjectId;         // ref StudentProfile
  userId: Types.ObjectId;            // ref User (for fast auth checks)
  paperVersionId: Types.ObjectId;    // ref PaperVersion
  status: AttemptStatus;
  startedAt: Date;
  deadlineAt: Date;                  // server-calculated: startedAt + durationMinutes
  submittedAt?: Date;
  totalTabSwitches: number;
  disconnectCount: number;
  score?: number;
  maxScore: number;
  correctCount?: number;
  incorrectCount?: number;
  unansweredCount?: number;
  scoredAt?: Date;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
  updatedAt: Date;
}

const AttemptSchema = new Schema<IAttempt>({
  assessmentId:    { type: Schema.Types.ObjectId, ref: 'Assessment', required: true },
  studentId:       { type: Schema.Types.ObjectId, ref: 'StudentProfile', required: true },
  userId:          { type: Schema.Types.ObjectId, ref: 'User', required: true },
  paperVersionId:  { type: Schema.Types.ObjectId, ref: 'PaperVersion', required: true },
  status:          { type: String, enum: ['IN_PROGRESS','SUBMITTED','TIMED_OUT','FORCE_SUBMITTED','ABANDONED','SCORED'], default: 'IN_PROGRESS' },
  startedAt:       { type: Date, required: true },
  deadlineAt:      { type: Date, required: true },
  submittedAt:     { type: Date },
  totalTabSwitches:{ type: Number, default: 0 },
  disconnectCount: { type: Number, default: 0 },
  score:           { type: Number },
  maxScore:        { type: Number, required: true },
  correctCount:    { type: Number },
  incorrectCount:  { type: Number },
  unansweredCount: { type: Number },
  scoredAt:        { type: Date },
  ipAddress:       { type: String, required: true },
  userAgent:       { type: String, required: true },
}, { timestamps: true });

// Enforce one active attempt per student per assessment
AttemptSchema.index(
  { assessmentId: 1, studentId: 1 },
  { unique: true, partialFilterExpression: { status: 'IN_PROGRESS' } }
);
AttemptSchema.index({ assessmentId: 1, status: 1 });
AttemptSchema.index({ deadlineAt: 1 }); // for timeout cron
AttemptSchema.index({ userId: 1 });

export const Attempt = model<IAttempt>('Attempt', AttemptSchema);
```

---

## 7. Answer (autosave per question)

```typescript
// server/src/models/Answer.ts
import { Schema, model, Document, Types } from 'mongoose';

export interface IAnswer extends Document {
  attemptId: Types.ObjectId;
  questionId: Types.ObjectId;
  selectedOptionId?: string;   // undefined = unanswered
  savedAt: Date;
  isCorrect?: boolean;         // populated only after scoring
  marksAwarded?: number;
}

const AnswerSchema = new Schema<IAnswer>({
  attemptId:        { type: Schema.Types.ObjectId, ref: 'Attempt', required: true },
  questionId:       { type: Schema.Types.ObjectId, ref: 'Question', required: true },
  selectedOptionId: { type: String, enum: ['A','B','C','D',null] },
  savedAt:          { type: Date, default: Date.now },
  isCorrect:        { type: Boolean },
  marksAwarded:     { type: Number },
}, { timestamps: false });

AnswerSchema.index({ attemptId: 1, questionId: 1 }, { unique: true });

export const Answer = model<IAnswer>('Answer', AnswerSchema);
```

---

## 8. Incident (browser integrity events)

```typescript
// server/src/models/Incident.ts
import { Schema, model, Document, Types } from 'mongoose';

export type IncidentType =
  | 'TAB_SWITCH'
  | 'FULLSCREEN_EXIT'
  | 'CAMERA_LOST'
  | 'CAMERA_DENIED'
  | 'COPY_ATTEMPT'
  | 'RIGHT_CLICK'
  | 'NETWORK_DISCONNECT'
  | 'NETWORK_RECONNECT'
  | 'MULTIPLE_DISPLAYS_DETECTED'
  | 'ADMIN_FLAGGED';

export type ReviewStatus = 'PENDING' | 'REVIEWED_CLEAN' | 'REVIEWED_FLAGGED';

export interface IIncident extends Document {
  attemptId: Types.ObjectId;
  studentId: Types.ObjectId;
  assessmentId: Types.ObjectId;
  type: IncidentType;
  occurredAt: Date;
  metadata?: Record<string, unknown>; // e.g., { tabSwitchCount: 2 }
  reviewStatus: ReviewStatus;
  reviewedBy?: Types.ObjectId;
  reviewNote?: string;
  reviewedAt?: Date;
}

const IncidentSchema = new Schema<IIncident>({
  attemptId:    { type: Schema.Types.ObjectId, ref: 'Attempt', required: true },
  studentId:    { type: Schema.Types.ObjectId, ref: 'StudentProfile', required: true },
  assessmentId: { type: Schema.Types.ObjectId, ref: 'Assessment', required: true },
  type:         { type: String, required: true },
  occurredAt:   { type: Date, required: true },
  metadata:     { type: Schema.Types.Mixed },
  reviewStatus: { type: String, enum: ['PENDING','REVIEWED_CLEAN','REVIEWED_FLAGGED'], default: 'PENDING' },
  reviewedBy:   { type: Schema.Types.ObjectId, ref: 'User' },
  reviewNote:   { type: String, maxlength: 2000 },
  reviewedAt:   { type: Date },
}, { timestamps: { createdAt: true, updatedAt: false } });

IncidentSchema.index({ attemptId: 1 });
IncidentSchema.index({ assessmentId: 1, reviewStatus: 1 });
IncidentSchema.index({ studentId: 1 });

export const Incident = model<IIncident>('Incident', IncidentSchema);
```

---

## 9. ImportBatch

```typescript
// server/src/models/ImportBatch.ts
import { Schema, model, Document, Types } from 'mongoose';

export type ImportStatus = 'PREVIEW' | 'COMMITTED' | 'FAILED';

export interface IImportBatch extends Document {
  assessmentId: Types.ObjectId;
  uploadedBy: Types.ObjectId;
  originalFilename: string;
  storagePath: string;              // server path or S3 key
  status: ImportStatus;
  totalRows: number;
  validRows: number;
  duplicateRows: number;
  errorRows: number;
  errorReport?: object[];           // row-level errors
  committedAt?: Date;
  createdAt: Date;
}

const ImportBatchSchema = new Schema<IImportBatch>({
  assessmentId:      { type: Schema.Types.ObjectId, ref: 'Assessment', required: true },
  uploadedBy:        { type: Schema.Types.ObjectId, ref: 'User', required: true },
  originalFilename:  { type: String, required: true },
  storagePath:       { type: String, required: true },
  status:            { type: String, enum: ['PREVIEW','COMMITTED','FAILED'], default: 'PREVIEW' },
  totalRows:         { type: Number, required: true },
  validRows:         { type: Number, required: true },
  duplicateRows:     { type: Number, required: true },
  errorRows:         { type: Number, required: true },
  errorReport:       { type: [Schema.Types.Mixed] },
  committedAt:       { type: Date },
}, { timestamps: { createdAt: true, updatedAt: false } });

ImportBatchSchema.index({ assessmentId: 1 });
ImportBatchSchema.index({ uploadedBy: 1 });

export const ImportBatch = model<IImportBatch>('ImportBatch', ImportBatchSchema);
```

---

## 10. AuditLog (append-only, no updates, no deletes)

```typescript
// server/src/models/AuditLog.ts
import { Schema, model, Document, Types } from 'mongoose';

export interface IAuditLog extends Document {
  actor: Types.ObjectId;        // userId performing the action
  actorRole: string;
  action: string;               // e.g., 'ASSESSMENT_STATUS_CHANGED'
  resourceType: string;         // e.g., 'Assessment'
  resourceId?: string;
  before?: object;              // sanitised previous state
  after?: object;               // sanitised new state
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
  outcome: 'SUCCESS' | 'FAILURE';
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>({
  actor:        { type: Schema.Types.ObjectId, ref: 'User', required: true },
  actorRole:    { type: String, required: true },
  action:       { type: String, required: true, maxlength: 100 },
  resourceType: { type: String, required: true, maxlength: 100 },
  resourceId:   { type: String },
  before:       { type: Schema.Types.Mixed },
  after:        { type: Schema.Types.Mixed },
  reason:       { type: String, maxlength: 1000 },
  ipAddress:    { type: String },
  userAgent:    { type: String },
  outcome:      { type: String, enum: ['SUCCESS','FAILURE'], required: true },
}, { timestamps: { createdAt: true, updatedAt: false } });

// No .pre('deleteOne') — this collection must never be purged by the app
AuditLogSchema.index({ actor: 1, createdAt: -1 });
AuditLogSchema.index({ action: 1 });
AuditLogSchema.index({ resourceType: 1, resourceId: 1 });

export const AuditLog = model<IAuditLog>('AuditLog', AuditLogSchema);
```

---

## 11. RefreshToken

```typescript
// server/src/models/RefreshToken.ts
import { Schema, model, Document, Types } from 'mongoose';

export interface IRefreshToken extends Document {
  userId: Types.ObjectId;
  tokenHash: string;    // SHA-256 of the raw refresh token
  expiresAt: Date;
  isRevoked: boolean;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

const RefreshTokenSchema = new Schema<IRefreshToken>({
  userId:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
  tokenHash: { type: String, required: true, unique: true, select: false },
  expiresAt: { type: Date, required: true },
  isRevoked: { type: Boolean, default: false },
  ipAddress: { type: String },
  userAgent: { type: String },
}, { timestamps: { createdAt: true, updatedAt: false } });

RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // auto-purge expired
RefreshTokenSchema.index({ userId: 1 });

export const RefreshToken = model<IRefreshToken>('RefreshToken', RefreshTokenSchema);
```
