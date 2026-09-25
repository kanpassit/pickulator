import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

/**
 * Lists group-member link requests waiting on the signed-in user to accept
 * or decline (see the host-side POST /api/groups/[id]/members/[memberId]/
 * link-request). Source of truth is GroupMember.pendingLinkUserId itself,
 * not the Notification row created alongside it, so this stays correct
 * even if that notification was cleared some other way.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const members = await prisma.groupMember.findMany({
    where: { pendingLinkUserId: user.id },
    include: { group: true },
    orderBy: { pendingLinkAt: "asc" },
  });

  return NextResponse.json({
    requests: members.map((m) => ({
      memberId: m.id,
      displayName: m.displayName,
      initial: m.initial,
      tintColor: m.tintColor,
      group: { id: m.group.id, name: m.group.name },
      pendingLinkAt: m.pendingLinkAt,
    })),
  });
}
