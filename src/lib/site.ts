export const SITE_URL = "https://pickulator.com";
export const SITE_NAME = "Pickulator";

// Optional public contact address shown on the legal pages. Set
// NEXT_PUBLIC_CONTACT_EMAIL in Vercel to display one; when unset the
// "Contact" line is simply omitted rather than showing a made-up address.
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || null;

// Bump when privacy.tsx / terms.tsx change in a way users should know about.
export const LEGAL_LAST_UPDATED = "September 30, 2026";
