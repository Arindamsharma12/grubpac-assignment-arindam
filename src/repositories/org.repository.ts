import { prisma } from "../config/prisma";

export const orgRepository = {
  create(name: string) {
    return prisma.organization.create({ data: { name } });
  },

  findById(id: string) {
    return prisma.organization.findUnique({ where: { id } });
  },
};
