import type { OrgRole } from "../../generated/prisma/client.js";

declare global {
  namespace Express {
    interface Request {
      /** Populated by the authenticate middleware after JWT verification */
      user?: {
        userId: string;
        email: string;
      };
      /** Populated by the authorize middleware after org membership lookup */
      orgMember?: {
        orgId: string;
        role: OrgRole;
      };
    }
  }
}
