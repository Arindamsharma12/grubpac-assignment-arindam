import { Router } from "express";
import { authenticate } from "@/middlewares/authenticate";
import { authorize } from "@/middlewares/authorize";
import {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
} from "@/controllers/project.controller";
import { validate } from "@/middlewares/validate";
import { z } from "zod";

const router = Router({ mergeParams: true });

const createProjectSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
});

const updateProjectSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
});

router.use(authenticate, authorize());

router.post("/", validate(createProjectSchema), createProject);
router.get("/", getProjects);
router.get("/:projectId", getProjectById);
router.put("/:projectId", validate(updateProjectSchema), updateProject);
router.delete("/:projectId", deleteProject);

export default router;
