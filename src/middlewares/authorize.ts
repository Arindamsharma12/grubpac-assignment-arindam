import type { Request, Response, NextFunction } from "express";
import type { OrgRole } from "@/../generated/prisma/client.js";
import { prisma } from "@/lib/config/prisma";
import { ForbiddenError, UnauthorizedError } from "@/lib/errors/AppError.js";

export function authorize(...allowedRoles: OrgRole[]) {
  return async (
    req: Request,
    _res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user) {
        next(new UnauthorizedError("Authentication required"));
        return;
      }

      const rawOrgId = req.params["orgId"];
      const orgId = Array.isArray(rawOrgId) ? rawOrgId[0] : rawOrgId;
      if (!orgId) {
        next(new ForbiddenError("Organization context required"));
        return;
      }

      const membership = await prisma.orgMember.findUnique({
        where: {
          orgId_userId: {
            orgId,
            userId: req.user.userId,
          },
        },
      });

      if (!membership) {
        // User is not a member of this org ? cross-tenant prevention
        // Return 403 with no resource details to avoid leaking info
        next(new ForbiddenError("Forbidden"));
        return;
      }

      if (allowedRoles.length > 0 && !allowedRoles.includes(membership.role)) {
        next(new ForbiddenError("Insufficient permissions"));
        return;
      }

      req.orgMember = { orgId: membership.orgId, role: membership.role };
      next();
    } catch (err) {
      next(err);
    }
  };
}
