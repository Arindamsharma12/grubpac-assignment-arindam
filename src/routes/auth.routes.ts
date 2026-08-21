import { Router } from "express";
import { authController } from "@/controllers/auth.controller";
import { validate } from "@/middlewares/validate";
import { authenticate } from "@/middlewares/authenticate";
import { rateLimiter } from "@/middlewares/rateLimiter";
import {
  registerSchema,
  loginSchema,
  refreshSchema,
} from "../lib/validators/auth.validator";

const router = Router();

// All auth routes are rate-limited: 10 req/min/IP
router.post(
  "/register",
  rateLimiter,
  validate(registerSchema),
  authController.register,
);

router.post("/login", rateLimiter, validate(loginSchema), authController.login);

router.post(
  "/refresh",
  rateLimiter,
  validate(refreshSchema),
  authController.refresh,
);

router.post("/logout", rateLimiter, authenticate, authController.logout);

router.post("/logout-all", rateLimiter, authenticate, authController.logoutAll);

export default router;
