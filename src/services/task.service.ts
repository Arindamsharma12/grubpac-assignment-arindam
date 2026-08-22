import { prisma } from "@/lib/config/prisma";
import { NotFoundError, BadRequestError } from "@/lib/errors/AppError";
import type {
  Prisma,
  TaskStatus,
  TaskPriority,
  Task,
} from "@/../generated/prisma/client.js";
import { ProjectService } from "./project.service";
import { emailQueue, redisConnection } from "@/lib/queue";

type TaskWithAssignments = Prisma.TaskGetPayload<{
  include: { assignments: { include: { user: { select: { id: true; name: true; email: true } } } } };
}>;

interface OffsetPaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

interface CursorPaginatedResult<T> {
  data: T[];
  next_cursor: string | null;
}

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
  ): Promise<Task> {
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
  ): Promise<OffsetPaginatedResult<TaskWithAssignments> | CursorPaginatedResult<TaskWithAssignments>> {
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
      const findArgs: Prisma.TaskFindManyArgs = {
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
      const data = (await prisma.task.findMany(findArgs)) as TaskWithAssignments[];

      let next_cursor: string | null = null;
      if (data.length > limit) {
        const nextItem = data.pop();
        next_cursor = nextItem?.id || null;
      }

      return { data, next_cursor };
    }
  }

  static async getTaskById(orgId: string, projectId: string, taskId: string): Promise<TaskWithAssignments> {
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
  ): Promise<Task> {
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

  static async deleteTask(orgId: string, projectId: string, taskId: string): Promise<Task> {
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
  ): Promise<{ task: TaskWithAssignments; jobId: string | undefined }> {
    const task = await this.getTaskById(orgId, projectId, taskId);

    const member = await prisma.orgMember.findUnique({
      where: { orgId_userId: { orgId, userId } },
      include: { user: true },
    });
    if (!member) {
      throw new BadRequestError(
        "User is not a member of this organization",
        "USER_NOT_IN_ORG",
      );
    }

    // Bonus: Deduplicate assignments within 5 seconds
    const dedupKey = `dedup:assign:${taskId}:${userId}`;
    const setNxResult = await redisConnection.set(dedupKey, "1", "EX", 5, "NX");
    if (!setNxResult) {
      throw new BadRequestError(
        "Duplicate assignment request",
        "DUPLICATE_ASSIGNMENT",
      );
    }

    /*
     * Consistency Strategy:
     * We use an interactive Prisma transaction.
     * We first persist the assignment to the database. If it succeeds, we enqueue the
     * email job to Redis via BullMQ. If enqueueing fails, the transaction rolls back,
     * ensuring we don't have an assignment without a corresponding notification.
     * Note: If Redis enqueue succeeds but the DB commit subsequently fails, we could
     * end up with a ghost job. For strict distributed consistency, an Outbox Pattern
     * is required, but this transaction block covers the primary failure case (job enqueue failure).
     */
    let jobId: string | undefined;

    await prisma.$transaction(async (tx) => {
      try {
        await tx.taskAssignment.create({
          data: {
            taskId: task.id,
            userId,
          },
        });
      } catch (error: any) {
        // If unique constraint violation, ignore (already assigned)
        if (error.code === "P2002") {
          return;
        }
        throw error;
      }

      const job = await emailQueue.add(
        "send-assignment-email",
        {
          taskId: task.id,
          userId,
          email: member.user.email,
          title: task.title,
        },
        {
          jobId: `assign-${taskId}-${userId}-${Date.now()}`,
        },
      );
      jobId = job.id;
    });

    const updatedTask = await this.getTaskById(orgId, projectId, taskId);
    return { task: updatedTask, jobId };
  }

  static async unassignUser(
    orgId: string,
    projectId: string,
    taskId: string,
    userId: string,
  ): Promise<TaskWithAssignments> {
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
  ): Promise<void> {
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

  static async getDashboard(orgId: string, projectId: string): Promise<Record<string, number>> {
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
