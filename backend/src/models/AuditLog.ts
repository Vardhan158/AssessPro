import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
  actorId: mongoose.Types.ObjectId;
  actorRole: string;
  action: string;
  targetResource: string;
  resourceId?: string;
  details: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>({
  actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  actorRole: { type: String, required: true },
  action: { type: String, required: true },
  targetResource: { type: String, required: true },
  resourceId: { type: String },
  details: { type: Schema.Types.Mixed, default: {} },
  ipAddress: { type: String },
  userAgent: { type: String }
}, { timestamps: true });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);

export async function logAudit(params: {
  actorId: string | mongoose.Types.ObjectId;
  actorRole: string;
  action: string;
  targetResource: string;
  resourceId?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
}) {
  try {
    await AuditLog.create({
      actorId: params.actorId,
      actorRole: params.actorRole,
      action: params.action,
      targetResource: params.targetResource,
      resourceId: params.resourceId,
      details: params.details || {},
      ipAddress: params.ipAddress,
      userAgent: params.userAgent
    });
  } catch (err) {
    console.error('AuditLog creation error:', err);
  }
}
