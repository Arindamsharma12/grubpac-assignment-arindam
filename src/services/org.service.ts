import { prisma } from "@/lib/config/prisma";

export class OrgService {
  static async getUserOrganizations(userId: string) {
    const memberships = await prisma.orgMember.findMany({
      where: { userId },
      include: {
        organization: true,
      },
    });

    return memberships.map((membership) => ({
      id: membership.organization.id,
      name: membership.organization.name,
      role: membership.role,
      joinedAt: membership.createdAt,
    }));
  }

  static async addMemberToOrganization(orgId: string, userId: string, role: "org_admin" | "member" = "member") {
    // Check if user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error("User not found");
    }

    // Upsert or Create member
    return prisma.orgMember.upsert({
      where: {
        orgId_userId: { orgId, userId }
      },
      update: { role },
      create: { orgId, userId, role },
    });
  }
}
