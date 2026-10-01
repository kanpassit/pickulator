import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { decideRound, isDecideFailure } from "@/lib/decideRound";

// Web search + tool-use round trips can run past the platform's default
// function timeout, so give this route real headroom.
export const maxDuration = 60;

/**
 * Closes a round and computes the pick from everyone's hidden answers.
 * The scoring + AI restaurant search lives in lib/decideRound.ts (shared
 * with the host's "pick something else" reroll); this route just gates
 * who may close the round and persists the outcome.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id } = await params;
  const occasion = await prisma.occasion.findUnique({
    where: { id },
    include: {
      group: { include: { customOptions: true } },
      answers: true,
      result: true,
    },
  });
  if (!occasion) return NextResponse.json({ error: "Occasion not found" }, { status: 404 });
  if (occasion.group.hostUserId !== user.id) {
    return NextResponse.json({ error: "Only the host can close a round" }, { status: 403 });
  }

  if (occasion.result) {
    return NextResponse.json({ occasion: { id: occasion.id, status: occasion.status }, result: occasion.result });
  }

  if (occasion.answers.length === 0) {
    return NextResponse.json({ error: "No one has answered yet" }, { status: 400 });
  }

  const decision = await decideRound(occasion, { hostUserId: user.id });
  if (isDecideFailure(decision)) {
    return NextResponse.json({ error: decision.error }, { status: decision.status });
  }
  const { chosenName, chosenMeta, alsoConsidered } = decision;

  const [, result] = await prisma.$transaction([
    prisma.occasion.update({
      where: { id: occasion.id },
      data: { status: "CLOSED", closedAt: new Date() },
    }),
    prisma.result.create({
      data: {
        occasionId: occasion.id,
        chosenName,
        chosenMeta: chosenMeta as never,
        alsoConsidered: alsoConsidered as never,
      },
    }),
  ]);

  return NextResponse.json({ occasion: { id: occasion.id, status: "CLOSED" }, result });
}
