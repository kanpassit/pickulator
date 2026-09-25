"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { QuestionProgress } from "../_components/QuestionProgress";

const MODES = [
  { id: "DRIVE", name: "Driving", hint: "I'll take a car", dot: "var(--tint-yellow)" },
  { id: "TRANSIT", name: "Transit", hint: "Bus, train, or a rideshare", dot: "var(--tint-pink)" },
  { id: "WALK", name: "Walking", hint: "Keep it close by", dot: "var(--tint-green)" },
  { id: "BIKE", name: "Biking", hint: "On two wheels", dot: "var(--tint-tan)" },
] as const;

function LocationContent() {
  const params = useSearchParams();
  const occasionId = params.get("occasionId");
  const token = params.get("token");
  const picks = params.get("picks") ?? "";
  const vibe = params.get("vibe");
  const budget = params.get("budget");
  const out = params.get("out") ?? "";
  const router = useRouter();

  const [mode, setMode] = useState<string | null>(params.get("mode"));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const backQ = new URLSearchParams({ occasionId: occasionId ?? "", picks });
  if (token) backQ.set("token", token);
  if (vibe) backQ.set("vibe", vibe);
  if (budget) backQ.set("budget", budget);
  if (out) backQ.set("out", out);
  const backHref = `/dealbreakers?${backQ.toString()}`;

  async function submit() {
    if (!occasionId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/occasions/${occasionId}/answers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(token ? { linkToken: token } : {}),
          rankedPicks: picks.split(",").filter(Boolean),
          vibe,
          budget,
          dealbreakers: out.split(",").filter(Boolean),
          locationMode: mode,
        }),
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
      <QuestionProgress step={5} total={5} label="How are you getting there?" backHref={backHref} />

      <div className="flex flex-col gap-2 mt-2">
        <h1 className="m-0 font-serif text-[34px] font-bold leading-[1.12]">Getting there</h1>
        <div className="text-[15px] leading-[1.4] text-muted">Optional - helps me weigh how far is too far for the group.</div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {MODES.map((m) => {
          const on = mode === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(on ? null : m.id)}
              className="box-border h-[128px] px-4 py-3.5 rounded-[20px] border-2 bg-white flex flex-col justify-between items-start text-left"
              style={{ borderColor: on ? "var(--primary)" : "var(--border)" }}
            >
              <div className="w-9 h-9 rounded-full" style={{ background: m.dot }} />
              <div className="flex flex-col gap-1">
                <div className="text-lg font-bold">{m.name}</div>
                <div className="text-sm leading-[1.35] text-muted">{m.hint}</div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex-grow" />
      {error && <div className="text-sm text-primary text-center">{error}</div>}
      <button
        type="button"
        onClick={submit}
        disabled={!occasionId || busy}
        className="h-14 rounded-[14px] bg-primary text-white flex items-center justify-center text-[17px] font-semibold border-none disabled:opacity-60"
      >
        {busy ? "Saving…" : "Submit my picks"}
      </button>
    </div>
  );
}

export default function LocationPage() {
  return (
    <Suspense fallback={<div className="w-full flex-1 flex items-center justify-center text-muted">Loading…</div>}>
      <LocationContent />
    </Suspense>
  );
}
