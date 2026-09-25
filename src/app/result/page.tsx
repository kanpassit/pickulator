"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

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
  occasion: { id: string; status: string };
  group: { id: string; name: string };
  result: Result | null;
};

function ResultContent() {
  const occasionId = useSearchParams().get("occasionId");
  const [data, setData] = useState<OccData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!occasionId) return;
    fetch(`/api/occasions/${occasionId}`)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Couldn't load this round");
        return body as OccData;
      })
      .then(setData)
      .catch((err) => setError(err.message));
  }, [occasionId]);

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
      <div className="flex items-center justify-center h-11 text-sm text-muted">{data.group.name} · Decided</div>

      <div className="flex flex-col gap-2.5">
        <div className="text-[13px] font-bold tracking-[0.08em] uppercase text-primary">Tonight&apos;s pick</div>
        <div className="bg-white border border-border rounded-[24px] p-6 flex flex-col gap-3.5">
          <div className="flex flex-col gap-1.5">
            <div className="font-serif text-[34px] font-bold leading-[1.1]">{result.chosenName}</div>
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
