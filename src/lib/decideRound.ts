import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { cuisineLabel } from "@/lib/cuisineLabels";
import { getAiRestaurantPick } from "@/lib/aiPick";
import { rateLimited } from "@/lib/rateLimit";

// Each AI pick is a real Claude + web-search round trip, so bound how many a
// single host can trigger in a day - no tiers/billing exist yet, this is just
// a cost backstop. Closing a round and rerolling its pick share the budget.
export const AI_PICK_DAILY_LIMIT = 10;

const RANK_WEIGHTS = [3, 2, 1]; // 1st, 2nd, 3rd pick

export type DecideOccasion = Prisma.OccasionGetPayload<{
  include: { group: { include: { customOptions: true } }; answers: true };
}>;

type Tally = {
  score: number;
  breadth: number; // how many members included this pick at all
  firstPlaceVotes: number;
};

export type Decision = {
  chosenName: string;
  chosenMeta: Record<string, unknown>;
  alsoConsidered: unknown;
  usedAi: boolean;
};

export type DecideFailure = { error: string; status: number };

function dedupe(names: (string | null | undefined)[]): string[] {
  return Array.from(new Set(names.map((n) => (n ?? "").trim()).filter(Boolean)));
}

/**
 * Places the AI must stay away from for this group.
 *
 * - dislikedNames: anything a member rated "Not again" in a past check-in.
 *   Always applied - that's an explicit "never again" signal, so it doesn't
 *   depend on the round's "avoid repeats" toggle. (Previously these ratings
 *   were collected but never fed back into the prompt.)
 * - avoidNames: everywhere the group has already been, plus places they
 *   said they went to instead. Only when the round has "avoid repeats" on.
 */
export async function loadAvoidLists(occasion: { id: string; groupId: string; avoidRepeats: boolean }) {
  const [notAgainFeedback, pastResults, elsewhereFeedback] = await Promise.all([
    prisma.feedback.findMany({
      where: { occasion: { groupId: occasion.groupId }, rating: "NOT_AGAIN" },
      select: { choice: true, notes: true, occasion: { select: { result: { select: { chosenName: true } } } } },
    }),
    occasion.avoidRepeats
      ? prisma.result.findMany({
          where: { occasion: { groupId: occasion.groupId, status: "CLOSED", NOT: { id: occasion.id } } },
          select: { chosenName: true },
        })
      : Promise.resolve([] as { chosenName: string }[]),
    occasion.avoidRepeats
      ? prisma.feedback.findMany({
          where: { occasion: { groupId: occasion.groupId }, choice: "ELSEWHERE", notes: { not: null } },
          select: { notes: true },
        })
      : Promise.resolve([] as { notes: string | null }[]),
  ]);

  // "Not again" after going to the pick means the pick; after going
  // somewhere else it means the place they typed in.
  const dislikedNames = dedupe(
    notAgainFeedback.map((f) => (f.choice === "ELSEWHERE" ? f.notes : f.occasion.result?.chosenName))
  );
  const disliked = new Set(dislikedNames.map((n) => n.toLowerCase()));
  const avoidNames = dedupe([...pastResults.map((r) => r.chosenName), ...elsewhereFeedback.map((f) => f.notes)]).filter(
    (n) => !disliked.has(n.toLowerCase())
  );

  return { dislikedNames, avoidNames };
}

/**
 * Scores everyone's ranked picks (3/2/1 weighting, dealbreakers excluded) -
 * cheap, and gives the group's cuisine preference plus a safe fallback - then,
 * if the round has a location and the Claude API is configured, asks Claude
 * to search the web and name one real, verified restaurant grounded in that
 * scoring. If that fails or isn't configured, the result falls back to the
 * cuisine-only heuristic pick rather than ever inventing a restaurant.
 *
 * `rejectedNames` are suggestions already turned down for this round (a
 * reroll): they're excluded from both the AI prompt and the heuristic.
 * With `requireAi`, a missing AI pick is a failure instead of a fallback,
 * since a reroll that silently returns the same cuisine isn't a reroll.
 */
