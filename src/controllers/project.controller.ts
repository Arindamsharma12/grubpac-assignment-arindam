import type { Request, Response, NextFunction } from "express";
import { ProjectService } from "@/services/project.service";
import { TaskService } from "@/services/task.service";

export const createProject = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const orgId = req.params.orgId as string;
    const project = await ProjectService.createProject(orgId, req.body);
    res.status(201).json({ data: project });
  } catch (error) {
    next(error);
  }
};

export const getProjects = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const orgId = req.params.orgId as string;
    const limit = parseInt(req.query.limit as string) || 20;
    const page = req.query.page
      ? parseInt(req.query.page as string)
      : undefined;
    const cursor = req.query.cursor as string | undefined;

    const result = await ProjectService.getProjects(orgId, {
      limit,
      ...(page !== undefined && { page }),
      ...(cursor !== undefined && { cursor }),
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getProjectById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const orgId = req.params.orgId as string;
    const projectId = req.params.projectId as string;
    const project = await ProjectService.getProjectById(orgId, projectId);
    res.json({ data: project });
  } catch (error) {
    next(error);
  }
};

export const updateProject = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const orgId = req.params.orgId as string;
    const projectId = req.params.projectId as string;
    const project = await ProjectService.updateProject(
      orgId,
      projectId,
      req.body,
    );
    res.json({ data: project });
  } catch (error) {
    next(error);
  }
};

export const deleteProject = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const orgId = req.params.orgId as string;
    const projectId = req.params.projectId as string;
    await ProjectService.deleteProject(orgId, projectId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const getProjectDashboard = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const orgId = req.params.orgId as string;
    const projectId = req.params.projectId as string;
    const dashboard = await TaskService.getDashboard(orgId, projectId);
    res.json({ data: dashboard });
  } catch (error) {
    next(error);
  }
};
