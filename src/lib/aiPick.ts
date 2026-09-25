import Anthropic from "@anthropic-ai/sdk";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

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
  avoidNames: string[];
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
    "Report the final restaurant recommendation for the group. Only call this once you have verified via web search that the restaurant is real and currently operating.",
  input_schema: {
    type: "object" as const,
    properties: {
      name: { type: "string", description: "The restaurant's real name, exactly as found via search" },
      address: { type: "string", description: "Street address as found via search" },
      priceRange: { type: "string", description: "e.g. $, $$, $$$ - empty string if unknown" },
      cuisine: { type: "string" },
      why: { type: "string", description: "2-4 sentences tying the pick to the group's answers below" },
      sourceUrl: { type: "string", description: "A URL from the search results confirming this restaurant exists" },
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

  const userMessage = `A group of friends is deciding where to eat. Recommend ONE real, currently-operating restaurant near "${input.location}", using web search to verify it actually exists before you recommend it.
${
  input.maxDistance && input.maxDistance !== "No limit"
    ? `The group only wants to travel within ${input.maxDistance} of "${input.location}" - do not recommend anywhere farther than that.\n`
    : ""
}
Occasion: ${input.occasionType} on ${input.day}, around ${input.timeSlot}.

Cuisine preferences (weighted by everyone's ranked top-3 picks; higher score = stronger group preference):
${rankedSummary || "- no picks submitted"}

Hard dealbreakers (never recommend a restaurant whose main cuisine is one of these): ${
    input.dealbreakerLabels.length ? input.dealbreakerLabels.join(", ") : "none"
  }
Budget notes from the group: ${input.budgets.length ? input.budgets.join(", ") : "none given"}
Vibe notes from the group: ${input.vibes.length ? input.vibes.join(", ") : "none given"}
${
  input.avoidNames.length
    ? `\nThe group wants somewhere NEW this time. They've already been to these places recently - do NOT recommend any of them again, as a top pick or as a backup: ${input.avoidNames.join(", ")}.\n`
    : ""
}
Search the web to find a real restaurant near that location matching the group's top cuisine preference (or their next-best preference if you can't verify a place for the top one). You MUST verify with a search result that it exists and is currently open for business before recommending it - never invent a restaurant, address, or URL. Prefer a well-reviewed option (roughly 3.5 stars and up on Google or Yelp) among places that otherwise fit; only fall back to something lower-rated if nothing meeting the other criteria has a decent rating. If your search results show a star rating and review count, include them - but never estimate, guess, or make one up if you didn't actually see it. Then find up to 2 real backup alternatives you also verified. When you're done, call propose_pick with your final answer - don't just describe it in plain text.`;

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

function extractProposal(response: Anthropic.Message): Record<string, unknown> | null {
  const block = response.content.find(
    (b) => b.type === "tool_use" && (b as { name?: string }).name === "propose_pick"
  ) as { input?: unknown } | undefined;
  if (!block || typeof block.input !== "object" || block.input === null) return null;
  return block.input as Record<string, unknown>;
}
