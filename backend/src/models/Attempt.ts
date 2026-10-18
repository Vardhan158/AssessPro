import mongoose, { Schema, Document } from 'mongoose';

export enum AttemptStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  SUBMITTED = 'SUBMITTED', // Student submitted manually
  TIMED_OUT = 'TIMED_OUT', // Examination deadline expired
  AUTO_SUBMITTED = 'AUTO_SUBMITTED', // Proctoring violation threshold exceeded
  FORCE_SUBMITTED = 'FORCE_SUBMITTED', // Finalized by administrative enforcement action
  SCORED = 'SCORED' // Evaluation completed
}

export interface IAttempt extends Document {
  assessmentId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  paperVersionId: mongoose.Types.ObjectId;
  status: AttemptStatus;
  finalizedReason?: string;
  isScored: boolean;
  startedAt: Date;
  deadlineAt: Date;
  submittedAt?: Date;
  score?: number;
  totalMarks?: number;
  percentage?: number;
  passed?: boolean;
  totalTabSwitches: number;
  cameraSnapshotsCount: number;
  networkDisconnectsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const AttemptSchema = new Schema<IAttempt>({
  assessmentId: { type: Schema.Types.ObjectId, ref: 'Assessment', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  paperVersionId: { type: Schema.Types.ObjectId, ref: 'PaperVersion', required: true },
  status: { type: String, enum: Object.values(AttemptStatus), default: AttemptStatus.IN_PROGRESS },
  finalizedReason: { type: String },
  isScored: { type: Boolean, default: false },
  startedAt: { type: Date, required: true },
  deadlineAt: { type: Date, required: true },
  submittedAt: { type: Date },
  score: { type: Number },
  totalMarks: { type: Number },
  percentage: { type: Number },
  passed: { type: Boolean },
  totalTabSwitches: { type: Number, default: 0 },
  cameraSnapshotsCount: { type: Number, default: 0 },
  networkDisconnectsCount: { type: Number, default: 0 }
}, { timestamps: true });

AttemptSchema.index({ assessmentId: 1, userId: 1 }, { unique: true });

export const Attempt = mongoose.model<IAttempt>('Attempt', AttemptSchema);
