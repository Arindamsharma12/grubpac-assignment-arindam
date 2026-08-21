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
}
