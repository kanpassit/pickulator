import { createHmac, timingSafeEqual } from "crypto";

const COOKIE_NAME = "pk_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 90; // 90 days

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not set");
  }
  return secret;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64urlDecode(input: string): Buffer {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(padded, "base64");
}

function sign(payload: string): string {
  return base64url(createHmac("sha256", getSecret()).update(payload).digest());
}

export type SessionPayload = {
  uid: string;
  exp: number;
};

export function createSessionToken(uid: string): string {
  const payload: SessionPayload = {
    uid,
    exp: Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS,
  };
  const encodedPayload = base64url(JSON.stringify(payload));
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifySessionToken(token: string | undefined | null): SessionPayload | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [encodedPayload, signature] = parts;

  let expectedSignature: string;
  try {
    expectedSignature = sign(encodedPayload);
  } catch {
    return null;
  }

  const a = Buffer.from(signature);
  const b = Buffer.from(expectedSignature);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return null;
  }

  try {
    const payload = JSON.parse(base64urlDecode(encodedPayload).toString("utf8")) as SessionPayload;
    if (typeof payload.uid !== "string" || typeof payload.exp !== "number") return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
export const SESSION_MAX_AGE_SECONDS = MAX_AGE_SECONDS;
