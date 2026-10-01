// Outbound links for a chosen place. These are plain search/directions URLs
// built from the name + address the AI verified, so they work without any
// extra API key or place-ID lookup; the destination site resolves the place.

function query(name: string, address?: string | null) {
  return [name, address].filter(Boolean).join(", ");
}

export function directionsUrl(name: string, address?: string | null) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query(name, address))}`;
}

/** Google Maps place card: reviews, hours, phone and often a reserve button. */
export function reviewsUrl(name: string, address?: string | null) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query(name, address))}`;
}

export function yelpUrl(name: string, address?: string | null) {
  const params = new URLSearchParams({ find_desc: name });
  if (address) params.set("find_loc", address);
  return `https://www.yelp.com/search?${params.toString()}`;
}

export function reserveUrl(name: string, address?: string | null) {
  return `https://www.google.com/search?q=${encodeURIComponent(`${query(name, address)} reserve a table`)}`;
}

/** Fallback for cuisine-only results, where there's no specific place yet. */
export function searchNearbyUrl(term: string) {
  return `https://www.google.com/maps/search/${encodeURIComponent(`${term} near me`)}`;
}

// Rounds where booking a table is a realistic next step.
export function isReservable(occasionType: string | undefined) {
  return occasionType === "DINNER" || occasionType === "LUNCH" || occasionType === "BRUNCH";
}
