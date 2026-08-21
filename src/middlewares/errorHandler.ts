import type { Request, Response, NextFunction } from "express";
import { AppError, TooManyRequestsError } from "../errors/AppError";
import { env } from "../config/env";

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
      status: "error",
      message: err.message,
    };

    // Attach field-level validation details if present
    if ("details" in err) {
      body["details"] = (err as AppError & { details: unknown }).details;
    }

    // Add Retry-After header for 429 responses
    if (err instanceof TooManyRequestsError) {
      res.setHeader("Retry-After", String(err.retryAfterSeconds));
    }

    res.status(err.statusCode).json(body);
    return;
  }

  // ── Unexpected errors ──────────────────────────────────────────────
  console.error("Unhandled error:", err);

  res.status(500).json({
    status: "error",
    message:
      env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message || "Internal server error",
  });
}
