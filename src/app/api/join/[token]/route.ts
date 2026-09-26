import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { setGuestCookie } from "@/lib/identity";
import { rateLimited, clientIp } from "@/lib/rateLimit";

/**
 * Resolves an invite link. Two shapes share this URL:
 *
 * - Group link (token === Group.id): the normal path now. One link per
 *   group, shared in a group chat. Returns every member's name so the
 *   person can pick who they are (see /api/join/[token]/claim) - no
 *   identity is known yet, so no guest cookie is set here.
 * - Personal link (token === GroupMember.linkToken): the old per-person
 *   link shape, kept working for any already-shared links. Identity is
 *   already known from the token itself.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  if (await rateLimited("join-lookup", clientIp(req), { max: 40, windowMs: 10 * 60_000 })) {
    return NextResponse.json({ error: "Too many attempts. Try again shortly." }, { status: 429 });
  }

  const group = await prisma.group.findUnique({
    where: { id: token },
    include: { members: { orderBy: { createdAt: "asc" } } },
  });

  if (group) {
    const occasion = await prisma.occasion.findFirst({
      where: { groupId: group.id, status: "OPEN" },
      orderBy: { createdAt: "desc" },
    });

    let answeredMemberIds = new Set<string>();
    if (occasion) {
      const answers = await prisma.answer.findMany({
        where: { occasionId: occasion.id },
        select: { memberId: true },
      });
      answeredMemberIds = new Set(answers.map((a) => a.memberId));
    }

    return NextResponse.json({
      mode: "group",
      group: { id: group.id, name: group.name },
      occasion: occasion
        ? {
            id: occasion.id,
            type: occasion.type,
            day: occasion.day,
            timeSlot: occasion.timeSlot,
            status: occasion.status,
          }
        : null,
      members: group.members.map((m) => ({
        id: m.id,
        displayName: m.displayName,
        initial: m.initial,
        tintColor: m.tintColor,
        hasAccount: Boolean(m.userId),
        answered: answeredMemberIds.has(m.id),
      })),
    });
  }

  const member = await prisma.groupMember.findUnique({
    where: { linkToken: token },
    include: { group: { include: { members: true } } },
  });

  if (!member) {
    return NextResponse.json({ error: "This link isn't valid anymore" }, { status: 404 });
  }

  if (!member.linkOpenedAt) {
    await prisma.groupMember.update({
      where: { id: member.id },
      data: { linkOpenedAt: new Date() },
    });
  }

  const occasion = await prisma.occasion.findFirst({
    where: { groupId: member.groupId, status: "OPEN" },
    orderBy: { createdAt: "desc" },
  });

  let answeredMemberIds = new Set<string>();
  if (occasion) {
    const answers = await prisma.answer.findMany({
      where: { occasionId: occasion.id },
      select: { memberId: true },
    });
    answeredMemberIds = new Set(answers.map((a) => a.memberId));
  }

  const res = NextResponse.json({
    mode: "member",
    group: { id: member.group.id, name: member.group.name },
    member: {
      id: member.id,
      displayName: member.displayName,
      initial: member.initial,
      tintColor: member.tintColor,
      phone: member.phone,
      role: member.role,
      hasAccount: Boolean(member.userId),
    },
    occasion: occasion
      ? {
          id: occasion.id,
          type: occasion.type,
          day: occasion.day,
          timeSlot: occasion.timeSlot,
          status: occasion.status,
          hasAnswered: answeredMemberIds.has(member.id),
        }
      : null,
    members: member.group.members.map((m) => ({
      id: m.id,
      displayName: m.displayName,
      initial: m.initial,
      tintColor: m.tintColor,
      answered: answeredMemberIds.has(m.id),
    })),
  });

  // Remember this guest for this group so they can come back to pickulator.com
  // later (e.g. from the home screen) without needing their personal link again.
  if (!member.userId) {
    setGuestCookie(res, member.groupId, member.linkToken);
  }

  return res;
}

/** Sets the optional mobile number captured on the Join screen (personal-link path only). */
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const member = await prisma.groupMember.findUnique({ where: { linkToken: token } });
  if (!member) {
    return NextResponse.json({ error: "This link isn't valid anymore" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { phone } = (body ?? {}) as { phone?: string | null };

  const updated = await prisma.groupMember.update({
    where: { id: member.id },
    data: { phone: typeof phone === "string" && phone.trim().length > 0 ? phone.trim() : null },
  });

  return NextResponse.json({ member: { id: updated.id, phone: updated.phone } });
}
