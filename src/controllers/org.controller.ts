import type { Request, Response, NextFunction } from "express";
import { OrgService } from "@/services/org.service";

export const getMyOrganizations = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new Error("User ID is missing from request");
    }

    const organizations = await OrgService.getUserOrganizations(userId);
    res.json({ data: organizations });
  } catch (error) {
    next(error);
  }
};
