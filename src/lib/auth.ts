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
    select: { id: true, email: true, name: true },
  });
  return user;
}

/** Sets the session cookie for the given user id. Call from a Route Handler or Server Action. */
export async function setSessionCookie(userId: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, createSessionToken(userId), {
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
