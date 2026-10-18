"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const zod_1 = require("zod");
dotenv_1.default.config();
if (process.env.NODE_ENV === 'test') {
    const testUri = process.env.MONGODB_TEST_URI;
    if (!testUri) {
        throw new Error('MONGODB_TEST_URI is required when NODE_ENV=test');
    }
    let databaseName = '';
    try {
        databaseName = new URL(testUri).pathname.replace(/^\//, '');
    }
    catch {
        throw new Error('MONGODB_TEST_URI must be a valid MongoDB connection URI');
    }
    if (databaseName !== 'secure_assessment_e2e_test') {
        throw new Error('MONGODB_TEST_URI must target secure_assessment_e2e_test');
    }
    process.env.MONGODB_URI = testUri;
}
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'test', 'production']).default('development'),
    PORT: zod_1.z.coerce.number().default(5000),
    MONGODB_URI: zod_1.z.string().min(1).default('mongodb+srv://harshavardhandevang_db_user:WidTX3FijxB03ePR@cluster0.rtgs8it.mongodb.net/assessment_platform'),
    JWT_ACCESS_SECRET: zod_1.z.string().default('super_secret_access_key_1234567890_32bytes'),
    JWT_REFRESH_SECRET: zod_1.z.string().default('super_secret_refresh_key_0987654321_32bytes'),
    JWT_ACCESS_EXPIRES_IN: zod_1.z.string().default('15m'),
    JWT_REFRESH_EXPIRES_IN: zod_1.z.string().default('7d'),
    CLIENT_ORIGIN: zod_1.z.string().default('http://localhost:5173'),
    SMTP_HOST: zod_1.z.string().optional(),
    SMTP_PORT: zod_1.z.coerce.number().default(587),
    SMTP_USER: zod_1.z.string().optional(),
    SMTP_PASSWORD: zod_1.z.string().optional(),
    SMTP_FROM: zod_1.z.string().email().optional(),
    EMAIL_PROVIDER_URL: zod_1.z.string().url().optional(),
    EMAIL_PROVIDER_TOKEN: zod_1.z.string().optional(),
    BREVO_API_KEY: zod_1.z.string().optional(),
    BREVO_USER: zod_1.z.string().email().optional(),
    BREVO_PASS: zod_1.z.string().optional(),
    BREVO_FROM_EMAIL: zod_1.z.string().email().optional(),
    EMAIL_FROM_NAME: zod_1.z.string().default('KGS PVT LTD'),
    QUESTION_IMPORT_MAX_MB: zod_1.z.coerce.number().positive().default(10),
    ADMIN_EMAIL: zod_1.z.string().email().optional(),
    ADMIN_PASSWORD: zod_1.z.string().min(8).optional(),
    SUPER_ADMIN_EMAIL: zod_1.z.string().email().optional(),
    SUPER_ADMIN_PASSWORD: zod_1.z.string().min(8).optional()
});
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
    console.error('Invalid environment configuration:', parsed.error.format());
}
exports.env = parsed.success ? parsed.data : envSchema.parse({});
