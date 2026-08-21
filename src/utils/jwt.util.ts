import jwt from "jsonwebtoken";
import { env } from "../config/env";

// ── Payload types ────────────────────────────────────────────────────

export interface AccessTokenPayload {
  userId: string;
  email: string;
}

export interface RefreshTokenPayload {
  userId: string;
  /** Token family identifier — not used yet but reserved for future rotation detection */
  jti: string;
}

// ── Generators ───────────────────────────────────────────────────────

export function generateAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: `${env.JWT_ACCESS_TTL_MINUTES}m`,
  });
}

export function generateRefreshToken(
  payload: Omit<RefreshTokenPayload, "jti">,
  jti: string,
): string {
  return jwt.sign({ ...payload, jti }, env.JWT_REFRESH_SECRET, {
    expiresIn: `${env.JWT_REFRESH_TTL_DAYS}d`,
  });
}

// ── Verifiers ────────────────────────────────────────────────────────

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
  return decoded as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET);
  return decoded as RefreshTokenPayload;
}
