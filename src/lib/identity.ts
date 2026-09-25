import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

/**
 * Identity model (see the "guest + registered users" note this borrows
 * from): a person answering a round is either a signed-in User or a
 * name-only guest recognized entirely by their personal GroupMember.linkToken
 * - there's no separate guest table, just a GroupMember with userId: null.
 * All activity (Answer, Feedback, CustomOption) references GroupMember.id,
 * never User.id, so a guest claiming their account later (signup's
 * claimToken) carries their whole history with them automatically.
 */

export function guestCookieName(groupId: string) {
  return `pk_g_${groupId}`;
}

const GUEST_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year - "recognized on return visits"

/** Sets the long-lived per-group cookie that lets a guest return later
 * without needing their personal link's token in the URL every time. */
export function setGuestCookie(res: NextResponse, groupId: string, linkToken: string) {
  res.cookies.set(guestCookieName(groupId), linkToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: GUEST_COOKIE_MAX_AGE,
  });
}

/**
 * Resolves which GroupMember is acting, for any endpoint any participant
 * (guest or registered) can call - answering, feedback. Tries, in order:
 * an explicit linkToken in the request body (a fresh personal-link visit),
 * the caller's own signed-in membership, then the returning-guest cookie.
 * Never trusts a memberId the caller merely asserts without one of these.
 */
export async function resolveMemberId(
  groupId: string,
  opts: { linkToken?: string | null; bodyMemberId?: string | null }
): Promise<string | null> {
  if (opts.linkToken) {
    const member = await prisma.groupMember.findUnique({ where: { linkToken: opts.linkToken } });
    if (member && member.groupId === groupId) return member.id;
  }

  const user = await getCurrentUser();
  if (user) {
    if (opts.bodyMemberId) {
      const member = await prisma.groupMember.findUnique({ where: { id: opts.bodyMemberId } });
      if (member && member.groupId === groupId && member.userId === user.id) return member.id;
    } else {
      const member = await prisma.groupMember.findFirst({ where: { groupId, userId: user.id } });
      if (member) return member.id;
    }
    return null;
  }

  const store = await cookies();
  const cookieToken = store.get(guestCookieName(groupId))?.value;
  if (cookieToken) {
    const member = await prisma.groupMember.findUnique({ where: { linkToken: cookieToken } });
    if (member && member.groupId === groupId) return member.id;
  }

  return null;
}
