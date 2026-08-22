import { describe, it, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import app from "../../src/app";
import { cleanDatabase, disconnectDatabase, prisma } from "../helpers/db";
import { createTestUser, createTestOrg, createTestProject } from "../helpers/auth";
import type { TestUser, TestOrg } from "../helpers/auth";

describe("Task Integration Tests", () => {
  let user: TestUser;
  let org: TestOrg;
  let project: { id: string; name: string; orgId: string };

  // Helper to build the base URL for tasks
  const tasksUrl = () => `/orgs/${org.id}/projects/${project.id}/tasks`;
  const taskUrl = (taskId: string) => `${tasksUrl()}/${taskId}`;

  beforeEach(async () => {
    await cleanDatabase();
    user = await createTestUser({ email: "taskuser@example.com" });
    org = await createTestOrg(user.id);
    project = await createTestProject(org.id);
  });

  afterAll(async () => {
    await cleanDatabase();
    await disconnectDatabase();
  });

  // ── Create Task ──────────────────────────────────────────────────

  describe("POST /orgs/:orgId/projects/:projectId/tasks", () => {
    it("should create a task and return 201", async () => {
      const res = await request(app)
        .post(tasksUrl())
        .set("Authorization", `Bearer ${user.accessToken}`)
        .send({ title: "My First Task" });

      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty("id");
      expect(res.body.data.title).toBe("My First Task");
      expect(res.body.data.status).toBe("todo");
      expect(res.body.data.priority).toBe("medium");
    });

    it("should create a task with all optional fields", async () => {
      const dueDate = new Date().toISOString();
      const res = await request(app)
        .post(tasksUrl())
        .set("Authorization", `Bearer ${user.accessToken}`)
        .send({
          title: "Full Task",
          description: "A detailed description",
          status: "in_progress",
          priority: "high",
          dueDate,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe("in_progress");
      expect(res.body.data.priority).toBe("high");
      expect(res.body.data.description).toBe("A detailed description");
    });

    it("should return 400 for missing title", async () => {
      const res = await request(app)
        .post(tasksUrl())
        .set("Authorization", `Bearer ${user.accessToken}`)
        .send({});

      expect(res.status).toBe(400);
    });

    it("should return 400 for invalid status enum", async () => {
      const res = await request(app)
        .post(tasksUrl())
        .set("Authorization", `Bearer ${user.accessToken}`)
        .send({ title: "Bad Task", status: "invalid_status" });

      expect(res.status).toBe(400);
    });
  });

  // ── Get Tasks ────────────────────────────────────────────────────

  describe("GET /orgs/:orgId/projects/:projectId/tasks", () => {
    it("should return paginated list of tasks", async () => {
      // Create 3 tasks
      for (const title of ["Task A", "Task B", "Task C"]) {
        await request(app)
          .post(tasksUrl())
          .set("Authorization", `Bearer ${user.accessToken}`)
          .send({ title });
      }

      const res = await request(app)
        .get(tasksUrl())
        .set("Authorization", `Bearer ${user.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(3);
    });
  });

  // ── Get Task by ID ──────────────────────────────────────────────

  describe("GET /orgs/:orgId/projects/:projectId/tasks/:taskId", () => {
    it("should return the task with assignments", async () => {
      const createRes = await request(app)
        .post(tasksUrl())
        .set("Authorization", `Bearer ${user.accessToken}`)
        .send({ title: "Get Me" });

      const taskId = createRes.body.data.id;

      const res = await request(app)
        .get(taskUrl(taskId))
        .set("Authorization", `Bearer ${user.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(taskId);
      expect(res.body.data).toHaveProperty("assignments");
    });

    it("should return 404 for non-existent task", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const res = await request(app)
        .get(taskUrl(fakeId))
        .set("Authorization", `Bearer ${user.accessToken}`);

      expect(res.status).toBe(404);
    });
  });

  // ── Update Task ─────────────────────────────────────────────────

  describe("PUT /orgs/:orgId/projects/:projectId/tasks/:taskId", () => {
    it("should update task fields", async () => {
      const createRes = await request(app)
        .post(tasksUrl())
        .set("Authorization", `Bearer ${user.accessToken}`)
        .send({ title: "Original" });

      const taskId = createRes.body.data.id;

      const res = await request(app)
        .put(taskUrl(taskId))
        .set("Authorization", `Bearer ${user.accessToken}`)
        .send({ title: "Updated", status: "done" });

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe("Updated");
      expect(res.body.data.status).toBe("done");
    });
  });

  // ── Delete Task ─────────────────────────────────────────────────

  describe("DELETE /orgs/:orgId/projects/:projectId/tasks/:taskId", () => {
    it("should soft-delete and return 204", async () => {
      const createRes = await request(app)
        .post(tasksUrl())
        .set("Authorization", `Bearer ${user.accessToken}`)
        .send({ title: "Delete Me" });

      const taskId = createRes.body.data.id;

      const deleteRes = await request(app)
        .delete(taskUrl(taskId))
        .set("Authorization", `Bearer ${user.accessToken}`);

      expect(deleteRes.status).toBe(204);

      // Should not be findable anymore
      const getRes = await request(app)
        .get(taskUrl(taskId))
        .set("Authorization", `Bearer ${user.accessToken}`);

      expect(getRes.status).toBe(404);
    });
  });

  // ── Assign User ─────────────────────────────────────────────────

  describe("POST /orgs/:orgId/projects/:projectId/tasks/:taskId/assign", () => {
    it("should assign a user and return jobId", async () => {
      const createRes = await request(app)
        .post(tasksUrl())
        .set("Authorization", `Bearer ${user.accessToken}`)
        .send({ title: "Assign Task" });

      const taskId = createRes.body.data.id;

      const res = await request(app)
        .post(`${taskUrl(taskId)}/assign`)
        .set("Authorization", `Bearer ${user.accessToken}`)
        .send({ userId: user.id });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty("assignments");
      expect(res.body).toHaveProperty("jobId");
    });
  });

  // ── Bulk Update Status ──────────────────────────────────────────

  describe("PATCH /orgs/:orgId/projects/:projectId/tasks/bulk-status", () => {
    it("should update status of multiple tasks", async () => {
      const ids: string[] = [];
      for (const title of ["Bulk 1", "Bulk 2"]) {
        const res = await request(app)
          .post(tasksUrl())
          .set("Authorization", `Bearer ${user.accessToken}`)
          .send({ title });
        ids.push(res.body.data.id);
      }

      const res = await request(app)
        .patch(`${tasksUrl()}/bulk-status`)
        .set("Authorization", `Bearer ${user.accessToken}`)
        .send({ taskIds: ids, status: "done" });

      expect(res.status).toBe(200);

      // Verify both tasks are now done
      for (const id of ids) {
        const getRes = await request(app)
          .get(taskUrl(id))
          .set("Authorization", `Bearer ${user.accessToken}`);
        expect(getRes.body.data.status).toBe("done");
      }
    });
  });

  // ── Cross-Tenant Isolation (MUST return 403) ────────────────────

  describe("Cross-Tenant Isolation", () => {
    let otherUser: TestUser;
    let otherOrg: TestOrg;
    let otherProject: { id: string; name: string; orgId: string };

    beforeEach(async () => {
      // Create a second user with their own org
      otherUser = await createTestUser({ email: "other@example.com" });
      otherOrg = await createTestOrg(otherUser.id);
      otherProject = await createTestProject(otherOrg.id);
    });

    it("should return 403 when accessing another org's tasks", async () => {
      // User from org A tries to access org B's project tasks
      const res = await request(app)
        .get(`/orgs/${otherOrg.id}/projects/${otherProject.id}/tasks`)
        .set("Authorization", `Bearer ${user.accessToken}`);

      expect(res.status).toBe(403);
    });

    it("should return 403 when creating a task in another org's project", async () => {
      const res = await request(app)
        .post(`/orgs/${otherOrg.id}/projects/${otherProject.id}/tasks`)
        .set("Authorization", `Bearer ${user.accessToken}`)
        .send({ title: "Sneaky Task" });

      expect(res.status).toBe(403);
    });

    it("should return 403 when accessing another org's projects", async () => {
      const res = await request(app)
        .get(`/orgs/${otherOrg.id}/projects`)
        .set("Authorization", `Bearer ${user.accessToken}`);

      expect(res.status).toBe(403);
    });

    it("should return 403 when trying to assign a user in another org's task", async () => {
      // Create a task in the other org
      const taskRes = await request(app)
        .post(`/orgs/${otherOrg.id}/projects/${otherProject.id}/tasks`)
        .set("Authorization", `Bearer ${otherUser.accessToken}`)
        .send({ title: "Other Task" });

      const taskId = taskRes.body.data.id;

      // First user tries to assign someone
      const res = await request(app)
        .post(`/orgs/${otherOrg.id}/projects/${otherProject.id}/tasks/${taskId}/assign`)
        .set("Authorization", `Bearer ${user.accessToken}`)
        .send({ userId: user.id });

      expect(res.status).toBe(403);
    });
  });
});
