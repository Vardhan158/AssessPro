import mongoose, { Schema, Document } from 'mongoose';

export enum IncidentType {
  TAB_SWITCH = 'TAB_SWITCH',
  FULLSCREEN_EXIT = 'FULLSCREEN_EXIT',
  CAMERA_DISCONNECT = 'CAMERA_DISCONNECT',
  CAMERA_SNAPSHOT = 'CAMERA_SNAPSHOT',
  MULTIPLE_FACES = 'MULTIPLE_FACES',
  NETWORK_DISCONNECT = 'NETWORK_DISCONNECT'
}

export enum IncidentSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export enum IncidentStatus {
  LOGGED = 'LOGGED',
  FLAGGED = 'FLAGGED',
  REVIEWED_APPROVED = 'REVIEWED_APPROVED',
  REVIEWED_REJECTED = 'REVIEWED_REJECTED',
  PENDING = 'PENDING',
  REVIEWED = 'REVIEWED',
  NEEDS_INVESTIGATION = 'NEEDS_INVESTIGATION'
}

export interface IIncident extends Document {
  attemptId: mongoose.Types.ObjectId;
  assessmentId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  type: IncidentType;
  severity: IncidentSeverity;
  status: IncidentStatus;
  details: string;
  timestamp: Date;
  reviewerNotes?: string;
}

const IncidentSchema = new Schema<IIncident>({
  attemptId: { type: Schema.Types.ObjectId, ref: 'Attempt', required: true },
  assessmentId: { type: Schema.Types.ObjectId, ref: 'Assessment', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: Object.values(IncidentType), required: true },
  severity: { type: String, enum: Object.values(IncidentSeverity), default: IncidentSeverity.MEDIUM },
  status: { type: String, enum: Object.values(IncidentStatus), default: IncidentStatus.LOGGED },
  details: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  reviewerNotes: { type: String }
}, { timestamps: true });

export const Incident = mongoose.model<IIncident>('Incident', IncidentSchema);
