import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { notifyBestEffort } from "@/lib/notify";

/** Accepts a pending link request: the guest's whole history now belongs to this account. */
export async function POST(_req: Request, { params }: { params: Promise<{ memberId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { memberId } = await params;
  const member = await prisma.groupMember.findUnique({ where: { id: memberId }, include: { group: true } });
  if (!member || member.pendingLinkUserId !== user.id) {
    return NextResponse.json({ error: "No matching link request" }, { status: 404 });
  }

  const alreadyInGroup = await prisma.groupMember.findFirst({
    where: { groupId: member.groupId, userId: user.id },
  });
  if (alreadyInGroup) {
    // Someone else beat them to it, or they joined this group another way
    // since the request was made - clear the stale request rather than
    // violate the group's one-membership-per-account expectation.
    await prisma.groupMember.update({
      where: { id: memberId },
      data: { pendingLinkUserId: null, pendingLinkEmail: null, pendingLinkAt: null },
    });
    return NextResponse.json({ error: "You're already a member of that group" }, { status: 409 });
  }

  await prisma.groupMember.update({
    where: { id: memberId },
    data: { userId: user.id, pendingLinkUserId: null, pendingLinkEmail: null, pendingLinkAt: null, pendingEmail: null },
  });

  await prisma.notification.deleteMany({
    where: { userId: user.id, type: "MEMBER_LINK_REQUEST", relatedId: memberId },
  });

  await notifyBestEffort({
    userId: member.group.hostUserId,
    type: "MEMBER_LINK_ACCEPTED",
    title: `${user.name} accepted your link request`,
    body: `"${member.displayName}" in ${member.group.name} is now their account.`,
    link: `/invite?groupId=${member.groupId}`,
    actorUserId: user.id,
    groupId: member.groupId,
    relatedId: memberId,
  });

  return NextResponse.json({ ok: true });
}
