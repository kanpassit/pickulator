import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

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

  // --- Resolve which member is checking in (guest link, or their own membership) ---
  let memberId: string | null = null;

  if (linkToken && typeof linkToken === "string") {
    const member = await prisma.groupMember.findUnique({ where: { linkToken } });
    if (member && member.groupId === occasion.groupId) memberId = member.id;
  } else {
    const user = await getCurrentUser();
    if (user) {
      if (bodyMemberId && typeof bodyMemberId === "string") {
        const member = await prisma.groupMember.findUnique({ where: { id: bodyMemberId } });
        if (member && member.groupId === occasion.groupId && member.userId === user.id) {
          memberId = member.id;
        }
      } else {
        const member = await prisma.groupMember.findFirst({
          where: { groupId: occasion.groupId, userId: user.id },
        });
        if (member) memberId = member.id;
      }
    }
  }

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
