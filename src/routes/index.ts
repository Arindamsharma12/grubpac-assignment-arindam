import { Router } from "express";
import authRoutes from "@/routes/auth.routes";
import projectRoutes from "@/routes/project.routes";
import taskRoutes from "@/routes/task.routes";
import orgRoutes from "@/routes/org.routes";
import jobRoutes from "@/routes/job.routes";
import { addMember, removeMember } from "@/controllers/org.controller";
import { authenticate } from "@/middlewares/authenticate";
import { authorize } from "@/middlewares/authorize";

const router = Router();

router.use("/auth", authRoutes);
router.use("/orgs", orgRoutes);

const orgRouter = Router({ mergeParams: true });
orgRouter.use(authenticate);
orgRouter.post("/members", authorize(["org_admin"], "Only org admin can manage members"), addMember);
orgRouter.delete("/members/:userId", authorize(["org_admin"], "Only org admin can manage members"), removeMember);
orgRouter.use("/projects", projectRoutes);
orgRouter.use("/projects/:projectId/tasks", taskRoutes);

router.use("/orgs/:orgId", orgRouter);
router.use("/jobs", jobRoutes);

export default router;
