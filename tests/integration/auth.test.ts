import { describe, it, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import app from "../../src/app";
import { cleanDatabase, disconnectDatabase, prisma } from "../helpers/db";
import { createTestUser } from "../helpers/auth";

describe("Auth Integration Tests", () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await cleanDatabase();
    await disconnectDatabase();
  });

  // ── Registration ─────────────────────────────────────────────────

  describe("POST /auth/register", () => {
    it("should register a new user and return 201 with tokens", async () => {
      const res = await request(app)
        .post("/auth/register")
        .send({
          name: "Alice",
          email: "alice@example.com",
          password: "password123",
          orgName: "Alice Corp",
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe("success");
      expect(res.body.data).toHaveProperty("accessToken");
      expect(res.body.data).toHaveProperty("refreshToken");
      expect(res.body.data.user).toHaveProperty("id");
      expect(res.body.data.user.email).toBe("alice@example.com");
      expect(res.body.data.organization).toHaveProperty("id");

      // Should set cookies
      const cookies = res.headers["set-cookie"];
      expect(cookies).toBeDefined();
    });

    it("should return 409 for duplicate email", async () => {
      await createTestUser({ email: "dup@example.com" });

      const res = await request(app)
        .post("/auth/register")
        .send({
          name: "Duplicate",
          email: "dup@example.com",
          password: "password123",
          orgName: "Dup Corp",
        });

      expect(res.status).toBe(409);
    });

    it("should return 400 for validation errors", async () => {
      const res = await request(app)
        .post("/auth/register")
        .send({
          name: "A", // Too short
          email: "not-an-email",
          password: "short",
          // Missing orgName
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe("VALIDATION_ERROR");
      expect(res.body.details).toBeDefined();
    });
  });

  // ── Login ────────────────────────────────────────────────────────

  describe("POST /auth/login", () => {
    it("should login with correct credentials and return tokens", async () => {
      const user = await createTestUser({
        email: "login@example.com",
        password: "password123",
      });

      const res = await request(app)
        .post("/auth/login")
        .send({ email: "login@example.com", password: "password123" });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("success");
      expect(res.body.data).toHaveProperty("accessToken");
      expect(res.body.data).toHaveProperty("refreshToken");
      expect(res.body.data.user.email).toBe("login@example.com");
    });

    it("should return 401 for wrong password", async () => {
      await createTestUser({
        email: "wrong@example.com",
        password: "correct-password",
      });

      const res = await request(app)
        .post("/auth/login")
        .send({ email: "wrong@example.com", password: "wrong-password" });

      expect(res.status).toBe(401);
    });

    it("should return 401 for non-existent email", async () => {
      const res = await request(app)
        .post("/auth/login")
        .send({ email: "noone@example.com", password: "password123" });

      expect(res.status).toBe(401);
    });
  });

  // ── Token Refresh ────────────────────────────────────────────────

  describe("POST /auth/refresh", () => {
    it("should return new token pair", async () => {
      // Register to get tokens
      const regRes = await request(app)
        .post("/auth/register")
        .send({
          name: "Refresh User",
          email: "refresh@example.com",
          password: "password123",
          orgName: "Refresh Corp",
        });

      const refreshToken = regRes.body.data.refreshToken;

      const res = await request(app)
        .post("/auth/refresh")
        .send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty("accessToken");
      expect(res.body.data).toHaveProperty("refreshToken");
      // New refresh token should be different (rotation)
      expect(res.body.data.refreshToken).not.toBe(refreshToken);
    });

    it("should reject reused refresh token (reuse detection)", async () => {
      const regRes = await request(app)
        .post("/auth/register")
        .send({
          name: "Reuse User",
          email: "reuse@example.com",
          password: "password123",
          orgName: "Reuse Corp",
        });

      const oldRefreshToken = regRes.body.data.refreshToken;

      // Use the token once (rotates it)
      await request(app)
        .post("/auth/refresh")
        .send({ refreshToken: oldRefreshToken });

      // Try to reuse the old token
      const reuseRes = await request(app)
        .post("/auth/refresh")
        .send({ refreshToken: oldRefreshToken });

      expect(reuseRes.status).toBe(401);
    });
  });

  // ── Get Me ───────────────────────────────────────────────────────

  describe("GET /auth/me", () => {
    it("should return user profile with valid token", async () => {
      const user = await createTestUser({ email: "me@example.com" });

      const res = await request(app)
        .get("/auth/me")
        .set("Authorization", `Bearer ${user.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe("me@example.com");
      expect(res.body.data).not.toHaveProperty("passwordHash");
    });

    it("should return 401 without token", async () => {
      const res = await request(app).get("/auth/me");

      expect(res.status).toBe(401);
    });

    it("should return 401 with invalid token", async () => {
      const res = await request(app)
        .get("/auth/me")
        .set("Authorization", "Bearer invalid-token-here");

      expect(res.status).toBe(401);
    });
  });

  // ── Logout ──────────────────────────────────────────────────────

  describe("POST /auth/logout", () => {
    it("should blacklist the access token", async () => {
      const regRes = await request(app)
        .post("/auth/register")
        .send({
          name: "Logout User",
          email: "logout@example.com",
          password: "password123",
          orgName: "Logout Corp",
        });

      const accessToken = regRes.body.data.accessToken;
      const refreshToken = regRes.body.data.refreshToken;

      // Logout
      const logoutRes = await request(app)
        .post("/auth/logout")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ refreshToken });

      expect(logoutRes.status).toBe(200);

      // Token should now be blacklisted
      const meRes = await request(app)
        .get("/auth/me")
        .set("Authorization", `Bearer ${accessToken}`);

      expect(meRes.status).toBe(401);
    });
  });
});
