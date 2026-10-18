"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateStudentId = generateStudentId;
const StudentIdSequence_1 = require("../models/StudentIdSequence");
async function generateStudentId(date = new Date()) {
    const year = date.getFullYear();
    const sequence = await StudentIdSequence_1.StudentIdSequence.findOneAndUpdate({ year }, { $inc: { sequence: 1 }, $setOnInsert: { year } }, { new: true, upsert: true, setDefaultsOnInsert: true });
    if (!sequence)
        throw new Error('Unable to allocate a student ID');
    return `STU-${year}-${String(sequence.sequence).padStart(4, '0')}`;
}
