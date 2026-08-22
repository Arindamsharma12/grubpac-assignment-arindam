import type { Request, Response, NextFunction } from "express";
import { AppError, TooManyRequestsError } from "@/lib/errors/AppError";
import { env } from "@/lib/config/env";

/**
 * Global Express error handler.
 *
 * Must be registered AFTER all routes (Express identifies error handlers
 * by their 4-parameter signature).
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // ── Operational errors (expected) ──────────────────────────────────
  if (err instanceof AppError) {
    const body: Record<string, unknown> = {
      error: err.message,
      code: err.code || "INTERNAL_ERROR",
    };

    // Attach field-level validation details if present
    if ("details" in err) {
      body["details"] = (err as AppError & { details: unknown }).details;
    } else {
      body["details"] = {};
    }

    // Add Retry-After header for 429 responses
    if (err instanceof TooManyRequestsError) {
      res.setHeader("Retry-After", String(err.retryAfterSeconds));
    }

    res.status(err.statusCode).json(body);
    return;
  }

  console.error("Unhandled error:", err);

  res.status(500).json({
    error:
      env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message || "Internal server error",
    code: "INTERNAL_ERROR",
    details: {},
  });
}
