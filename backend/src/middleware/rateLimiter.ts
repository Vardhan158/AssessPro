import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const loginAttemptsMap = new Map<string, RateLimitRecord>();
const forgotPasswordAttemptsMap = new Map<string, RateLimitRecord>();

// Clean up stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of loginAttemptsMap.entries()) {
    if (now > record.resetTime) {
      loginAttemptsMap.delete(key);
    }
  }
  for (const [key, record] of forgotPasswordAttemptsMap.entries()) {
    if (now > record.resetTime) {
      forgotPasswordAttemptsMap.delete(key);
    }
  }
}, 5 * 60 * 1000);

export function loginRateLimiter(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 10; // Max 10 login requests per 15 minutes per IP

  const record = loginAttemptsMap.get(ip);

  if (!record || now > record.resetTime) {
    loginAttemptsMap.set(ip, {
      count: 1,
      resetTime: now + windowMs
    });
    return next();
  }

  if (record.count >= maxAttempts) {
    const minutesRemaining = Math.ceil((record.resetTime - now) / (60 * 1000));
    return res.status(429).json({
      success: false,
      message: `Too many login attempts from this IP address. Rate limit exceeded. Please try again in ${minutesRemaining} minutes.`
    });
  }

  record.count += 1;
  next();
}

export function forgotPasswordRateLimiter(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 5; // Max 5 password reset requests per 15 minutes per IP

  const record = forgotPasswordAttemptsMap.get(ip);

  if (!record || now > record.resetTime) {
    forgotPasswordAttemptsMap.set(ip, {
      count: 1,
      resetTime: now + windowMs
    });
    return next();
  }

  if (record.count >= maxAttempts) {
    const minutesRemaining = Math.ceil((record.resetTime - now) / (60 * 1000));
    return res.status(429).json({
      success: false,
      message: `Rate limit exceeded for password recovery requests. Please try again in ${minutesRemaining} minutes.`
    });
  }

  record.count += 1;
  next();
}
