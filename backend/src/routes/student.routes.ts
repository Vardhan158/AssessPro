import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { User, UserRole, UserStatus } from '../models/User';
import { Assessment, AssessmentStatus, ResultVisibility } from '../models/Assessment';
import { Attempt, AttemptStatus } from '../models/Attempt';
import { StudentProfile } from '../models/StudentProfile';
import { Question } from '../models/Question';
import { PaperVersion } from '../models/PaperVersion';
import { Answer } from '../models/Answer';
import { startOrGetAttempt, saveAnswer, submitAttempt } from '../services/attempt.service';
import { scoreAttempt } from '../services/scoring.service';
import { logIncident } from '../services/incident.service';
import { AppError } from '../middleware/errorHandler';

const router = Router();

router.use(authenticate);
router.use(authorize(UserRole.STUDENT));

// 1. Student Dashboard API
router.get('/dashboard', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const userDoc = await User.findById(userId);

    // Retrieve or auto-initialize student profile details
    let profile = await StudentProfile.findOne({ userId });
    if (!profile) {
      const fallbackId = `STU-${userId.slice(-6).toUpperCase()}`;
      profile = await StudentProfile.create({
        userId,
        studentId: fallbackId,
        collegeName: 'Institute of Technology & Engineering',
        branch: 'Computer Science & Engineering',
        yearOfStudy: '4th Year',
        eligibilityTags: ['ALL', 'CS', 'FINAL_YEAR']
      });
    }

    const candidateTags = profile.eligibilityTags || ['ALL'];

    // Fetch published/open/paused/closed assessments (DRAFT assessments are excluded from student view)
    const assessments = await Assessment.find({
      status: { $in: [AssessmentStatus.PUBLISHED, AssessmentStatus.OPEN, AssessmentStatus.PAUSED, AssessmentStatus.CLOSED, AssessmentStatus.RESULTS_PUBLISHED] }
    }).sort({ openAt: -1 });

    // Fetch all user's attempts
    const attempts = await Attempt.find({ userId });
    const attemptMap = new Map(attempts.map(a => [a.assessmentId.toString(), a]));

    const now = new Date();

    const items = await Promise.all(
      assessments.map(async (ass) => {
        // Question count for this assessment
        const questionCount = await Question.countDocuments({ assessmentId: ass._id });

        const att = attemptMap.get(ass._id.toString());
        const allowedTags = ass.allowedEligibilityTags?.length ? ass.allowedEligibilityTags : ['ALL'];
        const isAssigned = (ass.eligibleStudentIds || []).some(id => id.toString() === userId);
        const isEligible = isAssigned && (allowedTags.includes('ALL') || candidateTags.some(tag => allowedTags.includes(tag)));
        const accountRestricted = userDoc?.status !== UserStatus.ACTIVE;

        const openAt = new Date(ass.openAt);
        const closeAt = new Date(ass.closeAt);

        const isUpcoming = now < openAt;
        const isClosed = now > closeAt || ass.status === AssessmentStatus.CLOSED;
        const isPaused = ass.status === AssessmentStatus.PAUSED;
        const isOpen = ass.status === AssessmentStatus.OPEN && !isUpcoming && !isClosed && !isPaused;

        const hasActiveAttempt = att && att.status === AttemptStatus.IN_PROGRESS;
        const hasSubmitted = att && (
          att.status === AttemptStatus.SUBMITTED ||
          att.status === AttemptStatus.AUTO_SUBMITTED ||
          att.status === AttemptStatus.TIMED_OUT ||
          att.status === AttemptStatus.FORCE_SUBMITTED ||
          att.status === AttemptStatus.SCORED
        );

        let canStart = false;
        let canResume = false;
        let canViewResults = false;
        let actionType = 'LOCKED';
        let displayStatus = 'Not Available';
        let disableReason: string | null = null;

        if (hasActiveAttempt) {
          canResume = true;
          actionType = 'RESUME';
          displayStatus = 'Active Attempt (In Progress)';
        } else if (hasSubmitted) {
          canViewResults = true;
          actionType = 'VIEW_RESULTS';
          displayStatus = 'Submitted';
          disableReason = 'Attempt limit reached (1/1 Attempt Used)';
        } else if (accountRestricted) {
          actionType = 'INELIGIBLE';
          displayStatus = 'Account Restricted';
          disableReason = 'Your student account is not active. Contact an administrator.';
        } else if (!isAssigned) {
          actionType = 'INELIGIBLE';
          displayStatus = 'Not Assigned';
          disableReason = 'You are not assigned to this assessment';
        } else if (!isEligible) {
          actionType = 'INELIGIBLE';
          displayStatus = 'Not Eligible';
          disableReason = 'Your student profile does not meet this assessment’s eligibility requirements';
        } else if (isPaused) {
          actionType = 'PAUSED';
          displayStatus = 'Paused';
          disableReason = 'Assessment is temporarily paused by administrator';
        } else if (isUpcoming) {
          actionType = 'SCHEDULED';
          displayStatus = 'Scheduled / Upcoming';
          disableReason = `Assessment not yet open. Access window starts at ${openAt.toLocaleString()}`;
        } else if (isClosed) {
          actionType = 'CLOSED';
          displayStatus = 'Closed';
          disableReason = `Assessment access window closed on ${closeAt.toLocaleString()}`;
        } else if (isOpen) {
          canStart = true;
          actionType = 'START';
          displayStatus = 'Open & Eligible';
        }

        return {
          id: ass._id,
          title: ass.title,
          code: ass.code,
          description: ass.description,
          durationMinutes: ass.durationMinutes,
          totalMarks: ass.totalMarks,
          passPercentage: ass.passPercentage,
          negativeMarking: ass.negativeMarking,
          openAt: ass.openAt,
          closeAt: ass.closeAt,
          status: ass.status,
          resultVisibility: ass.resultVisibility || ResultVisibility.SCORE_ONLY,
          questionCount,
          allowedAttempts: 1,
          usedAttempts: att ? 1 : 0,
          isAssigned,
          isEligible,
          accountRestricted,
          canStart,
          canResume,
          canViewResults,
          actionType,
          displayStatus,
          disableReason,
          integrityPolicy: ass.integrityPolicy,
          attempt: att ? {
            id: att._id,
            status: att.status,
            finalizedReason: att.finalizedReason,
            startedAt: att.startedAt,
            submittedAt: att.submittedAt,
            score: att.score,
            percentage: att.percentage,
            passed: att.passed
          } : null
        };
      })
    );

    res.json({
      success: true,
      profile: {
        studentId: profile.studentId,
        email: userDoc?.email || req.user!.email,
        firstName: userDoc?.firstName || req.user!.firstName,
        lastName: userDoc?.lastName || req.user!.lastName,
        collegeName: profile.collegeName || 'Institute of Technology',
        branch: profile.branch || 'Computer Science & Engineering',
        yearOfStudy: profile.yearOfStudy || '4th Year',
        eligibilityTags: profile.eligibilityTags || ['ALL']
      },
      assessments: items
    });
  } catch (error) {
    next(error);
  }
});

