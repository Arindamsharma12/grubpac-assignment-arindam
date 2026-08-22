import { Router } from "express";
import { authenticate } from "@/middlewares/authenticate";
import { getMyOrganizations, getOrganizationById } from "@/controllers/org.controller";

const router = Router();

router.use(authenticate);

router.get("/", getMyOrganizations);
router.get("/:orgId", getOrganizationById);

export default router;
