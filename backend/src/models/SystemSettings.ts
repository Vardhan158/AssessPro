import mongoose, { Schema, Document } from 'mongoose';

export interface ISystemSettings extends Document {
  passwordMinLength: number;
  passwordRequireSymbols: boolean;
  adminMfaRequired: boolean;
  sessionTimeoutMinutes: number;
  auditLogRetentionDays: number;
  maxTabSwitchesDefault: number;
  cameraRequiredDefault: boolean;
  updatedAt: Date;
}

const SystemSettingsSchema = new Schema<ISystemSettings>({
  passwordMinLength: { type: Number, default: 8, min: 6 },
  passwordRequireSymbols: { type: Boolean, default: true },
  adminMfaRequired: { type: Boolean, default: true },
  sessionTimeoutMinutes: { type: Number, default: 60, min: 15 },
  auditLogRetentionDays: { type: Number, default: 90, min: 30 },
  maxTabSwitchesDefault: { type: Number, default: 3, min: 1 },
  cameraRequiredDefault: { type: Boolean, default: true }
}, { timestamps: true });

export const SystemSettings = mongoose.model<ISystemSettings>('SystemSettings', SystemSettingsSchema);
