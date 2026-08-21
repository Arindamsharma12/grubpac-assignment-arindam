import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "@/lib/utils/jwt.util";
import { UnauthorizedError } from "@/lib/errors/AppError";
import { redis } from "@/lib/config/redis";

/**
 * JWT authentication middleware.
 *
 * Extracts the token from cookies or Authorization header, verifies it,
 * checks if it is blacklisted, and attaches `req.user = { userId, email }` for downstream handlers.
 */
export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  let token = req.cookies?.accessToken;

  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.slice(7); // strip "Bearer "
    }
  }

  if (!token) {
    next(new UnauthorizedError("Missing authentication token"));
    return;
  }

  try {
    const isBlacklisted = await redis.get(`bl_${token}`);
    if (isBlacklisted) {
      next(new UnauthorizedError("Token is invalidated"));
      return;
    }

    const payload = verifyAccessToken(token);
    req.user = { userId: payload.userId, email: payload.email };
    next();
  } catch {
    next(new UnauthorizedError("Invalid or expired access token"));
  }
}
