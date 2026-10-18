import mongoose from 'mongoose';
import { Assessment, AssessmentStatus } from '../models/Assessment';
import { Attempt, AttemptStatus } from '../models/Attempt';
import { PaperVersion } from '../models/PaperVersion';
import { Answer } from '../models/Answer';
import { Question } from '../models/Question';
import { StudentProfile } from '../models/StudentProfile';
import { User, UserStatus } from '../models/User';
import { scoreAttempt } from './scoring.service';
import { AppError } from '../middleware/errorHandler';

export async function startOrGetAttempt(params: { assessmentId?: string; attemptId?: string }, userId: string) {
  const { assessmentId, attemptId } = params;

  // Verify candidate user account is active
  const user = await User.findById(userId);
  if (!user || user.status !== UserStatus.ACTIVE) {
    throw new AppError('Student account must be active to start or access an examination', 403);
  }

  let attempt = null;
  let targetAssessmentId = assessmentId;

  // 1. If attemptId is provided, retrieve attempt ensuring strictly owned by authenticated userId
  if (attemptId) {
    attempt = await Attempt.findOne({ _id: attemptId, userId });
    if (!attempt) {
      throw new AppError('Examination attempt not found or unauthorized for this student', 404);
    }
    targetAssessmentId = attempt.assessmentId.toString();
  }

  if (!targetAssessmentId) {
    throw new AppError('Assessment ID or Attempt ID is required', 400);
  }

  const assessment = await Assessment.findById(targetAssessmentId);
  if (!assessment) {
    throw new AppError('Assessment not found', 404);
  }

  // 2. Revalidate Assessment Status
  if (assessment.status === AssessmentStatus.DRAFT) {
    throw new AppError('Assessment is in draft mode and not available to students', 400);
  }

  if (assessment.status === AssessmentStatus.PAUSED) {
    throw new AppError('Assessment is currently paused by administrator. New attempts are blocked.', 400);
  }

  if (assessment.status === AssessmentStatus.CLOSED) {
    throw new AppError('Assessment access window is closed', 400);
  }

  if (assessment.status !== AssessmentStatus.OPEN && assessment.status !== AssessmentStatus.PUBLISHED) {
    throw new AppError('Assessment is not open for candidates', 400);
  }

  const isAssigned = (assessment.eligibleStudentIds || []).some(id => id.toString() === userId);
  if (!isAssigned) {
    throw new AppError('This assessment is not assigned to this student', 403);
  }

  const configuredQuestionCount = await Question.countDocuments({ assessmentId: assessment._id });
  if (configuredQuestionCount === 0) {
    throw new AppError('Assessment is not ready: questions have not been configured', 400);
  }

  // 3. Revalidate Access Schedule Window
  const now = new Date();
  if (now < new Date(assessment.openAt)) {
    throw new AppError(`Assessment access window has not opened yet. Schedule starts at ${new Date(assessment.openAt).toLocaleString()}`, 400);
  }

  if (now > new Date(assessment.closeAt)) {
    throw new AppError(`Assessment access window ended on ${new Date(assessment.closeAt).toLocaleString()}`, 400);
  }

  // 4. Revalidate Candidate Eligibility Tags
  const profile = await StudentProfile.findOne({ userId });
  const candidateTags = profile?.eligibilityTags || ['ALL'];
  const allowedTags = assessment.allowedEligibilityTags?.length ? assessment.allowedEligibilityTags : ['ALL'];
  const isEligible = allowedTags.includes('ALL') || candidateTags.some(tag => allowedTags.includes(tag));

  if (!isEligible) {
    throw new AppError('Candidate is not eligible for this assessment based on profile eligibility tags', 403);
  }

  // 5. Existing Attempt & Submission Limit / Network Disconnect Limit Revalidation
  if (!attempt) {
    attempt = await Attempt.findOne({ assessmentId: targetAssessmentId, userId });
  }

  if (attempt) {
    const isFinalized = attempt.status === AttemptStatus.SUBMITTED ||
                        attempt.status === AttemptStatus.AUTO_SUBMITTED ||
                        attempt.status === AttemptStatus.TIMED_OUT ||
                        attempt.status === AttemptStatus.FORCE_SUBMITTED ||
                        attempt.status === AttemptStatus.SCORED;

    if (isFinalized) {
      throw new AppError(`Resumption unavailable: Attempt is finalized (${attempt.status}). ${attempt.finalizedReason || 'Saved responses submitted.'}`, 400);
    }

    // STU-13 Enforcement: Check if candidate exceeded maximum allowed network disconnections (5)
    if (attempt.networkDisconnectsCount > 5) {
      if (attempt.status === AttemptStatus.IN_PROGRESS) {
        attempt.status = AttemptStatus.AUTO_SUBMITTED;
        attempt.finalizedReason = 'Proctoring violation: Exceeded maximum allowed network disconnections (5/5)';
        attempt.submittedAt = new Date();
        await scoreAttempt(attempt);
      }
      throw new AppError('Resumption unavailable: Exceeded maximum allowed network disconnections limit (5/5). Saved responses submitted.', 400);
    }
  }

  // 6. Atomically Create New Attempt if none exists
  if (!attempt) {
    // Assign approved paper version server-side (Student cannot select or manipulate version)
    let paperVersion = await PaperVersion.findOne({ assessmentId: targetAssessmentId });
    if (!paperVersion) {
      // The answer key is required to build the server-side paper version,
      // but it is removed from the student response below.
      const questions = await Question.find({ assessmentId: targetAssessmentId }).select('+correctOptionId');
      if (questions.length === 0) {
        throw new AppError('No questions found for this assessment', 400);
      }

      const paperQuestions = questions.map(q => ({
        questionId: q._id as mongoose.Types.ObjectId,
        text: q.text,
        codeSnippet: q.codeSnippet,
        options: q.options,
        correctOptionId: q.correctOptionId,
        marks: q.marks
      }));

      paperVersion = await PaperVersion.create({
        assessmentId: targetAssessmentId,
        versionNumber: 1,
        questions: paperQuestions
      });
    }

    // Server-Side Authoritative Deadline Calculation: deadlineAt = startedAt + durationMinutes
    const startTime = new Date();
    const deadlineAt = new Date(startTime.getTime() + assessment.durationMinutes * 60 * 1000);

    try {
      attempt = await Attempt.create({
        assessmentId: targetAssessmentId,
        userId,
        paperVersionId: paperVersion._id,
        status: AttemptStatus.IN_PROGRESS,
        startedAt: startTime,
        deadlineAt,
        totalTabSwitches: 0,
        cameraSnapshotsCount: 0,
        networkDisconnectsCount: 0
      });
    } catch (dupErr: any) {
      // In case of rapid repeated clicks, idempotently fetch the created attempt
      attempt = await Attempt.findOne({ assessmentId: targetAssessmentId, userId });
      if (!attempt) {
        throw new AppError('Failed to initialize attempt session', 500);
      }
    }
  }

  // Check for deadline expiration
  if (attempt.status === AttemptStatus.IN_PROGRESS && new Date() > attempt.deadlineAt) {
    attempt.status = AttemptStatus.TIMED_OUT;
    attempt.finalizedReason = 'Examination deadline expired';
    attempt.submittedAt = attempt.deadlineAt;
    await scoreAttempt(attempt);
    throw new AppError(`Resumption unavailable: Examination deadline expired on ${new Date(attempt.deadlineAt).toLocaleString()}. Attempt auto-submitted.`, 400);
  }

  // Fetch assigned paper version & saved answers
  const paper = await PaperVersion.findById(attempt.paperVersionId);
  const answers = await Answer.find({ attemptId: attempt._id });

  // CRITICAL SECURITY RULE: Never expose correctOptionId to student API payload!
  const sanitizedQuestions = paper ? paper.questions.map(q => ({
    questionId: q.questionId,
    text: q.text,
    codeSnippet: q.codeSnippet,
    options: q.options.map(opt => ({
      optionId: opt.optionId,
      text: opt.text
    })),
    marks: q.marks
  })) : [];

  return {
    attempt: {
      id: attempt._id,
      assessmentId: attempt.assessmentId,
      userId: attempt.userId,
      paperVersionId: attempt.paperVersionId,
      status: attempt.status,
      finalizedReason: attempt.finalizedReason,
      startedAt: attempt.startedAt,
      deadlineAt: attempt.deadlineAt,
      submittedAt: attempt.submittedAt,
      totalTabSwitches: attempt.totalTabSwitches,
      networkDisconnectsCount: attempt.networkDisconnectsCount
    },
    assessment: {
      id: assessment._id,
      title: assessment.title,
      code: assessment.code,
      durationMinutes: assessment.durationMinutes,
      totalMarks: assessment.totalMarks,
      negativeMarking: assessment.negativeMarking,
      integrityPolicy: assessment.integrityPolicy
    },
    paper: paper ? {
      id: paper._id,
      questions: sanitizedQuestions
    } : null,
    savedAnswers: answers.map(a => ({
      questionId: a.questionId,
      selectedOptionId: a.selectedOptionId,
      isMarkedForReview: a.isMarkedForReview
    }))
  };
}

