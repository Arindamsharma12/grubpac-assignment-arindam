import { describe, it, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import app from "../../src/app";
import { cleanDatabase, disconnectDatabase, prisma } from "../helpers/db";
import { createTestUser, createTestOrg, createTestProject } from "../helpers/auth";
import type { TestUser, TestOrg } from "../helpers/auth";

describe("Project Integration Tests", () => {
  let user: TestUser;
  let org: TestOrg;

  const projectsUrl = () => `/orgs/${org.id}/projects`;
  const projectUrl = (id: string) => `${projectsUrl()}/${id}`;

  beforeEach(async () => {
    await cleanDatabase();
    user = await createTestUser({ email: "projuser@example.com" });
    org = await createTestOrg(user.id, "org_admin");
  });

  afterAll(async () => {
    await cleanDatabase();
    await disconnectDatabase();
  });

  // ── Create Project ──────────────────────────────────────────────

  describe("POST /orgs/:orgId/projects", () => {
    it("should create a project and return 201", async () => {
      const res = await request(app)
        .post(projectsUrl())
        .set("Authorization", `Bearer ${user.accessToken}`)
        .send({ name: "New Project" });

      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty("id");
      expect(res.body.data.name).toBe("New Project");
    });

    it("should return 400 for empty name", async () => {
      const res = await request(app)
        .post(projectsUrl())
        .set("Authorization", `Bearer ${user.accessToken}`)
        .send({ name: "" });

      expect(res.status).toBe(400);
    });
  });

  // ── Get Projects ────────────────────────────────────────────────

  describe("GET /orgs/:orgId/projects", () => {
    it("should return paginated list of projects", async () => {
      await createTestProject(org.id, "Project 1");
      await createTestProject(org.id, "Project 2");

      const res = await request(app)
        .get(projectsUrl())
        .set("Authorization", `Bearer ${user.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
    });
  });

  // ── Get Project by ID ───────────────────────────────────────────

  describe("GET /orgs/:orgId/projects/:projectId", () => {
    it("should return the project", async () => {
      const project = await createTestProject(org.id, "My Project");

      const res = await request(app)
        .get(projectUrl(project.id))
        .set("Authorization", `Bearer ${user.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe("My Project");
    });

    it("should return 404 for non-existent project", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const res = await request(app)
        .get(projectUrl(fakeId))
        .set("Authorization", `Bearer ${user.accessToken}`);

      expect(res.status).toBe(404);
    });
  });

  // ── Update Project ──────────────────────────────────────────────

  describe("PUT /orgs/:orgId/projects/:projectId", () => {
    it("should update project fields", async () => {
      const project = await createTestProject(org.id, "Original Name");

      const res = await request(app)
        .put(projectUrl(project.id))
        .set("Authorization", `Bearer ${user.accessToken}`)
        .send({ name: "Updated Name", description: "New description" });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe("Updated Name");
      expect(res.body.data.description).toBe("New description");
    });
  });

  // ── Delete Project ──────────────────────────────────────────────

  describe("DELETE /orgs/:orgId/projects/:projectId", () => {
    it("should soft-delete project when user is org_admin", async () => {
      const project = await createTestProject(org.id);

      const res = await request(app)
        .delete(projectUrl(project.id))
        .set("Authorization", `Bearer ${user.accessToken}`);

      expect(res.status).toBe(204);

      // Should not be accessible anymore
      const getRes = await request(app)
        .get(projectUrl(project.id))
        .set("Authorization", `Bearer ${user.accessToken}`);

      expect(getRes.status).toBe(404);
    });

    it("should return 403 when non-admin tries to delete", async () => {
      // Create a member (not admin) in the same org
      const memberUser = await createTestUser({ email: "member@example.com" });
      await prisma.orgMember.create({
        data: { orgId: org.id, userId: memberUser.id, role: "member" },
      });

      const project = await createTestProject(org.id);

      const res = await request(app)
        .delete(projectUrl(project.id))
        .set("Authorization", `Bearer ${memberUser.accessToken}`);

      expect(res.status).toBe(403);
    });
  });

  // ── Cross-Tenant Isolation ──────────────────────────────────────

  describe("Cross-Tenant Isolation", () => {
    it("should return 403 when accessing another org's projects", async () => {
      const otherUser = await createTestUser({ email: "otherproj@example.com" });
      const otherOrg = await createTestOrg(otherUser.id);
      await createTestProject(otherOrg.id, "Secret Project");

      const res = await request(app)
        .get(`/orgs/${otherOrg.id}/projects`)
        .set("Authorization", `Bearer ${user.accessToken}`);

      expect(res.status).toBe(403);
    });
  });
});
