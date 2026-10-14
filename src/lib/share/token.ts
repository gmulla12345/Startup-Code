import { randomBytes } from "node:crypto";

/**
 * Share-link tokens: 16 random bytes (128 bits) from the operating system's
 * secure generator, written as 22 URL-safe characters. Not derived from anything
 * (no counter, no timestamp, no user or place id), so a token cannot be guessed or
 * enumerated, and knowing one link says nothing about any other.
 */
export const SHARE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{22}$/;

export function generateShareToken(): string {
  return randomBytes(16).toString("base64url");
}

export function isShareToken(value: unknown): value is string {
  return typeof value === "string" && SHARE_TOKEN_PATTERN.test(value);
}

/** The cache tag for everything a share page is built from; turning a link off expires it. */
export function shareTag(token: string): string {
  return `share:${token}`;
}
