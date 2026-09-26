// The built-in cuisine/pick options shown on the Question and Dealbreakers
// screens, shared between them (and kept in sync with cuisineLabels.ts on
// the server) so both draw from the same canonical option ids.
//
// The right option set depends on the round's occasion type: a "Coffee" or
// "Drinks" round has nothing to do with tacos-vs-ramen, so those two get
// their own dedicated sets instead of the meal-cuisine list every other
// occasion type shares. setsFor() is the single place that decision lives -
// both screens call it rather than importing a set directly.
export type Option = { id: string; name: string; hint: string; dot: string };

const MEAL_SETS: Option[][] = [
  [
    { id: "thai", name: "Thai", hint: "Curries, noodles, basil everything", dot: "var(--tint-yellow)" },
    { id: "tacos", name: "Tacos", hint: "Street-style, salsa bar", dot: "var(--tint-pink)" },
    { id: "ramen", name: "Ramen", hint: "Rich broth, quick in and out", dot: "var(--tint-green)" },
    { id: "burgers", name: "Burgers", hint: "Smash patties, shakes, fries", dot: "var(--tint-tan)" },
  ],
  [
    { id: "indian", name: "Indian", hint: "Curries, naan, share-plate friendly", dot: "var(--tint-yellow)" },
    { id: "med", name: "Mediterranean", hint: "Grilled skewers, mezze, fresh salads", dot: "var(--tint-pink)" },
    { id: "kbbq", name: "Korean BBQ", hint: "Grill at the table, lots of sides", dot: "var(--tint-green)" },
    { id: "sushi", name: "Sushi", hint: "Rolls, nigiri, quick and light", dot: "var(--tint-tan)" },
  ],
  [
    { id: "pizza", name: "Pizza", hint: "Wood-fired, easy to share", dot: "var(--tint-yellow)" },
    { id: "viet", name: "Vietnamese", hint: "Pho, banh mi, herbs and broth", dot: "var(--tint-pink)" },
    { id: "sandwich", name: "Sandwiches", hint: "Casual, fast, good for a big group", dot: "var(--tint-green)" },
    { id: "mexican", name: "Mexican", hint: "Tortas, mole, fresh-pressed tortillas", dot: "var(--tint-tan)" },
  ],
  [
    { id: "chinese", name: "Chinese", hint: "Wok-fired, dumplings, family-style", dot: "var(--tint-yellow)" },
    { id: "greek", name: "Greek", hint: "Gyros, spreads, char-grilled skewers", dot: "var(--tint-pink)" },
    { id: "bbq", name: "BBQ", hint: "Smoked low and slow, saucy sides", dot: "var(--tint-green)" },
    { id: "seafood", name: "Seafood", hint: "Fresh catch, raw bar, coastal vibes", dot: "var(--tint-tan)" },
  ],
  [
    { id: "steakhouse", name: "Steakhouse", hint: "Chophouse cuts, sides worth splitting", dot: "var(--tint-yellow)" },
    { id: "vegan", name: "Vegan", hint: "Plant-based, still worth the trip", dot: "var(--tint-pink)" },
    { id: "breakfast", name: "Breakfast", hint: "Eggs, pancakes, brinner energy", dot: "var(--tint-green)" },
    { id: "wings", name: "Wings", hint: "Sauced and tossed, game-day energy", dot: "var(--tint-tan)" },
  ],
  [
    { id: "poke", name: "Poke", hint: "Cold, fresh, build-your-own bowls", dot: "var(--tint-yellow)" },
    { id: "dimsum", name: "Dim Sum", hint: "Small plates, cart-side, share everything", dot: "var(--tint-pink)" },
    { id: "ethiopian", name: "Ethiopian", hint: "Injera, stews, eat with your hands", dot: "var(--tint-green)" },
    { id: "surprise", name: "Surprise me", hint: "Let the crew history decide", dot: "var(--tint-tan)" },
  ],
];

const COFFEE_SETS: Option[][] = [
  [
    { id: "coffeeshop", name: "Coffee shop", hint: "Espresso, drip, a place to sit", dot: "var(--tint-yellow)" },
    { id: "boba", name: "Boba / bubble tea", hint: "Milk tea, fruit tea, extra toppings", dot: "var(--tint-pink)" },
    { id: "bakery", name: "Bakery", hint: "Pastries, bread, something flaky", dot: "var(--tint-green)" },
    { id: "dessert", name: "Dessert", hint: "Ice cream, cake, something sweet", dot: "var(--tint-tan)" },
  ],
  [
    { id: "teahouse", name: "Tea house", hint: "Loose-leaf, matcha, a slower pace", dot: "var(--tint-yellow)" },
    { id: "juicebar", name: "Juice / smoothie", hint: "Fresh-pressed, blended, something light", dot: "var(--tint-pink)" },
    { id: "donuts", name: "Donuts", hint: "Fresh, glazed, quick and sweet", dot: "var(--tint-green)" },
    { id: "surprise", name: "Surprise me", hint: "Let the crew history decide", dot: "var(--tint-tan)" },
  ],
];

const DRINKS_SETS: Option[][] = [
  [
    { id: "cocktailbar", name: "Cocktail bar", hint: "Craft drinks, a real menu", dot: "var(--tint-yellow)" },
    { id: "brewery", name: "Brewery", hint: "Beer flights, casual and loud", dot: "var(--tint-pink)" },
    { id: "winebar", name: "Wine bar", hint: "By the glass, small plates", dot: "var(--tint-green)" },
    { id: "divebar", name: "Dive bar", hint: "No frills, cheap, good jukebox", dot: "var(--tint-tan)" },
  ],
  [
    { id: "rooftop", name: "Rooftop / lounge", hint: "A view, a scene, dress a bit up", dot: "var(--tint-yellow)" },
    { id: "sportsbar", name: "Sports bar", hint: "Games on, wings, big groups", dot: "var(--tint-pink)" },
    { id: "speakeasy", name: "Speakeasy", hint: "Hidden, a little effort to find", dot: "var(--tint-green)" },
    { id: "surprise", name: "Surprise me", hint: "Let the crew history decide", dot: "var(--tint-tan)" },
  ],
];

// Keyed by OccasionType (see prisma/schema.prisma). Anything not listed
// here (or an unrecognized/missing type) falls back to the meal sets.
const SETS_BY_OCCASION: Record<string, Option[][]> = {
  COFFEE: COFFEE_SETS,
  DRINKS: DRINKS_SETS,
  BRUNCH: MEAL_SETS,
  LUNCH: MEAL_SETS,
  DINNER: MEAL_SETS,
  LATE: MEAL_SETS,
};

export function setsFor(occasionType: string | null | undefined): Option[][] {
  return (occasionType && SETS_BY_OCCASION[occasionType]) || MEAL_SETS;
}

// Kept for anything that genuinely wants "the default/meal list" regardless
// of occasion type. Prefer setsFor() in new code.
export const SETS = MEAL_SETS;

export const ALL: Record<string, Option> = Object.fromEntries(
  Object.values(SETS_BY_OCCASION)
    .flat(2)
    .map((o) => [o.id, o])
);
