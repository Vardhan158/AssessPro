"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_service_1 = require("../services/auth.service");
const authenticate_1 = require("../middleware/authenticate");
const rateLimiter_1 = require("../middleware/rateLimiter");
const env_1 = require("../config/env");
const router = (0, express_1.Router)();
const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: env_1.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 3600 * 1000, // 7 days
    path: '/'
};
// STU-01 Acceptance Criterion: Public self-registration is explicitly disabled
router.post('/register', (req, res) => {
    res.status(403).json({
        success: false,
        message: 'Public self-registration is disabled. Candidates must be registered by an administrator.'
    });
});
router.post('/login', rateLimiter_1.loginRateLimiter, async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const { user, accessToken, refreshToken } = await (0, auth_service_1.loginUser)(email, password);
        // Store refresh token in secure HTTP-only cookie
        res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);
        res.json({
            success: true,
            token: accessToken,
            accessToken,
            user
        });
    }
    catch (error) {
        next(error);
    }
});
router.post('/refresh', async (req, res, next) => {
    try {
        const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
        const { user, accessToken, newRefreshToken } = await (0, auth_service_1.refreshSession)(refreshToken);
        res.cookie('refreshToken', newRefreshToken, COOKIE_OPTIONS);
        res.json({
            success: true,
            token: accessToken,
            accessToken,
            user
        });
    }
    catch (error) {
        next(error);
    }
});
router.post('/logout', async (req, res) => {
    await (0, auth_service_1.revokeRefreshSession)(req.cookies?.refreshToken || req.body?.refreshToken);
    res.clearCookie('refreshToken', { path: '/' });
    res.json({ success: true, message: 'Logged out successfully' });
});
router.post('/activate', async (req, res, next) => {
    try {
        const { email, activationToken, newPassword, token } = req.body;
        const result = await (0, auth_service_1.activateAccount)(email, activationToken, newPassword, token);
        if (result.refreshToken) {
            res.cookie('refreshToken', result.refreshToken, COOKIE_OPTIONS);
        }
        res.json({
            success: true,
            token: result.token,
            accessToken: result.accessToken,
            user: result.user
        });
    }
    catch (error) {
        next(error);
    }
});
router.get('/verify-token', async (req, res, next) => {
    try {
        const token = req.query.token;
        const email = req.query.email;
        const result = await (0, auth_service_1.verifyActivationToken)(token, email);
        res.json({ success: true, ...result });
    }
    catch (error) {
        next(error);
    }
});
router.post('/verify-token', async (req, res, next) => {
    try {
        const { token, email } = req.body;
        const result = await (0, auth_service_1.verifyActivationToken)(token, email);
        res.json({ success: true, ...result });
    }
    catch (error) {
        next(error);
    }
});
router.post('/request-reissue', async (req, res, next) => {
    try {
        const { email, reason } = req.body;
        const result = await (0, auth_service_1.requestActivationReissue)(email, reason);
        res.json(result);
    }
    catch (error) {
        next(error);
    }
});
router.post('/forgot-password', rateLimiter_1.forgotPasswordRateLimiter, async (req, res, next) => {
    try {
        const { email } = req.body;
        const result = await (0, auth_service_1.resetPasswordRequest)(email);
        res.json(result);
    }
    catch (error) {
        next(error);
    }
});
router.get('/verify-reset-token', async (req, res, next) => {
    try {
        const token = req.query.token;
        const result = await (0, auth_service_1.verifyResetToken)(token);
        res.json({ success: true, ...result });
    }
    catch (error) {
        next(error);
    }
});
router.post('/verify-reset-token', async (req, res, next) => {
    try {
        const { token } = req.body;
        const result = await (0, auth_service_1.verifyResetToken)(token);
        res.json({ success: true, ...result });
    }
    catch (error) {
        next(error);
    }
});
router.post('/reset-password', async (req, res, next) => {
    try {
        const { token, newPassword } = req.body;
        const result = await (0, auth_service_1.resetPassword)(token, newPassword);
        res.json(result);
    }
    catch (error) {
        next(error);
    }
});
router.get('/me', authenticate_1.authenticate, (req, res) => {
    res.json({ success: true, user: req.user });
});
exports.default = router;
