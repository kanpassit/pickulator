"use client";

import Link from "next/link";
import Script from "next/script";
import { useSyncExternalStore } from "react";

// Google Analytics is only loaded after an explicit "Accept". The choice
// lives in localStorage so it sticks per browser; "Decline" is remembered
// too so the banner doesn't nag. Everything the app needs to work (the
// sign-in and guest cookies) is unaffected by this choice.
const STORAGE_KEY = "pk_analytics_consent";
const CHANGE_EVENT = "pk-analytics-consent-change";

type Consent = "granted" | "denied" | "unset";

function readConsent(): Consent {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === "granted" || v === "denied" ? v : "unset";
  } catch {
    // Storage blocked (private mode etc.): treat as undecided, never track.
    return "unset";
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function choose(value: "granted" | "denied") {
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // ignore - the in-memory event below still updates this page view
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function AnalyticsConsent({ gaId }: { gaId: string }) {
  // Server snapshot is "denied" so nothing tracks or flashes during SSR/hydration.
  const consent = useSyncExternalStore<Consent>(subscribe, readConsent, () => "denied");

  return (
    <>
      {consent === "granted" && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              window.gtag = window.gtag || gtag;
              gtag('js', new Date());
              gtag('config', '${gaId}');
            `}
          </Script>
        </>
      )}

      {consent === "unset" && (
        <div
          role="dialog"
          aria-label="Analytics preference"
          className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-[480px] box-border rounded-2xl border border-border bg-white p-4 shadow-[0_8px_24px_rgba(42,33,27,0.18)] flex flex-col gap-3"
        >
          <p className="m-0 text-sm leading-[1.45]">
            Can we use Google Analytics to see how Pickulator is used? It&apos;s optional - the app works the same
            either way.{" "}
            <Link href="/privacy" className="font-semibold">
              Privacy
            </Link>
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => choose("denied")}
              className="flex-1 h-11 rounded-[10px] border-2 border-border bg-white text-sm font-semibold"
            >
              No thanks
            </button>
            <button
              type="button"
              onClick={() => choose("granted")}
              className="flex-1 h-11 rounded-[10px] border-none bg-primary text-white text-sm font-semibold"
            >
              Accept
            </button>
          </div>
        </div>
      )}
    </>
  );
}
