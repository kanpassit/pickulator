import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveMemberId } from "@/lib/identity";

const TRAVEL_MODES = ["DRIVE", "TRANSIT", "WALK", "BIKE"] as const;

/**
 * Submits (or replaces) one member's hidden answers for a round. Answers
 * stay hidden from other members until the round closes, matching the
 * Question screen's "Hidden until everyone has answered".
 *
 * Identity comes from one of two places, matching how the app has no
 * required login: a guest's personal `linkToken` (from their /j/<token>
 * link), or the signed-in user's own membership (`memberId`, defaulting to
 * their membership in this occasion's group).
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: occasionId } = await params;

  const occasion = await prisma.occasion.findUnique({
    where: { id: occasionId },
    include: { group: true },
  });
  if (!occasion) return NextResponse.json({ error: "Occasion not found" }, { status: 404 });
  if (occasion.status !== "OPEN") {
    return NextResponse.json({ error: "This round is no longer taking answers" }, { status: 409 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    linkToken,
    memberId: bodyMemberId,
    rankedPicks,
    vibe,
    budget,
    dealbreakers,
    locationMode,
  } = (body ?? {}) as {
    linkToken?: string;
    memberId?: string;
    rankedPicks?: unknown;
    vibe?: unknown;
    budget?: unknown;
    dealbreakers?: unknown;
    locationMode?: unknown;
  };

  // --- Resolve which member is answering: their linkToken, their signed-in
  // membership, or (new) a returning-guest cookie from an earlier visit ---
  const memberId = await resolveMemberId(occasion.groupId, {
    linkToken: typeof linkToken === "string" ? linkToken : null,
    bodyMemberId: typeof bodyMemberId === "string" ? bodyMemberId : null,
  });

  if (!memberId) {
    return NextResponse.json({ error: "Could not identify who is answering" }, { status: 401 });
  }

  // --- Validate answer shape ---
  if (
    !Array.isArray(rankedPicks) ||
    rankedPicks.length === 0 ||
    rankedPicks.length > 3 ||
    !rankedPicks.every((p) => typeof p === "string" && p.trim().length > 0)
  ) {
    return NextResponse.json({ error: "rankedPicks must be 1-3 non-empty strings" }, { status: 400 });
  }

  const dealbreakersList =
    Array.isArray(dealbreakers) && dealbreakers.every((d) => typeof d === "string")
      ? dealbreakers
      : [];

  if (
    locationMode !== undefined &&
    locationMode !== null &&
    !TRAVEL_MODES.includes(locationMode as (typeof TRAVEL_MODES)[number])
  ) {
    return NextResponse.json({ error: `locationMode must be one of ${TRAVEL_MODES.join(", ")}` }, { status: 400 });
  }

  const answer = await prisma.answer.upsert({
    where: { occasionId_memberId: { occasionId, memberId } },
    create: {
      occasionId,
      memberId,
      rankedPicks,
      vibe: typeof vibe === "string" ? vibe : null,
      budget: typeof budget === "string" ? budget : null,
      dealbreakers: dealbreakersList,
      locationMode: (locationMode as (typeof TRAVEL_MODES)[number] | undefined) ?? null,
    },
    update: {
      rankedPicks,
      vibe: typeof vibe === "string" ? vibe : null,
      budget: typeof budget === "string" ? budget : null,
      dealbreakers: dealbreakersList,
      locationMode: (locationMode as (typeof TRAVEL_MODES)[number] | undefined) ?? null,
      answeredAt: new Date(),
    },
  });

  return NextResponse.json({ answer: { id: answer.id, memberId: answer.memberId } }, { status: 201 });
}
