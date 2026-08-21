import type { Request, Response, NextFunction } from "express";
import type { OrgRole } from "../../generated/prisma/client.js";
import { orgMemberRepository } from "../repositories/orgMember.repository";
import { ForbiddenError, UnauthorizedError } from "../errors/AppError";

/**
 * Role-based authorization middleware factory.
 *
 * Usage:
 *   router.get("/orgs/:orgId/projects", authenticate, authorize("org_admin", "member"), handler);
 *
 * How it works:
 * 1. Reads `orgId` from route params (`:orgId`)
 * 2. Looks up the authenticated user's membership in that org
 * 3. Checks the role is in the allowed set
 * 4. Attaches `req.orgMember = { orgId, role }` for downstream use
 *
 * Security: The org context is ALWAYS derived from the user's verified
 * JWT + database membership lookup — never from client-supplied body fields.
 */
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

      const membership = await orgMemberRepository.findByOrgAndUser(
        orgId,
        req.user.userId,
      );

      if (!membership) {
        // User is not a member of this org → cross-tenant prevention
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
