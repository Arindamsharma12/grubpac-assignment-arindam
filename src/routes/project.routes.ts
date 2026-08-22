import { Router } from "express";
import { authenticate } from "@/middlewares/authenticate";
import { authorize } from "@/middlewares/authorize";
import {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  getProjectDashboard,
} from "@/controllers/project.controller";
import { validate } from "@/middlewares/validate";
import {
  createProjectSchema,
  updateProjectSchema,
} from "@/lib/validators/project.validator";

const router = Router({ mergeParams: true });

router.use(authenticate, authorize());

router.post("/", validate(createProjectSchema), createProject);
router.get("/", getProjects);
router.get("/:projectId/dashboard", getProjectDashboard);
router.get("/:projectId", getProjectById);
router.put("/:projectId", validate(updateProjectSchema), updateProject);
router.delete("/:projectId", authorize(["org_admin"], "Only org admin can delete the project"), deleteProject);

export default router;
