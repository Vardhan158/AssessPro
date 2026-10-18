import mongoose, { Schema, Document } from 'mongoose';

export interface IAnswer extends Document {
  attemptId: mongoose.Types.ObjectId;
  questionId: mongoose.Types.ObjectId;
  selectedOptionId: string;
  isMarkedForReview: boolean;
  savedAt: Date;
}

const AnswerSchema = new Schema<IAnswer>({
  attemptId: { type: Schema.Types.ObjectId, ref: 'Attempt', required: true },
  questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
  selectedOptionId: { type: String, required: true },
  isMarkedForReview: { type: Boolean, default: false },
  savedAt: { type: Date, default: Date.now }
}, { timestamps: true });

AnswerSchema.index({ attemptId: 1, questionId: 1 }, { unique: true });

export const Answer = mongoose.model<IAnswer>('Answer', AnswerSchema);
