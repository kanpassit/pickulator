import { randomBytes } from "crypto";

/** URL-safe random token for personal invite links, e.g. "q7Xn4t2AkP9c". */
export function generateLinkToken(): string {
  return randomBytes(9)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

const TINTS = ["#F6DDD4", "#E6EAD3", "#F3E3B5", "#EFE6D6", "#DCEAF0", "#E5DCEF"];

/** Deterministic-ish tint rotation so avatar colors stay stable as a group grows. */
export function tintForIndex(index: number): string {
  return TINTS[index % TINTS.length];
}

export function initialFor(name: string): string {
  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed[0].toUpperCase() : "?";
}
