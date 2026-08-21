import { randomUUID } from "crypto";
import { prisma } from "../lib/config/prisma";
import { Prisma } from "../../generated/prisma/client.js";
import { env } from "../lib/config/env";
import { hashPassword, comparePassword } from "../lib/utils/password.util";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../lib/utils/jwt.util";
import { sha256 } from "../lib/utils/hash.util";
import { ConflictError, UnauthorizedError } from "../lib/errors/AppError";
import type {
  RegisterInput,
  LoginInput,
} from "../lib/validators/auth.validator";

// -- Helpers ----------------------------------------------------------

function refreshTokenExpiresAt(): Date {
  return new Date(Date.now() + env.JWT_REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);
}

/**
 * Generate an access + refresh token pair and persist the refresh token hash.
 */
async function issueTokens(user: { id: string; email: string }) {
  const accessToken = generateAccessToken({
    userId: user.id,
    email: user.email,
  });

  const jti = randomUUID();
  const refreshToken = generateRefreshToken({ userId: user.id }, jti);

  // Store SHA-256 hash of the refresh JWT — not the raw token
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: sha256(refreshToken),
      expiresAt: refreshTokenExpiresAt(),
    }
  });

  return { accessToken, refreshToken };
}

// -- Service ----------------------------------------------------------

export const authService = {
  /**
   * Register a new user, create their organization, and make them admin.
   */
  async register(input: RegisterInput) {
    const { name, email, password, orgName } = input;

    // 1. Check uniqueness
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictError("Email already registered");
    }

    // 2. Hash password
    const passwordHash = await hashPassword(password);

    // 3. Transactional: create user ? org ? membership
    const { user, organization, membership } = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const user = await tx.user.create({
          data: { name, email, passwordHash },
        });

        const organization = await tx.organization.create({
          data: { name: orgName },
        });

        const membership = await tx.orgMember.create({
          data: {
            orgId: organization.id,
            userId: user.id,
            role: "org_admin",
          },
        });

        return { user, organization, membership };
      },
    );

    // 4. Issue tokens
    const tokens = await issueTokens(user);

    return {
      user: { id: user.id, name: user.name, email: user.email },
      organization: { id: organization.id, name: organization.name },
      membership: { id: membership.id, role: membership.role },
      ...tokens,
    };
  },

  /**
   * Authenticate with email + password, return tokens.
   */
  async login(input: LoginInput) {
    const { email, password } = input;

    // 1. Find user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedError("Invalid email or password");
    }

    // 2. Verify password
    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedError("Invalid email or password");
    }

    // 3. Issue tokens
    const tokens = await issueTokens(user);

    return {
      user: { id: user.id, name: user.name, email: user.email },
      ...tokens,
    };
  },

  /**
   * Refresh token rotation:
   * - Verify the old refresh JWT
   * - Revoke the old token in DB
   * - Issue a brand-new access + refresh pair
   */
  async refresh(refreshToken: string) {
    // 1. Verify JWT signature + expiry
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw new UnauthorizedError("Invalid or expired refresh token");
    }

    // 2. Look up the hash in DB
    const tokenHash = sha256(refreshToken);
    const storedToken = await prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (!storedToken) {
      throw new UnauthorizedError("Refresh token not recognized");
    }

    // 3. Check revocation
    if (storedToken.revokedAt) {
      // Possible token reuse attack — revoke ALL tokens for this user
      await prisma.refreshToken.updateMany({
        where: { userId: storedToken.userId },
        data: { revokedAt: new Date() }
      });
      throw new UnauthorizedError(
        "Refresh token already used — all sessions revoked",
      );
    }

    // 4. Check expiry (belt-and-suspenders alongside JWT expiry)
    if (storedToken.expiresAt < new Date()) {
      throw new UnauthorizedError("Refresh token expired");
    }

    // 5. Revoke old token (rotation)
    await prisma.refreshToken.update({
      where: { tokenHash },
      data: { revokedAt: new Date() }
    });

    // 6. Fetch user for new access token
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      throw new UnauthorizedError("User not found");
    }

    // 7. Issue new pair
    const tokens = await issueTokens(user);

    return tokens;
  },

  /**
   * Revoke a single refresh token (single-device logout).
   */
  async logout(refreshToken: string) {
    const tokenHash = sha256(refreshToken);
    const storedToken = await prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (storedToken && !storedToken.revokedAt) {
      await prisma.refreshToken.update({
        where: { tokenHash },
        data: { revokedAt: new Date() }
      });
    }
  },

  /**
   * Revoke ALL refresh tokens for a user (logout all devices — bonus).
   */
  async logoutAll(userId: string) {
    await prisma.refreshToken.updateMany({
      where: { userId },
      data: { revokedAt: new Date() }
    });
  },
};
