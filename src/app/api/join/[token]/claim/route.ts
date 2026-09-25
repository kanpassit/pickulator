import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { setGuestCookie } from "@/lib/identity";
import { generateLinkToken, initialFor, tintForIndex } from "@/lib/tokens";

/**
 * The "who are you" step for a group invite link (see GET /api/join/[token]
 * for the two link shapes). Body is either { memberId } - claiming an
 * existing name someone already listed - or { name } - adding yourself
 * because you're not on the list yet. Either way this sets the returning-
 * guest cookie for that member, exactly like opening a personal link used to.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const group = await prisma.group.findUnique({
    where: { id: token },
    include: { members: { orderBy: { createdAt: "asc" } } },
  });
  if (!group) {
    return NextResponse.json({ error: "This link isn't valid anymore" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { memberId, name } = (body ?? {}) as { memberId?: string; name?: string };

  let member: (typeof group.members)[number];

  if (memberId) {
    const found = group.members.find((m) => m.id === memberId);
    if (!found) {
      return NextResponse.json({ error: "That person isn't in this group" }, { status: 404 });
    }
    if (found.userId) {
      return NextResponse.json(
        { error: "This person already has an account - they should log in instead." },
        { status: 400 }
      );
    }
    member = found;
  } else {
    const trimmed = typeof name === "string" ? name.trim() : "";
    if (!trimmed) {
      return NextResponse.json({ error: "Pick your name, or type it in" }, { status: 400 });
    }
    member = await prisma.groupMember.create({
      data: {
        groupId: group.id,
        displayName: trimmed,
        initial: initialFor(trimmed),
        tintColor: tintForIndex(group.members.length),
        role: "MEMBER",
        linkToken: generateLinkToken(),
      },
    });
  }

  if (!member.linkOpenedAt) {
    await prisma.groupMember.update({ where: { id: member.id }, data: { linkOpenedAt: new Date() } });
  }

  const occasion = await prisma.occasion.findFirst({
    where: { groupId: group.id, status: "OPEN" },
    orderBy: { createdAt: "desc" },
  });

  let hasAnswered = false;
  if (occasion) {
    const answer = await prisma.answer.findUnique({
      where: { occasionId_memberId: { occasionId: occasion.id, memberId: member.id } },
    });
    hasAnswered = Boolean(answer);
  }

  const res = NextResponse.json({
    member: {
      id: member.id,
      displayName: member.displayName,
      initial: member.initial,
      tintColor: member.tintColor,
      linkToken: member.linkToken,
    },
    occasion: occasion
      ? { id: occasion.id, type: occasion.type, day: occasion.day, timeSlot: occasion.timeSlot, hasAnswered }
      : null,
  });

  setGuestCookie(res, group.id, member.linkToken);
  return res;
}