// STU-19 Read-Only Student Registered Profile API Endpoint
router.get('/profile', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const userDoc = await User.findById(userId);
    let profile = await StudentProfile.findOne({ userId });

    if (!profile) {
      const fallbackId = `STU-${userId.slice(-6).toUpperCase()}`;
      profile = await StudentProfile.create({
        userId,
        studentId: fallbackId,
        collegeName: 'Institute of Technology & Engineering',
        branch: 'Computer Science & Engineering',
        yearOfStudy: '4th Year',
        phone: userDoc?.phone || '+1 555-0199',
        eligibilityTags: ['ALL', 'CS', 'FINAL_YEAR']
      });
    }

    res.json({
      success: true,
      profile: {
        id: userDoc?._id || userId,
        studentId: profile.studentId,
        firstName: userDoc?.firstName || req.user!.firstName,
        lastName: userDoc?.lastName || req.user!.lastName,
        email: userDoc?.email || req.user!.email,
        phone: userDoc?.phone || profile.phone || '-',
        collegeName: profile.collegeName || 'Institute of Technology',
        branch: profile.branch || 'Computer Science & Engineering',
        yearOfStudy: profile.yearOfStudy || '4th Year',
        eligibilityTags: profile.eligibilityTags || ['ALL'],
        accountStatus: userDoc?.status || 'ACTIVE',
        createdAt: userDoc?.createdAt || new Date()
      }
    });
  } catch (error) {
    next(error);
  }
});

