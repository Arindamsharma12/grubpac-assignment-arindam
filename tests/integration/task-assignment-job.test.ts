import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import request from "supertest";
import app from "../../src/app";
import { cleanDatabase, disconnectDatabase } from "../helpers/db";
import { createTestUser, createTestOrg, createTestProject } from "../helpers/auth";
import type { TestUser, TestOrg } from "../helpers/auth";
import { emailQueue } from "../../src/lib/queue";

describe("Task Assignment Queue Job (Bonus)", () => {
  let user: TestUser;
  let org: TestOrg;
  let project: { id: string; name: string; orgId: string };

  beforeEach(async () => {
    await cleanDatabase();
    user = await createTestUser({ email: "jobuser@example.com" });
    org = await createTestOrg(user.id);
    project = await createTestProject(org.id);
  });

  afterAll(async () => {
    await cleanDatabase();
    await disconnectDatabase();
    await emailQueue.close();
  });

  it("should create a queue job when assigning a user to a task", async () => {
    // Spy on emailQueue.add
    const addSpy = vi.spyOn(emailQueue, "add");

    // Create a task
    const taskRes = await request(app)
      .post(`/orgs/${org.id}/projects/${project.id}/tasks`)
      .set("Authorization", `Bearer ${user.accessToken}`)
      .send({ title: "Queue Test Task" });

    const taskId = taskRes.body.data.id;

    // Assign the user
    const assignRes = await request(app)
      .post(`/orgs/${org.id}/projects/${project.id}/tasks/${taskId}/assign`)
      .set("Authorization", `Bearer ${user.accessToken}`)
      .send({ userId: user.id });

    expect(assignRes.status).toBe(200);
    expect(assignRes.body).toHaveProperty("jobId");

    // Verify emailQueue.add was called
    expect(addSpy).toHaveBeenCalled();
    expect(addSpy).toHaveBeenCalledWith(
      "send-assignment-email",
      expect.objectContaining({
        taskId,
        userId: user.id,
        email: user.email,
      }),
      expect.any(Object),
    );

    addSpy.mockRestore();
  });
});
