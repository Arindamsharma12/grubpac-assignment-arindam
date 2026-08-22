import { prisma } from "./db";
import { hashPassword } from "../../src/lib/utils/password.util";
import { generateAccessToken } from "../../src/lib/utils/jwt.util";
import type { OrgRole } from "../../generated/prisma/client.js";

const DEFAULT_PASSWORD = "password123";

export interface TestUser {
  id: string;
  name: string;
  email: string;
  password: string;
  accessToken: string;
}

export interface TestOrg {
  id: string;
  name: string;
}

/**
 * Create a test user with a hashed password and a valid access token.
 */
export async function createTestUser(overrides: {
  name?: string;
  email?: string;
  password?: string;
} = {}): Promise<TestUser> {
  const password = overrides.password ?? DEFAULT_PASSWORD;
  const email = overrides.email ?? `test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const name = overrides.name ?? "Test User";

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: { name, email, passwordHash },
  });

  const accessToken = generateAccessToken({ userId: user.id, email: user.email });

  return { id: user.id, name: user.name, email: user.email, password, accessToken };
}

/**
 * Create a test organization and add the user as a member.
 */
export async function createTestOrg(
  userId: string,
  role: OrgRole = "org_admin",
  orgName?: string,
): Promise<TestOrg> {
  const org = await prisma.organization.create({
    data: { name: orgName ?? `Test Org ${Date.now()}` },
  });

  await prisma.orgMember.create({
    data: { orgId: org.id, userId, role },
  });

  return { id: org.id, name: org.name };
}

/**
 * Create a test project in an organization.
 */
export async function createTestProject(
  orgId: string,
  name?: string,
): Promise<{ id: string; name: string; orgId: string }> {
  const project = await prisma.project.create({
    data: {
      orgId,
      name: name ?? `Test Project ${Date.now()}`,
    },
  });

  return { id: project.id, name: project.name, orgId: project.orgId };
}
