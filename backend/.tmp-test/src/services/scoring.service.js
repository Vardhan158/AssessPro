"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scoreAttempt = scoreAttempt;
const Answer_1 = require("../models/Answer");
const PaperVersion_1 = require("../models/PaperVersion");
const Assessment_1 = require("../models/Assessment");
async function scoreAttempt(attempt) {
    const paperVersion = await PaperVersion_1.PaperVersion.findById(attempt.paperVersionId).select('+questions.correctOptionId');
    if (!paperVersion) {
        throw new Error('Paper version not found for scoring');
    }
    const assessment = await Assessment_1.Assessment.findById(attempt.assessmentId);
    const negativeMarking = assessment?.negativeMarking || 0;
    const savedAnswers = await Answer_1.Answer.find({ attemptId: attempt._id });
    const answerMap = new Map(savedAnswers.map(a => [a.questionId.toString(), a.selectedOptionId]));
    let score = 0;
    let totalMarks = 0;
    for (const q of paperVersion.questions) {
        totalMarks += q.marks;
        const selectedOptionId = answerMap.get(q.questionId.toString());
        if (selectedOptionId) {
            if (selectedOptionId === q.correctOptionId) {
                score += q.marks;
            }
            else if (negativeMarking > 0) {
                score -= negativeMarking;
            }
        }
    }
    score = Math.max(0, score);
    const percentage = totalMarks > 0 ? (score / totalMarks) * 100 : 0;
    const passPercentage = assessment && assessment.totalMarks > 0
        ? (assessment.passingMarks / assessment.totalMarks) * 100
        : 40;
    const passed = percentage >= passPercentage;
    attempt.score = Math.round(score * 100) / 100;
    attempt.totalMarks = totalMarks;
    attempt.percentage = Math.round(percentage * 100) / 100;
    attempt.passed = passed;
    attempt.isScored = true;
    await attempt.save();
    return attempt;
}
