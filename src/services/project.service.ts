import { prisma } from "@/lib/config/prisma";
import { NotFoundError } from "@/lib/errors/AppError";
import type { Prisma, Project } from "@/../generated/prisma/client.js";

interface OffsetPaginatedResult<T> { data: T[]; total: number; page: number; limit: number; }
interface CursorPaginatedResult<T> { data: T[]; next_cursor: string | null; }

export class ProjectService {
  static async createProject(
    orgId: string,
    data: { name: string; description?: string },
  ): Promise<Project> {
    return prisma.project.create({
      data: {
        orgId,
        name: data.name,
        ...(data.description !== undefined && {
          description: data.description,
        }),
      },
    });
  }

  static async getProjects(
    orgId: string,
    options: {
      limit: number;
      cursor?: string;
      page?: number;
    },
  ): Promise<OffsetPaginatedResult<Project> | CursorPaginatedResult<Project>> {
    const { limit, cursor, page } = options;

    if (page !== undefined) {
      // Offset pagination
      const skip = (page - 1) * limit;
      const [data, total] = await Promise.all([
        prisma.project.findMany({
          where: { orgId, deletedAt: null },
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
        }),
        prisma.project.count({ where: { orgId, deletedAt: null } }),
      ]);
      return { data, total, page, limit };
    } else {
      // Cursor pagination
      const findArgs: Prisma.ProjectFindManyArgs = {
        where: { orgId, deletedAt: null },
        take: limit + 1,
        orderBy: { id: "asc" },
      };
      if (cursor) {
        findArgs.cursor = { id: cursor };
      }
      const data = await prisma.project.findMany(findArgs);

      let next_cursor: string | null = null;
      if (data.length > limit) {
        const nextItem = data.pop();
        next_cursor = nextItem?.id || null;
      }

      return { data, next_cursor };
    }
  }

  static async getProjectById(orgId: string, projectId: string): Promise<Project> {
    const project = await prisma.project.findFirst({
      where: { id: projectId, orgId, deletedAt: null },
    });
    if (!project) {
      throw new NotFoundError("Project not found", "PROJECT_NOT_FOUND");
    }
    return project;
  }

  static async updateProject(
    orgId: string,
    projectId: string,
    data: { name?: string; description?: string },
  ): Promise<Project> {
    const project = await this.getProjectById(orgId, projectId);
    return prisma.project.update({
      where: { id: project.id },
      data,
    });
  }

  static async deleteProject(orgId: string, projectId: string): Promise<Project> {
    const project = await this.getProjectById(orgId, projectId);
    // Soft delete
    return prisma.project.update({
      where: { id: project.id },
      data: { deletedAt: new Date() },
    });
  }

}
