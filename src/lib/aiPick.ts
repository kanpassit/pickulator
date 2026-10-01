import Anthropic from "@anthropic-ai/sdk";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

// The prompt below is written generically ("restaurant") because that's
// what most rounds are, but a Coffee or Drinks round isn't looking for a
// restaurant at all - these keep the prompt honest about what kind of
// place and activity actually fits the occasion.
function venueNoun(occasionType: string): string {
  if (occasionType === "COFFEE") return "coffee shop, café, or similar spot";
  if (occasionType === "DRINKS") return "bar";
  return "restaurant";
}

function activityPhrase(occasionType: string): string {
  if (occasionType === "COFFEE") return "where to grab coffee";
  if (occasionType === "DRINKS") return "where to grab drinks";
  return "where to eat";
}

export type RankedTally = {
  pick: string;
  label: string;
  score: number;
  breadth: number;
  firstPlaceVotes: number;
};

export type AiPickInput = {
  location: string;
  maxDistance: string | null;
  occasionType: string;
  day: string;
  timeSlot: string;
  rankedTallies: RankedTally[];
  dealbreakerLabels: string[];
  budgets: string[];
  vibes: string[];
  // Places the group has been to recently (only when the round has
  // "avoid repeats" on) - soft "we want somewhere new" signal.
  avoidNames: string[];
  // Places someone in the group rated "Not again" after a past round.
  // Always excluded, whether or not "avoid repeats" is on.
  dislikedNames: string[];
  // Picks the host already turned down for THIS round (reroll).
  rejectedNames: string[];
};

export type AiPickCandidate = {
  name: string;
  cuisine: string;
  why: string;
};

export type AiPickResult = {
  name: string;
  address: string;
  priceRange: string | null;
  cuisine: string;
  why: string;
  sourceUrl: string;
  rating: number | null;
  reviewCount: number | null;
  alsoConsidered: AiPickCandidate[];
};

const PROPOSE_PICK_TOOL = {
  name: "propose_pick",
  description:
    "Report the final recommendation for the group. Only call this once you have verified via web search that the place is real and currently operating.",
  input_schema: {
    type: "object" as const,
    properties: {
      name: { type: "string", description: "The place's real name, exactly as found via search" },
      address: { type: "string", description: "Street address as found via search" },
      priceRange: { type: "string", description: "e.g. $, $$, $$$ - empty string if unknown" },
      cuisine: { type: "string" },
      why: { type: "string", description: "2-4 sentences tying the pick to the group's answers below" },
      sourceUrl: { type: "string", description: "A URL from the search results confirming this place exists" },
      rating: {
        type: "number",
        description: "Google/Yelp star rating out of 5 if you found one in your search results (e.g. 4.3), omit entirely if you didn't see one - never estimate or guess a number",
      },
      reviewCount: {
        type: "number",
        description: "Number of reviews behind that rating if shown, omit entirely if you didn't see one",
      },
      alsoConsidered: {
        type: "array",
        maxItems: 2,
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            cuisine: { type: "string" },
            why: { type: "string" },
          },
          required: ["name", "cuisine", "why"],
        },
      },
    },
    required: ["name", "address", "cuisine", "why", "sourceUrl", "alsoConsidered"],
  },
};

/**
 * Asks Claude to search the web and recommend one REAL, verifiable
 * restaurant for the group, grounded in their aggregated answers. Returns
 * null (never a guess) if the model can't produce a verified pick - the
 * caller should fall back to the cuisine-only heuristic result.
 */
