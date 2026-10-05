"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { canNativeShare, shareOrCopy } from "@/lib/share";
import { directionsUrl, isReservable, reserveUrl, reviewsUrl, searchNearbyUrl, yelpUrl } from "@/lib/placeLinks";

type HeuristicMeta = {
  source: "heuristic";
  why: string;
  breadth: number;
  firstPlaceVotes: number;
  totalAnswers: number;
};
type ClaudeMeta = {
  source: "claude";
  why: string;
  address: string;
  priceRange: string | null;
  cuisine: string;
  sourceUrl: string;
  rating: number | null;
  reviewCount: number | null;
  heuristicPick: string;
  totalAnswers: number;
};
type Result = {
  chosenName: string;
  chosenMeta: HeuristicMeta | ClaudeMeta;
  alsoConsidered:
    | { pick: string; label: string; score: number; breadth: number }[]
    | { name: string; cuisine: string; why: string }[]
    | null;
};
type OccData = {
  occasion: { id: string; status: string; type?: string };
  group: { id: string; name: string };
  result: Result | null;
  isHost?: boolean;
};

const REROLL_ERROR = "Couldn't pick something else";

function ResultContent() {
  const params = useSearchParams();
  const occasionId = params.get("occasionId");
  const token = params.get("token");
  const [data, setData] = useState<OccData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rerolling, setRerolling] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [shareNote, setShareNote] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!occasionId) return;
    fetch(`/api/occasions/${occasionId}${token ? `?token=${encodeURIComponent(token)}` : ""}`)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Couldn't load this round");
        return body as OccData;
      })
      .then(setData)
      .catch((err) => setError(err.message));
  }, [occasionId, token]);

  useEffect(() => {
    load();
    // The host can swap the pick ("pick something else"), so everyone else's
    // screen refreshes itself instead of showing a place that's been dropped.
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, 8000);
    return () => clearInterval(interval);
  }, [load]);

  async function reroll() {
    if (!occasionId || rerolling) return;
    setRerolling(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/occasions/${occasionId}/reroll`, { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionError(body.error ?? REROLL_ERROR);
        return;
      }
      load();
    } finally {
      setRerolling(false);
    }
  }

  async function sharePick(name: string, address: string | null) {
    const outcome = await shareOrCopy({
      title: `We're going to ${name}`,
      text: `Pickulator picked ${name}${address ? ` (${address})` : ""} for ${data?.group.name ?? "us"}.`,
      url: directionsUrl(name, address),
    });
    if (outcome === "copied") {
      setShareNote("Link copied");
      setTimeout(() => setShareNote(null), 2000);
    }
  }

  if (error) {
    return <div className="w-full flex-1 flex items-center justify-center text-muted">{error}</div>;
  }
  if (!data) {
    return <div className="w-full flex-1 flex items-center justify-center text-muted">Loading…</div>;
  }
  if (!data.result) {
    return (
      <div className="w-full flex-1 flex items-center justify-center text-muted text-center px-6">
        This round hasn&apos;t been decided yet.
      </div>
    );
  }

  const { result } = data;
  const meta = result.chosenMeta;

  return (
    <div className="w-full flex-1 box-border px-6 pt-5 pb-6 flex flex-col gap-[22px]">
      <div className="flex items-center justify-between h-11">
        <div className="w-11 h-11" />
        <div className="flex-1 text-center text-sm text-muted">{data.group.name} · Decided</div>
        <Link href="/" className="w-11 h-11 flex items-center justify-center text-sm font-semibold text-muted">
          Done
        </Link>
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="text-[13px] font-bold tracking-[0.08em] uppercase text-primary">Tonight&apos;s pick</div>
        <div className="bg-white border border-border rounded-[24px] p-6 flex flex-col gap-3.5">
          <div className="flex flex-col gap-1.5">
            <h1 className="m-0 font-serif text-[34px] font-bold leading-[1.1]">{result.chosenName}</h1>
            {meta.source === "claude" ? (
              <div className="text-[15px] text-muted">
                {[meta.cuisine, meta.priceRange, meta.address].filter(Boolean).join(" · ")}
              </div>
            ) : (
              <div className="text-[15px] text-muted">
                {meta.breadth} of {meta.totalAnswers} picked it
                {meta.firstPlaceVotes > 0 ? ` · ${meta.firstPlaceVotes} ranked it first` : ""}
              </div>
            )}
            {meta.source === "claude" && meta.rating && (
              <div
                className="self-start px-2.5 py-1 rounded-full text-[13px] font-semibold flex items-center gap-1"
                style={{ background: "var(--tint-yellow)" }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                <span>
                  {meta.rating.toFixed(1)}
                  {meta.reviewCount ? ` (${meta.reviewCount.toLocaleString()})` : ""}
                </span>
              </div>
            )}
          </div>
          <div className="h-px bg-border" />
          <div className="flex flex-col gap-1.5">
            <div className="text-sm font-bold">Why this one</div>
            <div className="text-[15px] leading-[1.5]">{meta.why}</div>
          </div>
          {meta.source === "claude" && meta.sourceUrl && (
            <a
              href={meta.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-semibold text-primary"
            >
              View source →
            </a>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        {meta.source === "claude" ? (
          <>
            <a
              href={directionsUrl(result.chosenName, meta.address)}
              target="_blank"
              rel="noreferrer"
              className="h-14 box-border rounded-[14px] bg-primary text-white flex items-center justify-center text-[17px] font-semibold no-underline"
            >
              Get directions
            </a>
            <div className="grid grid-cols-2 gap-2.5">
              <a
                href={reviewsUrl(result.chosenName, meta.address)}
                target="_blank"
                rel="noreferrer"
                className="h-12 box-border rounded-[12px] border-2 border-border bg-white text-[#2A211B] flex items-center justify-center text-[15px] font-semibold no-underline"
              >
                Reviews &amp; hours
              </a>
              {isReservable(data.occasion.type) ? (
                <a
                  href={reserveUrl(result.chosenName, meta.address)}
                  target="_blank"
                  rel="noreferrer"
                  className="h-12 box-border rounded-[12px] border-2 border-border bg-white text-[#2A211B] flex items-center justify-center text-[15px] font-semibold no-underline"
                >
                  Reserve a table
                </a>
              ) : (
                <a
                  href={yelpUrl(result.chosenName, meta.address)}
                  target="_blank"
                  rel="noreferrer"
                  className="h-12 box-border rounded-[12px] border-2 border-border bg-white text-[#2A211B] flex items-center justify-center text-[15px] font-semibold no-underline"
                >
                  See on Yelp
                </a>
              )}
            </div>
          </>
        ) : (
          <a
            href={searchNearbyUrl(result.chosenName)}
            target="_blank"
            rel="noreferrer"
            className="h-14 box-border rounded-[14px] bg-primary text-white flex items-center justify-center text-[17px] font-semibold no-underline"
          >
            Find {result.chosenName} nearby
          </a>
        )}
        <button
          type="button"
          onClick={() => sharePick(result.chosenName, meta.source === "claude" ? meta.address : null)}
          className="h-12 rounded-[12px] border-none bg-transparent text-primary text-[15px] font-semibold"
        >
          {shareNote ?? (canNativeShare() ? "Share this pick with the group" : "Copy a link to this pick")}
        </button>
      </div>

      {result.alsoConsidered && result.alsoConsidered.length > 0 && (
        <div className="flex flex-col gap-1">
          <div className="text-base font-semibold mb-1">Also considered</div>
          {result.alsoConsidered.map((o, i) => {
            const key = "name" in o ? o.name : o.pick;
            const label = "name" in o ? o.name : o.label;
            const sub = "why" in o ? o.why : `${o.breadth} picked it`;
            return (
              <div
                key={key}
                className={`flex flex-col gap-0.5 py-3 ${
                  i < result.alsoConsidered!.length - 1 ? "border-b border-border" : ""
                }`}
              >
                <div className="text-base font-semibold">{label}</div>
                <div className="text-sm text-muted">{sub}</div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex-grow" />
      <div className="flex flex-col gap-3">
        {data.isHost && (
          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={reroll}
              disabled={rerolling}
              className="h-12 rounded-[14px] border-2 border-border bg-white text-[#2A211B] text-[15px] font-semibold disabled:opacity-60"
            >
              {rerolling ? "Finding another place…" : "Not feeling it? Pick something else"}
            </button>
            {actionError && <div role="alert" className="text-sm text-primary text-center">{actionError}</div>}
            {rerolling && (
              <div className="text-[13px] leading-[1.4] text-muted text-center">
                Everyone&apos;s answers still count. This can take up to a minute.
              </div>
            )}
          </div>
        )}
        <Link
          href={`/feedback?occasionId=${occasionId}`}
          className="h-14 box-border rounded-[14px] border-2 border-primary bg-white text-primary flex items-center justify-center text-[17px] font-semibold no-underline"
        >
          We went here
        </Link>
      </div>
    </div>
  );
}

export default function ResultPage() {
  return (
    <Suspense fallback={<div className="w-full flex-1 flex items-center justify-center text-muted">Loading…</div>}>
      <ResultContent />
    </Suspense>
  );
}
