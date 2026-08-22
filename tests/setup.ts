/**
 * Global test setup — runs before every test file.
 *
 * Sets environment variables that the app's env.ts module validates
 * at import time. Must be listed in vitest.config.ts `setupFiles`.
 */

process.env.NODE_ENV = "test";
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://taskflow:taskflow_password@localhost:5433/taskflow?schema=public";
process.env.REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
process.env.JWT_ACCESS_SECRET = "test-access-secret-that-is-long-enough";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-that-is-long-enough";
process.env.BCRYPT_COST = "12"; // Minimum allowed by env schema
