import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3000),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),

  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),

  /** Access token TTL in minutes */
  JWT_ACCESS_TTL_MINUTES: z.coerce.number().int().positive().default(15),
  /** Refresh token TTL in days */
  JWT_REFRESH_TTL_DAYS: z.coerce.number().int().positive().default(7),

  BCRYPT_COST: z.coerce.number().int().min(12).default(12),

  /** Auth rate limit: max requests per window */
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
  /** Auth rate limit: window size in seconds */
  AUTH_RATE_LIMIT_WINDOW_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .default(60),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error("❌ Invalid environment variables:");
    console.error(result.error.flatten().fieldErrors);
    process.exit(1);
  }

  return result.data;
}

export const env = loadEnv();
