// The built-in cuisine/pick options shown on the Question screen, shared
// with the Dealbreakers screen so both draw from the same canonical list
// (and stay in sync with cuisineLabels.ts on the server).
export type Option = { id: string; name: string; hint: string; dot: string };

export const SETS: Option[][] = [
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

export const ALL: Record<string, Option> = Object.fromEntries(SETS.flat().map((o) => [o.id, o]));
