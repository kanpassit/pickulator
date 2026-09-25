"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Option = { id: string; name: string; hint: string; dot: string };

const SETS: Option[][] = [
  [
    { id: "thai", name: "Thai", hint: "Curries, noodles, basil everything", dot: "var(--tint-yellow)" },
    { id: "tacos", name: "Tacos", hint: "Street-style, salsa bar", dot: "var(--tint-pink)" },
    { id: "ramen", name: "Ramen", hint: "Rich broth, quick in and out", dot: "var(--tint-green)" },
    { id: "surprise", name: "Surprise me", hint: "Let the crew history decide", dot: "var(--tint-tan)" },
  ],
  [
    { id: "burgers", name: "Burgers", hint: "Smash patties, shakes, fries", dot: "var(--tint-yellow)" },
    { id: "indian", name: "Indian", hint: "Curries, naan, share-plate friendly", dot: "var(--tint-pink)" },
    { id: "med", name: "Mediterranean", hint: "Grilled skewers, mezze, fresh salads", dot: "var(--tint-green)" },
    { id: "kbbq", name: "Korean BBQ", hint: "Grill at the table, lots of sides", dot: "var(--tint-tan)" },
  ],
  [
    { id: "sushi", name: "Sushi", hint: "Rolls, nigiri, quick and light", dot: "var(--tint-yellow)" },
    { id: "pizza", name: "Pizza", hint: "Wood-fired, easy to share", dot: "var(--tint-pink)" },
    { id: "viet", name: "Vietnamese", hint: "Pho, banh mi, herbs and broth", dot: "var(--tint-green)" },
    { id: "sandwich", name: "Sandwiches", hint: "Casual, fast, good for a big group", dot: "var(--tint-tan)" },
  ],
];

const ALL: Record<string, Option> = Object.fromEntries(SETS.flat().map((o) => [o.id, o]));

function QuestionContent() {
  const params = useSearchParams();
  const occasionId = params.get("occasionId");
  const token = params.get("token");
  const router = useRouter();

  const [picks, setPicks] = useState<string[]>([]);
  const [set, setSet] = useState(0);
  const [label, setLabel] = useState("New round");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!occasionId) return;
    fetch(`/api/occasions/${occasionId}`)
      .then((res) => res.json())
      .then((body) => {
        if (body.group && body.occasion) {
          setLabel(`${body.group.name} · ${body.occasion.type[0]}${body.occasion.type.slice(1).toLowerCase()}`);
        }
      })
      .catch(() => {});
  }, [occasionId]);

  const full = picks.length >= 3;
  const opts = SETS[set % SETS.length];

  function toggle(id: string) {
    setPicks((cur) => {
      if (cur.includes(id)) return cur.filter((x) => x !== id);
      if (cur.length < 3) return [...cur, id];
      return cur;
    });
  }

  async function submit() {
    if (!occasionId || !full) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/occasions/${occasionId}/answers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(token ? { linkToken: token, rankedPicks: picks } : { rankedPicks: picks }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't save your picks");
        return;
      }
      const q = new URLSearchParams({ occasionId });
      if (token) q.set("token", token);
      router.push(`/waiting?${q.toString()}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full flex-1 box-border px-6 pt-5 pb-6 flex flex-col gap-5">
      <div className="flex items-center justify-between h-11">
        <div className="w-11 h-11" />
        <div className="text-sm text-muted">{label}</div>
        <div className="w-11" />
      </div>

      <div className="flex flex-col gap-2 mt-2">
        <h1 className="m-0 font-serif text-[34px] font-bold leading-[1.12]">Pick your top 3</h1>
        <div className="text-[15px] leading-[1.4] text-muted">
          What are you in the mood for? Tap in order, favorite first. Only you can see your picks.
        </div>
      </div>

      <div className="flex gap-2">
        {[0, 1, 2].map((i) => {
          const id = picks[i];
          const on = !!id;
          return (
            <div
              key={i}
              className="flex-1 min-w-0 box-border h-10 px-2.5 rounded-full border-2 flex items-center gap-2 overflow-hidden"
              style={{
                borderStyle: on ? "solid" : "dashed",
                borderColor: on ? "var(--primary)" : "#B8AA98",
                background: on ? "#FFFFFF" : "transparent",
              }}
            >
              <div
                className="w-[22px] h-[22px] shrink-0 rounded-full flex items-center justify-center text-[13px] font-bold"
                style={{ background: on ? "var(--primary)" : "var(--tint-tan)", color: on ? "#FFFFFF" : "var(--muted)" }}
              >
                {i + 1}
              </div>
              <div
                className="text-sm font-semibold whitespace-nowrap overflow-hidden text-ellipsis"
                style={{ color: on ? "var(--foreground)" : "var(--muted)" }}
              >
                {on ? ALL[id].name : "Empty"}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {opts.map((o) => {
          const idx = picks.indexOf(o.id);
          const on = idx >= 0;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => toggle(o.id)}
              className="box-border h-[152px] px-4 py-3.5 rounded-[20px] border-2 bg-white flex flex-col justify-between items-start text-left"
              style={{ borderColor: on ? "var(--primary)" : "var(--border)", opacity: !on && full ? 0.5 : 1 }}
            >
              <div className="flex items-center justify-between w-full">
                <div className="w-9 h-9 rounded-full" style={{ background: o.dot }} />
                {on && (
                  <div className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-[15px] font-bold">
                    {idx + 1}
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <div className="text-xl font-bold">{o.name}</div>
                <div className="text-sm leading-[1.35] text-muted">{o.hint}</div>
              </div>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => setSet((s) => (s + 1) % SETS.length)}
        className="-mt-2 h-[52px] rounded-[14px] border-none flex items-center justify-center gap-2 text-base font-semibold"
        style={{ background: "var(--tint-tan)" }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 12a8 8 0 11-2.3-5.6" />
          <path d="M20 4v5h-5" />
        </svg>
        <span>Give me more options</span>
      </button>

      <div className="flex-grow" />
      <div className="flex items-center justify-center gap-2 text-sm text-muted">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="5" y="11" width="14" height="9" rx="2" />
          <path d="M8 11V8a4 4 0 018 0v3" />
        </svg>
        <span>Hidden until everyone has answered</span>
      </div>
      {error && <div className="text-sm text-primary text-center">{error}</div>}
      <button
        type="button"
        onClick={submit}
        disabled={!full || busy || !occasionId}
        className="h-14 rounded-[14px] flex items-center justify-center text-[17px] font-semibold border-none disabled:cursor-not-allowed"
        style={{
          background: full ? "var(--primary)" : "var(--border)",
          color: full ? "#FFFFFF" : "var(--muted)",
        }}
      >
        {busy ? "Saving…" : full ? "Submit my picks" : `Pick ${3 - picks.length} more`}
      </button>
    </div>
  );
}

export default function QuestionPage() {
  return (
    <Suspense fallback={<div className="w-full flex-1 flex items-center justify-center text-muted">Loading…</div>}>
      <QuestionContent />
    </Suspense>
  );
}
