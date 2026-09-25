import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

/**
 * Status snapshot for an occasion: who has answered (not what), the group's
 * host (so the client can show host-only actions), the full Result once the
 * round is closed, and the group's permanent custom options (added once,
 * carried into every round - see custom-options/route.ts).
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const occasion = await prisma.occasion.findUnique({
    where: { id },
    include: {
      group: {
        include: {
          members: true,
          customOptions: { orderBy: { createdAt: "asc" } },
        },
      },
      answers: { select: { memberId: true } },
      result: true,
    },
  });

  if (!occasion) return NextResponse.json({ error: "Occasion not found" }, { status: 404 });

  const answeredIds = new Set(occasion.answers.map((a) => a.memberId));

  // Resolve the signed-in caller's own membership, if any, so the client
  // can decide who's allowed to delete a custom option (its creator, or
  // the host) without exposing every member's raw userId.
  const user = await getCurrentUser();
  const isHost = Boolean(user && user.id === occasion.group.hostUserId);
  const myMemberId = user
    ? occasion.group.members.find((m) => m.userId === user.id)?.id ?? null
    : null;

  return NextResponse.json({
    occasion: {
      id: occasion.id,
      type: occasion.type,
      day: occasion.day,
      timeSlot: occasion.timeSlot,
      status: occasion.status,
      closeMode: occasion.closeMode,
    },
    group: { id: occasion.group.id, name: occasion.group.name, hostUserId: occasion.group.hostUserId },
    members: occasion.group.members.map((m) => ({
      id: m.id,
      displayName: m.displayName,
      initial: m.initial,
      tintColor: m.tintColor,
      answered: answeredIds.has(m.id),
    })),
    answeredCount: answeredIds.size,
    totalMembers: occasion.group.members.length,
    result: occasion.result,
    myMemberId,
    isHost,
    customOptions: occasion.group.customOptions.map((o) => ({
      id: o.id,
      label: o.label,
      hint: o.hint,
      createdByMemberId: o.createdByMemberId,
    })),
  });
}

/**
 * Deletes one round - answers, feedback, and its result all cascade via the
 * schema's onDelete: Cascade relations. Host only, matching group delete;
 * used from "Recent nights" (Home) and History, and, unlike a group
 * delete, doesn't touch the group or its other rounds.
 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id } = await params;
  const occasion = await prisma.occasion.findUnique({ where: { id }, include: { group: true } });
  if (!occasion) return NextResponse.json({ error: "Round not found" }, { status: 404 });
  if (occasion.group.hostUserId !== user.id) {
    return NextResponse.json({ error: "Only the host can delete a round" }, { status: 403 });
  }

  await prisma.occasion.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
