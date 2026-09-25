import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

/** Declines a pending link request; the member stays a guest, unchanged. */
export async function POST(_req: Request, { params }: { params: Promise<{ memberId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { memberId } = await params;
  const member = await prisma.groupMember.findUnique({ where: { id: memberId } });
  if (!member || member.pendingLinkUserId !== user.id) {
    return NextResponse.json({ error: "No matching link request" }, { status: 404 });
  }

  await prisma.groupMember.update({
    where: { id: memberId },
    data: { pendingLinkUserId: null, pendingLinkEmail: null, pendingLinkAt: null },
  });

  await prisma.notification.deleteMany({
    where: { userId: user.id, type: "MEMBER_LINK_REQUEST", link: `/?linkMemberId=${memberId}` },
  });

  return NextResponse.json({ ok: true });
}
