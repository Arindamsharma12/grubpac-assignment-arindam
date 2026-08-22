import { describe, it, expect } from "vitest";
import jwt from "jsonwebtoken";
import {
  generateAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../../src/lib/utils/jwt.util";
import { sha256 } from "../../src/lib/utils/hash.util";
import { hashPassword, comparePassword } from "../../src/lib/utils/password.util";

// ── JWT Tests ────────────────────────────────────────────────────────

describe("JWT Utilities", () => {
  const testPayload = { userId: "user-123", email: "test@example.com" };

  describe("generateAccessToken", () => {
    it("should produce a valid JWT that can be verified", () => {
      const token = generateAccessToken(testPayload);

      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(token.split(".")).toHaveLength(3); // JWT has 3 parts

      const decoded = verifyAccessToken(token);
      expect(decoded.userId).toBe(testPayload.userId);
      expect(decoded.email).toBe(testPayload.email);
    });

    it("should include standard JWT claims", () => {
      const token = generateAccessToken(testPayload);
      const decoded = jwt.decode(token) as Record<string, unknown>;

      expect(decoded).toHaveProperty("iat");
      expect(decoded).toHaveProperty("exp");
      expect(decoded.userId).toBe(testPayload.userId);
    });
  });

  describe("verifyAccessToken", () => {
    it("should reject tokens signed with wrong secret", () => {
      const fakeToken = jwt.sign(testPayload, "wrong-secret-key-1234567");

      expect(() => verifyAccessToken(fakeToken)).toThrow();
    });

    it("should reject expired tokens", () => {
      const secret = process.env.JWT_ACCESS_SECRET!;
      const expiredToken = jwt.sign(testPayload, secret, { expiresIn: "0s" });

      expect(() => verifyAccessToken(expiredToken)).toThrow();
    });

    it("should reject malformed tokens", () => {
      expect(() => verifyAccessToken("not-a-jwt")).toThrow();
    });
  });

  describe("generateRefreshToken", () => {
    it("should include jti claim", () => {
      const jti = "family-abc-123";
      const token = generateRefreshToken({ userId: "user-123" }, jti);

      const decoded = verifyRefreshToken(token);
      expect(decoded.jti).toBe(jti);
      expect(decoded.userId).toBe("user-123");
    });

    it("should produce a different token than access token", () => {
      const accessToken = generateAccessToken(testPayload);
      const refreshToken = generateRefreshToken({ userId: testPayload.userId }, "jti-1");

      expect(accessToken).not.toBe(refreshToken);
    });
  });

  describe("verifyRefreshToken", () => {
    it("should reject access tokens (different secret)", () => {
      const accessToken = generateAccessToken(testPayload);

      // Access tokens are signed with a different secret
      expect(() => verifyRefreshToken(accessToken)).toThrow();
    });
  });
});

// ── SHA-256 Tests ────────────────────────────────────────────────────

describe("SHA-256 Hashing", () => {
  it("should produce consistent hashes for the same input", () => {
    const hash1 = sha256("hello-world");
    const hash2 = sha256("hello-world");

    expect(hash1).toBe(hash2);
  });

  it("should produce different hashes for different inputs", () => {
    const hash1 = sha256("input-a");
    const hash2 = sha256("input-b");

    expect(hash1).not.toBe(hash2);
  });

  it("should produce a 64-character hex string", () => {
    const hash = sha256("test-data");

    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]+$/);
  });
});

// ── Password Hashing Tests ───────────────────────────────────────────

describe("Password Hashing", () => {
  it("should hash password to a different string than plaintext", async () => {
    const plaintext = "my-secure-password";
    const hash = await hashPassword(plaintext);

    expect(hash).not.toBe(plaintext);
    expect(hash.length).toBeGreaterThan(0);
  });

  it("should produce a valid bcrypt hash", async () => {
    const hash = await hashPassword("test-password");

    // bcrypt hashes start with $2b$ or $2a$
    expect(hash).toMatch(/^\$2[ab]\$/);
  });

  it("should return true when comparing correct password", async () => {
    const plaintext = "correct-password";
    const hash = await hashPassword(plaintext);

    const result = await comparePassword(plaintext, hash);
    expect(result).toBe(true);
  });

  it("should return false when comparing wrong password", async () => {
    const hash = await hashPassword("correct-password");

    const result = await comparePassword("wrong-password", hash);
    expect(result).toBe(false);
  });

  it("should produce different hashes for the same password (salt)", async () => {
    const plaintext = "same-password";
    const hash1 = await hashPassword(plaintext);
    const hash2 = await hashPassword(plaintext);

    expect(hash1).not.toBe(hash2);
    // But both should still verify correctly
    expect(await comparePassword(plaintext, hash1)).toBe(true);
    expect(await comparePassword(plaintext, hash2)).toBe(true);
  });
});
