import { Router } from 'express';
import {
  loginUser,
  activateAccount,
  resetPasswordRequest,
  verifyActivationToken,
  requestActivationReissue,
  refreshSession,
  verifyResetToken,
  resetPassword
  ,revokeRefreshSession
} from '../services/auth.service';
import { authenticate } from '../middleware/authenticate';
import { loginRateLimiter, forgotPasswordRateLimiter } from '../middleware/rateLimiter';
import { env } from '../config/env';

const router = Router();

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  // Cross-site refresh cookies require Secure and SameSite=None in production.
  sameSite: (env.NODE_ENV === 'production' ? 'none' : 'lax') as 'none' | 'lax',
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

router.post('/login', loginRateLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { user, accessToken, refreshToken } = await loginUser(email, password);

    // Store refresh token in secure HTTP-only cookie
    res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);

    res.json({
      success: true,
      token: accessToken,
      accessToken,
      user
    });
  } catch (error) {
    next(error);
  }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    const { user, accessToken, newRefreshToken } = await refreshSession(refreshToken);

    res.cookie('refreshToken', newRefreshToken, COOKIE_OPTIONS);

    res.json({
      success: true,
      token: accessToken,
      accessToken,
      user
    });
  } catch (error) {
    next(error);
  }
});

router.post('/logout', async (req, res) => {
  await revokeRefreshSession(req.cookies?.refreshToken || req.body?.refreshToken);
  res.clearCookie('refreshToken', { path: '/' });
  res.json({ success: true, message: 'Logged out successfully' });
});

router.post('/activate', async (req, res, next) => {
  try {
    const { email, activationToken, newPassword, token } = req.body;
    const result = await activateAccount(email, activationToken, newPassword, token);

    if (result.refreshToken) {
      res.cookie('refreshToken', result.refreshToken, COOKIE_OPTIONS);
    }

    res.json({
      success: true,
      token: result.token,
      accessToken: result.accessToken,
      user: result.user
    });
  } catch (error) {
    next(error);
  }
});

router.get('/verify-token', async (req, res, next) => {
  try {
    const token = req.query.token as string | undefined;
    const email = req.query.email as string | undefined;
    const result = await verifyActivationToken(token, email);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
});

router.post('/verify-token', async (req, res, next) => {
  try {
    const { token, email } = req.body;
    const result = await verifyActivationToken(token, email);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
});

router.post('/request-reissue', async (req, res, next) => {
  try {
    const { email, reason } = req.body;
    const result = await requestActivationReissue(email, reason);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/forgot-password', forgotPasswordRateLimiter, async (req, res, next) => {
  try {
    const { email } = req.body;
    const result = await resetPasswordRequest(email);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/verify-reset-token', async (req, res, next) => {
  try {
    const token = req.query.token as string | undefined;
    const result = await verifyResetToken(token);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
});

router.post('/verify-reset-token', async (req, res, next) => {
  try {
    const { token } = req.body;
    const result = await verifyResetToken(token);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
});

router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    const result = await resetPassword(token, newPassword);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/me', authenticate, (req, res) => {
  res.json({ success: true, user: req.user });
});

export default router;
