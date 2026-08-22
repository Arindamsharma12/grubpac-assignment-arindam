import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { cleanDatabase, disconnectDatabase, prisma } from "../helpers/db";
import { createTestUser, createTestOrg, createTestProject } from "../helpers/auth";
import { ProjectService } from "../../src/services/project.service";

describe("Pagination", () => {
  let orgId: string;

  beforeAll(async () => {
    await cleanDatabase();
    const user = await createTestUser();
    const org = await createTestOrg(user.id);
    orgId = org.id;

    // Create 5 projects for testing pagination
    for (let i = 0; i < 5; i++) {
      await createTestProject(orgId, `Project ${String(i + 1).padStart(2, "0")}`);
    }
  });

  afterAll(async () => {
    await cleanDatabase();
    await disconnectDatabase();
  });

  describe("Cursor Pagination", () => {
    it("should return next_cursor when more items exist", async () => {
      const result = await ProjectService.getProjects(orgId, { limit: 2 });

      expect(result).toHaveProperty("data");
      expect(result).toHaveProperty("next_cursor");
      expect(result.data).toHaveLength(2);
      expect((result as any).next_cursor).not.toBeNull();
    });

    it("should return null cursor when on last page", async () => {
      const result = await ProjectService.getProjects(orgId, { limit: 10 });

      expect(result.data.length).toBeLessThanOrEqual(10);
      expect((result as any).next_cursor).toBeNull();
    });

    it("should return next page using cursor", async () => {
      const firstPage = await ProjectService.getProjects(orgId, { limit: 2 });
      const cursor = (firstPage as any).next_cursor as string;

      expect(cursor).toBeDefined();

      const secondPage = await ProjectService.getProjects(orgId, {
        limit: 2,
        cursor,
      });

      // Second page should have different items
      const firstIds = firstPage.data.map((p) => p.id);
      const secondIds = secondPage.data.map((p) => p.id);

      // No overlap between pages
      for (const id of secondIds) {
        expect(firstIds).not.toContain(id);
      }
    });
  });

  describe("Offset Pagination", () => {
    it("should return correct total, page, and limit", async () => {
      const result = await ProjectService.getProjects(orgId, {
        limit: 2,
        page: 1,
      });

      expect(result).toHaveProperty("total");
      expect(result).toHaveProperty("page");
      expect(result).toHaveProperty("limit");
      expect((result as any).total).toBe(5);
      expect((result as any).page).toBe(1);
      expect((result as any).limit).toBe(2);
      expect(result.data).toHaveLength(2);
    });

    it("should return correct items for page 2", async () => {
      const page1 = await ProjectService.getProjects(orgId, { limit: 2, page: 1 });
      const page2 = await ProjectService.getProjects(orgId, { limit: 2, page: 2 });

      // Different items on different pages
      const ids1 = page1.data.map((p) => p.id);
      const ids2 = page2.data.map((p) => p.id);

      for (const id of ids2) {
        expect(ids1).not.toContain(id);
      }
    });

    it("should return empty data for page beyond total", async () => {
      const result = await ProjectService.getProjects(orgId, {
        limit: 2,
        page: 100,
      });

      expect(result.data).toHaveLength(0);
      expect((result as any).total).toBe(5);
    });
  });
});
