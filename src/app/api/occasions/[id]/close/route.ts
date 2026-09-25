import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { cuisineLabel } from "@/lib/cuisineLabels";

const RANK_WEIGHTS = [3, 2, 1]; // 1st, 2nd, 3rd pick

type Tally = {
  score: number;
  breadth: number; // how many members included this pick at all
  firstPlaceVotes: number;
};

/**
 * Closes a round and computes the pick from everyone's hidden answers.
 *
 * This is a heuristic stand-in, not a real restaurant recommendation: there
 * is no places/restaurant API wired up yet (that's separately scoped), so
 * the "pick" is the group's top-scoring cuisine, not an actual venue. Swap
 * this scoring step out once a places API is integrated.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id } = await params;
  const occasion = await prisma.occasion.findUnique({
    where: { id },
    include: {
      group: true,
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

  const dealbreakers = new Set<string>();
  for (const a of occasion.answers) {
    for (const d of a.dealbreakers) dealbreakers.add(d);
  }

  const tallies = new Map<string, Tally>();
  for (const a of occasion.answers) {
    a.rankedPicks.forEach((pick, index) => {
      if (dealbreakers.has(pick)) return;
      const weight = RANK_WEIGHTS[index] ?? 1;
      const t = tallies.get(pick) ?? { score: 0, breadth: 0, firstPlaceVotes: 0 };
      t.score += weight;
      t.breadth += 1;
      if (index === 0) t.firstPlaceVotes += 1;
      tallies.set(pick, t);
    });
  }

  const ranked = Array.from(tallies.entries())
    .map(([pick, t]) => ({ pick, ...t }))
    .sort((a, b) => b.score - a.score || b.breadth - a.breadth || a.pick.localeCompare(b.pick));

  if (ranked.length === 0) {
    return NextResponse.json(
      { error: "Every pick submitted was ruled out as a dealbreaker" },
      { status: 409 }
    );
  }

  const winner = ranked[0];
  const runnerUps = ranked.slice(1, 3);
  const totalAnswers = occasion.answers.length;

  const whyParts: string[] = [];
  whyParts.push(
    `${cuisineLabel(winner.pick)} showed up in ${winner.breadth} of ${totalAnswers} top-3 picks` +
      (winner.firstPlaceVotes > 0
        ? `, ranked first by ${winner.firstPlaceVotes} ${winner.firstPlaceVotes === 1 ? "person" : "people"}.`
        : ".")
  );
  if (dealbreakers.size > 0) {
    whyParts.push(
      `Ruled out for dealbreakers: ${Array.from(dealbreakers).map(cuisineLabel).join(", ")}.`
    );
  }

  const chosenMeta = {
    pick: winner.pick,
    score: winner.score,
    breadth: winner.breadth,
    firstPlaceVotes: winner.firstPlaceVotes,
    totalAnswers,
    why: whyParts.join(" "),
  };

  const alsoConsidered = runnerUps.map((r) => ({
    pick: r.pick,
    label: cuisineLabel(r.pick),
    score: r.score,
    breadth: r.breadth,
  }));

  const [, result] = await prisma.$transaction([
    prisma.occasion.update({
      where: { id: occasion.id },
      data: { status: "CLOSED", closedAt: new Date() },
    }),
    prisma.result.create({
      data: {
        occasionId: occasion.id,
        chosenName: cuisineLabel(winner.pick),
        chosenMeta,
        alsoConsidered,
      },
    }),
  ]);

  return NextResponse.json({ occasion: { id: occasion.id, status: "CLOSED" }, result });
}
