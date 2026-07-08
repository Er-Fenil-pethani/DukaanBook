import dotenv from 'dotenv';
import path from 'path';
import { execSync } from 'child_process';

dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

const testUrl = process.env.DATABASE_URL_TEST;
if (!testUrl) {
  // eslint-disable-next-line no-console
  console.warn('DATABASE_URL_TEST not set — tests will be skipped.');
} else {
  process.env.DATABASE_URL = testUrl;
  process.env.NODE_ENV = 'test';
  try {
    execSync('npx prisma migrate deploy', {
      env: { ...process.env, DATABASE_URL: testUrl },
      cwd: path.resolve(__dirname, '..', '..'),
      stdio: 'pipe',
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Failed to apply migrations to test DB:', (e as Error).message);
    throw e;
  }
}
