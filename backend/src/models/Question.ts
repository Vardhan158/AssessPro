import mongoose, { Schema, Document } from 'mongoose';

export interface IOption {
  optionId: string;
  text: string;
}

export interface IQuestion extends Document {
  assessmentId?: mongoose.Types.ObjectId;
  text: string;
  codeSnippet?: string;
  options: IOption[];
  correctOptionId: string;
  marks: number;
  explanation?: string;
  category: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
}

const QuestionSchema = new Schema<IQuestion>({
  assessmentId: { type: Schema.Types.ObjectId, ref: 'Assessment', required: false },
  text: { type: String, required: true },
  codeSnippet: { type: String },
  options: [{
    optionId: { type: String, required: true },
    text: { type: String, required: true }
  }],
  correctOptionId: { type: String, required: true, select: false }, // Explicitly excluded from student queries
  marks: { type: Number, default: 1 },
  explanation: { type: String },
  category: { type: String, default: 'General' },
  difficulty: { type: String, enum: ['EASY', 'MEDIUM', 'HARD'], default: 'MEDIUM' }
}, { timestamps: true });

export const Question = mongoose.model<IQuestion>('Question', QuestionSchema);
