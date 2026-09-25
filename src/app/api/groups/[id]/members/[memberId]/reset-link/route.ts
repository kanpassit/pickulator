import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { generateLinkToken } from "@/lib/tokens";

/** Regenerates a member's personal link token; the old link stops working. */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id, memberId } = await params;
  const group = await prisma.group.findUnique({ where: { id } });
  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });
  if (group.hostUserId !== user.id) {
    return NextResponse.json({ error: "Only the host can reset links" }, { status: 403 });
  }

  const member = await prisma.groupMember.findUnique({ where: { id: memberId } });
  if (!member || member.groupId !== group.id) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  const updated = await prisma.groupMember.update({
    where: { id: memberId },
    data: { linkToken: generateLinkToken(), linkCreatedAt: new Date(), linkOpenedAt: null },
  });

  return NextResponse.json({
    member: { id: updated.id, linkToken: updated.linkToken, joinPath: `/j/${updated.linkToken}` },
  });
}
