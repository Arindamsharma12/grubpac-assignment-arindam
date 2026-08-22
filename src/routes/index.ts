import { Router } from "express";
import authRoutes from "@/routes/auth.routes";
import projectRoutes from "@/routes/project.routes";
import taskRoutes from "@/routes/task.routes";
import orgRoutes from "@/routes/org.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/orgs", orgRoutes);

import { addMember } from "@/controllers/org.controller";
import { authenticate } from "@/middlewares/authenticate";
import { authorize } from "@/middlewares/authorize";

const orgRouter = Router({ mergeParams: true });
orgRouter.use(authenticate);
orgRouter.post("/members", authorize("org_admin"), addMember);
orgRouter.use("/projects", projectRoutes);
orgRouter.use("/projects/:projectId/tasks", taskRoutes);

router.use("/orgs/:orgId", orgRouter);

export default router;
