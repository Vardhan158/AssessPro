import mongoose, { Document, Schema } from 'mongoose';

export interface IStudentIdSequence extends Document {
  year: number;
  sequence: number;
}

const StudentIdSequenceSchema = new Schema<IStudentIdSequence>({
  year: { type: Number, required: true, unique: true, index: true },
  sequence: { type: Number, required: true, default: 0 }
});

export const StudentIdSequence = mongoose.model<IStudentIdSequence>('StudentIdSequence', StudentIdSequenceSchema);
