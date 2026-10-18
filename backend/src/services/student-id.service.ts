import { StudentIdSequence } from '../models/StudentIdSequence';

export async function generateStudentId(date = new Date()): Promise<string> {
  const year = date.getFullYear();
  const sequence = await StudentIdSequence.findOneAndUpdate(
    { year },
    { $inc: { sequence: 1 }, $setOnInsert: { year } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  if (!sequence) throw new Error('Unable to allocate a student ID');
  return `STU-${year}-${String(sequence.sequence).padStart(4, '0')}`;
}
