import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { cuisineLabel } from "@/lib/cuisineLabels";
import { getAiRestaurantPick } from "@/lib/aiPick";

// Web search + tool-use round trips can run past the platform's default
// function timeout, so give this route real headroom.
export const maxDuration = 60;

const RANK_WEIGHTS = [3, 2, 1]; // 1st, 2nd, 3rd pick

type Tally = {
  score: number;
  breadth: number; // how many members included this pick at all
  firstPlaceVotes: number;
};

/**
 * Closes a round and computes the pick from everyone's hidden answers.
 *
 * Always scores everyone's ranked picks first (3/2/1 weighting, dealbreakers
 * excluded) - that's cheap and gives us the group's cuisine preference plus
 * a safe fallback. If the occasion has a location and the Claude API is
 * configured, we then ask Claude to search the web and name one real,
 * verified restaurant grounded in that scoring; if that fails or isn't
 * configured, the result falls back to the cuisine-only heuristic pick
 * rather than ever inventing a restaurant.
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
      customOptions: true,
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

  // Custom options are free-text labels a member typed in, not static
  // cuisine ids - resolve those by id before falling back to cuisineLabel's
  // title-casing (which would otherwise mangle a custom option's cuid id).
  const customLabelById = new Map(occasion.customOptions.map((o) => [o.id, o.label]));
  const labelFor = (pick: string) => customLabelById.get(pick) ?? cuisineLabel(pick);

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

  const heuristicWhyParts: string[] = [];
  heuristicWhyParts.push(
    `${labelFor(winner.pick)} showed up in ${winner.breadth} of ${totalAnswers} top-3 picks` +
      (winner.firstPlaceVotes > 0
        ? `, ranked first by ${winner.firstPlaceVotes} ${winner.firstPlaceVotes === 1 ? "person" : "people"}.`
        : ".")
  );
  if (dealbreakers.size > 0) {
    heuristicWhyParts.push(
      `Ruled out for dealbreakers: ${Array.from(dealbreakers).map(labelFor).join(", ")}.`
    );
  }

  let chosenName = labelFor(winner.pick);
  let chosenMeta: Record<string, unknown> = {
    source: "heuristic",
    pick: winner.pick,
    score: winner.score,
    breadth: winner.breadth,
    firstPlaceVotes: winner.firstPlaceVotes,
    totalAnswers,
    why: heuristicWhyParts.join(" "),
  };
  let alsoConsidered: unknown = runnerUps.map((r) => ({
    pick: r.pick,
    label: labelFor(r.pick),
    score: r.score,
    breadth: r.breadth,
  }));

  if (occasion.location) {
    try {
      let avoidNames: string[] = [];
      if (occasion.avoidRepeats) {
        const [pastResults, elsewhereFeedback] = await Promise.all([
          prisma.result.findMany({
            where: { occasion: { groupId: occasion.groupId, status: "CLOSED", NOT: { id: occasion.id } } },
            select: { chosenName: true },
          }),
          prisma.feedback.findMany({
            where: { occasion: { groupId: occasion.groupId }, choice: "ELSEWHERE", notes: { not: null } },
            select: { notes: true },
          }),
        ]);
        avoidNames = Array.from(
          new Set(
            [...pastResults.map((r) => r.chosenName), ...elsewhereFeedback.map((f) => f.notes ?? "")]
              .map((n) => n.trim())
              .filter(Boolean)
          )
        );
      }

      const aiPick = await getAiRestaurantPick({
        location: occasion.location,
        occasionType: occasion.type,
        day: occasion.day,
        timeSlot: occasion.timeSlot,
        rankedTallies: ranked.slice(0, 5).map((r) => ({
          pick: r.pick,
          label: labelFor(r.pick),
          score: r.score,
          breadth: r.breadth,
          firstPlaceVotes: r.firstPlaceVotes,
        })),
        dealbreakerLabels: Array.from(dealbreakers).map(labelFor),
        budgets: occasion.answers.map((a) => a.budget).filter((b): b is string => Boolean(b)),
        vibes: occasion.answers.map((a) => a.vibe).filter((v): v is string => Boolean(v)),
        avoidNames,
      });

      if (aiPick) {
        chosenName = aiPick.name;
        chosenMeta = {
          source: "claude",
          address: aiPick.address,
          priceRange: aiPick.priceRange,
          cuisine: aiPick.cuisine,
          why: aiPick.why,
          sourceUrl: aiPick.sourceUrl,
          heuristicPick: labelFor(winner.pick),
          totalAnswers,
        };
        alsoConsidered = aiPick.alsoConsidered;
      }
    } catch (err) {
      console.error("AI restaurant pick failed, falling back to heuristic result", err);
    }
  }

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
