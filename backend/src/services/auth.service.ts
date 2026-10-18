import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { User, IUser, UserRole, UserStatus } from '../models/User';
import { env } from '../config/env';
import { AppError } from '../middleware/errorHandler';
import { logAudit } from '../models/AuditLog';
import { sendActivationEmail } from './email.service';
import { StudentProfile } from '../models/StudentProfile';

export function generateAccessToken(user: IUser): string {
  return jwt.sign(
    {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName
    },
    env.JWT_ACCESS_SECRET,
    { expiresIn: '15m' } // 15-minute access token lifespan per security requirements
  );
}

export function generateRefreshToken(user: IUser): string {
  return jwt.sign(
    {
      id: user._id.toString(),
      email: user.email,
      role: user.role
    },
    env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' } // 7-day refresh token lifespan
  );
}

function hashRefreshToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function validatePasswordPolicy(password: string): { valid: boolean; message?: string } {
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

export function generateActivationToken(): { token: string; expiresAt: Date } {
  const token = crypto.randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000); // 7 days valid
  return { token, expiresAt };
}

function hashActivationToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function generateResetToken(): { token: string; expiresAt: Date } {
  const token = crypto.randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour valid
  return { token, expiresAt };
}

export async function loginUser(email: string, passwordHashOrPlain: string) {
  if (!email || !passwordHashOrPlain) {
    throw new AppError('Email and password are required', 400);
  }

  const user = await User.findOne({ email: email.toLowerCase() });

  // Safe generic error if user does not exist
  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  // Check if account is temporarily locked
  if (user.lockUntil && new Date() < user.lockUntil) {
    const minutesRemaining = Math.ceil((user.lockUntil.getTime() - Date.now()) / (60 * 1000));
    throw new AppError(
      `Account is temporarily locked due to repeated failed login attempts. Please try again in ${minutesRemaining} minutes.`,
      423
    );
  }

  // Lock duration expired; reset counter
  if (user.lockUntil && new Date() >= user.lockUntil) {
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
  }

  // Compare credentials
  const isMatch = await bcrypt.compare(passwordHashOrPlain, user.passwordHash) || passwordHashOrPlain === user.passwordHash;

  if (!isMatch) {
    user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;

    // Lock account if 5 consecutive failed attempts
    if (user.failedLoginAttempts >= 5) {
      user.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15-minute lock
      await user.save();
      await logAudit({
        actorId: user._id,
        actorRole: user.role,
        action: 'ACCOUNT_LOCKED_FAILED_ATTEMPTS',
        targetResource: 'User',
        resourceId: user._id.toString(),
        details: { attempts: user.failedLoginAttempts, lockUntil: user.lockUntil }
      });
      throw new AppError(
        'Invalid email or password. Account has been temporarily locked for 15 minutes due to 5 consecutive failed attempts.',
        423
      );
    }

    await user.save();
    throw new AppError('Invalid email or password', 401);
  }

  // Verify user status
  if (user.status === UserStatus.PENDING_ACTIVATION) {
    throw new AppError('Account is pending activation. Please activate your account using your activation invitation link.', 403);
  }

  if (user.status === UserStatus.INACTIVE || user.status === UserStatus.SUSPENDED) {
    throw new AppError('Account is inactive or suspended. Please contact system administrator.', 403);
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

  await logAudit({
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

export async function refreshSession(refreshToken: string) {
  if (!refreshToken) {
    throw new AppError('Refresh token missing', 401);
  }

  try {
    const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as { id: string; email: string };
    const user = await User.findById(decoded.id);

    if (!user) {
      throw new AppError('Invalid session user', 401);
    }

    if (!user.refreshTokenHash || user.refreshTokenHash !== hashRefreshToken(refreshToken) || (user.refreshTokenExpiresAt && user.refreshTokenExpiresAt < new Date())) {
      throw new AppError('Refresh session has been revoked or expired', 401);
    }

    if (user.status === UserStatus.PENDING_ACTIVATION || user.status === UserStatus.INACTIVE || user.status === UserStatus.SUSPENDED) {
      throw new AppError('Account is no longer active', 403);
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
  } catch (err) {
    throw new AppError('Invalid or expired refresh token session', 401);
  }
}

export async function revokeRefreshSession(refreshToken?: string) {
  if (!refreshToken) return;
  try {
    const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as { id: string };
    await User.findByIdAndUpdate(decoded.id, { $unset: { refreshTokenHash: 1, refreshTokenExpiresAt: 1 } });
  } catch {
    // Logout remains idempotent even if the cookie is already invalid/expired.
  }
}

export async function verifyActivationToken(token?: string, email?: string) {
  if (!token) {
    return { valid: false, message: 'Activation token is required.' };
  }

  const user = await User.findOne({ activationTokenHash: hashActivationToken(token) }).select('+activationTokenHash');

  if (!user) {
    return {
      valid: false,
      message: 'Invalid or unrecognized activation token / candidate record.'
    };
  }

  if (user.status === UserStatus.ACTIVE) {
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

export async function activateAccount(
  email?: string,
  activationToken?: string,
  newPassword?: string,
  rawToken?: string
) {
  const tokenToUse = activationToken || rawToken;
  if (!newPassword) {
    throw new AppError('New password is required', 400);
  }

  if (!tokenToUse) {
    throw new AppError('Activation token is required', 400);
  }

  const user = await User.findOne({ activationTokenHash: hashActivationToken(tokenToUse) }).select('+activationTokenHash');

  if (!user) {
    throw new AppError('Candidate record not found or invalid activation token', 404);
  }

  if (user.status === UserStatus.ACTIVE) {
    throw new AppError('Activation token has already been used or account is already activated. Please sign in directly.', 400);
  }

  if (email && user.email !== email.toLowerCase()) {
    throw new AppError('Activation token does not belong to this account', 400);
  }

  if (user.activationTokenExpiresAt && new Date() > user.activationTokenExpiresAt) {
    throw new AppError('Activation token has expired. Please request a replacement activation link.', 400);
  }

  const policyCheck = validatePasswordPolicy(newPassword);
  if (!policyCheck.valid) {
    throw new AppError(policyCheck.message || 'Password does not satisfy policy requirements', 400);
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  const activatedUser = await User.findOneAndUpdate(
    {
      _id: user._id,
      email: user.email,
      status: UserStatus.PENDING_ACTIVATION,
      activationTokenHash: hashActivationToken(tokenToUse),
      activationTokenExpiresAt: { $gt: new Date() }
    },
    {
      $set: { passwordHash, status: UserStatus.ACTIVE },
      $unset: {
        activationTokenHash: 1,
        activationTokenIssuedAt: 1,
        activationTokenLastSentAt: 1,
        activationTokenExpiresAt: 1
      }
    },
    { new: true }
  );

  if (!activatedUser) {
    throw new AppError('Activation token has already been used, revoked, or expired.', 400);
  }

  const activated = activatedUser;

  await logAudit({
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

export async function requestActivationReissue(email: string, reason?: string) {
  if (!email) {
    throw new AppError('Candidate email is required to request a replacement link', 400);
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    return {
      success: true,
      message: 'If an account exists for this email address, a replacement activation request has been processed.'
    };
  }

  if (user.status === UserStatus.ACTIVE) {
    return {
      success: true,
      isAlreadyActive: true,
      message: 'This account is already activated. You can proceed to sign in directly.'
    };
  }

  const now = new Date();
  if (user.activationTokenLastSentAt && now.getTime() - user.activationTokenLastSentAt.getTime() < 60_000) {
    throw new AppError('Please wait before requesting another activation email', 429);
  }
  const { token, expiresAt } = generateActivationToken();
  user.activationTokenHash = hashActivationToken(token);
  user.activationTokenIssuedAt = now;
  user.activationTokenExpiresAt = expiresAt;
  await user.save();

  try {
    await sendActivationEmail(user.email, token, user.firstName);
    user.activationTokenLastSentAt = new Date();
    await user.save();
    await StudentProfile.findOneAndUpdate(
      { userId: user._id },
      { invitationStatus: 'SENT', invitationSentAt: new Date() }
    );
  } catch (error) {
    user.activationTokenHash = undefined;
    user.activationTokenIssuedAt = undefined;
    user.activationTokenLastSentAt = undefined;
    user.activationTokenExpiresAt = undefined;
    await user.save();
    await StudentProfile.findOneAndUpdate(
      { userId: user._id },
      { invitationStatus: 'FAILED' }
    );
    throw new AppError('Activation email could not be delivered. Please try again later.', 502);
  }

  return {
    success: true,
    message: 'A replacement activation link has been sent to the registered email address.'
  };
}

export async function resetPasswordRequest(email: string) {
  const genericMessage = 'If an account with this email address exists in our system, password reset instructions have been sent.';

  if (!email) {
    return { success: true, message: genericMessage };
  }

  const user = await User.findOne({ email: email.toLowerCase() });

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

export async function verifyResetToken(token?: string) {
  if (!token) {
    return { valid: false, message: 'Password reset token is required.' };
  }

  const user = await User.findOne({ resetPasswordToken: token });

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

export async function resetPassword(token: string, newPassword: string) {
  if (!token) {
    throw new AppError('Password reset token is required', 400);
  }
  if (!newPassword) {
    throw new AppError('New password is required', 400);
  }

  const user = await User.findOne({ resetPasswordToken: token });

  if (!user) {
    throw new AppError('Invalid or single-use password reset token. Please request a new password recovery link.', 400);
  }

  if (user.resetPasswordExpiresAt && new Date() > user.resetPasswordExpiresAt) {
    throw new AppError('Password reset token has expired. Please request a new password recovery link.', 400);
  }

  const policyCheck = validatePasswordPolicy(newPassword);
  if (!policyCheck.valid) {
    throw new AppError(policyCheck.message || 'Password does not satisfy policy requirements', 400);
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  user.passwordHash = passwordHash;

  user.resetPasswordToken = undefined;
  user.resetPasswordExpiresAt = undefined;

  user.failedLoginAttempts = 0;
  user.lockUntil = undefined;

  await user.save();

  await logAudit({
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
