import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

/** Secret handed only to the player who started a round (never stored in clear). */
export function createSessionToken() {
  return randomBytes(32).toString("base64url");
}

export function tokenMatches(token: string, expectedHash: string) {
  const a = Buffer.from(sha256(token), "hex");
  const b = Buffer.from(expectedHash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Client IP from proxy headers (Vercel sets x-forwarded-for). */
export function getClientIp(headers: Headers) {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || "unknown";
}

/** Raw IPs are never stored: only a salted hash, used for rate limiting. */
export function hashIp(ip: string, salt = process.env.IP_HASH_SALT ?? "") {
  return sha256(`${salt}:${ip}`);
}

export const RATE_LIMITS = {
  start: { limit: 30, windowMs: 10 * 60 * 1000 },
  submit: { limit: 30, windowMs: 10 * 60 * 1000 },
  publish: { limit: 10, windowMs: 10 * 60 * 1000 },
} as const;

export type RateLimitedAction = keyof typeof RATE_LIMITS;
