import { Router } from "express";
import { authenticate } from "@/middlewares/authenticate";
import { getMyOrganizations } from "@/controllers/org.controller";

const router = Router();

router.use(authenticate);

router.get("/", getMyOrganizations);

export default router;
