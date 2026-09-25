import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Status snapshot for an occasion: who has answered (not what), the group's
 * host (so the client can show host-only actions), and the full Result once
 * the round is closed.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const occasion = await prisma.occasion.findUnique({
    where: { id },
    include: {
      group: { include: { members: true } },
      answers: { select: { memberId: true } },
      result: true,
      customOptions: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!occasion) return NextResponse.json({ error: "Occasion not found" }, { status: 404 });

  const answeredIds = new Set(occasion.answers.map((a) => a.memberId));

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
    customOptions: occasion.customOptions.map((o) => ({
      id: o.id,
      label: o.label,
      hint: o.hint,
      createdByMemberId: o.createdByMemberId,
    })),
  });
}
