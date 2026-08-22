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
import {
  createTaskSchema,
  updateTaskSchema,
  bulkUpdateSchema,
  assignUserSchema,
} from "@/lib/validators/task.validator";

const router = Router({ mergeParams: true });

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
