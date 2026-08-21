import { prisma } from "../config/prisma";
import type { OrgRole } from "../../generated/prisma/client.js";

export const orgMemberRepository = {
  create(data: { orgId: string; userId: string; role: OrgRole }) {
    return prisma.orgMember.create({ data });
  },

  findByUserId(userId: string) {
    return prisma.orgMember.findMany({
      where: { userId },
      include: { organization: true },
    });
  },

  findByOrgAndUser(orgId: string, userId: string) {
    return prisma.orgMember.findUnique({
      where: { orgId_userId: { orgId, userId } },
    });
  },
};