// 2. Fetch Single Assessment Details & Instructions
router.get('/assessments/:assessmentId', async (req, res, next) => {
  try {
    const { assessmentId } = req.params;
    const userId = req.user!.id;

    const ass = await Assessment.findById(assessmentId);
    if (!ass) {
      throw new AppError('Assessment not found', 404);
    }

    if (ass.status === AssessmentStatus.DRAFT) {
      throw new AppError('Assessment is in draft state and unavailable', 403);
    }

    const isAssigned = (ass.eligibleStudentIds || []).some(id => id.toString() === userId);
    if (!isAssigned) {
      throw new AppError('This assessment is not assigned to this student', 403);
    }

    const profile = await StudentProfile.findOne({ userId });
    const candidateTags = profile?.eligibilityTags || ['ALL'];
    const allowedTags = ass.allowedEligibilityTags?.length ? ass.allowedEligibilityTags : ['ALL'];
    if (!allowedTags.includes('ALL') && !candidateTags.some(tag => allowedTags.includes(tag))) {
      throw new AppError('Student is not eligible for this assessment', 403);
    }

    const questionCount = await Question.countDocuments({ assessmentId: ass._id });
    const attempt = await Attempt.findOne({ assessmentId: ass._id, userId });

    res.json({
      success: true,
      assessment: {
        id: ass._id,
        title: ass.title,
        code: ass.code,
        description: ass.description,
        durationMinutes: ass.durationMinutes,
        totalMarks: ass.totalMarks,
        passPercentage: ass.passPercentage,
        negativeMarking: ass.negativeMarking,
        openAt: ass.openAt,
        closeAt: ass.closeAt,
        status: ass.status,
        resultVisibility: ass.resultVisibility || ResultVisibility.SCORE_ONLY,
        questionCount,
        allowedAttempts: 1,
        usedAttempts: attempt ? 1 : 0,
        integrityPolicy: ass.integrityPolicy,
        attempt: attempt ? {
          id: attempt._id,
          status: attempt.status,
          finalizedReason: attempt.finalizedReason,
          startedAt: attempt.startedAt,
          submittedAt: attempt.submittedAt
        } : null
      }
    });
  } catch (error) {
    next(error);
  }
});

