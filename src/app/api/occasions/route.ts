import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const TYPES = ["BRUNCH", "LUNCH", "DINNER", "COFFEE", "DRINKS", "LATE"] as const;
const DAYS = ["TODAY", "TOMORROW", "WEEKEND", "OTHER"] as const;

/** Starts a new round for a group. Only the host starts rounds. */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { groupId, type, day, timeSlot } = (body ?? {}) as {
    groupId?: string;
    type?: string;
    day?: string;
    timeSlot?: string;
  };

  if (!groupId || typeof groupId !== "string") {
    return NextResponse.json({ error: "groupId is required" }, { status: 400 });
  }
  if (!type || !TYPES.includes(type as (typeof TYPES)[number])) {
    return NextResponse.json({ error: `type must be one of ${TYPES.join(", ")}` }, { status: 400 });
  }
  if (!day || !DAYS.includes(day as (typeof DAYS)[number])) {
    return NextResponse.json({ error: `day must be one of ${DAYS.join(", ")}` }, { status: 400 });
  }
  if (!timeSlot || typeof timeSlot !== "string" || timeSlot.trim().length === 0) {
    return NextResponse.json({ error: "timeSlot is required" }, { status: 400 });
  }

  const group = await prisma.group.findUnique({ where: { id: groupId }, include: { members: true } });
  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });
  if (group.hostUserId !== user.id) {
    return NextResponse.json({ error: "Only the host can start a round" }, { status: 403 });
  }

  const hostMember = group.members.find((m) => m.userId === user.id);
  if (!hostMember) {
    return NextResponse.json({ error: "Host has no member record in this group" }, { status: 500 });
  }

  const occasion = await prisma.occasion.create({
    data: {
      groupId: group.id,
      type: type as (typeof TYPES)[number],
      day: day as (typeof DAYS)[number],
      timeSlot: timeSlot.trim(),
      createdByMemberId: hostMember.id,
    },
  });

  return NextResponse.json({ occasion }, { status: 201 });
}
