import type { Request, Response, NextFunction } from "express";
import { TaskService } from "@/services/task.service";
import type { TaskStatus, TaskPriority } from "@/../generated/prisma/client.js";

export const createTask = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const orgId = req.params.orgId as string;
    const projectId = req.params.projectId as string;
    const task = await TaskService.createTask(orgId, projectId, req.body);
    res.status(201).json({ data: task });
  } catch (error) {
    next(error);
  }
};

export const getTasks = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const orgId = req.params.orgId as string;
    const projectId = req.params.projectId as string;
    const limit = parseInt(req.query.limit as string) || 20;
    const page = req.query.page
      ? parseInt(req.query.page as string)
      : undefined;
    const cursor = req.query.cursor as string | undefined;

    const filters = {
      ...(req.query.status !== undefined && {
        status: req.query.status as TaskStatus,
      }),
      ...(req.query.priority !== undefined && {
        priority: req.query.priority as TaskPriority,
      }),
      ...(req.query.assigneeId !== undefined && {
        assigneeId: req.query.assigneeId as string,
      }),
      ...(req.query.dueDateStart !== undefined && {
        dueDateStart: req.query.dueDateStart as string,
      }),
      ...(req.query.dueDateEnd !== undefined && {
        dueDateEnd: req.query.dueDateEnd as string,
      }),
      ...(req.query.search !== undefined && {
        search: req.query.search as string,
      }),
    };

    const result = await TaskService.getTasks(orgId, projectId, filters, {
      limit,
      ...(page !== undefined && { page }),
      ...(cursor !== undefined && { cursor }),
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getTaskById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const orgId = req.params.orgId as string;
    const projectId = req.params.projectId as string;
    const taskId = req.params.taskId as string;
    const task = await TaskService.getTaskById(orgId, projectId, taskId);
    res.json({ data: task });
  } catch (error) {
    next(error);
  }
};

export const updateTask = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const orgId = req.params.orgId as string;
    const projectId = req.params.projectId as string;
    const taskId = req.params.taskId as string;
    const task = await TaskService.updateTask(
      orgId,
      projectId,
      taskId,
      req.body,
    );
    res.json({ data: task });
  } catch (error) {
    next(error);
  }
};

export const deleteTask = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const orgId = req.params.orgId as string;
    const projectId = req.params.projectId as string;
    const taskId = req.params.taskId as string;
    await TaskService.deleteTask(orgId, projectId, taskId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const assignUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const orgId = req.params.orgId as string;
    const projectId = req.params.projectId as string;
    const taskId = req.params.taskId as string;
    const { userId } = req.body;
    const result = await TaskService.assignUser(
      orgId,
      projectId,
      taskId,
      userId,
    );
    res.json({ data: result.task, jobId: result.jobId });
  } catch (error) {
    next(error);
  }
};

export const unassignUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const orgId = req.params.orgId as string;
    const projectId = req.params.projectId as string;
    const taskId = req.params.taskId as string;
    const userId = req.params.userId as string;
    const task = await TaskService.unassignUser(
      orgId,
      projectId,
      taskId,
      userId,
    );
    res.json({ data: task });
  } catch (error) {
    next(error);
  }
};

export const bulkUpdateStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const orgId = req.params.orgId as string;
    const projectId = req.params.projectId as string;
    const { taskIds, status } = req.body;
    await TaskService.bulkUpdateStatus(orgId, projectId, taskIds, status);
    res.json({ data: { success: true } });
  } catch (error) {
    next(error);
  }
};

export const getDashboard = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const orgId = req.params.orgId as string;
    const projectId = req.params.projectId as string;
    const dashboard = await TaskService.getDashboard(orgId, projectId);
    res.json({ data: dashboard });
  } catch (error) {
    next(error);
  }
};
