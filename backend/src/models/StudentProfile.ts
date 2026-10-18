import mongoose, { Schema, Document } from 'mongoose';

export type InvitationDeliveryStatus = 'PENDING' | 'SENT' | 'FAILED';

export interface IStudentProfile extends Document {
  userId: mongoose.Types.ObjectId;
  studentId: string; // Required, unique student registration ID
  collegeName?: string;
  branch?: string;
  yearOfStudy?: string;
  phone?: string;
  eligibilityTags: string[];
  invitationStatus: InvitationDeliveryStatus;
  invitationSentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const StudentProfileSchema = new Schema<IStudentProfile>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  studentId: { type: String, required: true, unique: true, uppercase: true, trim: true },
  collegeName: { type: String, default: 'Institute of Technology' },
  branch: { type: String, default: 'Computer Science' },
  yearOfStudy: { type: String, default: '4th Year' },
  phone: { type: String },
  eligibilityTags: [{ type: String }],
  invitationStatus: { type: String, enum: ['PENDING', 'SENT', 'FAILED'], default: 'PENDING' },
  invitationSentAt: { type: Date }
}, { timestamps: true });

export const StudentProfile = mongoose.model<IStudentProfile>('StudentProfile', StudentProfileSchema);
