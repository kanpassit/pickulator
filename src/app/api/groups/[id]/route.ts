import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

/** Fetches one group with its members, if the current user has access to it. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id } = await params;
  const group = await prisma.group.findUnique({
    where: { id },
    include: { members: { orderBy: { createdAt: "asc" } } },
  });

  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

  const hasAccess =
    group.hostUserId === user.id || group.members.some((m) => m.userId === user.id);
  if (!hasAccess) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ group });
}

/**
 * Deletes a group and everything under it (members, occasions, answers,
 * results, feedback, custom options all cascade via the schema's onDelete:
 * Cascade relations). Host only - there's no undo.
 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id } = await params;
  const group = await prisma.group.findUnique({ where: { id } });
  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });
  if (group.hostUserId !== user.id) {
    return NextResponse.json({ error: "Only the host can delete this group" }, { status: 403 });
  }

  await prisma.group.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
