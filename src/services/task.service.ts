import { prisma } from "@/lib/config/prisma";
import { NotFoundError, BadRequestError } from "@/lib/errors/AppError";
import type {
  Prisma,
  TaskStatus,
  TaskPriority,
} from "@/../generated/prisma/client.js";
import { ProjectService } from "./project.service";

interface TaskFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string;
  dueDateStart?: string;
  dueDateEnd?: string;
  search?: string;
}

export class TaskService {
  static async createTask(
    orgId: string,
    projectId: string,
    data: {
      title: string;
      description?: string;
      status?: TaskStatus;
      priority?: TaskPriority;
      dueDate?: string;
    },
  ) {
    // Verify project belongs to org
    await ProjectService.getProjectById(orgId, projectId);

    return prisma.task.create({
      data: {
        projectId,
        title: data.title,
        ...(data.description !== undefined && {
          description: data.description,
        }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.priority !== undefined && { priority: data.priority }),
        ...(data.dueDate !== undefined && {
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
        }),
      },
    });
  }

  static async getTasks(
    orgId: string,
    projectId: string,
    filters: TaskFilters,
    options: { limit: number; cursor?: string; page?: number },
  ) {
    // Verify project belongs to org
    await ProjectService.getProjectById(orgId, projectId);

    const where: Prisma.TaskWhereInput = {
      projectId,
      deletedAt: null,
    };

    if (filters.status) where.status = filters.status;
    if (filters.priority) where.priority = filters.priority;
    if (filters.assigneeId) {
      where.assignments = {
        some: { userId: filters.assigneeId },
      };
    }
    if (filters.dueDateStart || filters.dueDateEnd) {
      where.dueDate = {};
      if (filters.dueDateStart)
        where.dueDate.gte = new Date(filters.dueDateStart);
      if (filters.dueDateEnd) where.dueDate.lte = new Date(filters.dueDateEnd);
    }
    if (filters.search) {
      where.title = { search: filters.search };
    }

    const { limit, cursor, page } = options;

    if (page !== undefined) {
      const skip = (page - 1) * limit;
      const [data, total] = await Promise.all([
        prisma.task.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            assignments: {
              include: {
                user: { select: { id: true, name: true, email: true } },
              },
            },
          },
        }),
        prisma.task.count({ where }),
      ]);
      return { data, total, page, limit };
    } else {
      const findArgs: any = {
        where,
        take: limit + 1,
        orderBy: { id: "asc" },
        include: {
          assignments: {
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          },
        },
      };
      if (cursor) {
        findArgs.cursor = { id: cursor };
      }
      const data = await prisma.task.findMany(findArgs);

      let next_cursor: string | null = null;
      if (data.length > limit) {
        const nextItem = data.pop();
        next_cursor = nextItem?.id || null;
      }

      return { data, next_cursor };
    }
  }

  static async getTaskById(orgId: string, projectId: string, taskId: string) {
    await ProjectService.getProjectById(orgId, projectId);

    const task = await prisma.task.findFirst({
      where: { id: taskId, projectId, deletedAt: null },
      include: {
        assignments: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    });
    if (!task) {
      throw new NotFoundError("Task not found", "TASK_NOT_FOUND");
    }
    return task;
  }

  static async updateTask(
    orgId: string,
    projectId: string,
    taskId: string,
    data: {
      title?: string;
      description?: string;
      status?: TaskStatus;
      priority?: TaskPriority;
      dueDate?: string;
    },
  ) {
    const task = await this.getTaskById(orgId, projectId, taskId);
    return prisma.task.update({
      where: { id: task.id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && {
          description: data.description,
        }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.priority !== undefined && { priority: data.priority }),
        ...(data.dueDate !== undefined && {
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
        }),
      },
    });
  }

  static async deleteTask(orgId: string, projectId: string, taskId: string) {
    const task = await this.getTaskById(orgId, projectId, taskId);
    return prisma.task.update({
      where: { id: task.id },
      data: { deletedAt: new Date() },
    });
  }

  static async assignUser(
    orgId: string,
    projectId: string,
    taskId: string,
    userId: string,
  ) {
    const task = await this.getTaskById(orgId, projectId, taskId);

    // The assigned user must belong to the same organization as the task.
    const member = await prisma.orgMember.findUnique({
      where: { orgId_userId: { orgId, userId } },
    });
    if (!member) {
      throw new BadRequestError(
        "User is not a member of this organization",
        "USER_NOT_IN_ORG",
      );
    }

    try {
      await prisma.taskAssignment.create({
        data: {
          taskId: task.id,
          userId,
        },
      });
    } catch (error) {
      // Ignore if already assigned
    }
    return this.getTaskById(orgId, projectId, taskId);
  }

  static async unassignUser(
    orgId: string,
    projectId: string,
    taskId: string,
    userId: string,
  ) {
    const task = await this.getTaskById(orgId, projectId, taskId);
    await prisma.taskAssignment.deleteMany({
      where: { taskId: task.id, userId },
    });
    return this.getTaskById(orgId, projectId, taskId);
  }

  static async bulkUpdateStatus(
    orgId: string,
    projectId: string,
    taskIds: string[],
    status: TaskStatus,
  ) {
    await ProjectService.getProjectById(orgId, projectId);

    await prisma.task.updateMany({
      where: {
        id: { in: taskIds },
        projectId,
        deletedAt: null,
      },
      data: { status },
    });
  }

  static async getDashboard(orgId: string, projectId: string) {
    await ProjectService.getProjectById(orgId, projectId);

    const counts = await prisma.task.groupBy({
      by: ["status"],
      where: { projectId, deletedAt: null },
      _count: { _all: true },
    });

    return counts.reduce(
      (acc, curr) => {
        acc[curr.status] = curr._count._all;
        return acc;
      },
      {} as Record<string, number>,
    );
  }
}
