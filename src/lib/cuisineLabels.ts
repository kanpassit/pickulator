// Display labels for the cuisine/option ids used on the Question screen.
// Anything not listed here just gets title-cased as a fallback.
const LABELS: Record<string, string> = {
  thai: "Thai",
  tacos: "Tacos",
  ramen: "Ramen",
  surprise: "Surprise me",
  burgers: "Burgers",
  indian: "Indian",
  med: "Mediterranean",
  kbbq: "Korean BBQ",
  sushi: "Sushi",
  pizza: "Pizza",
  viet: "Vietnamese",
  sandwich: "Sandwiches",
};

export function cuisineLabel(id: string): string {
  if (LABELS[id]) return LABELS[id];
  return id
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}
