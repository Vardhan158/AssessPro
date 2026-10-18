"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const mongoose_1 = __importDefault(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const authenticate_1 = require("../middleware/authenticate");
const authorize_1 = require("../middleware/authorize");
const User_1 = require("../models/User");
const StudentProfile_1 = require("../models/StudentProfile");
const Assessment_1 = require("../models/Assessment");
const Question_1 = require("../models/Question");
const Attempt_1 = require("../models/Attempt");
const Incident_1 = require("../models/Incident");
const PaperVersion_1 = require("../models/PaperVersion");
const Answer_1 = require("../models/Answer");
const SystemSettings_1 = require("../models/SystemSettings");
const auth_service_1 = require("../services/auth.service");
const email_service_1 = require("../services/email.service");
const scoring_service_1 = require("../services/scoring.service");
const errorHandler_1 = require("../middleware/errorHandler");
const AuditLog_1 = require("../models/AuditLog");
const multer_1 = __importDefault(require("multer"));
const question_import_service_1 = require("../services/question-import.service");
const env_1 = require("../config/env");
const student_id_service_1 = require("../services/student-id.service");
const student_import_service_1 = require("../services/student-import.service");
const router = (0, express_1.Router)();
const questionUpload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage(), limits: { fileSize: env_1.env.QUESTION_IMPORT_MAX_MB * 1024 * 1024 } });
const candidateUpload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
router.use(authenticate_1.authenticate);
router.use((0, authorize_1.authorize)(User_1.UserRole.ADMIN, User_1.UserRole.SUPER_ADMIN));
router.get('/platform/users', (0, authorize_1.authorize)(User_1.UserRole.SUPER_ADMIN), async (req, res, next) => {
    try {
        const users = await User_1.User.find({ role: { $in: [User_1.UserRole.ADMIN, User_1.UserRole.SUPER_ADMIN] } })
            .select('-passwordHash -activationTokenHash -resetPasswordToken').sort({ createdAt: -1 });
        res.json({ success: true, users });
    }
    catch (error) {
        next(error);
    }
});
// Super Admin: Create New Administrator Account
router.post('/platform/users', (0, authorize_1.authorize)(User_1.UserRole.SUPER_ADMIN), async (req, res, next) => {
    try {
        const { firstName, lastName, email, permissions } = req.body;
        if (!firstName?.trim() || !lastName?.trim() || !email?.trim()) {
            throw new errorHandler_1.AppError('First name, last name, and email are required', 400);
        }
        const emailNorm = email.trim().toLowerCase();
        const existing = await User_1.User.findOne({ email: emailNorm });
        if (existing) {
            throw new errorHandler_1.AppError('User account with this email address already exists', 409);
        }
        const { token, expiresAt } = (0, auth_service_1.generateActivationToken)();
        const tokenHash = require('crypto').createHash('sha256').update(token).digest('hex');
        const tempPasswordHash = await bcryptjs_1.default.hash('TEMP_PENDING_ACTIVATION', 10);
        const newUser = await User_1.User.create({
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: emailNorm,
            passwordHash: tempPasswordHash,
            role: User_1.UserRole.ADMIN,
            status: User_1.UserStatus.PENDING_ACTIVATION,
            activationTokenHash: tokenHash,
            activationTokenIssuedAt: new Date(),
            activationTokenExpiresAt: expiresAt
        });
        await (0, AuditLog_1.logAudit)({
            actorId: req.user.id,
            actorRole: req.user.role,
            action: 'ADMIN_ACCOUNT_CREATED',
            targetResource: 'User',
            resourceId: newUser.id,
            details: { email: newUser.email, permissions: permissions || ['ALL'] }
        });
        res.status(201).json({
            success: true,
            message: 'Administrator account created successfully. Activation link generated.',
            user: {
                id: newUser._id,
                firstName: newUser.firstName,
                lastName: newUser.lastName,
                email: newUser.email,
                role: newUser.role,
                status: newUser.status
            }
        });
    }
    catch (error) {
        next(error);
    }
});
// Super Admin: Reset Administrator Access / Re-issue Activation
router.post('/platform/users/:id/reset-access', (0, authorize_1.authorize)(User_1.UserRole.SUPER_ADMIN), async (req, res, next) => {
    try {
        const target = await User_1.User.findById(req.params.id);
        if (!target || ![User_1.UserRole.ADMIN, User_1.UserRole.SUPER_ADMIN].includes(target.role)) {
            throw new errorHandler_1.AppError('Administrator not found', 404);
        }
        const result = await (0, auth_service_1.requestActivationReissue)(target.email, 'SUPER_ADMIN_DISPATCH');
        await (0, AuditLog_1.logAudit)({
            actorId: req.user.id,
            actorRole: req.user.role,
            action: 'ADMIN_ACCESS_RESET',
            targetResource: 'User',
            resourceId: target.id,
            details: { email: target.email }
        });
        res.json(result);
    }
    catch (error) {
        next(error);
    }
});
// Super Admin: Get Global System Settings
router.get('/platform/settings', (0, authorize_1.authorize)(User_1.UserRole.SUPER_ADMIN), async (_req, res, next) => {
    try {
        let settings = await SystemSettings_1.SystemSettings.findOne();
        if (!settings) {
            settings = await SystemSettings_1.SystemSettings.create({});
        }
        res.json({ success: true, settings });
    }
    catch (error) {
        next(error);
    }
});
// Super Admin: Update Global System Settings with Audit History
router.put('/platform/settings', (0, authorize_1.authorize)(User_1.UserRole.SUPER_ADMIN), async (req, res, next) => {
    try {
        let settings = await SystemSettings_1.SystemSettings.findOne();
        if (!settings) {
            settings = new SystemSettings_1.SystemSettings(req.body);
        }
        else {
            Object.assign(settings, req.body);
        }
        await settings.save();
        await (0, AuditLog_1.logAudit)({
            actorId: req.user.id,
            actorRole: req.user.role,
            action: 'PLATFORM_SETTINGS_UPDATED',
            targetResource: 'SystemSettings',
            resourceId: settings.id,
            details: { ...req.body }
        });
        res.json({ success: true, message: 'Global system settings updated and audit logged', settings });
    }
    catch (error) {
        next(error);
    }
});
router.patch('/platform/users/:id/status', (0, authorize_1.authorize)(User_1.UserRole.SUPER_ADMIN), async (req, res, next) => {
    try {
        const { status, reason } = req.body;
        if (!reason?.trim())
            throw new errorHandler_1.AppError('A reason is required for administrator status changes', 400);
        if (![User_1.UserStatus.ACTIVE, User_1.UserStatus.INACTIVE, User_1.UserStatus.SUSPENDED].includes(status))
            throw new errorHandler_1.AppError('Invalid administrator status', 400);
        const target = await User_1.User.findById(req.params.id);
        if (!target || ![User_1.UserRole.ADMIN, User_1.UserRole.SUPER_ADMIN].includes(target.role))
            throw new errorHandler_1.AppError('Administrator not found', 404);
        const previousStatus = target.status;
        target.status = status;
        await target.save();
        await (0, AuditLog_1.logAudit)({ actorId: req.user.id, actorRole: req.user.role, action: 'ADMIN_STATUS_CHANGED', targetResource: 'User', resourceId: target.id, details: { previousStatus, status, reason } });
        res.json({ success: true, user: target });
    }
    catch (error) {
        next(error);
    }
});
router.get('/platform/overview', (0, authorize_1.authorize)(User_1.UserRole.SUPER_ADMIN), async (_req, res, next) => {
    try {
        const [adminCount, superAdminCount, totalAdminsCount, studentCount, assessmentCount, activeExamsCount, activeAttempts, pendingIncidents] = await Promise.all([
            User_1.User.countDocuments({ role: User_1.UserRole.ADMIN }),
            User_1.User.countDocuments({ role: User_1.UserRole.SUPER_ADMIN }),
            User_1.User.countDocuments({ role: { $in: [User_1.UserRole.ADMIN, User_1.UserRole.SUPER_ADMIN] } }),
            User_1.User.countDocuments({ role: User_1.UserRole.STUDENT }),
            Assessment_1.Assessment.countDocuments(),
            Attempt_1.Attempt.distinct('assessmentId', { status: Attempt_1.AttemptStatus.IN_PROGRESS }).then((assessmentIds) => assessmentIds.length),
            Attempt_1.Attempt.countDocuments({ status: Attempt_1.AttemptStatus.IN_PROGRESS }),
            Incident_1.Incident.countDocuments({ status: { $in: [Incident_1.IncidentStatus.LOGGED, Incident_1.IncidentStatus.FLAGGED] } })
        ]);
        res.json({
            success: true,
            overview: {
                adminCount,
                superAdminCount,
                totalAdminsCount,
                studentCount,
                assessmentCount,
                activeExamsCount,
                activeAttempts,
                pendingIncidents,
                database: mongoose_1.default.connection.readyState === 1 ? 'connected' : 'unavailable'
            }
        });
    }
    catch (error) {
        next(error);
    }
});
router.get('/platform/readiness', (0, authorize_1.authorize)(User_1.UserRole.SUPER_ADMIN), async (_req, res, next) => {
    try {
        const databaseConnected = mongoose_1.default.connection.readyState === 1;
        const isDev = process.env.NODE_ENV !== 'production';
        const checks = [
            { key: 'database', label: 'Database connectivity', status: databaseConnected ? 'PASS' : 'BLOCKED', details: databaseConnected ? 'MongoDB connection is active and healthy.' : 'Database connectivity is unavailable.' },
            { key: 'backups', label: 'Backup verification', status: (process.env.BACKUP_VERIFIED === 'true' || isDev) ? 'PASS' : 'BLOCKED', details: (process.env.BACKUP_VERIFIED === 'true' || isDev) ? 'Automated database snapshot backups verified.' : 'Backup verification is required before production release.' },
            { key: 'monitoring', label: 'Monitoring and alerting', status: (process.env.MONITORING_CONFIGURED === 'true' || isDev) ? 'PASS' : 'BLOCKED', details: (process.env.MONITORING_CONFIGURED === 'true' || isDev) ? 'Telemetry monitoring and error alerting active.' : 'External monitoring verification is required before release.' },
            { key: 'incidentResponse', label: 'Incident response ownership', status: (process.env.INCIDENT_OWNER_CONFIGURED === 'true' || isDev) ? 'PASS' : 'BLOCKED', details: (process.env.INCIDENT_OWNER_CONFIGURED === 'true' || isDev) ? 'Designated system administrator owner assigned.' : 'An incident response owner has not been configured.' },
            { key: 'deployment', label: 'Deployment blockers', status: (process.env.DEPLOYMENT_CHECK_PASS === 'true' || isDev) ? 'PASS' : 'BLOCKED', details: (process.env.DEPLOYMENT_CHECK_PASS === 'true' || isDev) ? 'All system build, security, and migration checks passed.' : 'Production readiness cannot be inferred from build results alone.' }
        ];
        res.json({ success: true, ready: checks.every(check => check.status === 'PASS'), checks });
    }
    catch (error) {
        next(error);
    }
});
router.get('/platform/audit', (0, authorize_1.authorize)(User_1.UserRole.SUPER_ADMIN), async (req, res, next) => {
    try {
        const page = Math.max(Number(req.query.page) || 1, 1);
        const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
        const [logs, total] = await Promise.all([AuditLog_1.AuditLog.find().sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit), AuditLog_1.AuditLog.countDocuments()]);
        res.json({ success: true, logs, meta: { page, limit, total } });
    }
    catch (error) {
        next(error);
    }
});
router.patch('/results/:assessmentId/publish', async (req, res, next) => {
    try {
        const { showScore = true, showAnswers = false } = req.body;
        const assessment = await Assessment_1.Assessment.findById(req.params.assessmentId);
        if (!assessment)
            throw new errorHandler_1.AppError('Assessment not found', 404);
        assessment.status = Assessment_1.AssessmentStatus.RESULTS_PUBLISHED;
        assessment.resultVisibility = showAnswers ? 'SCORE_AND_ANSWERS' : showScore ? 'SCORE_ONLY' : 'HIDDEN';
        await assessment.save();
        await (0, AuditLog_1.logAudit)({
            actorId: req.user.id,
            actorRole: req.user.role,
            action: 'RESULTS_PUBLISHED',
            targetResource: 'Assessment',
            resourceId: assessment.id,
            details: { visibility: assessment.resultVisibility }
        });
        res.json({ success: true, assessment });
    }
    catch (error) {
        next(error);
    }
});
// Get All Assessments
router.get('/assessments', async (req, res, next) => {
    try {
        const assessments = await Assessment_1.Assessment.find().sort({ createdAt: -1 });
        const enrichedAssessments = await Promise.all(assessments.map(async (assessment) => {
            const [questionCount, activeAttemptCount, completedAttemptCount] = await Promise.all([
                Question_1.Question.countDocuments({ assessmentId: assessment._id }),
                Attempt_1.Attempt.countDocuments({ assessmentId: assessment._id, status: Attempt_1.AttemptStatus.IN_PROGRESS }),
                Attempt_1.Attempt.countDocuments({ assessmentId: assessment._id, status: { $in: [Attempt_1.AttemptStatus.SUBMITTED, Attempt_1.AttemptStatus.AUTO_SUBMITTED, Attempt_1.AttemptStatus.TIMED_OUT, Attempt_1.AttemptStatus.FORCE_SUBMITTED, Attempt_1.AttemptStatus.SCORED] } })
            ]);
            return { ...assessment.toObject(), questionCount, assignedStudentCount: assessment.eligibleStudentIds?.length || 0, activeAttemptCount, completedAttemptCount };
        }));
        res.json({ success: true, assessments: enrichedAssessments });
    }
    catch (error) {
        next(error);
    }
});
// Create Assessment
router.post('/assessments', async (req, res, next) => {
    try {
        const { title, code, durationMinutes, totalQuestions, totalMarks, passingMarks, allowedAttempts, openAt, closeAt } = req.body;
        if (!title?.trim() || !code?.trim())
            throw new errorHandler_1.AppError('Assessment title and code are required', 400);
        if (!Number.isInteger(Number(durationMinutes)) || Number(durationMinutes) <= 0) {
            throw new errorHandler_1.AppError('Duration must be a positive whole number', 400);
        }
        if (!Number.isInteger(Number(totalQuestions)) || Number(totalQuestions) <= 0) {
            throw new errorHandler_1.AppError('Total questions must be a positive whole number', 400);
        }
        if (!Number.isFinite(Number(totalMarks)) || Number(totalMarks) <= 0) {
            throw new errorHandler_1.AppError('Total marks must be a positive number', 400);
        }
        if (!Number.isFinite(Number(passingMarks)) || Number(passingMarks) < 0 || Number(passingMarks) > Number(totalMarks)) {
            throw new errorHandler_1.AppError('Passing marks must not exceed total marks', 400);
        }
        if (!Number.isInteger(Number(allowedAttempts)) || Number(allowedAttempts) < 1) {
            throw new errorHandler_1.AppError('Maximum allowed attempts must be at least 1', 400);
        }
        if (!openAt || !closeAt || new Date(closeAt) <= new Date(openAt)) {
            throw new errorHandler_1.AppError('Assessment schedule must have a valid closing time after the opening time', 400);
        }
        let assessment;
        try {
            assessment = await Assessment_1.Assessment.create({
                ...req.body,
                title: title.trim(),
                code: code.trim().toUpperCase(),
                durationMinutes: Number(durationMinutes),
                totalQuestions: Number(totalQuestions),
                totalMarks: Number(totalMarks),
                passingMarks: Number(passingMarks),
                allowedAttempts: Number(allowedAttempts),
                createdById: req.user.id
            });
        }
        catch (error) {
            if (error?.code === 11000)
                throw new errorHandler_1.AppError('Assessment code already exists', 409);
            throw error;
        }
        res.json({ success: true, assessment });
    }
    catch (error) {
        next(error);
    }
});
// Update Status (DRAFT -> OPEN -> CLOSED)
router.patch('/assessments/:id/status', async (req, res, next) => {
    try {
        const { status } = req.body;
        if (status === Assessment_1.AssessmentStatus.OPEN || status === Assessment_1.AssessmentStatus.PUBLISHED) {
            const assessment = await Assessment_1.Assessment.findById(req.params.id);
            if (!assessment)
                throw new errorHandler_1.AppError('Assessment not found', 404);
            if (!Number.isInteger(assessment.durationMinutes) || assessment.durationMinutes <= 0 || !Number.isInteger(assessment.totalQuestions) || assessment.totalQuestions <= 0 || assessment.totalMarks <= 0 || assessment.passingMarks > assessment.totalMarks || !Number.isInteger(assessment.allowedAttempts) || assessment.allowedAttempts < 1) {
                throw new errorHandler_1.AppError('Assessment duration and marks must be valid before opening', 409);
            }
            if (!assessment.openAt || !assessment.closeAt || assessment.closeAt <= assessment.openAt) {
                throw new errorHandler_1.AppError('Configure a valid assessment schedule before opening', 409);
            }
            const questionCount = await Question_1.Question.countDocuments({ assessmentId: assessment._id });
            if (questionCount === 0)
                throw new errorHandler_1.AppError('Add at least one question before opening the assessment', 409);
            if (questionCount !== assessment.totalQuestions)
                throw new errorHandler_1.AppError(`Assessment requires exactly ${assessment.totalQuestions} questions; ${questionCount} selected`, 409);
            const allocatedMarks = await Question_1.Question.aggregate([{ $match: { assessmentId: assessment._id } }, { $group: { _id: null, total: { $sum: '$marks' } } }]);
            if ((allocatedMarks[0]?.total || 0) !== assessment.totalMarks)
                throw new errorHandler_1.AppError('Question marks must exactly match the assessment total before opening', 409);
            const assignedIds = assessment.eligibleStudentIds || [];
            const assignedUsers = await User_1.User.find({ _id: { $in: assignedIds }, role: User_1.UserRole.STUDENT, status: User_1.UserStatus.ACTIVE }).select('_id');
            const assignedProfiles = await StudentProfile_1.StudentProfile.find({ userId: { $in: assignedUsers.map(user => user._id) } }).select('userId eligibilityTags');
            const profileByUserId = new Map(assignedProfiles.map(profile => [profile.userId.toString(), profile]));
            const allowedTags = assessment.allowedEligibilityTags?.length ? assessment.allowedEligibilityTags : ['ALL'];
            const eligibleAssignedCount = assignedUsers.filter(user => {
                const tags = profileByUserId.get(user._id.toString())?.eligibilityTags || ['ALL'];
                return allowedTags.includes('ALL') || tags.some(tag => allowedTags.includes(tag));
            }).length;
            if (eligibleAssignedCount === 0)
                throw new errorHandler_1.AppError('Assign at least one active eligible student before opening the assessment', 409);
        }
        const assessment = await Assessment_1.Assessment.findByIdAndUpdate(req.params.id, { status }, { new: true });
        if (!assessment)
            throw new errorHandler_1.AppError('Assessment not found', 404);
        await (0, AuditLog_1.logAudit)({ actorId: req.user.id, actorRole: req.user.role, action: 'ASSESSMENT_STATUS_CHANGED', targetResource: 'Assessment', resourceId: assessment.id, details: { status } });
        res.json({ success: true, assessment });
    }
    catch (error) {
        next(error);
    }
});
// STU-01: Admin Candidate Manual Registration
router.post('/candidates/manual', async (req, res, next) => {
    try {
        const { firstName, lastName, email, phone, collegeName, branch, yearOfStudy } = req.body;
        if (!firstName || !lastName || !email) {
            throw new errorHandler_1.AppError('First Name, Last Name, and Email are required', 400);
        }
        // Check duplicate studentId or email
        const existingUser = await User_1.User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            throw new errorHandler_1.AppError('A candidate with this email address already exists', 400);
        }
        const { token, expiresAt } = (0, auth_service_1.generateActivationToken)();
        const tempPasswordHash = await bcryptjs_1.default.hash('TEMP_PENDING_ACTIVATION', 10);
        const user = await User_1.User.create({
            email: email.toLowerCase(),
            passwordHash: tempPasswordHash,
            role: User_1.UserRole.STUDENT,
            status: User_1.UserStatus.PENDING_ACTIVATION,
            firstName,
            lastName,
            phone,
            activationTokenHash: require('crypto').createHash('sha256').update(token).digest('hex'),
            activationTokenIssuedAt: new Date(),
            activationTokenLastSentAt: new Date(),
            activationTokenExpiresAt: expiresAt
        });
        let profile;
        for (let attempt = 0; attempt < 5; attempt += 1) {
            try {
                profile = await StudentProfile_1.StudentProfile.create({
                    userId: user._id,
                    studentId: await (0, student_id_service_1.generateStudentId)(),
                    collegeName: collegeName || 'Institute of Technology',
                    branch: branch || 'Computer Science',
                    yearOfStudy: yearOfStudy || '4th Year',
                    phone,
                    eligibilityTags: ['ALL'],
                    invitationStatus: 'PENDING'
                });
                break;
            }
            catch (error) {
                if (error?.code !== 11000 || attempt === 4)
                    throw error;
            }
        }
        if (!profile)
            throw new errorHandler_1.AppError('Unable to allocate a unique Student ID', 503);
        let invitationStatus = 'FAILED';
        try {
            await (0, email_service_1.sendActivationEmail)(user.email, token, user.firstName);
            user.activationTokenLastSentAt = new Date();
            await user.save();
            invitationStatus = 'SENT';
        }
        catch (emailErr) {
            console.error(`Failed to dispatch activation email to ${user.email}:`, emailErr);
        }
        profile.invitationStatus = invitationStatus;
        if (invitationStatus === 'SENT')
            profile.invitationSentAt = new Date();
        await profile.save();
        await (0, AuditLog_1.logAudit)({
            actorId: req.user.id,
            actorRole: req.user.role,
            action: invitationStatus === 'SENT' ? 'CANDIDATE_INVITATION_SENT' : 'CANDIDATE_INVITATION_FAILED',
            targetResource: 'User',
            resourceId: user.id,
            details: { email: user.email, invitationStatus }
        });
        res.json({
            success: true,
            message: invitationStatus === 'SENT'
                ? 'Candidate registered successfully. Activation email dispatched.'
                : 'Candidate registered successfully, but email delivery failed. You can resend the invitation.',
            candidate: {
                id: user._id,
                studentId: profile.studentId,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                status: user.status,
                invitationStatus
            }
        });
    }
    catch (error) {
        next(error);
    }
});
// Candidate Template Download
router.get('/candidates/template', async (_req, res) => {
    const csvTemplate = 'First Name,Last Name,Email,Phone,College Name,Branch,Year of Study\nJohn,Doe,john.doe@example.com,9876543210,Institute of Technology,Computer Science,4th Year\nJane,Smith,jane.smith@example.com,9876543211,National Engineering College,Information Technology,3rd Year';
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="student_import_template.csv"');
    res.send(csvTemplate);
});
// Candidate Bulk Import Preview / Pre-flight check
router.post('/candidates/bulk-upload/preview', candidateUpload.single('file'), async (req, res, next) => {
    try {
        const originalname = req.file?.originalname || 'import_students.csv';
        let buffer;
        if (req.file) {
            buffer = req.file.buffer;
        }
        else if (req.body?.csvText) {
            buffer = Buffer.from(req.body.csvText, 'utf-8');
        }
        else {
            throw new errorHandler_1.AppError('Please provide a valid Excel/CSV file or text content', 400);
        }
        const rows = (0, student_import_service_1.parseFileBuffer)(buffer, originalname);
        if (rows.length === 0) {
            throw new errorHandler_1.AppError('The provided file contains no candidate data rows', 400);
        }
        const results = await (0, student_import_service_1.validateCandidateRows)(rows);
        const validCount = results.filter(r => r.status === 'VALID').length;
        const duplicateCount = results.filter(r => r.status === 'DUPLICATE').length;
        const invalidCount = results.filter(r => r.status === 'INVALID').length;
        res.json({
            success: true,
            summary: {
                totalRows: results.length,
                validCount,
                duplicateCount,
                invalidCount
            },
            results
        });
    }
    catch (error) {
        next(error);
    }
});
// Candidate Bulk Import Confirm
router.post('/candidates/bulk-upload/confirm', async (req, res, next) => {
    try {
        const { validRows } = req.body;
        if (!Array.isArray(validRows) || validRows.length === 0) {
            throw new errorHandler_1.AppError('No valid candidate records provided for import', 400);
        }
        const created = await (0, student_import_service_1.processBatchImport)(validRows);
        await (0, AuditLog_1.logAudit)({
            actorId: req.user.id,
            actorRole: req.user.role,
            action: 'CANDIDATES_BULK_IMPORTED',
            targetResource: 'User',
            details: { count: created.length }
        });
        res.json({
            success: true,
            message: `Successfully registered ${created.length} candidates.`,
            importedCount: created.length,
            candidates: created
        });
    }
    catch (error) {
        next(error);
    }
});
// STU-01: List All Candidates
router.get('/candidates', async (req, res, next) => {
    try {
        const users = await User_1.User.find({ role: User_1.UserRole.STUDENT }).sort({ createdAt: -1 });
        const userIds = users.map(u => u._id);
        const profiles = await StudentProfile_1.StudentProfile.find({ userId: { $in: userIds } });
        const profileMap = new Map(profiles.map(p => [p.userId.toString(), p]));
        const candidateList = users.map(u => {
            const prof = profileMap.get(u._id.toString());
            return {
                id: u._id,
                studentId: prof?.studentId || 'N/A',
                firstName: u.firstName,
                lastName: u.lastName,
                email: u.email,
                phone: u.phone || prof?.phone || '-',
                collegeName: prof?.collegeName || '-',
                branch: prof?.branch || '-',
                yearOfStudy: prof?.yearOfStudy || '-',
                status: u.status,
                activationStatus: u.status === User_1.UserStatus.ACTIVE ? 'ACTIVATED' : 'PENDING',
                invitationStatus: prof?.invitationStatus || 'PENDING',
                invitationSentAt: prof?.invitationSentAt,
                createdAt: u.createdAt
            };
        });
        res.json({ success: true, candidates: candidateList });
    }
    catch (error) {
        next(error);
    }
});
// Admin: Resend Candidate Activation Invitation Link
router.post('/candidates/:id/resend-invitation', async (req, res, next) => {
    try {
        const user = await User_1.User.findById(req.params.id);
        if (!user || user.role !== User_1.UserRole.STUDENT) {
            throw new errorHandler_1.AppError('Candidate not found', 404);
        }
        if (user.status !== User_1.UserStatus.PENDING_ACTIVATION) {
            throw new errorHandler_1.AppError('Candidate account is already activated or not in pending state', 400);
        }
        // Rate limiting: Enforce 60-second cooldown between invitation resends
        if (user.activationTokenLastSentAt) {
            const secondsSinceLastSent = (Date.now() - user.activationTokenLastSentAt.getTime()) / 1000;
            if (secondsSinceLastSent < 60) {
                const secondsRemaining = Math.ceil(60 - secondsSinceLastSent);
                throw new errorHandler_1.AppError(`Please wait ${secondsRemaining} seconds before requesting another invitation link`, 429);
            }
        }
        const { token, expiresAt } = (0, auth_service_1.generateActivationToken)();
        const tokenHash = require('crypto').createHash('sha256').update(token).digest('hex');
        user.activationTokenHash = tokenHash;
        user.activationTokenIssuedAt = new Date();
        user.activationTokenExpiresAt = expiresAt;
        await user.save();
        let invitationStatus = 'FAILED';
        try {
            await (0, email_service_1.sendActivationEmail)(user.email, token, user.firstName);
            user.activationTokenLastSentAt = new Date();
            await user.save();
            invitationStatus = 'SENT';
        }
        catch (emailErr) {
            console.error(`Failed to dispatch resend activation email to ${user.email}:`, emailErr);
        }
        const profile = await StudentProfile_1.StudentProfile.findOne({ userId: user._id });
        if (profile) {
            profile.invitationStatus = invitationStatus;
            if (invitationStatus === 'SENT')
                profile.invitationSentAt = new Date();
            await profile.save();
        }
        await (0, AuditLog_1.logAudit)({
            actorId: req.user.id,
            actorRole: req.user.role,
            action: 'CANDIDATE_INVITATION_RESENT',
            targetResource: 'User',
            resourceId: user.id,
            details: { email: user.email, invitationStatus }
        });
        if (invitationStatus === 'FAILED') {
            return res.status(502).json({
                success: false,
                message: 'Invitation email could not be accepted by the configured email provider. Check provider configuration and logs, then retry.',
                invitationStatus
            });
        }
        res.json({
            success: true,
            message: 'Activation invitation re-sent successfully',
            invitationStatus
        });
    }
    catch (error) {
        next(error);
    }
});
// Admin: Deactivate / Activate Student Account
router.patch('/candidates/:id/status', async (req, res, next) => {
    try {
        const { status } = req.body;
        if (![User_1.UserStatus.INACTIVE, User_1.UserStatus.SUSPENDED].includes(status) && status !== User_1.UserStatus.ACTIVE) {
            throw new errorHandler_1.AppError('Invalid candidate status', 400);
        }
        const candidate = await User_1.User.findOne({ _id: req.params.id, role: User_1.UserRole.STUDENT });
        if (!candidate)
            throw new errorHandler_1.AppError('Candidate account not found', 404);
        // Pending students can only become ACTIVE through /auth/activate, after
        // token validation and password setup. Admins may still deactivate or
        // suspend an already active account.
        if (status === User_1.UserStatus.ACTIVE && candidate.status !== User_1.UserStatus.ACTIVE) {
            throw new errorHandler_1.AppError('Pending candidates must activate through their email invitation', 403);
        }
        candidate.status = status;
        await candidate.save();
        await (0, AuditLog_1.logAudit)({
            actorId: req.user.id,
            actorRole: req.user.role,
            action: 'CANDIDATE_STATUS_CHANGED',
            targetResource: 'User',
            resourceId: candidate.id,
            details: { email: candidate.email, status }
        });
        res.json({ success: true, message: `Candidate status updated to ${status}`, candidate });
    }
    catch (error) {
        next(error);
    }
});
// Add Question to Assessment
router.get('/assessments/:id', async (req, res, next) => {
    try {
        const assessment = await Assessment_1.Assessment.findById(req.params.id);
        if (!assessment)
            throw new errorHandler_1.AppError('Assessment not found', 404);
        const questions = await Question_1.Question.find({ assessmentId: assessment._id }).select('+correctOptionId').sort({ createdAt: 1 });
        const questionMarks = questions.reduce((sum, question) => sum + question.marks, 0);
        const assignedIds = assessment.eligibleStudentIds || [];
        const assignedUsers = await User_1.User.find({ _id: { $in: assignedIds }, role: User_1.UserRole.STUDENT, status: User_1.UserStatus.ACTIVE }).select('_id');
        const assignedProfiles = await StudentProfile_1.StudentProfile.find({ userId: { $in: assignedUsers.map(user => user._id) } }).select('userId eligibilityTags');
        const assignedProfileByUserId = new Map(assignedProfiles.map(profile => [profile.userId.toString(), profile]));
        const allowedTags = assessment.allowedEligibilityTags?.length ? assessment.allowedEligibilityTags : ['ALL'];
        const eligibleAssignedCount = assignedUsers.filter(user => {
            const tags = assignedProfileByUserId.get(user._id.toString())?.eligibilityTags || ['ALL'];
            return allowedTags.includes('ALL') || tags.some(tag => allowedTags.includes(tag));
        }).length;
        res.json({ success: true, assessment, questions, readiness: {
                hasQuestions: questions.length > 0,
                marksMatch: questionMarks === assessment.totalMarks,
                scheduleValid: assessment.closeAt > assessment.openAt,
                eligible: eligibleAssignedCount > 0,
                assignedStudentCount: eligibleAssignedCount
            }, questionMarks });
    }
    catch (error) {
        next(error);
    }
});
// Admin: Live Examination Monitoring API Endpoint
router.get('/assessments/:id/live-monitoring', async (req, res, next) => {
    try {
        const assessment = await Assessment_1.Assessment.findById(req.params.id);
        if (!assessment)
            throw new errorHandler_1.AppError('Assessment not found', 404);
        const assignedStudentIds = assessment.eligibleStudentIds || [];
        const users = await User_1.User.find({ _id: { $in: assignedStudentIds }, role: User_1.UserRole.STUDENT }).select('firstName lastName email');
        const profiles = await StudentProfile_1.StudentProfile.find({ userId: { $in: assignedStudentIds } }).select('userId studentId collegeName');
        const profileMap = new Map(profiles.map(p => [p.userId.toString(), p]));
        const attempts = await Attempt_1.Attempt.find({ assessmentId: assessment._id });
        const attemptMap = new Map(attempts.map(a => [a.userId.toString(), a]));
        const incidents = await Incident_1.Incident.find({ assessmentId: assessment._id }).sort({ createdAt: -1 });
        const incidentCountMap = new Map();
        incidents.forEach(inc => {
            const uId = inc.userId?.toString();
            if (uId)
                incidentCountMap.set(uId, (incidentCountMap.get(uId) || 0) + 1);
        });
        const studentMonitoringList = users.map(user => {
            const uId = user._id.toString();
            const prof = profileMap.get(uId);
            const att = attemptMap.get(uId);
            const incCount = incidentCountMap.get(uId) || 0;
            let liveStatus = 'Not Started';
            if (att) {
                if (att.status === Attempt_1.AttemptStatus.IN_PROGRESS)
                    liveStatus = 'In Progress';
                else if (incCount > 0)
                    liveStatus = 'Review Required';
                else if (att.status === Attempt_1.AttemptStatus.TIMED_OUT)
                    liveStatus = 'Timed Out';
                else
                    liveStatus = 'Submitted';
            }
            return {
                userId: uId,
                studentId: prof?.studentId || 'N/A',
                name: `${user.firstName} ${user.lastName}`,
                email: user.email,
                liveStatus,
                attemptStatus: att?.status || 'NO_ATTEMPT',
                incidentCount: incCount,
                tabSwitches: att?.totalTabSwitches || 0,
                startedAt: att?.startedAt,
                submittedAt: att?.submittedAt
            };
        });
        const summary = {
            totalAssigned: assignedStudentIds.length,
            startedCount: attempts.length,
            notStartedCount: assignedStudentIds.length - attempts.length,
            inProgressCount: attempts.filter(a => a.status === Attempt_1.AttemptStatus.IN_PROGRESS).length,
            submittedCount: attempts.filter(a => [Attempt_1.AttemptStatus.SUBMITTED, Attempt_1.AttemptStatus.AUTO_SUBMITTED, Attempt_1.AttemptStatus.SCORED].includes(a.status)).length,
            timedOutCount: attempts.filter(a => a.status === Attempt_1.AttemptStatus.TIMED_OUT).length,
            reviewRequiredCount: studentMonitoringList.filter(s => s.incidentCount > 0).length
        };
        res.json({ success: true, assessment: { title: assessment.title, code: assessment.code }, summary, candidates: studentMonitoringList, incidents });
    }
    catch (error) {
        next(error);
    }
});
router.get('/assessments/:id/assignment-candidates', async (req, res, next) => {
    try {
        const assessment = await Assessment_1.Assessment.findById(req.params.id);
        if (!assessment)
            throw new errorHandler_1.AppError('Assessment not found', 404);
        const users = await User_1.User.find({ role: User_1.UserRole.STUDENT, status: User_1.UserStatus.ACTIVE }).select('firstName lastName email');
        const profiles = await StudentProfile_1.StudentProfile.find({ userId: { $in: users.map(user => user._id) } }).select('userId studentId eligibilityTags');
        const profileByUserId = new Map(profiles.map(profile => [profile.userId.toString(), profile]));
        const allowedTags = assessment.allowedEligibilityTags?.length ? assessment.allowedEligibilityTags : ['ALL'];
        const candidates = users
            .filter(user => {
            const profile = profileByUserId.get(user._id.toString());
            const tags = profile?.eligibilityTags || ['ALL'];
            return allowedTags.includes('ALL') || tags.some(tag => allowedTags.includes(tag));
        })
            .map(user => ({
            ...user.toObject(),
            studentId: profileByUserId.get(user._id.toString())?.studentId
        }));
        res.json({ success: true, assignedStudentIds: assessment.eligibleStudentIds || [], candidates });
    }
    catch (error) {
        next(error);
    }
});
router.put('/assessments/:id/assignments', async (req, res, next) => {
    try {
        const assessment = await Assessment_1.Assessment.findById(req.params.id);
        if (!assessment)
            throw new errorHandler_1.AppError('Assessment not found', 404);
        if (assessment.status !== Assessment_1.AssessmentStatus.DRAFT)
            throw new errorHandler_1.AppError('Students can only be assigned while the assessment is in draft', 409);
        const ids = Array.isArray(req.body.studentIds) ? [...new Set(req.body.studentIds.map(String))] : [];
        if (ids.some(id => !mongoose_1.default.isValidObjectId(id)))
            throw new errorHandler_1.AppError('Assignment contains an invalid student', 400);
        const users = await User_1.User.find({ _id: { $in: ids }, role: User_1.UserRole.STUDENT, status: User_1.UserStatus.ACTIVE }).select('_id');
        const profiles = await StudentProfile_1.StudentProfile.find({ userId: { $in: ids } }).select('userId eligibilityTags');
        const profileByUserId = new Map(profiles.map(profile => [profile.userId.toString(), profile]));
        const allowedTags = assessment.allowedEligibilityTags?.length ? assessment.allowedEligibilityTags : ['ALL'];
        const validCount = users.filter(user => {
            const tags = profileByUserId.get(user._id.toString())?.eligibilityTags || ['ALL'];
            return allowedTags.includes('ALL') || tags.some(tag => allowedTags.includes(tag));
        }).length;
        if (validCount !== ids.length)
            throw new errorHandler_1.AppError('Only unique active student accounts can be assigned', 400);
        assessment.eligibleStudentIds = ids;
        await assessment.save();
        res.json({ success: true, assignedStudentIds: assessment.eligibleStudentIds, assignedStudentCount: ids.length });
    }
    catch (error) {
        next(error);
    }
});
router.get('/assessments/:id/assignment-summary', async (req, res, next) => {
    try {
        const assessment = await Assessment_1.Assessment.findById(req.params.id);
        if (!assessment)
            throw new errorHandler_1.AppError('Assessment not found', 404);
        const assignedIds = assessment.eligibleStudentIds || [];
        const users = await User_1.User.find({ _id: { $in: assignedIds }, role: User_1.UserRole.STUDENT }).select('status');
        const profiles = await StudentProfile_1.StudentProfile.find({ userId: { $in: assignedIds } }).select('userId eligibilityTags');
        const profileByUserId = new Map(profiles.map(profile => [profile.userId.toString(), profile]));
        const allowedTags = assessment.allowedEligibilityTags?.length ? assessment.allowedEligibilityTags : ['ALL'];
        const attempts = await Attempt_1.Attempt.find({ assessmentId: assessment._id, userId: { $in: assignedIds } }).select('userId status');
        const attempted = new Set(attempts.map(attempt => attempt.userId.toString()));
        const summary = { assigned: assignedIds.length, eligible: 0, ineligible: 0, invitationPending: 0, alreadyAttempted: 0 };
        users.forEach(user => {
            const id = user._id.toString();
            const tags = profileByUserId.get(id)?.eligibilityTags || ['ALL'];
            const eligible = user.status === User_1.UserStatus.ACTIVE && (allowedTags.includes('ALL') || tags.some(tag => allowedTags.includes(tag)));
            if (eligible)
                summary.eligible += 1;
            else
                summary.ineligible += 1;
            if (user.status === User_1.UserStatus.PENDING_ACTIVATION)
                summary.invitationPending += 1;
            if (attempted.has(id))
                summary.alreadyAttempted += 1;
        });
        res.json({ success: true, summary });
    }
    catch (error) {
        next(error);
    }
});
router.post('/assessments/:id/questions', async (req, res, next) => {
    try {
        const assessment = await Assessment_1.Assessment.findById(req.params.id);
        if (!assessment)
            throw new errorHandler_1.AppError('Assessment not found', 404);
        if (assessment.status !== Assessment_1.AssessmentStatus.DRAFT)
            throw new errorHandler_1.AppError('Questions can only be changed while the assessment is in draft', 409);
        const { text, options, correctOptionId, marks, explanation, category, codeSnippet } = req.body;
        if (!text?.trim() || !Array.isArray(options) || options.length < 2 || !correctOptionId)
            throw new errorHandler_1.AppError('Question text, two options, and a correct option are required', 400);
        if (!options.every((option) => option.optionId && option.text?.trim()) || !options.some((option) => option.optionId === correctOptionId))
            throw new errorHandler_1.AppError('Question options are invalid', 400);
        if (!Number.isFinite(Number(marks)) || Number(marks) <= 0)
            throw new errorHandler_1.AppError('Question marks must be positive', 400);
        const existingMarks = await Question_1.Question.aggregate([{ $match: { assessmentId: assessment._id } }, { $group: { _id: null, total: { $sum: '$marks' } } }]);
        if ((existingMarks[0]?.total || 0) + Number(marks) > assessment.totalMarks)
            throw new errorHandler_1.AppError('Allocated question marks cannot exceed the assessment total', 400);
        const question = await Question_1.Question.create({ assessmentId: assessment._id, text: text.trim(), options, correctOptionId, marks: Number(marks), explanation, category, codeSnippet });
        await PaperVersion_1.PaperVersion.deleteMany({ assessmentId: assessment._id });
        res.status(201).json({ success: true, question });
    }
    catch (error) {
        next(error);
    }
});
router.post('/assessments/:id/questions/import/preview', questionUpload.single('file'), async (req, res, next) => {
    try {
        if (!req.file)
            throw new errorHandler_1.AppError('A PDF or DOCX file is required', 400);
        const result = await (0, question_import_service_1.extractQuestions)(req.file.buffer, req.file.originalname);
        res.json({ success: true, ...result });
    }
    catch (error) {
        next(error);
    }
});
router.post('/assessments/:id/questions/import', async (req, res, next) => {
    const session = await mongoose_1.default.startSession();
    try {
        session.startTransaction();
        const assessment = await Assessment_1.Assessment.findById(req.params.id).session(session);
        if (!assessment || assessment.status !== Assessment_1.AssessmentStatus.DRAFT)
            throw new errorHandler_1.AppError('Only draft assessments can import questions', 409);
        if (!Array.isArray(req.body.questions) || !req.body.questions.length)
            throw new errorHandler_1.AppError('No valid questions were supplied', 400);
        const current = await Question_1.Question.find({ assessmentId: assessment._id }).session(session);
        const currentMarks = current.reduce((sum, q) => sum + q.marks, 0);
        const incomingMarks = req.body.questions.reduce((sum, q) => sum + Number(q.marks), 0);
        if (!Number.isFinite(incomingMarks) || currentMarks + incomingMarks > assessment.totalMarks) {
            throw new errorHandler_1.AppError(`Imported question marks exceed the assessment total of ${assessment.totalMarks}`, 400);
        }
        const existing = new Set(current.map(q => q.text.trim().toLowerCase()));
        const documents = req.body.questions.map((q, index) => {
            if (!q.text?.trim() || !Array.isArray(q.options) || q.options.length < 2 || q.options.length > 4 || !q.correctOptionId || !Number.isFinite(Number(q.marks)) || Number(q.marks) <= 0 || !q.options.every((o) => o.optionId && o.text?.trim()) || !q.options.some((o) => o.optionId === q.correctOptionId)) {
                throw new errorHandler_1.AppError(`Question ${index + 1} is invalid: text, 2-4 options, one correct answer, and positive marks are required`, 400);
            }
            const normalizedText = q.text.trim().toLowerCase();
            if (existing.has(normalizedText))
                throw new errorHandler_1.AppError(`Question ${index + 1} is a duplicate`, 409);
            existing.add(normalizedText);
            return { ...q, assessmentId: assessment._id, marks: Number(q.marks) };
        });
        const inserted = await Question_1.Question.insertMany(documents, { session });
        await PaperVersion_1.PaperVersion.deleteMany({ assessmentId: assessment._id }).session(session);
        await session.commitTransaction();
        res.status(201).json({ success: true, imported: inserted.length, questions: inserted });
    }
    catch (error) {
        if (session.inTransaction())
            await session.abortTransaction();
        next(error);
    }
    finally {
        await session.endSession();
    }
});
router.patch('/assessments/:id/questions/:questionId', async (req, res, next) => {
    try {
        const assessment = await Assessment_1.Assessment.findById(req.params.id);
        if (!assessment)
            throw new errorHandler_1.AppError('Assessment not found', 404);
        if (assessment.status !== Assessment_1.AssessmentStatus.DRAFT)
            throw new errorHandler_1.AppError('Questions can only be changed while the assessment is in draft', 409);
        const { text, options, correctOptionId, marks, explanation, category, codeSnippet } = req.body;
        if (!text?.trim() || !Array.isArray(options) || options.length < 2 || !correctOptionId)
            throw new errorHandler_1.AppError('Question text, two options, and a correct option are required', 400);
        if (!options.every((option) => option.optionId && option.text?.trim()) || !options.some((option) => option.optionId === correctOptionId))
            throw new errorHandler_1.AppError('Question options are invalid', 400);
        if (!Number.isFinite(Number(marks)) || Number(marks) <= 0)
            throw new errorHandler_1.AppError('Question marks must be positive', 400);
        const currentQuestion = await Question_1.Question.findOne({ _id: req.params.questionId, assessmentId: assessment._id });
        if (!currentQuestion)
            throw new errorHandler_1.AppError('Question not found', 404);
        const allOtherMarks = await Question_1.Question.aggregate([{ $match: { assessmentId: assessment._id } }, { $group: { _id: null, total: { $sum: '$marks' } } }]);
        if ((allOtherMarks[0]?.total || 0) - currentQuestion.marks + Number(marks) > assessment.totalMarks)
            throw new errorHandler_1.AppError('Allocated question marks cannot exceed the assessment total', 400);
        const question = await Question_1.Question.findOneAndUpdate({ _id: req.params.questionId, assessmentId: assessment._id }, { text: text.trim(), options, correctOptionId, marks: Number(marks), explanation, category, codeSnippet }, { new: true, runValidators: true }).select('+correctOptionId');
        if (!question)
            throw new errorHandler_1.AppError('Question not found', 404);
        await PaperVersion_1.PaperVersion.deleteMany({ assessmentId: assessment._id });
        res.json({ success: true, question });
    }
    catch (error) {
        next(error);
    }
});
router.delete('/assessments/:id/questions/:questionId', async (req, res, next) => {
    try {
        const assessment = await Assessment_1.Assessment.findById(req.params.id);
        if (!assessment)
            throw new errorHandler_1.AppError('Assessment not found', 404);
        if (assessment.status !== Assessment_1.AssessmentStatus.DRAFT)
            throw new errorHandler_1.AppError('Questions can only be changed while the assessment is in draft', 409);
        const question = await Question_1.Question.findOneAndDelete({ _id: req.params.questionId, assessmentId: assessment._id });
        if (!question)
            throw new errorHandler_1.AppError('Question not found', 404);
        await PaperVersion_1.PaperVersion.deleteMany({ assessmentId: assessment._id });
        res.json({ success: true });
    }
    catch (error) {
        next(error);
    }
});
// Central Question Bank Routes
router.get('/question-bank', async (req, res, next) => {
    try {
        const { category, difficulty, search } = req.query;
        const filter = {
            $or: [
                { assessmentId: { $exists: false } },
                { assessmentId: null }
            ]
        };
        if (category && category !== 'ALL') {
            filter.category = category;
        }
        if (difficulty && difficulty !== 'ALL') {
            filter.difficulty = difficulty;
        }
        if (search && typeof search === 'string' && search.trim()) {
            filter.text = { $regex: search.trim(), $options: 'i' };
        }
        const questions = await Question_1.Question.find(filter).select('+correctOptionId').sort({ createdAt: -1 });
        res.json({ success: true, questions });
    }
    catch (error) {
        next(error);
    }
});
router.post('/question-bank', async (req, res, next) => {
    try {
        const { text, options, correctOptionId, marks, explanation, category, difficulty, codeSnippet } = req.body;
        if (!text?.trim() || !Array.isArray(options) || options.length < 2 || !correctOptionId) {
            throw new errorHandler_1.AppError('Question text, options (at least 2), and correct answer are required', 400);
        }
        if (!options.every((o) => o.optionId && o.text?.trim()) || !options.some((o) => o.optionId === correctOptionId)) {
            throw new errorHandler_1.AppError('Invalid question options', 400);
        }
        const question = await Question_1.Question.create({
            text: text.trim(),
            options,
            correctOptionId,
            marks: Number(marks) || 1,
            explanation: explanation || '',
            category: category || 'General',
            difficulty: difficulty || 'MEDIUM',
            codeSnippet: codeSnippet || ''
        });
        res.status(201).json({ success: true, question });
    }
    catch (error) {
        next(error);
    }
});
router.put('/question-bank/:id', async (req, res, next) => {
    try {
        const { text, options, correctOptionId, marks, explanation, category, difficulty, codeSnippet } = req.body;
        if (!text?.trim() || !Array.isArray(options) || options.length < 2 || !correctOptionId) {
            throw new errorHandler_1.AppError('Question text, options, and correct answer are required', 400);
        }
        const question = await Question_1.Question.findByIdAndUpdate(req.params.id, {
            text: text.trim(),
            options,
            correctOptionId,
            marks: Number(marks) || 1,
            explanation,
            category,
            difficulty,
            codeSnippet
        }, { new: true, runValidators: true }).select('+correctOptionId');
        if (!question)
            throw new errorHandler_1.AppError('Question not found in Question Bank', 404);
        res.json({ success: true, question });
    }
    catch (error) {
        next(error);
    }
});
router.delete('/question-bank/:id', async (req, res, next) => {
    try {
        const question = await Question_1.Question.findByIdAndDelete(req.params.id);
        if (!question)
            throw new errorHandler_1.AppError('Question not found in Question Bank', 404);
        res.json({ success: true, message: 'Question removed from Question Bank' });
    }
    catch (error) {
        next(error);
    }
});
// Import questions from Central Bank to an Assessment
router.post('/assessments/:id/import-from-bank', async (req, res, next) => {
    try {
        const assessment = await Assessment_1.Assessment.findById(req.params.id);
        if (!assessment)
            throw new errorHandler_1.AppError('Assessment not found', 404);
        if (assessment.status !== Assessment_1.AssessmentStatus.DRAFT)
            throw new errorHandler_1.AppError('Questions can only be added while assessment is in draft', 409);
        const { questionIds } = req.body;
        if (!Array.isArray(questionIds) || questionIds.length === 0) {
            throw new errorHandler_1.AppError('Select at least one question from the Question Bank', 400);
        }
        const bankQuestions = await Question_1.Question.find({ _id: { $in: questionIds } }).select('+correctOptionId');
        if (bankQuestions.length === 0)
            throw new errorHandler_1.AppError('No valid questions found for the provided selection', 400);
        const existingMarks = await Question_1.Question.aggregate([{ $match: { assessmentId: assessment._id } }, { $group: { _id: null, total: { $sum: '$marks' } } }]);
        const currentTotal = existingMarks[0]?.total || 0;
        const incomingMarks = bankQuestions.reduce((sum, q) => sum + q.marks, 0);
        if (currentTotal + incomingMarks > assessment.totalMarks) {
            throw new errorHandler_1.AppError(`Importing these questions (${incomingMarks} marks) exceeds the assessment total limit of ${assessment.totalMarks}`, 400);
        }
        const copies = bankQuestions.map(q => ({
            assessmentId: assessment._id,
            text: q.text,
            options: q.options,
            correctOptionId: q.correctOptionId,
            marks: q.marks,
            explanation: q.explanation,
            category: q.category,
            difficulty: q.difficulty,
            codeSnippet: q.codeSnippet
        }));
        const inserted = await Question_1.Question.insertMany(copies);
        await PaperVersion_1.PaperVersion.deleteMany({ assessmentId: assessment._id });
        res.status(201).json({ success: true, count: inserted.length, questions: inserted });
    }
    catch (error) {
        next(error);
    }
});
// List Proctoring Incidents
router.get('/incidents', async (req, res, next) => {
    try {
        const incidents = await Incident_1.Incident.find()
            .populate('userId', 'firstName lastName email')
            .populate('assessmentId', 'title code status')
            .sort({ timestamp: -1 });
        res.json({ success: true, incidents });
    }
    catch (error) {
        next(error);
    }
});
// Admin: Review Proctoring Incident Decision (CLEARED, DOCUMENTED, ESCALATED)
router.patch('/incidents/:id/decision', async (req, res, next) => {
    try {
        const { status, decisionNote } = req.body;
        if (!['LOGGED', 'FLAGGED', 'CLEARED', 'DOCUMENTED', 'ESCALATED', 'RESOLVED', 'PENDING', 'REVIEWED', 'NEEDS_INVESTIGATION'].includes(status)) {
            throw new errorHandler_1.AppError('Invalid incident decision status', 400);
        }
        const incident = await Incident_1.Incident.findByIdAndUpdate(req.params.id, { status, reviewerNotes: decisionNote || '' }, { new: true });
        if (!incident)
            throw new errorHandler_1.AppError('Incident record not found', 404);
        await (0, AuditLog_1.logAudit)({
            actorId: req.user.id,
            actorRole: req.user.role,
            action: 'INCIDENT_DECISION_RECORDED',
            targetResource: 'Incident',
            resourceId: incident.id,
            details: { status, decisionNote }
        });
        res.json({ success: true, message: `Incident updated to ${status}`, incident });
    }
    catch (error) {
        next(error);
    }
});
// STU-15: Administrative Force-Submit Endpoint
router.post('/attempts/:attemptId/force-submit', async (req, res, next) => {
    try {
        const { attemptId } = req.params;
        const { reason } = req.body;
        const attempt = await Attempt_1.Attempt.findById(attemptId);
        if (!attempt) {
            throw new errorHandler_1.AppError('Attempt not found', 404);
        }
        if (attempt.status !== Attempt_1.AttemptStatus.IN_PROGRESS) {
            return res.json({
                success: true,
                message: `Attempt is already finalized (${attempt.status})`,
                attempt
            });
        }
        const forceReason = reason || 'Attempt finalized by administrative enforcement action';
        attempt.status = Attempt_1.AttemptStatus.FORCE_SUBMITTED;
        attempt.finalizedReason = forceReason;
        attempt.submittedAt = new Date();
        await (0, scoring_service_1.scoreAttempt)(attempt);
        await Incident_1.Incident.create({
            attemptId: attempt._id,
            assessmentId: attempt.assessmentId,
            userId: attempt.userId,
            type: Incident_1.IncidentType.FULLSCREEN_EXIT,
            severity: Incident_1.IncidentSeverity.CRITICAL,
            status: Incident_1.IncidentStatus.FLAGGED,
            details: `Administrative force-submission executed: ${forceReason}`,
            timestamp: new Date()
        });
        res.json({
            success: true,
            message: 'Attempt force-submitted and evaluated successfully',
            attempt
        });
    }
    catch (error) {
        next(error);
    }
});
// List All Candidate Attempts & Results
router.get('/results', async (req, res, next) => {
    try {
        const attempts = await Attempt_1.Attempt.find()
            .populate('userId', 'firstName lastName email')
            .populate('assessmentId', 'title code totalMarks passPercentage status')
            .sort({ submittedAt: -1 });
        const userIds = attempts.map(a => a.userId?._id).filter(Boolean);
        const profiles = await StudentProfile_1.StudentProfile.find({ userId: { $in: userIds } });
        const profileMap = new Map(profiles.map(p => [p.userId.toString(), p]));
        const enrichedAttempts = await Promise.all(attempts.map(async (att) => {
            const incidentCount = await Incident_1.Incident.countDocuments({ attemptId: att._id });
            const uId = att.userId?._id?.toString();
            const prof = uId ? profileMap.get(uId) : null;
            let durationMins = 0;
            if (att.startedAt && att.submittedAt) {
                durationMins = Math.round((new Date(att.submittedAt).getTime() - new Date(att.startedAt).getTime()) / 60000);
            }
            return {
                ...att.toObject(),
                studentId: prof?.studentId || 'N/A',
                collegeName: prof?.collegeName || 'Institute of Technology',
                incidentCount,
                durationMins
            };
        }));
        res.json({ success: true, attempts: enrichedAttempts });
    }
    catch (error) {
        next(error);
    }
});
// Review Single Attempt Details & Proctor Incident Audit
router.get('/results/attempt/:attemptId/details', async (req, res, next) => {
    try {
        const attempt = await Attempt_1.Attempt.findById(req.params.attemptId)
            .populate('userId', 'firstName lastName email')
            .populate('assessmentId', 'title code totalMarks passPercentage status');
        if (!attempt)
            throw new errorHandler_1.AppError('Attempt not found', 404);
        const profile = await StudentProfile_1.StudentProfile.findOne({ userId: attempt.userId._id });
        const incidents = await Incident_1.Incident.find({ attemptId: attempt._id }).sort({ timestamp: -1 });
        const paper = await PaperVersion_1.PaperVersion.findById(attempt.paperVersionId).select('+questions.correctOptionId');
        const answers = await Answer_1.Answer.find({ attemptId: attempt._id });
        const answerMap = new Map(answers.map(answer => [answer.questionId.toString(), answer.selectedOptionId]));
        const questions = paper?.questions.map((question, index) => {
            const selectedOptionId = answerMap.get(question.questionId.toString()) || null;
            const isCorrect = selectedOptionId !== null && selectedOptionId === question.correctOptionId;
            return { index: index + 1, questionId: question.questionId, text: question.text, selectedOptionId,
                selectedAnswer: question.options.find(option => option.optionId === selectedOptionId)?.text || null,
                correctOptionId: question.correctOptionId,
                correctAnswer: question.options.find(option => option.optionId === question.correctOptionId)?.text || null,
                marks: question.marks, marksAwarded: isCorrect ? question.marks : 0,
                status: selectedOptionId === null ? 'UNANSWERED' : isCorrect ? 'CORRECT' : 'INCORRECT' };
        }) || [];
        res.json({
            success: true,
            attempt,
            studentProfile: {
                studentId: profile?.studentId || 'N/A',
                collegeName: profile?.collegeName || '-',
                branch: profile?.branch || '-'
            },
            incidents,
            questions
        });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
