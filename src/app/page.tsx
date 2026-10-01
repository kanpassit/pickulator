import type { Metadata } from "next";
import { getCurrentUser, type SessionUser } from "@/lib/auth";
import Landing from "@/components/Landing";
import HomeClient from "./HomeClient";

// Public landing copy for search/social. Next doesn't merge nested
// openGraph/twitter objects, so they're repeated in full here.
const TITLE = "Pickulator: decide where your group eats, without the debate";
const DESCRIPTION =
  "Everyone privately ranks what they're in the mood for and sets dealbreakers. AI picks one real restaurant your whole group can agree on, and explains why. Free.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "https://pickulator.com",
    siteName: "Pickulator",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/og-image.png"],
  },
};

export default async function Home() {
  // Signed-in users get their dashboard; everyone else (including
  // crawlers) gets the fully server-rendered landing page. A failed lookup
  // (e.g. the database is briefly unreachable) must not take the public
  // page down, so it falls back to the landing page.
  let user: SessionUser | null = null;
  try {
    user = await getCurrentUser();
  } catch (err) {
    console.error("Home: session lookup failed, showing landing page", err);
  }

  return user ? <HomeClient user={user} /> : <Landing />;
}
