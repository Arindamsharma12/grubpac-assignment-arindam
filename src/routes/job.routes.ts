import { Router } from "express";
import { getJobStatus } from "@/controllers/job.controller";
import { authenticate } from "@/middlewares/authenticate";

const router = Router();

router.use(authenticate);

router.get("/:id", getJobStatus);

export default router;
