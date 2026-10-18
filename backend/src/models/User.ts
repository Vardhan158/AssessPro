import mongoose, { Schema, Document } from 'mongoose';

export enum UserRole {
  STUDENT = 'STUDENT',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN'
}

export enum UserStatus {
  PENDING_ACTIVATION = 'PENDING_ACTIVATION',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED'
}

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  firstName: string;
  lastName: string;
  phone?: string;
  activationTokenHash?: string;
  activationTokenIssuedAt?: Date;
  activationTokenLastSentAt?: Date;
  activationTokenExpiresAt?: Date;
  resetPasswordToken?: string;
  resetPasswordExpiresAt?: Date;
  refreshTokenHash?: string;
  refreshTokenExpiresAt?: Date;
  failedLoginAttempts?: number;
  lockUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: Object.values(UserRole), default: UserRole.STUDENT },
  status: { type: String, enum: Object.values(UserStatus), default: UserStatus.PENDING_ACTIVATION },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  phone: { type: String },
  activationTokenHash: { type: String, index: true, select: false },
  activationTokenIssuedAt: { type: Date },
  activationTokenLastSentAt: { type: Date },
  activationTokenExpiresAt: { type: Date },
  resetPasswordToken: { type: String, index: true },
  resetPasswordExpiresAt: { type: Date },
  refreshTokenHash: { type: String, index: true },
  refreshTokenExpiresAt: { type: Date },
  failedLoginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date }
}, { timestamps: true });

export const User = mongoose.model<IUser>('User', UserSchema);
