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

export const addMember = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const orgId = req.params.orgId as string;
    const { userId, role } = req.body;
    
    if (!orgId || !userId) {
      throw new Error("orgId and userId are required");
    }

    const member = await OrgService.addMemberToOrganization(orgId, userId, role);
    res.status(201).json({ data: member });
  } catch (error) {
    next(error);
  }
};
