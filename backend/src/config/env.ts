import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (!v) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return v;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: Number(process.env.PORT ?? 5000),
  DATABASE_URL: required('DATABASE_URL'),
  DATABASE_URL_TEST: process.env.DATABASE_URL_TEST,
  JWT_SECRET: required('JWT_SECRET', 'dev-only-secret-change-me'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? '7d',
  CLIENT_URL: process.env.CLIENT_URL ?? 'http://localhost:3000',
  UPLOAD_DIR: process.env.UPLOAD_DIR ?? './uploads',
  MAX_UPLOAD_BYTES: Number(process.env.MAX_UPLOAD_BYTES ?? 5_242_880),
  isProd: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
};
