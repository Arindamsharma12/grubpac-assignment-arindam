export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code?: string;

  constructor(
    message: string,
    statusCode: number,
    isOperational = true,
    code?: string,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    if (code !== undefined) {
      this.code = code;
    }
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message = "Bad request", code = "BAD_REQUEST") {
    super(message, 400, true, code);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized", code = "UNAUTHORIZED") {
    super(message, 401, true, code);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden", code = "FORBIDDEN") {
    super(message, 403, true, code);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Not found", code = "NOT_FOUND") {
    super(message, 404, true, code);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflict", code = "CONFLICT") {
    super(message, 409, true, code);
  }
}

export class TooManyRequestsError extends AppError {
  public readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number, message = "Too many requests", code = "TOO_MANY_REQUESTS") {
    super(message, 429, true, code);
    this.retryAfterSeconds = retryAfterSeconds;
  }
}
