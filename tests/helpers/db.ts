import { prisma } from "../../src/lib/config/prisma";
import { redis } from "../../src/lib/config/redis";

/**
 * Truncate all tables and flush Redis to ensure test isolation.
 * Uses raw TRUNCATE CASCADE to handle foreign key constraints reliably.
 */
export async function cleanDatabase(): Promise<void> {
  const tablenames = [
    "comments",
    "task_assignments",
    "refresh_tokens",
    "tasks",
    "projects",
    "org_members",
    "organizations",
    "users",
  ];

  for (const table of tablenames) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE`);
  }

  // Flush Redis to clear rate limiter counters and token blacklist entries
  await redis.flushdb();
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  await redis.quit();
}

export { prisma };
