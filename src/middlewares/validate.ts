import type { Request, Response, NextFunction } from "express";
import type { ZodSchema } from "zod";
import { ZodError } from "zod";
import { BadRequestError } from "../errors/AppError";

/**
 * Returns an Express middleware that validates `req.body` against the
 * supplied Zod schema.  On success the parsed (and transformed) data
 * replaces `req.body` so downstream handlers receive clean input.
 */
export function validate(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const fieldErrors = err.issues.map((e) => ({
          field: e.path.map(String).join("."),
          message: e.message,
        }));

        const error = new BadRequestError("Validation failed");
        // Attach field-level details so the error handler can include them
        (error as BadRequestError & { details: unknown }).details = fieldErrors;
        next(error);
        return;
      }
      next(err);
    }
  };
}
