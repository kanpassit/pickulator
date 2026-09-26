"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

// gtag.js only auto-fires a page_view on the very first (full) page load.
// Every route change after that happens client-side (next/link, router.push
// - see e.g. src/app/j/[token]/JoinPageClient.tsx's router.push calls), which
// gtag.js has no way to see on its own, so without this the vast majority of
// navigation through the app would go untracked. This fires a page_view on
// every pathname/query change instead.
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function GoogleAnalyticsPageView({ gaId }: { gaId: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname || typeof window.gtag !== "function") return;
    const query = searchParams.toString();
    window.gtag("config", gaId, { page_path: query ? `${pathname}?${query}` : pathname });
  }, [pathname, searchParams, gaId]);

  return null;
}
