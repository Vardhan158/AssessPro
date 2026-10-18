import mongoose, { Schema, Document } from 'mongoose';

export interface IPaperQuestionOption {
  optionId: string;
  text: string;
}

export interface IPaperQuestion {
  questionId: mongoose.Types.ObjectId;
  text: string;
  codeSnippet?: string;
  options: IPaperQuestionOption[];
  correctOptionId: string;
  marks: number;
}

export interface IPaperVersion extends Document {
  assessmentId: mongoose.Types.ObjectId;
  questions: IPaperQuestion[];
  versionNumber: number;
}

const PaperVersionSchema = new Schema<IPaperVersion>({
  assessmentId: { type: Schema.Types.ObjectId, ref: 'Assessment', required: true },
  versionNumber: { type: Number, required: true },
  questions: [{
    questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
    text: { type: String, required: true },
    codeSnippet: { type: String },
    options: [{
      optionId: { type: String, required: true },
      text: { type: String, required: true }
    }],
    correctOptionId: { type: String, required: true, select: false }, // Hidden by default
    marks: { type: Number, default: 1 }
  }]
}, { timestamps: true });

export const PaperVersion = mongoose.model<IPaperVersion>('PaperVersion', PaperVersionSchema);
