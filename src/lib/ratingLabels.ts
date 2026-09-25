// Matches the RATINGS options on the Feedback screen (src/app/feedback/page.tsx).
export const RATING_LABELS: Record<string, { label: string; bg: string }> = {
  LOVED: { label: "Loved it", bg: "var(--tint-green)" },
  FINE: { label: "It was fine", bg: "var(--tint-yellow)" },
  NOT_AGAIN: { label: "Not again", bg: "var(--tint-pink)" },
};
