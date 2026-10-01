import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { decideRound, isDecideFailure } from "@/lib/decideRound";

// Same budget as closing a round: a reroll is another web-search round trip.
export const maxDuration = 60;

// Keeps the rejected list (and so the prompt) bounded if a host keeps going.
const MAX_REROLLS = 5;

/**
 * Host-only "pick something else": the group didn't like the first pick, so
 * replace this round's result with a different one instead of starting a new
 * round and making everyone answer again. The previous suggestion(s) are
 * remembered on the result (chosenMeta.rejectedNames) and excluded from the
 * next search, so a reroll can't hand back the same place.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id } = await params;
  const occasion = await prisma.occasion.findUnique({
    where: { id },
    include: { group: { include: { customOptions: true } }, answers: true, result: true },
  });
  if (!occasion) return NextResponse.json({ error: "Occasion not found" }, { status: 404 });
  if (occasion.group.hostUserId !== user.id) {
    return NextResponse.json({ error: "Only the host can pick something else" }, { status: 403 });
  }
  if (!occasion.result) {
    return NextResponse.json({ error: "This round hasn't been decided yet" }, { status: 409 });
  }

  const previousMeta = (occasion.result.chosenMeta ?? {}) as Record<string, unknown>;
  const earlier = Array.isArray(previousMeta.rejectedNames)
    ? (previousMeta.rejectedNames as unknown[]).filter((n): n is string => typeof n === "string")
    : [];
  const rejectedNames = [...earlier, occasion.result.chosenName];

  if (rejectedNames.length > MAX_REROLLS) {
    return NextResponse.json({ error: "That's the most re-picks for one round." }, { status: 429 });
  }

  const decision = await decideRound(occasion, {
    hostUserId: user.id,
    rejectedNames,
    // Only an AI-backed round can reroll to a genuinely different place; the
    // cuisine-only fallback steps to the next-ranked cuisine instead.
    requireAi: previousMeta.source === "claude",
  });
  if (isDecideFailure(decision)) {
    return NextResponse.json({ error: decision.error }, { status: decision.status });
  }

  const hostMember = await prisma.groupMember.findFirst({
    where: { groupId: occasion.groupId, userId: user.id },
    select: { id: true },
  });

  const result = await prisma.result.update({
    where: { occasionId: occasion.id },
    data: {
      chosenName: decision.chosenName,
      chosenMeta: { ...decision.chosenMeta, rejectedNames } as never,
      alsoConsidered: decision.alsoConsidered as never,
      vetoedByMemberId: hostMember?.id ?? null,
      vetoedOptionName: occasion.result.chosenName,
    },
  });

  return NextResponse.json({ result });
}
