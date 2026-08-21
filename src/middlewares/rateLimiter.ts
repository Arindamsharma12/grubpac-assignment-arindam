import type { Request, Response, NextFunction } from "express";
import { redis } from "@/lib/config/redis";
import { env } from "@/lib/config/env";
import { TooManyRequestsError } from "@/lib/errors/AppError";

/**
 * Redis-based sliding-window rate limiter for auth endpoints.
 *
 * Strategy: fixed-window counter using INCR + EXPIRE.
 * Key format: `rl:auth:<ip>:<window>`
 *
 * Defaults (from env):
 *   - 10 requests per 60-second window per IP
 */
export async function rateLimiter(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
    const windowSeconds = env.AUTH_RATE_LIMIT_WINDOW_SECONDS;
    const maxRequests = env.AUTH_RATE_LIMIT_MAX;

    // Current window identifier (floors to the nearest window)
    const currentWindow = Math.floor(Date.now() / 1000 / windowSeconds);
    const key = "rl:auth:${ip}:${currentWindow}";

    const current = await redis.incr(key);

    // Set expiry only on the first request of the window
    if (current === 1) {
      await redis.expire(key, windowSeconds);
    }

    if (current > maxRequests) {
      const retryAfter =
        windowSeconds - (Math.floor(Date.now() / 1000) % windowSeconds);
      next(new TooManyRequestsError(retryAfter));
      return;
    }

    next();
  } catch (err) {
    // If Redis is down, allow the request through (fail-open)
    // to avoid blocking all auth traffic due to a Redis outage.
    console.error("Rate limiter error (failing open):", err);
    next();
  }
}
