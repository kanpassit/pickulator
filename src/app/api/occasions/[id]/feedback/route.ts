import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveMemberId } from "@/lib/identity";

const CHOICES = ["WENT", "ELSEWHERE", "DIDNT_GO"] as const;
const RATINGS = ["LOVED", "FINE", "NOT_AGAIN"] as const;

/**
 * Records the post-visit check-in: did the group go with the pick, and how
 * was it. Same guest-link-or-session identity pattern as answer submission.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: occasionId } = await params;

  const occasion = await prisma.occasion.findUnique({ where: { id: occasionId } });
  if (!occasion) return NextResponse.json({ error: "Occasion not found" }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    linkToken,
    memberId: bodyMemberId,
    choice,
    rating,
    notes,
  } = (body ?? {}) as {
    linkToken?: string;
    memberId?: string;
    choice?: string;
    rating?: string | null;
    notes?: string | null;
  };

  // --- Resolve which member is checking in: their linkToken, their signed-in
  // membership, or (new) a returning-guest cookie from an earlier visit ---
  const memberId = await resolveMemberId(occasion.groupId, {
    linkToken: typeof linkToken === "string" ? linkToken : null,
    bodyMemberId: typeof bodyMemberId === "string" ? bodyMemberId : null,
  });

  if (!memberId) {
    return NextResponse.json({ error: "Could not identify who is checking in" }, { status: 401 });
  }

  if (!choice || !CHOICES.includes(choice as (typeof CHOICES)[number])) {
    return NextResponse.json({ error: `choice must be one of ${CHOICES.join(", ")}` }, { status: 400 });
  }
  if (rating !== undefined && rating !== null && !RATINGS.includes(rating as (typeof RATINGS)[number])) {
    return NextResponse.json({ error: `rating must be one of ${RATINGS.join(", ")}` }, { status: 400 });
  }

  const feedback = await prisma.feedback.upsert({
    where: { occasionId_memberId: { occasionId, memberId } },
    create: {
      occasionId,
      memberId,
      choice: choice as (typeof CHOICES)[number],
      rating: (rating as (typeof RATINGS)[number] | null | undefined) ?? null,
      notes: typeof notes === "string" ? notes : null,
    },
    update: {
      choice: choice as (typeof CHOICES)[number],
      rating: (rating as (typeof RATINGS)[number] | null | undefined) ?? null,
      notes: typeof notes === "string" ? notes : null,
    },
  });

  return NextResponse.json({ feedback: { id: feedback.id, memberId: feedback.memberId } }, { status: 201 });
}
