import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { generateLinkToken, initialFor, tintForIndex } from "@/lib/tokens";

/** Lists groups the current user hosts or belongs to, with recent closed rounds. */
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

  return NextResponse.json({ groups: groupsOut });
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