export async function saveAnswer(
  attemptId: string,
  userId: string,
  questionId: string,
  selectedOptionId: string,
  isMarkedForReview: boolean = false
) {
  // 1. Verify attempt ownership by authenticated userId
  const attempt = await Attempt.findOne({ _id: attemptId, userId });
  if (!attempt) {
    throw new AppError('Attempt not found or unauthorized for this candidate', 404);
  }

  // 2. Verify attempt is still active (Reject answer changes for finalized attempts)
  if (attempt.status !== AttemptStatus.IN_PROGRESS) {
    throw new AppError(`Examination is finalized (${attempt.status}). Answer changes rejected.`, 400);
  }

  // 3. Check server-side deadline
  if (new Date() > attempt.deadlineAt) {
    attempt.status = AttemptStatus.TIMED_OUT;
    attempt.finalizedReason = 'Server deadline expired during save attempt';
    attempt.submittedAt = attempt.deadlineAt;
    await scoreAttempt(attempt);
    throw new AppError('Server deadline expired. Attempt auto-submitted.', 400);
  }

  // 4. Verify question belongs to the assigned paper version
  const paper = await PaperVersion.findById(attempt.paperVersionId);
  if (!paper) {
    throw new AppError('Assigned paper version not found', 404);
  }

  const questionInPaper = paper.questions.find(
    (q) => q.questionId.toString() === questionId
  );

  if (!questionInPaper) {
    throw new AppError('Invalid question ID for this assigned examination paper', 400);
  }

  // 5. Store answer (Upsert ensures only the latest valid answer is persisted and used for scoring)
  await Answer.findOneAndUpdate(
    { attemptId, questionId },
    { selectedOptionId, isMarkedForReview, savedAt: new Date() },
    { upsert: true, new: true }
  );

  return { success: true, savedAt: new Date() };
}

export async function submitAttempt(attemptId: string, userId: string, autoSubmitted: boolean = false) {
  const attempt = await Attempt.findOne({ _id: attemptId, userId });
  if (!attempt) {
    throw new AppError('Attempt not found or unauthorized', 404);
  }

  const isFinalized = attempt.status === AttemptStatus.SUBMITTED ||
                      attempt.status === AttemptStatus.AUTO_SUBMITTED ||
                      attempt.status === AttemptStatus.TIMED_OUT ||
                      attempt.status === AttemptStatus.FORCE_SUBMITTED ||
                      attempt.status === AttemptStatus.SCORED;

  if (isFinalized) {
    return attempt;
  }

  attempt.status = autoSubmitted ? AttemptStatus.AUTO_SUBMITTED : AttemptStatus.SUBMITTED;
  attempt.finalizedReason = autoSubmitted ? 'Proctoring violation or automated trigger' : 'Submitted manually by candidate';
  attempt.submittedAt = new Date();

  await scoreAttempt(attempt);
  return attempt;
}