// STU-18 Authorized Result Publication & Visibility Endpoint
router.get('/results/:assessmentId', async (req, res, next) => {
  try {
    const { assessmentId } = req.params;
    const userId = req.user!.id;

    const assessment = await Assessment.findById(assessmentId);
    if (!assessment) {
      throw new AppError('Assessment not found', 404);
    }

    const attempt = await Attempt.findOne({ assessmentId: assessment._id, userId });
    if (!attempt) {
      throw new AppError('No attempt record found for this candidate and assessment', 404);
    }

    if (assessment.status !== AssessmentStatus.RESULTS_PUBLISHED) {
      return res.json({
        success: true,
        visibility: ResultVisibility.NOT_PUBLISHED,
        message: 'Results Awaiting Publication',
        assessment: { title: assessment.title, code: assessment.code },
        attempt: { status: attempt.status, submittedAt: attempt.submittedAt, finalizedReason: attempt.finalizedReason }
      });
    }

    const userDoc = await User.findById(userId);
    const profile = await StudentProfile.findOne({ userId });

    const visibility = assessment.resultVisibility || ResultVisibility.SCORE_ONLY;

    // Check visibility mode
    if (visibility === ResultVisibility.NOT_PUBLISHED || visibility === ResultVisibility.HIDDEN) {
      return res.json({
        success: true,
        visibility,
        message: visibility === ResultVisibility.NOT_PUBLISHED ? 'Awaiting publication' : 'Results hidden by administrator',
        assessment: {
          title: assessment.title,
          code: assessment.code
        },
        candidate: {
          studentId: profile?.studentId,
          name: `${userDoc?.firstName} ${userDoc?.lastName}`
        },
        attempt: {
          status: attempt.status,
          submittedAt: attempt.submittedAt,
          finalizedReason: attempt.finalizedReason
        }
      });
    }

    // SCORE_ONLY or SCORE_AND_ANSWERS
    let questionsBreakdown = undefined;
    if (visibility === ResultVisibility.SCORE_AND_ANSWERS) {
      const paper = await PaperVersion.findById(attempt.paperVersionId);
      const answers = await Answer.find({ attemptId: attempt._id });
      const answerMap = new Map(answers.map(a => [a.questionId.toString(), a.selectedOptionId]));

      questionsBreakdown = paper ? paper.questions.map((q, idx) => ({
        index: idx + 1,
        questionId: q.questionId,
        text: q.text,
        marks: q.marks,
        selectedOptionId: answerMap.get(q.questionId.toString()) || null,
        options: q.options
      })) : [];
    }

    res.json({
      success: true,
      visibility,
      assessment: {
        id: assessment._id,
        title: assessment.title,
        code: assessment.code,
        totalMarks: assessment.totalMarks,
        passPercentage: assessment.passPercentage
      },
      candidate: {
        studentId: profile?.studentId || `STU-${userId.slice(-6).toUpperCase()}`,
        name: `${userDoc?.firstName} ${userDoc?.lastName}`
      },
      attempt: {
        id: attempt._id,
        status: attempt.status,
        finalizedReason: attempt.finalizedReason,
        submittedAt: attempt.submittedAt,
        score: attempt.score,
        percentage: attempt.percentage,
        passed: attempt.passed
      },
      questionsBreakdown
    });
  } catch (error) {
    next(error);
  }
});

// STU-17 Submission Confirmation Receipt API Endpoint
router.get('/submission/:attemptId', async (req, res, next) => {
  try {
    const { attemptId } = req.params;
    const userId = req.user!.id;

    const attempt = await Attempt.findOne({ _id: attemptId, userId });
    if (!attempt) {
      throw new AppError('Submission record not found or unauthorized for this student', 404);
    }

    const assessment = await Assessment.findById(attempt.assessmentId);
    if (!assessment) {
      throw new AppError('Associated assessment not found', 404);
    }

    const userDoc = await User.findById(userId);
    const profile = await StudentProfile.findOne({ userId });

    const visibility = assessment.resultVisibility || ResultVisibility.SCORE_ONLY;
    const isVisible = assessment.status === AssessmentStatus.RESULTS_PUBLISHED &&
      (visibility === ResultVisibility.SCORE_ONLY || visibility === ResultVisibility.SCORE_AND_ANSWERS);

    res.json({
      success: true,
      receipt: {
        attemptId: attempt._id,
        assessmentId: assessment._id,
        assessmentTitle: assessment.title,
        assessmentCode: assessment.code,
        studentName: `${userDoc?.firstName || ''} ${userDoc?.lastName || ''}`.trim() || 'Candidate',
        studentId: profile?.studentId || `STU-${userId.slice(-6).toUpperCase()}`,
        status: attempt.status,
        finalizedReason: attempt.finalizedReason || 'Submitted manually by candidate',
        submittedAt: attempt.submittedAt || attempt.updatedAt,
        resultsPublished: isVisible,
        score: isVisible ? attempt.score : undefined,
        totalMarks: isVisible ? assessment.totalMarks : undefined,
        percentage: isVisible ? attempt.percentage : undefined,
        passed: isVisible ? attempt.passed : undefined
      }
    });
  } catch (error) {
    next(error);
  }
});

