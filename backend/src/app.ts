import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth.routes';
import studentRoutes from './routes/student.routes';
import adminRoutes from './routes/admin.routes';

const app = express();
app.use(cors({
  origin: (requestOrigin, callback) => {
    if (!requestOrigin) return callback(null, true);
    if (
      requestOrigin.includes('localhost') ||
      requestOrigin.includes('onrender.com') ||
      requestOrigin.includes('vercel.app') ||
      requestOrigin.includes('netlify.app')
    ) {
      return callback(null, true);
    }
    if (env.CLIENT_ORIGIN && env.CLIENT_ORIGIN.split(',').some(allowed => requestOrigin.includes(allowed.trim()))) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true
}));
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
  if (env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});
app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/student', studentRoutes);
app.use('/api/v1/admin', adminRoutes);
app.get('/health', (_req, res) => res.json({ status: 'OK', timestamp: new Date() }));
app.get('/api/v1/health', (_req, res) => res.json({ status: 'OK', timestamp: new Date() }));
app.use(errorHandler);

export default app;
