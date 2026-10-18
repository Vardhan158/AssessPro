import bcrypt from 'bcryptjs';
import { env } from './config/env';
import { connectDB } from './config/db';
import { logger } from './config/logger';
import app from './app';
import { Attempt, AttemptStatus } from './models/Attempt';
import { scoreAttempt } from './services/scoring.service';
import { User, UserRole, UserStatus } from './models/User';

// Enforce expired attempts without creating demo users or assessments.
setInterval(async () => {
  try {
    const expiredAttempts = await Attempt.find({ status: AttemptStatus.IN_PROGRESS, deadlineAt: { $lt: new Date() } });
    for (const attempt of expiredAttempts) {
      logger.info(`Auto-finalizing expired attempt ${attempt._id}`);
      attempt.status = AttemptStatus.TIMED_OUT;
      attempt.finalizedReason = 'Server background job sweep: Examination deadline expired';
      attempt.submittedAt = attempt.deadlineAt;
      await scoreAttempt(attempt);
    }
  } catch (error) {
    logger.error('Error in background timeout job', error);
  }
}, 30 * 1000);

async function startServer() {
  await connectDB();
  await bootstrapAdmin();
  await bootstrapSuperAdmin();
  app.listen(env.PORT, () => logger.info(`Server running on port ${env.PORT} in ${env.NODE_ENV} mode`));
}

async function bootstrapAdmin() {
  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) {
    logger.warn('Admin bootstrap skipped: ADMIN_EMAIL or ADMIN_PASSWORD is not configured');
    return;
  }

  const email = env.ADMIN_EMAIL.toLowerCase();
  const existing = await User.findOne({ email });
  if (existing) {
    if (existing.role !== UserRole.ADMIN) {
      logger.warn(`Configured Admin email already belongs to a non-admin user: ${email}`);
    }
    return;
  }

  const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, 12);
  await User.create({
    email,
    passwordHash,
    role: UserRole.ADMIN,
    status: UserStatus.ACTIVE,
    firstName: 'Platform',
    lastName: 'Administrator'
  });
  logger.info(`Bootstrapped Admin account: ${email}`);
}

async function bootstrapSuperAdmin() {
  if (!env.SUPER_ADMIN_EMAIL || !env.SUPER_ADMIN_PASSWORD) {
    logger.warn('Super Admin bootstrap skipped: SUPER_ADMIN_EMAIL or SUPER_ADMIN_PASSWORD is not configured');
    return;
  }

  const email = env.SUPER_ADMIN_EMAIL.toLowerCase();
  const existing = await User.findOne({ email });
  if (existing) {
    if (existing.role !== UserRole.SUPER_ADMIN) {
      logger.warn(`Configured Super Admin email already belongs to a non-super-admin user: ${email}`);
    }
    return;
  }

  const passwordHash = await bcrypt.hash(env.SUPER_ADMIN_PASSWORD, 12);
  await User.create({
    email,
    passwordHash,
    role: UserRole.SUPER_ADMIN,
    status: UserStatus.ACTIVE,
    firstName: 'Platform',
    lastName: 'Administrator'
  });
  logger.info(`Bootstrapped Super Admin account: ${email}`);
}

startServer();
