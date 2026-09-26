import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  verifySessionToken,
} from "@/lib/session";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
};

/** Reads the session cookie and returns the current user, or null if not signed in. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  const payload = verifySessionToken(token);
  if (!payload) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.uid },
    select: { id: true, email: true, name: true, tokenVersion: true },
  });
  if (!user) return null;

  // A password reset bumps User.tokenVersion, which invalidates every
  // previously-issued token at once even though tokens aren't rows in a
  // revocable session table - see the tv field doc-comment in session.ts.
  // A token issued before tokenVersion existed has no tv, treated as 0.
  if ((payload.tv ?? 0) !== user.tokenVersion) return null;

  return { id: user.id, email: user.email, name: user.name };
}

/** Sets the session cookie for the given user id. Call from a Route Handler or Server Action. */
export async function setSessionCookie(userId: string, tokenVersion: number) {
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, createSessionToken(userId, tokenVersion), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

/** Clears the session cookie. */
export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE_NAME);
}
