import type { Request, Response, NextFunction } from "express";
import { OrgService } from "@/services/org.service";

export const getMyOrganizations = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
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

export const getOrganizationById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const orgId = req.params.orgId as string;
    if (!orgId) {
      throw new Error("orgId is required");
    }

    const organization = await OrgService.getOrganizationById(orgId);
    res.json({ data: organization });
  } catch (error) {
    next(error);
  }
};

export const addMember = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const orgId = req.params.orgId as string;
    const { userId, role } = req.body;

    if (!orgId || !userId) {
      throw new Error("orgId and userId are required");
    }

    const member = await OrgService.addMemberToOrganization(
      orgId,
      userId,
      role,
    );
    res.status(201).json({ data: member });
  } catch (error) {
    next(error);
  }
};

export const removeMember = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const orgId = req.params.orgId as string;
    const userId = req.params.userId as string;

    if (!orgId || !userId) {
      throw new Error("orgId and userId are required");
    }

    await OrgService.removeMemberFromOrganization(orgId, userId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