// 3. Start / Resume Exam Attempt
router.post('/attempts/start', async (req, res, next) => {
  try {
    const { assessmentId, attemptId, readyConfirmed, privacyAccepted } = req.body;
    if (!readyConfirmed || !privacyAccepted) {
      throw new AppError('Complete the required device readiness checks and accept the privacy notice before starting.', 400);
    }
    const userId = req.user!.id;
    const result = await startOrGetAttempt({ assessmentId, attemptId }, userId);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
});

// 4. Save Answer (Debounced Incremental Save — supports both /save-answer and /:attemptId/answer)
router.post(['/attempts/save-answer', '/attempts/:attemptId/answer'], async (req, res, next) => {
  try {
    const attemptId = req.params.attemptId || req.body.attemptId;
    const { questionId, selectedOptionId, isMarkedForReview } = req.body;
    const userId = req.user!.id;
    const result = await saveAnswer(attemptId, userId, questionId, selectedOptionId, isMarkedForReview);
    res.json({ ...result, data: result });
  } catch (error) {
    next(error);
  }
});

// 5. Session Heartbeat Endpoint
router.post(['/attempts/heartbeat', '/attempts/:attemptId/heartbeat'], async (req, res, next) => {
  try {
    const attemptId = req.params.attemptId || req.body.attemptId;
    const userId = req.user!.id;

    if (!attemptId) {
      return res.json({ success: true, data: { serverTime: new Date() } });
    }

    const attempt = await Attempt.findOne({ _id: attemptId, userId });
    if (!attempt) {
      throw new AppError('Attempt not found or unauthorized', 404);
    }

    // Check for deadline expiration
    if (attempt.status === AttemptStatus.IN_PROGRESS && new Date() > attempt.deadlineAt) {
      attempt.status = AttemptStatus.TIMED_OUT;
      attempt.finalizedReason = 'Examination deadline expired during heartbeat ping';
      attempt.submittedAt = attempt.deadlineAt;
      await scoreAttempt(attempt);
    }

    res.json({
      success: true,
      data: {
        serverTime: new Date(),
        deadlineAt: attempt.deadlineAt,
        status: attempt.status
      },
      serverTime: new Date(),
      deadlineAt: attempt.deadlineAt
    });
  } catch (error) {
    next(error);
  }
});

// 6. Log Proctoring Incident (supports both /incident and /:attemptId/incident)
router.post(['/attempts/incident', '/attempts/:attemptId/incident'], async (req, res, next) => {
  try {
    const attemptId = req.params.attemptId || req.body.attemptId;
    const { type, details } = req.body;
    const userId = req.user!.id;
    const result = await logIncident(attemptId, userId, type, details || 'Integrity event reported');
    res.json({ ...result, data: result });
  } catch (error) {
    next(error);
  }
});

// 7. Submit Exam Attempt (supports both /submit and /:attemptId/submit)
router.post(['/attempts/submit', '/attempts/:attemptId/submit'], async (req, res, next) => {
  try {
    const attemptId = req.params.attemptId || req.body.attemptId;
    const { autoSubmitted } = req.body;
    const userId = req.user!.id;
    const attempt = await submitAttempt(attemptId, userId, autoSubmitted);
    res.json({
      success: true,
      data: {
        status: attempt.status,
        submittedAt: attempt.submittedAt,
        message: 'Your exam has been submitted successfully.'
      },
      attempt
    });
  } catch (error) {
    next(error);
  }
});

export default router;
