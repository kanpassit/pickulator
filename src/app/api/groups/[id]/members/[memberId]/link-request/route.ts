import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { notifyBestEffort } from "@/lib/notify";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Host-initiated request to link a guest's history onto a registered
 * account (Invite screen's "Link to account", for when a guest like
 * "Allyson" or "Kimmy" has since signed up separately). Doesn't take
 * effect on its own - the target account's owner has to accept it from
 * their own session (see /api/pending-links) - so a wrong or unwanted
 * email can't silently attach someone else's history to an account.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id, memberId } = await params;
  const group = await prisma.group.findUnique({ where: { id } });
  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });
  if (group.hostUserId !== user.id) {
    return NextResponse.json({ error: "Only the host can link a member to an account" }, { status: 403 });
  }

  const member = await prisma.groupMember.findUnique({ where: { id: memberId } });
  if (!member || member.groupId !== group.id) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }
  if (member.userId) {
    return NextResponse.json({ error: "This person already has an account linked" }, { status: 409 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { email } = (body ?? {}) as { email?: string };
  if (!email || typeof email !== "string" || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
  }
  const normalizedEmail = email.trim().toLowerCase();

  const targetUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!targetUser) {
    return NextResponse.json({ error: "No account found with that email yet" }, { status: 404 });
  }

  const alreadyInGroup = await prisma.groupMember.findFirst({
    where: { groupId: group.id, userId: targetUser.id },
  });
  if (alreadyInGroup) {
    return NextResponse.json({ error: "That account is already in this group" }, { status: 409 });
  }

  const updated = await prisma.groupMember.update({
    where: { id: memberId },
    data: { pendingLinkUserId: targetUser.id, pendingLinkEmail: normalizedEmail, pendingLinkAt: new Date() },
  });

  await notifyBestEffort({
    userId: targetUser.id,
    type: "MEMBER_LINK_REQUEST",
    title: `${user.name} wants to link your account`,
    body: `to "${member.displayName}" in ${group.name}`,
    link: "/",
    actorUserId: user.id,
    groupId: group.id,
    relatedId: memberId,
  });

  return NextResponse.json({
    member: {
      id: updated.id,
      pendingLinkUserId: updated.pendingLinkUserId,
      pendingLinkEmail: updated.pendingLinkEmail,
    },
  });
}

/** Cancels a pending link request before it's been accepted or declined. */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id, memberId } = await params;
  const group = await prisma.group.findUnique({ where: { id } });
  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });
  if (group.hostUserId !== user.id) {
    return NextResponse.json({ error: "Only the host can cancel a link request" }, { status: 403 });
  }

  const member = await prisma.groupMember.findUnique({ where: { id: memberId } });
  if (!member || member.groupId !== group.id) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  if (member.pendingLinkUserId) {
    await prisma.notification.deleteMany({
      where: { userId: member.pendingLinkUserId, type: "MEMBER_LINK_REQUEST", relatedId: memberId },
    });
  }

  await prisma.groupMember.update({
    where: { id: memberId },
    data: { pendingLinkUserId: null, pendingLinkEmail: null, pendingLinkAt: null },
  });

  return NextResponse.json({ ok: true });
}