export async function getAiRestaurantPick(input: AiPickInput): Promise<AiPickResult | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;

  const client = new Anthropic();

  const rankedSummary = input.rankedTallies
    .map(
      (t) =>
        `- ${t.label}: weighted score ${t.score} (in ${t.breadth} people's top 3, ranked first by ${t.firstPlaceVotes})`
    )
    .join("\n");

  const venue = venueNoun(input.occasionType);

  const userMessage = `A group of friends is deciding ${activityPhrase(input.occasionType)} together. Recommend ONE real, currently-operating ${venue} near "${input.location}", using web search to verify it actually exists before you recommend it.
${
  input.maxDistance && input.maxDistance !== "No limit"
    ? `The group only wants to travel within ${input.maxDistance} of "${input.location}" - do not recommend anywhere farther than that.\n`
    : ""
}
Occasion: ${input.occasionType} on ${input.day}, around ${input.timeSlot}.

Cuisine preferences (weighted by everyone's ranked top-3 picks; higher score = stronger group preference):
${rankedSummary || "- no picks submitted"}

Hard dealbreakers (never recommend a place whose main category is one of these): ${
    input.dealbreakerLabels.length ? input.dealbreakerLabels.join(", ") : "none"
  }
Budget notes from the group: ${input.budgets.length ? input.budgets.join(", ") : "none given"}
Vibe notes from the group: ${input.vibes.length ? input.vibes.join(", ") : "none given"}
${
  input.avoidNames.length
    ? `\nThe group wants somewhere NEW this time. They've already been to these places recently - do NOT recommend any of them again, as a top pick or as a backup: ${input.avoidNames.join(", ")}.\n`
    : ""
}${
  input.dislikedNames.length
    ? `\nSomeone in this group rated these places "Not again" after going - never recommend them, as a top pick or as a backup: ${input.dislikedNames.join(", ")}.\n`
    : ""
}${
  input.rejectedNames.length
    ? `\nThe host already turned down these suggestions for this round - recommend something clearly different, and never one of these, as a top pick or as a backup: ${input.rejectedNames.join(", ")}.\n`
    : ""
}
Search the web to find a real ${venue} near that location matching the group's top preference (or their next-best preference if you can't verify a place for the top one). You MUST verify with a search result that it exists and is currently open for business before recommending it - never invent a place, address, or URL. Prefer a well-reviewed option (roughly 3.5 stars and up on Google or Yelp) among places that otherwise fit; only fall back to something lower-rated if nothing meeting the other criteria has a decent rating. If your search results show a star rating and review count, include them - but never estimate, guess, or make one up if you didn't actually see it. Then find up to 2 real backup alternatives you also verified. When you're done, call propose_pick with your final answer - don't just describe it in plain text.`;

  const tools = [
    { type: "web_search_20250305", name: "web_search", max_uses: 4 },
    PROPOSE_PICK_TOOL,
  ];

  const messages: Anthropic.MessageParam[] = [{ role: "user", content: userMessage }];

  let response = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    tools: tools as never,
    messages,
  });

  let proposal = extractProposal(response);

  if (!proposal) {
    // The model searched but didn't end on the tool call - force it on a follow-up turn.
    messages.push({ role: "assistant", content: response.content });
    messages.push({
      role: "user",
      content: "Call propose_pick now with your final recommendation, based on everything above.",
    });
    response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      tools: [PROPOSE_PICK_TOOL] as never,
      tool_choice: { type: "tool", name: "propose_pick" },
      messages,
    });
    proposal = extractProposal(response);
  }

  if (!proposal) return null;

  // The prompt asks the model to skip excluded places, but the exclusion
  // is a hard rule (e.g. "Not again" ratings), so verify it instead of
  // trusting the model, and give it one corrective turn before giving up.
  const excluded = [...input.avoidNames, ...input.dislikedNames, ...input.rejectedNames];
  let result = parseProposal(proposal);

  if (result && excluded.length > 0 && isExcluded(result, excluded)) {
    const toolUseId = findProposeToolUseId(response);
    messages.push({ role: "assistant", content: response.content });
    messages.push({
      role: "user",
      content: [
        ...(toolUseId
          ? [
              {
                type: "tool_result" as const,
                tool_use_id: toolUseId,
                is_error: true,
                content: `Rejected: "${result.name}" (or one of your backups) is on the excluded list (${excluded.join(
                  ", "
                )}). Pick a different, verified place.`,
              },
            ]
          : []),
        {
          type: "text" as const,
          text: `That recommendation includes a place the group ruled out (${excluded.join(
            ", "
          )}). Call propose_pick again with a different verified place, and make sure none of the backups are on that list either.`,
        },
      ],
    });
    response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      tools: tools as never,
      tool_choice: { type: "tool", name: "propose_pick" },
      messages,
    });
    const retryProposal = extractProposal(response);
    result = retryProposal ? parseProposal(retryProposal) : null;
    // Still on the list: no pick beats a pick the group said no to.
    if (result && isExcluded(result, excluded)) return null;
  }

  return result;
}

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function sameVenue(a: string, b: string): boolean {
  const x = normalizeName(a);
  const y = normalizeName(b);
  if (!x || !y) return false;
  if (x === y) return true;
  // "Ramen-Desu" vs "Ramen-Desu San Diego": one name contains the other.
  const [short, long] = x.length <= y.length ? [x, y] : [y, x];
  return short.length >= 5 && long.includes(short);
}

function isExcluded(result: AiPickResult, excluded: string[]): boolean {
  const names = [result.name, ...result.alsoConsidered.map((c) => c.name)].filter(Boolean);
  return names.some((n) => excluded.some((e) => sameVenue(n, e)));
}

function parseProposal(proposal: Record<string, unknown>): AiPickResult | null {
  const name = String(proposal.name ?? "").trim();
  const address = String(proposal.address ?? "").trim();
  const cuisine = String(proposal.cuisine ?? "").trim();
  const why = String(proposal.why ?? "").trim();
  const sourceUrl = String(proposal.sourceUrl ?? "").trim();
  const ratingNum = typeof proposal.rating === "number" && Number.isFinite(proposal.rating) ? proposal.rating : null;
  const reviewCountNum =
    typeof proposal.reviewCount === "number" && Number.isFinite(proposal.reviewCount) ? proposal.reviewCount : null;

  // Guard against a degenerate/empty tool call rather than trusting it blindly.
  if (!name || !why) return null;

  return {
    name,
    address,
    priceRange: proposal.priceRange ? String(proposal.priceRange).trim() : null,
    cuisine,
    why,
    sourceUrl,
    rating: ratingNum !== null && ratingNum > 0 && ratingNum <= 5 ? ratingNum : null,
    reviewCount: reviewCountNum !== null && reviewCountNum >= 0 ? reviewCountNum : null,
    alsoConsidered: Array.isArray(proposal.alsoConsidered)
      ? (proposal.alsoConsidered as unknown[]).slice(0, 2).map((a) => {
          const c = (a ?? {}) as Record<string, unknown>;
          return {
            name: String(c.name ?? "").trim(),
            cuisine: String(c.cuisine ?? "").trim(),
            why: String(c.why ?? "").trim(),
          };
        })
      : [],
  };
}

function findProposeToolUseId(response: Anthropic.Message): string | null {
  const block = response.content.find(
    (b) => b.type === "tool_use" && (b as { name?: string }).name === "propose_pick"
  ) as { id?: string } | undefined;
  return block?.id ?? null;
}

function extractProposal(response: Anthropic.Message): Record<string, unknown> | null {
  const block = response.content.find(
    (b) => b.type === "tool_use" && (b as { name?: string }).name === "propose_pick"
  ) as { input?: unknown } | undefined;
  if (!block || typeof block.input !== "object" || block.input === null) return null;
  return block.input as Record<string, unknown>;
}
