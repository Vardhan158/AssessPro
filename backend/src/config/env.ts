import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

if (process.env.NODE_ENV === 'test') {
  const testUri = process.env.MONGODB_TEST_URI;
  if (!testUri) {
    throw new Error('MONGODB_TEST_URI is required when NODE_ENV=test');
  }

  let databaseName = '';
  try {
    databaseName = new URL(testUri).pathname.replace(/^\//, '');
  } catch {
    throw new Error('MONGODB_TEST_URI must be a valid MongoDB connection URI');
  }

  if (databaseName !== 'secure_assessment_e2e_test') {
    throw new Error('MONGODB_TEST_URI must target secure_assessment_e2e_test');
  }

  process.env.MONGODB_URI = testUri;
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(5000),
  MONGODB_URI: z.string().min(1).default('mongodb+srv://harshavardhandevang_db_user:WidTX3FijxB03ePR@cluster0.rtgs8it.mongodb.net/assessment_platform'),
  JWT_ACCESS_SECRET: z.string().default('super_secret_access_key_1234567890_32bytes'),
  JWT_REFRESH_SECRET: z.string().default('super_secret_refresh_key_0987654321_32bytes'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().email().optional(),
  EMAIL_PROVIDER_URL: z.string().url().optional(),
  EMAIL_PROVIDER_TOKEN: z.string().optional(),
  BREVO_API_KEY: z.string().optional(),
  BREVO_USER: z.string().email().optional(),
  BREVO_PASS: z.string().optional(),
  BREVO_FROM_EMAIL: z.string().email().optional(),
  EMAIL_FROM_NAME: z.string().default('KGS PVT LTD'),
  QUESTION_IMPORT_MAX_MB: z.coerce.number().positive().default(10),
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().min(8).optional(),
  SUPER_ADMIN_EMAIL: z.string().email().optional(),
  SUPER_ADMIN_PASSWORD: z.string().min(8).optional()
});

export type Env = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.format());
}

export const env = parsed.success ? parsed.data : envSchema.parse({});
