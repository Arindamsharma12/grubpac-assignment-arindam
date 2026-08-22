import { prisma } from "@/lib/config/prisma";

export class OrgService {
  static async getUserOrganizations(userId: string) {
    const memberships = await prisma.orgMember.findMany({
      where: { userId },
      include: {
        organization: {
          include: {
            members: {
              include: {
                user: {
                  select: { id: true, name: true, email: true },
                },
              },
            },
          },
        },
      },
    });

    return memberships.map((membership) => ({
      id: membership.organization.id,
      name: membership.organization.name,
      role: membership.role,
      joinedAt: membership.createdAt,
      members: membership.organization.members.map((m) => ({
        id: m.userId,
        name: m.user.name,
        email: m.user.email,
        role: m.role,
        joinedAt: m.createdAt,
      })),
    }));
  }

  static async getOrganizationById(orgId: string) {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    if (!org) {
      throw new Error("Organization not found");
    }

    return {
      id: org.id,
      name: org.name,
      createdAt: org.createdAt,
      members: org.members.map((m) => ({
        id: m.userId,
        name: m.user.name,
        email: m.user.email,
        role: m.role,
        joinedAt: m.createdAt,
      })),
    };
  }

  static async addMemberToOrganization(
    orgId: string,
    userId: string,
    role: "org_admin" | "member" = "member",
  ) {
    // Check if user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error("User not found");
    }

    // Upsert or Create member
    return prisma.orgMember.upsert({
      where: {
        orgId_userId: { orgId, userId },
      },
      update: { role },
      create: { orgId, userId, role },
    });
  }

  static async removeMemberFromOrganization(orgId: string, userId: string) {
    return prisma.orgMember.delete({
      where: {
        orgId_userId: { orgId, userId },
      },
    });
  }
}
