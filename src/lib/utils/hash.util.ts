import { createHash } from "crypto";

/**
 * Produce a hex-encoded SHA-256 hash.
 * Used to store refresh tokens as hashes in the database —
 * even a DB breach won't reveal the raw JWT.
 */
export function sha256(data: string): string {
  return createHash("sha256").update(data).digest("hex");
}
