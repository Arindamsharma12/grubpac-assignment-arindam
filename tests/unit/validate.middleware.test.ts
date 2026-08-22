import { describe, it, expect, vi } from "vitest";
import { validate } from "../../src/middlewares/validate";
import {
  registerSchema,
  loginSchema,
} from "../../src/lib/validators/auth.validator";
import type { Request, Response, NextFunction } from "express";

// ── Helpers ──────────────────────────────────────────────────────────

function createMockReq(body: unknown): Request {
  return { body } as Request;
}

function createMockRes(): Response {
  return {} as Response;
}

// ── validate middleware ──────────────────────────────────────────────

describe("validate middleware", () => {
  it("should call next() with no error on valid body", () => {
    const schema = registerSchema;
    const middleware = validate(schema);
    const req = createMockReq({
      name: "John Doe",
      email: "john@example.com",
      password: "securepassword",
      orgName: "Acme Corp",
    });
    const res = createMockRes();
    const next = vi.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("should replace req.body with parsed data", () => {
    const middleware = validate(registerSchema);
    const req = createMockReq({
      name: "  Jane  ",
      email: "  JANE@EXAMPLE.COM  ",
      password: "password123",
      orgName: "  My Org  ",
    });
    const res = createMockRes();
    const next = vi.fn();

    middleware(req, res, next);

    // Email should be lowercased and names trimmed
    expect(req.body.email).toBe("jane@example.com");
    expect(req.body.name).toBe("Jane");
    expect(req.body.orgName).toBe("My Org");
  });

  it("should call next(error) on invalid body", () => {
    const middleware = validate(registerSchema);
    const req = createMockReq({ name: "J" }); // Missing fields + short name
    const res = createMockRes();
    const next = vi.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const error = next.mock.calls[0]![0];
    expect(error).toBeDefined();
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe("VALIDATION_ERROR");
  });

  it("should include field-level details in validation error", () => {
    const middleware = validate(registerSchema);
    const req = createMockReq({});
    const res = createMockRes();
    const next = vi.fn();

    middleware(req, res, next);

    const error = next.mock.calls[0]![0] as any;
    expect(error.details).toBeDefined();
    expect(Array.isArray(error.details)).toBe(true);
    expect(error.details.length).toBeGreaterThan(0);

    // Should have field names
    const fields = error.details.map((d: any) => d.field);
    expect(fields).toContain("name");
    expect(fields).toContain("email");
    expect(fields).toContain("password");
  });
});

// ── registerSchema ───────────────────────────────────────────────────

describe("registerSchema", () => {
  it("should reject password shorter than 8 characters", () => {
    const result = registerSchema.safeParse({
      name: "John",
      email: "john@example.com",
      password: "short",
      orgName: "My Org",
    });

    expect(result.success).toBe(false);
  });

  it("should reject invalid email", () => {
    const result = registerSchema.safeParse({
      name: "John",
      email: "not-an-email",
      password: "password123",
      orgName: "My Org",
    });

    expect(result.success).toBe(false);
  });

  it("should reject when required fields are missing", () => {
    const result = registerSchema.safeParse({});

    expect(result.success).toBe(false);
  });

  it("should transform email to lowercase", () => {
    const result = registerSchema.safeParse({
      name: "John",
      email: "JOHN@EXAMPLE.COM",
      password: "password123",
      orgName: "My Org",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("john@example.com");
    }
  });

  it("should reject name shorter than 2 characters", () => {
    const result = registerSchema.safeParse({
      name: "J",
      email: "john@example.com",
      password: "password123",
      orgName: "My Org",
    });

    expect(result.success).toBe(false);
  });
});

// ── loginSchema ──────────────────────────────────────────────────────

describe("loginSchema", () => {
  it("should reject missing password", () => {
    const result = loginSchema.safeParse({
      email: "test@example.com",
    });

    expect(result.success).toBe(false);
  });

  it("should reject invalid email", () => {
    const result = loginSchema.safeParse({
      email: "bad-email",
      password: "password123",
    });

    expect(result.success).toBe(false);
  });

  it("should accept valid credentials", () => {
    const result = loginSchema.safeParse({
      email: "test@example.com",
      password: "password123",
    });

    expect(result.success).toBe(true);
  });
});
