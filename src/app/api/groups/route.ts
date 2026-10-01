import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { generateLinkToken, initialFor, tintForIndex } from "@/lib/tokens";

/** Lists groups the current user hosts or belongs to, with recent closed
 * rounds, plus every currently-open round across all of them - that's the
 * "what needs my attention" list the home screen leads with. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const groups = await prisma.group.findMany({
    where: {
      OR: [{ hostUserId: user.id }, { members: { some: { userId: user.id } } }],
    },
    include: {
      members: { orderBy: { createdAt: "asc" } },
      occasions: {
        where: { status: "CLOSED" },
        include: { result: true, feedback: { select: { rating: true } } },
        orderBy: { closedAt: "desc" },
        take: 5,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Check-in ratings (Feedback.rating) were previously write-only - nothing
  // ever read them back. Summarize them here (how many rated each way) so
  // Recent nights / History can show what the group actually thought,
  // instead of the data going nowhere once someone hits Save.
  const groupsOut = groups.map((g) => ({
    ...g,
    occasions: g.occasions.map(({ feedback, ...occasion }) => {
      const counts = new Map<string, number>();
      for (const f of feedback) {
        if (f.rating) counts.set(f.rating, (counts.get(f.rating) ?? 0) + 1);
      }
      const ratingSummary = Array.from(counts, ([rating, count]) => ({ rating, count })).sort(
        (a, b) => b.count - a.count
      );
      return { ...occasion, ratingSummary };
    }),
  }));

  // Every open round across all of the user's groups, with whether their
  // own membership has answered yet - the thing an actual "home" screen
  // should lead with, instead of one arbitrarily "active" group.
  const groupIds = groups.map((g) => g.id);
  const myMemberIdByGroup = new Map(
    groups.map((g) => [g.id, g.members.find((m) => m.userId === user.id)?.id ?? null])
  );

  const openOccasions = groupIds.length
    ? await prisma.occasion.findMany({
        where: { groupId: { in: groupIds }, status: "OPEN" },
        orderBy: { createdAt: "desc" },
      })
    : [];

  // One query for every answer on every open round: enough to tell both
  // whether *I* have answered and how many/which people still haven't.
  // (Who has answered isn't secret - the waiting screen already shows it -
  // only what they answered is hidden.)
  const allAnswers = openOccasions.length
    ? await prisma.answer.findMany({
        where: { occasionId: { in: openOccasions.map((o) => o.id) } },
        select: { occasionId: true, memberId: true },
      })
    : [];
  const answeredByOccasion = new Map<string, Set<string>>();
  for (const a of allAnswers) {
    const set = answeredByOccasion.get(a.occasionId) ?? new Set<string>();
    set.add(a.memberId);
    answeredByOccasion.set(a.occasionId, set);
  }

  const groupById = new Map(groups.map((g) => [g.id, g]));
  const hostIdByGroup = new Map(groups.map((g) => [g.id, g.hostUserId]));

  const openRounds = openOccasions.map((o) => {
    const group = groupById.get(o.groupId);
    const myMemberId = myMemberIdByGroup.get(o.groupId) ?? null;
    const answered = answeredByOccasion.get(o.id) ?? new Set<string>();
    const members = group?.members ?? [];
    return {
      occasionId: o.id,
      groupId: o.groupId,
      groupName: group?.name ?? "",
      type: o.type,
      day: o.day,
      timeSlot: o.timeSlot,
      createdAt: o.createdAt.toISOString(),
      isHost: hostIdByGroup.get(o.groupId) === user.id,
      hasAnswered: myMemberId ? answered.has(myMemberId) : false,
      answeredCount: members.filter((m) => answered.has(m.id)).length,
      totalMembers: members.length,
      // Display names only, in join order, for "Waiting on Sam, Alex".
      waitingOn: members.filter((m) => !answered.has(m.id) && m.id !== myMemberId).map((m) => m.displayName),
    };
  });

  return NextResponse.json({ groups: groupsOut, openRounds });
}

/** Creates a new group with the current user as host, and as its first member. */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { name } = (body ?? {}) as { name?: string };
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Group name is required" }, { status: 400 });
  }

  const group = await prisma.group.create({
    data: {
      name: name.trim(),
      hostUserId: user.id,
      members: {
        create: {
          userId: user.id,
          displayName: user.name,
          initial: initialFor(user.name),
          tintColor: tintForIndex(0),
          role: "HOST",
          linkToken: generateLinkToken(),
        },
      },
    },
    include: { members: true },
  });

  return NextResponse.json({ group: { ...group, occasions: [] } }, { status: 201 });
}
