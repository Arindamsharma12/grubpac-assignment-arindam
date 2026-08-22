import { z } from "zod";
import { TaskStatus, TaskPriority } from "@/../generated/prisma/client.js";

export const createTaskSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  dueDate: z.string().datetime().optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  dueDate: z.string().datetime().optional(),
});

export const bulkUpdateSchema = z.object({
  taskIds: z.array(z.string().uuid()),
  status: z.nativeEnum(TaskStatus),
});

export const assignUserSchema = z.object({
  userId: z.string().uuid(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type BulkUpdateInput = z.infer<typeof bulkUpdateSchema>;
export type AssignUserInput = z.infer<typeof assignUserSchema>;