export async function decideRound(
  occasion: DecideOccasion,
  opts: { hostUserId: string; rejectedNames?: string[]; requireAi?: boolean }
): Promise<Decision | DecideFailure> {
  const rejectedNames = opts.rejectedNames ?? [];

  const dealbreakers = new Set<string>();
  for (const a of occasion.answers) {
    for (const d of a.dealbreakers) dealbreakers.add(d);
  }

  // Custom options are free-text labels a member typed in, not static
  // cuisine ids - resolve those by id before falling back to cuisineLabel's
  // title-casing (which would otherwise mangle a custom option's cuid id).
  const customLabelById = new Map(occasion.group.customOptions.map((o) => [o.id, o.label]));
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
    return { error: "Every pick submitted was ruled out as a dealbreaker", status: 409 };
  }

  const totalAnswers = occasion.answers.length;
  const rejectedLower = new Set(rejectedNames.map((n) => n.toLowerCase()));

  // For the cuisine-only fallback, a reroll moves on to the next cuisine.
  const heuristicRanked = ranked.filter((r) => !rejectedLower.has(labelFor(r.pick).toLowerCase()));
  const heuristicPool = heuristicRanked.length > 0 ? heuristicRanked : ranked;
  const winner = heuristicPool[0];
  const runnerUps = heuristicPool.slice(1, 3);

  const heuristicWhyParts: string[] = [];
  heuristicWhyParts.push(
    `${labelFor(winner.pick)} showed up in ${winner.breadth} of ${totalAnswers} top-3 picks` +
      (winner.firstPlaceVotes > 0
        ? `, ranked first by ${winner.firstPlaceVotes} ${winner.firstPlaceVotes === 1 ? "person" : "people"}.`
        : ".")
  );
  if (dealbreakers.size > 0) {
    heuristicWhyParts.push(`Ruled out for dealbreakers: ${Array.from(dealbreakers).map(labelFor).join(", ")}.`);
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
  let usedAi = false;

  if (occasion.location) {
    const overQuota = await rateLimited("ai-pick", opts.hostUserId, {
      max: AI_PICK_DAILY_LIMIT,
      windowMs: 24 * 60 * 60_000,
    });

    if (overQuota) {
      console.warn(`AI pick daily quota reached for host ${opts.hostUserId}, falling back to heuristic result`);
      if (opts.requireAi) {
        return { error: "You've hit today's limit for new picks. Try again tomorrow.", status: 429 };
      }
    } else {
      try {
        const { dislikedNames, avoidNames } = await loadAvoidLists(occasion);

        const aiPick = await getAiRestaurantPick({
          location: occasion.location,
          maxDistance: occasion.maxDistance,
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
          dislikedNames,
          rejectedNames,
        });

        if (aiPick) {
          usedAi = true;
          chosenName = aiPick.name;
          chosenMeta = {
            source: "claude",
            address: aiPick.address,
            priceRange: aiPick.priceRange,
            cuisine: aiPick.cuisine,
            why: aiPick.why,
            sourceUrl: aiPick.sourceUrl,
            rating: aiPick.rating,
            reviewCount: aiPick.reviewCount,
            heuristicPick: labelFor(winner.pick),
            totalAnswers,
          };
          alsoConsidered = aiPick.alsoConsidered;
        }
      } catch (err) {
        console.error("AI restaurant pick failed, falling back to heuristic result", err);
      }
    }
  }

  if (opts.requireAi && !usedAi) {
    return { error: "Couldn't find another verified place right now. Try again in a moment.", status: 502 };
  }

  return { chosenName, chosenMeta, alsoConsidered, usedAi };
}

export function isDecideFailure(d: Decision | DecideFailure): d is DecideFailure {
  return "error" in d;
}
