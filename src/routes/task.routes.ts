import { Router } from "express";
import { authenticate } from "@/middlewares/authenticate";
import { authorize } from "@/middlewares/authorize";
import {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
  assignUser,
  unassignUser,
  bulkUpdateStatus,
  getDashboard,
} from "@/controllers/task.controller";
import { validate } from "@/middlewares/validate";
import { z } from "zod";
import { TaskStatus, TaskPriority } from "@/../generated/prisma/client.js";

const router = Router({ mergeParams: true });

const createTaskSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  dueDate: z.string().datetime().optional(),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  dueDate: z.string().datetime().optional(),
});

const bulkUpdateSchema = z.object({
  taskIds: z.array(z.string().uuid()),
  status: z.nativeEnum(TaskStatus),
});

const assignUserSchema = z.object({
  userId: z.string().uuid(),
});

// Since tasks are tied to a project, we can mount this router on /orgs/:orgId/projects/:projectId/tasks
// But bulk update and dashboard might not need projectId in params, or they do?
// Let's assume this router is mounted on /orgs/:orgId/projects/:projectId/tasks
// Wait, for bulk operations or search, it could be across the org. Let's see.

router.use(authenticate, authorize());

router.post("/", validate(createTaskSchema), createTask);
router.get("/", getTasks);
router.get("/dashboard", getDashboard); // Should be before /:taskId to avoid conflict
router.patch("/bulk-status", validate(bulkUpdateSchema), bulkUpdateStatus); // Should be before /:taskId
router.get("/:taskId", getTaskById);
router.put("/:taskId", validate(updateTaskSchema), updateTask);
router.delete("/:taskId", deleteTask);

router.post("/:taskId/assign", validate(assignUserSchema), assignUser);
router.delete("/:taskId/assign/:userId", unassignUser);

export default router;
