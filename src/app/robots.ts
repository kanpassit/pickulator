import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/privacy", "/terms"],
      // Everything below is per-user app state or a private invite link,
      // not content worth indexing.
      disallow: [
        "/api/",
        "/j/",
        "/question",
        "/waiting",
        "/result",
        "/feedback",
        "/invite",
        "/start",
        "/occasion",
        "/vibe",
        "/budget",
        "/dealbreakers",
        "/groups",
        "/friends",
        "/account",
        "/reset-password",
        "/forgot-password",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
