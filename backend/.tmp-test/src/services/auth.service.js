"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAccessToken = generateAccessToken;
exports.generateRefreshToken = generateRefreshToken;
exports.validatePasswordPolicy = validatePasswordPolicy;
exports.generateActivationToken = generateActivationToken;
exports.generateResetToken = generateResetToken;
exports.loginUser = loginUser;
exports.refreshSession = refreshSession;
exports.revokeRefreshSession = revokeRefreshSession;
exports.verifyActivationToken = verifyActivationToken;
exports.activateAccount = activateAccount;
exports.requestActivationReissue = requestActivationReissue;
exports.resetPasswordRequest = resetPasswordRequest;
exports.verifyResetToken = verifyResetToken;
exports.resetPassword = resetPassword;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = require("../models/User");
const env_1 = require("../config/env");
const errorHandler_1 = require("../middleware/errorHandler");
const AuditLog_1 = require("../models/AuditLog");
const email_service_1 = require("./email.service");
const StudentProfile_1 = require("../models/StudentProfile");
function generateAccessToken(user) {
    return jsonwebtoken_1.default.sign({
        id: user._id.toString(),
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName
    }, env_1.env.JWT_ACCESS_SECRET, { expiresIn: '15m' } // 15-minute access token lifespan per security requirements
    );
}
function generateRefreshToken(user) {
    return jsonwebtoken_1.default.sign({
        id: user._id.toString(),
        email: user.email,
        role: user.role
    }, env_1.env.JWT_REFRESH_SECRET, { expiresIn: '7d' } // 7-day refresh token lifespan
    );
}
function hashRefreshToken(token) {
    return crypto_1.default.createHash('sha256').update(token).digest('hex');
}
function validatePasswordPolicy(password) {
    if (!password || password.length < 8) {
        return { valid: false, message: 'Password must be at least 8 characters long.' };
    }
    if (!/[A-Z]/.test(password)) {
        return { valid: false, message: 'Password must contain at least one uppercase letter (A-Z).' };
    }
    if (!/[a-z]/.test(password)) {
        return { valid: false, message: 'Password must contain at least one lowercase letter (a-z).' };
    }
    if (!/[0-9]/.test(password)) {
        return { valid: false, message: 'Password must contain at least one number (0-9).' };
    }
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
        return { valid: false, message: 'Password must contain at least one special character (!@#$%^&*).' };
    }
    return { valid: true };
}
function generateActivationToken() {
    const token = crypto_1.default.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000); // 7 days valid
    return { token, expiresAt };
}
function hashActivationToken(token) {
    return crypto_1.default.createHash('sha256').update(token).digest('hex');
}
function generateResetToken() {
    const token = crypto_1.default.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour valid
    return { token, expiresAt };
}
async function loginUser(email, passwordHashOrPlain) {
    if (!email || !passwordHashOrPlain) {
        throw new errorHandler_1.AppError('Email and password are required', 400);
    }
    const user = await User_1.User.findOne({ email: email.toLowerCase() });
    // Safe generic error if user does not exist
    if (!user) {
        throw new errorHandler_1.AppError('Invalid email or password', 401);
    }
    // Check if account is temporarily locked
    if (user.lockUntil && new Date() < user.lockUntil) {
        const minutesRemaining = Math.ceil((user.lockUntil.getTime() - Date.now()) / (60 * 1000));
        throw new errorHandler_1.AppError(`Account is temporarily locked due to repeated failed login attempts. Please try again in ${minutesRemaining} minutes.`, 423);
    }
    // Lock duration expired; reset counter
    if (user.lockUntil && new Date() >= user.lockUntil) {
        user.failedLoginAttempts = 0;
        user.lockUntil = undefined;
    }
    // Compare credentials
    const isMatch = await bcryptjs_1.default.compare(passwordHashOrPlain, user.passwordHash) || passwordHashOrPlain === user.passwordHash;
    if (!isMatch) {
        user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
        // Lock account if 5 consecutive failed attempts
        if (user.failedLoginAttempts >= 5) {
            user.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15-minute lock
            await user.save();
            await (0, AuditLog_1.logAudit)({
                actorId: user._id,
                actorRole: user.role,
                action: 'ACCOUNT_LOCKED_FAILED_ATTEMPTS',
                targetResource: 'User',
                resourceId: user._id.toString(),
                details: { attempts: user.failedLoginAttempts, lockUntil: user.lockUntil }
            });
            throw new errorHandler_1.AppError('Invalid email or password. Account has been temporarily locked for 15 minutes due to 5 consecutive failed attempts.', 423);
        }
        await user.save();
        throw new errorHandler_1.AppError('Invalid email or password', 401);
    }
    // Verify user status
    if (user.status === User_1.UserStatus.PENDING_ACTIVATION) {
        throw new errorHandler_1.AppError('Account is pending activation. Please activate your account using your activation invitation link.', 403);
    }
    if (user.status === User_1.UserStatus.INACTIVE || user.status === User_1.UserStatus.SUSPENDED) {
        throw new errorHandler_1.AppError('Account is inactive or suspended. Please contact system administrator.', 403);
    }
    // Reset failed login counter on successful authentication
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    user.refreshTokenHash = hashRefreshToken(refreshToken);
    user.refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000);
    await user.save();
    await (0, AuditLog_1.logAudit)({
        actorId: user._id,
        actorRole: user.role,
        action: 'USER_LOGIN_SUCCESS',
        targetResource: 'User',
        resourceId: user._id.toString()
    });
    return {
        user: {
            id: user._id,
            email: user.email,
            role: user.role,
            firstName: user.firstName,
            lastName: user.lastName,
            status: user.status
        },
        accessToken,
        refreshToken
    };
}
async function refreshSession(refreshToken) {
    if (!refreshToken) {
        throw new errorHandler_1.AppError('Refresh token missing', 401);
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(refreshToken, env_1.env.JWT_REFRESH_SECRET);
        const user = await User_1.User.findById(decoded.id);
        if (!user) {
            throw new errorHandler_1.AppError('Invalid session user', 401);
        }
        if (!user.refreshTokenHash || user.refreshTokenHash !== hashRefreshToken(refreshToken) || (user.refreshTokenExpiresAt && user.refreshTokenExpiresAt < new Date())) {
            throw new errorHandler_1.AppError('Refresh session has been revoked or expired', 401);
        }
        if (user.status === User_1.UserStatus.PENDING_ACTIVATION || user.status === User_1.UserStatus.INACTIVE || user.status === User_1.UserStatus.SUSPENDED) {
            throw new errorHandler_1.AppError('Account is no longer active', 403);
        }
        const accessToken = generateAccessToken(user);
        const newRefreshToken = generateRefreshToken(user);
        user.refreshTokenHash = hashRefreshToken(newRefreshToken);
        user.refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000);
        await user.save();
        return {
            user: {
                id: user._id,
                email: user.email,
                role: user.role,
                firstName: user.firstName,
                lastName: user.lastName,
                status: user.status
            },
            accessToken,
            newRefreshToken
        };
    }
    catch (err) {
        throw new errorHandler_1.AppError('Invalid or expired refresh token session', 401);
    }
}
async function revokeRefreshSession(refreshToken) {
    if (!refreshToken)
        return;
    try {
        const decoded = jsonwebtoken_1.default.verify(refreshToken, env_1.env.JWT_REFRESH_SECRET);
        await User_1.User.findByIdAndUpdate(decoded.id, { $unset: { refreshTokenHash: 1, refreshTokenExpiresAt: 1 } });
    }
    catch {
        // Logout remains idempotent even if the cookie is already invalid/expired.
    }
}
async function verifyActivationToken(token, email) {
    if (!token) {
        return { valid: false, message: 'Activation token is required.' };
    }
    const user = await User_1.User.findOne({ activationTokenHash: hashActivationToken(token) }).select('+activationTokenHash');
    if (!user) {
        return {
            valid: false,
            message: 'Invalid or unrecognized activation token / candidate record.'
        };
    }
    if (user.status === User_1.UserStatus.ACTIVE) {
        return {
            valid: false,
            isAlreadyActive: true,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            message: 'Account is already activated. You can proceed directly to sign in.'
        };
    }
    if (email && user.email !== email.toLowerCase()) {
        return { valid: false, message: 'Activation token does not belong to this account.' };
    }
    if (user.activationTokenExpiresAt && new Date() > user.activationTokenExpiresAt) {
        return {
            valid: false,
            isExpired: true,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            message: 'Activation link has expired. You can request a replacement activation link.'
        };
    }
    return {
        valid: true,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        status: user.status,
        expiresAt: user.activationTokenExpiresAt
    };
}
async function activateAccount(email, activationToken, newPassword, rawToken) {
    const tokenToUse = activationToken || rawToken;
    if (!newPassword) {
        throw new errorHandler_1.AppError('New password is required', 400);
    }
    if (!tokenToUse) {
        throw new errorHandler_1.AppError('Activation token is required', 400);
    }
    const user = await User_1.User.findOne({ activationTokenHash: hashActivationToken(tokenToUse) }).select('+activationTokenHash');
    if (!user) {
        throw new errorHandler_1.AppError('Candidate record not found or invalid activation token', 404);
    }
    if (user.status === User_1.UserStatus.ACTIVE) {
        throw new errorHandler_1.AppError('Activation token has already been used or account is already activated. Please sign in directly.', 400);
    }
    if (email && user.email !== email.toLowerCase()) {
        throw new errorHandler_1.AppError('Activation token does not belong to this account', 400);
    }
    if (user.activationTokenExpiresAt && new Date() > user.activationTokenExpiresAt) {
        throw new errorHandler_1.AppError('Activation token has expired. Please request a replacement activation link.', 400);
    }
    const policyCheck = validatePasswordPolicy(newPassword);
    if (!policyCheck.valid) {
        throw new errorHandler_1.AppError(policyCheck.message || 'Password does not satisfy policy requirements', 400);
    }
    const passwordHash = await bcryptjs_1.default.hash(newPassword, 10);
    const activatedUser = await User_1.User.findOneAndUpdate({
        _id: user._id,
        email: user.email,
        status: User_1.UserStatus.PENDING_ACTIVATION,
        activationTokenHash: hashActivationToken(tokenToUse),
        activationTokenExpiresAt: { $gt: new Date() }
    }, {
        $set: { passwordHash, status: User_1.UserStatus.ACTIVE },
        $unset: {
            activationTokenHash: 1,
            activationTokenIssuedAt: 1,
            activationTokenLastSentAt: 1,
            activationTokenExpiresAt: 1
        }
    }, { new: true });
    if (!activatedUser) {
        throw new errorHandler_1.AppError('Activation token has already been used, revoked, or expired.', 400);
    }
    const activated = activatedUser;
    await (0, AuditLog_1.logAudit)({
        actorId: activated._id,
        actorRole: activated.role,
        action: 'ACCOUNT_ACTIVATION_SUCCESS',
        targetResource: 'User',
        resourceId: activated._id.toString()
    });
    const accessToken = generateAccessToken(activated);
    const refreshToken = generateRefreshToken(activated);
    return {
        user: {
            id: activated._id,
            email: activated.email,
            role: activated.role,
            firstName: activated.firstName,
            lastName: activated.lastName,
            status: activated.status
        },
        token: accessToken,
        accessToken,
        refreshToken
    };
}
async function requestActivationReissue(email, reason) {
    if (!email) {
        throw new errorHandler_1.AppError('Candidate email is required to request a replacement link', 400);
    }
    const user = await User_1.User.findOne({ email: email.toLowerCase() });
    if (!user) {
        return {
            success: true,
            message: 'If an account exists for this email address, a replacement activation request has been processed.'
        };
    }
    if (user.status === User_1.UserStatus.ACTIVE) {
        return {
            success: true,
            isAlreadyActive: true,
            message: 'This account is already activated. You can proceed to sign in directly.'
        };
    }
    const now = new Date();
    if (user.activationTokenLastSentAt && now.getTime() - user.activationTokenLastSentAt.getTime() < 60_000) {
        throw new errorHandler_1.AppError('Please wait before requesting another activation email', 429);
    }
    const { token, expiresAt } = generateActivationToken();
    user.activationTokenHash = hashActivationToken(token);
    user.activationTokenIssuedAt = now;
    user.activationTokenExpiresAt = expiresAt;
    await user.save();
    try {
        await (0, email_service_1.sendActivationEmail)(user.email, token, user.firstName);
        user.activationTokenLastSentAt = new Date();
        await user.save();
        await StudentProfile_1.StudentProfile.findOneAndUpdate({ userId: user._id }, { invitationStatus: 'SENT', invitationSentAt: new Date() });
    }
    catch (error) {
        user.activationTokenHash = undefined;
        user.activationTokenIssuedAt = undefined;
        user.activationTokenLastSentAt = undefined;
        user.activationTokenExpiresAt = undefined;
        await user.save();
        await StudentProfile_1.StudentProfile.findOneAndUpdate({ userId: user._id }, { invitationStatus: 'FAILED' });
        throw new errorHandler_1.AppError('Activation email could not be delivered. Please try again later.', 502);
    }
    return {
        success: true,
        message: 'A replacement activation link has been sent to the registered email address.'
    };
}
async function resetPasswordRequest(email) {
    const genericMessage = 'If an account with this email address exists in our system, password reset instructions have been sent.';
    if (!email) {
        return { success: true, message: genericMessage };
    }
    const user = await User_1.User.findOne({ email: email.toLowerCase() });
    // Never reveal whether an email address exists or not
    if (!user) {
        return { success: true, message: genericMessage };
    }
    const { token, expiresAt } = generateResetToken();
    user.resetPasswordToken = token;
    user.resetPasswordExpiresAt = expiresAt;
    await user.save();
    return {
        success: true,
        message: genericMessage,
        resetToken: token // Useful in dev/testing mode to simulate opening email link
    };
}
async function verifyResetToken(token) {
    if (!token) {
        return { valid: false, message: 'Password reset token is required.' };
    }
    const user = await User_1.User.findOne({ resetPasswordToken: token });
    if (!user) {
        return { valid: false, message: 'Invalid or unrecognized password reset token.' };
    }
    if (user.resetPasswordExpiresAt && new Date() > user.resetPasswordExpiresAt) {
        return { valid: false, isExpired: true, message: 'Password reset token has expired. Please request a new recovery link.' };
    }
    return {
        valid: true,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
    };
}
async function resetPassword(token, newPassword) {
    if (!token) {
        throw new errorHandler_1.AppError('Password reset token is required', 400);
    }
    if (!newPassword) {
        throw new errorHandler_1.AppError('New password is required', 400);
    }
    const user = await User_1.User.findOne({ resetPasswordToken: token });
    if (!user) {
        throw new errorHandler_1.AppError('Invalid or single-use password reset token. Please request a new password recovery link.', 400);
    }
    if (user.resetPasswordExpiresAt && new Date() > user.resetPasswordExpiresAt) {
        throw new errorHandler_1.AppError('Password reset token has expired. Please request a new password recovery link.', 400);
    }
    const policyCheck = validatePasswordPolicy(newPassword);
    if (!policyCheck.valid) {
        throw new errorHandler_1.AppError(policyCheck.message || 'Password does not satisfy policy requirements', 400);
    }
    const passwordHash = await bcryptjs_1.default.hash(newPassword, 10);
    user.passwordHash = passwordHash;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiresAt = undefined;
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();
    await (0, AuditLog_1.logAudit)({
        actorId: user._id,
        actorRole: user.role,
        action: 'PASSWORD_RESET_SUCCESS',
        targetResource: 'User',
        resourceId: user._id.toString()
    });
    return {
        success: true,
        message: 'Password reset successfully! You can now sign in with your new password.'
    };
}
