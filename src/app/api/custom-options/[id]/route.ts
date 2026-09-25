import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

/**
 * Removes a group's permanent custom option (see custom-options/route.ts).
 * Matches the "guests can participate and self-serve, but can't create or
 * administer anything" rule adopted for this feature: only the option's
 * creator, or the group's host, can delete it - not any registered member,
 * and never a guest.
 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const option = await prisma.customOption.findUnique({
    where: { id },
    include: { group: true, createdByMember: true },
  });
  if (!option) return NextResponse.json({ error: "Option not found" }, { status: 404 });

  const isCreator = option.createdByMember.userId === user.id;
  const isHost = option.group.hostUserId === user.id;
  if (!isCreator && !isHost) {
    return NextResponse.json({ error: "Only the person who added this, or the host, can delete it" }, { status: 403 });
  }

  await prisma.customOption.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
