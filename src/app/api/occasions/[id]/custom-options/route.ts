import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

/**
 * Custom pick options for one round. Only signed-in members (not guests
 * answering via their personal link) can create one - Question.dc.html
 * "Add your own" - but everyone in the occasion, guests included, can see
 * and pick whatever's been added while they haven't answered yet.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: occasionId } = await params;

  const occasion = await prisma.occasion.findUnique({ where: { id: occasionId } });
  if (!occasion) return NextResponse.json({ error: "Occasion not found" }, { status: 404 });

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to add your own option" }, { status: 401 });
  }

  const member = await prisma.groupMember.findFirst({
    where: { groupId: occasion.groupId, userId: user.id },
  });
  if (!member) {
    return NextResponse.json({ error: "You're not a member of this group" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { label, hint } = (body ?? {}) as { label?: string; hint?: string };
  const trimmedLabel = typeof label === "string" ? label.trim() : "";
  if (!trimmedLabel) {
    return NextResponse.json({ error: "label is required" }, { status: 400 });
  }
  if (trimmedLabel.length > 40) {
    return NextResponse.json({ error: "label must be 40 characters or fewer" }, { status: 400 });
  }
  const trimmedHint = typeof hint === "string" ? hint.trim().slice(0, 80) : null;

  const option = await prisma.customOption.create({
    data: {
      occasionId,
      label: trimmedLabel,
      hint: trimmedHint || null,
      createdByMemberId: member.id,
    },
  });

  return NextResponse.json(
    {
      option: {
        id: option.id,
        label: option.label,
        hint: option.hint,
        createdByMemberId: option.createdByMemberId,
      },
    },
    { status: 201 }
  );
}
