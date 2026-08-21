import type { Request, Response, NextFunction } from "express";
import { authService } from "@/services/auth.service";
import { redis } from "@/lib/config/redis";

const getCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
});

const setAuthCookies = (
  res: Response,
  accessToken: string,
  refreshToken: string,
) => {
  const options = getCookieOptions();
  res.cookie("accessToken", accessToken, {
    ...options,
    maxAge: 15 * 60 * 1000, // 15 mins
  });
  res.cookie("refreshToken", refreshToken, {
    ...options,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

const clearAuthCookies = (res: Response) => {
  const options = getCookieOptions();
  res.clearCookie("accessToken", options);
  res.clearCookie("refreshToken", options);
};

export const authController = {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.register(req.body);

      setAuthCookies(res, result.accessToken, result.refreshToken);

      res.status(201).json({
        status: "success",
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.login(req.body);

      setAuthCookies(res, result.accessToken, result.refreshToken);

      res.status(200).json({
        status: "success",
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;
      if (!refreshToken) {
        return res
          .status(401)
          .json({ status: "error", message: "No refresh token provided" });
      }

      const result = await authService.refresh(refreshToken);

      setAuthCookies(res, result.accessToken, result.refreshToken);

      res.status(200).json({
        status: "success",
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;
      let accessToken = req.cookies?.accessToken;
      if (!accessToken) {
        const authHeader = req.headers.authorization;
        if (authHeader?.startsWith("Bearer ")) {
          accessToken = authHeader.slice(7);
        }
      }

      if (refreshToken) {
        await authService.logout(refreshToken);
      }

      if (accessToken) {
        // Blacklist the access token for 15 minutes (its max lifespan)
        await redis.setex(`bl_${accessToken}`, 15 * 60, "true");
      }

      clearAuthCookies(res);

      res.status(200).json({
        status: "success",
        message: "Logged out successfully",
      });
    } catch (err) {
      next(err);
    }
  },

  async logoutAll(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      await authService.logoutAll(userId);

      let accessToken = req.cookies?.accessToken;
      if (!accessToken) {
        const authHeader = req.headers.authorization;
        if (authHeader?.startsWith("Bearer ")) {
          accessToken = authHeader.slice(7);
        }
      }

      if (accessToken) {
        await redis.setex(`bl_${accessToken}`, 15 * 60, "true");
      }

      clearAuthCookies(res);

      res.status(200).json({
        status: "success",
        message: "All sessions revoked",
      });
    } catch (err) {
      next(err);
    }
  },
};
