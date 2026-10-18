import mongoose, { Schema, Document } from 'mongoose';

export enum AssessmentStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  OPEN = 'OPEN',
  PAUSED = 'PAUSED',
  CLOSED = 'CLOSED',
  RESULTS_PUBLISHED = 'RESULTS_PUBLISHED',
  ARCHIVED = 'ARCHIVED'
}

export enum ResultVisibility {
  NOT_PUBLISHED = 'NOT_PUBLISHED',
  SCORE_ONLY = 'SCORE_ONLY',
  SCORE_AND_ANSWERS = 'SCORE_AND_ANSWERS',
  HIDDEN = 'HIDDEN'
}

export interface IAssessmentIntegrityPolicy {
  maxTabSwitches: number; // review threshold for tab-switch incidents
  cameraRequired: boolean;
  microphoneRequired: boolean;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
}

export interface IAssessment extends Document {
  title: string;
  code: string;
  description: string;
  durationMinutes: number;
  totalQuestions: number;
  totalMarks: number;
  passingMarks: number;
  passPercentage: number;
  allowedAttempts: number;
  negativeMarking: number; // e.g. 0 or 0.25
  openAt: Date;
  closeAt: Date;
  status: AssessmentStatus;
  resultVisibility: ResultVisibility;
  allowedEligibilityTags: string[];
  eligibleStudentIds: mongoose.Types.ObjectId[];
  integrityPolicy: IAssessmentIntegrityPolicy;
  createdById: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AssessmentSchema = new Schema<IAssessment>({
  title: { type: String, required: true, trim: true },
  code: { type: String, required: true, unique: true, uppercase: true },
  description: { type: String, default: '' },
  durationMinutes: { type: Number, required: true, min: 1 },
  totalQuestions: { type: Number, required: true, min: 1 },
  totalMarks: { type: Number, required: true },
  passingMarks: { type: Number, default: 60 },
  passPercentage: { type: Number, default: 40 },
  allowedAttempts: { type: Number, default: 1 },
  negativeMarking: { type: Number, default: 0 },
  openAt: { type: Date, required: true },
  closeAt: { type: Date, required: true },
  status: { type: String, enum: Object.values(AssessmentStatus), default: AssessmentStatus.DRAFT },
  resultVisibility: { type: String, enum: Object.values(ResultVisibility), default: ResultVisibility.SCORE_ONLY },
  allowedEligibilityTags: [{ type: String }],
  eligibleStudentIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  integrityPolicy: {
    maxTabSwitches: { type: Number, default: 3 },
    cameraRequired: { type: Boolean, default: true },
    microphoneRequired: { type: Boolean, default: false },
    shuffleQuestions: { type: Boolean, default: true },
    shuffleOptions: { type: Boolean, default: true }
  },
  createdById: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

export const Assessment = mongoose.model<IAssessment>('Assessment', AssessmentSchema);
