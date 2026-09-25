import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Status snapshot for an occasion: used by the Waiting screen to show who
 * has answered without revealing anyone's actual (hidden) answers.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const occasion = await prisma.occasion.findUnique({
    where: { id },
    include: {
      group: { include: { members: true } },
      answers: { select: { memberId: true } },
      result: true,
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
      hasResult: Boolean(occasion.result),
    },
    group: { id: occasion.group.id, name: occasion.group.name },
    members: occasion.group.members.map((m) => ({
      id: m.id,
      displayName: m.displayName,
      initial: m.initial,
      tintColor: m.tintColor,
      answered: answeredIds.has(m.id),
    })),
    answeredCount: answeredIds.size,
    totalMembers: occasion.group.members.length,
  });
}
