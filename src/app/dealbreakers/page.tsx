"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { QuestionProgress } from "../_components/QuestionProgress";
import { SETS } from "@/lib/cuisineOptions";

type CustomOption = { id: string; label: string; hint: string | null };

function DealbreakersContent() {
  const params = useSearchParams();
  const occasionId = params.get("occasionId");
  const token = params.get("token");
  const picks = params.get("picks") ?? "";
  const vibe = params.get("vibe");
  const budget = params.get("budget");
  const router = useRouter();

  const [out, setOut] = useState<string[]>(() => {
    const raw = params.get("out");
    return raw ? raw.split(",").filter(Boolean) : [];
  });
  const [customOptions, setCustomOptions] = useState<CustomOption[]>([]);

  useEffect(() => {
    if (!occasionId) return;
    fetch(`/api/occasions/${occasionId}`)
      .then((res) => res.json())
      .then((body) => {
        if (Array.isArray(body.customOptions)) setCustomOptions(body.customOptions);
      })
      .catch(() => {});
  }, [occasionId]);

  const allOptions = [
    ...SETS.flat().filter((o) => o.id !== "surprise"),
    ...customOptions.map((o) => ({ id: o.id, name: o.label, hint: o.hint ?? "", dot: "var(--tint-tan)" })),
  ];

  function toggle(id: string) {
    setOut((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }

  const backQ = new URLSearchParams({ occasionId: occasionId ?? "", picks });
  if (token) backQ.set("token", token);
  if (vibe) backQ.set("vibe", vibe);
  if (budget) backQ.set("budget", budget);
  const backHref = `/budget?${backQ.toString()}`;

  function next() {
    const q = new URLSearchParams({ occasionId: occasionId ?? "", picks });
    if (token) q.set("token", token);
    if (vibe) q.set("vibe", vibe);
    if (budget) q.set("budget", budget);
    if (out.length) q.set("out", out.join(","));
    router.push(`/location?${q.toString()}`);
  }

  return (
    <div className="w-full flex-1 box-border px-6 pt-5 pb-6 flex flex-col gap-5">
      <QuestionProgress step={4} total={5} label="Anything to rule out?" backHref={backHref} />

      <div className="flex flex-col gap-2 mt-2">
        <h1 className="m-0 font-serif text-[34px] font-bold leading-[1.12]">Any dealbreakers?</h1>
        <div className="text-[15px] leading-[1.4] text-muted">Optional - tap anything the group should skip this round.</div>
      </div>

      <div className="flex flex-wrap gap-2">
        {allOptions.map((o) => {
          const on = out.includes(o.id);
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => toggle(o.id)}
              className="box-border h-11 px-4 rounded-full border-2 text-[15px] font-semibold"
              style={{
                borderColor: on ? "var(--primary)" : "var(--border)",
                background: on ? "var(--primary)" : "#FFFFFF",
                color: on ? "#FFFFFF" : "var(--foreground)",
              }}
            >
              {o.name}
            </button>
          );
        })}
      </div>

      <div className="flex-grow" />
      <button
        type="button"
        onClick={next}
        disabled={!occasionId}
        className="h-14 rounded-[14px] bg-primary text-white flex items-center justify-center text-[17px] font-semibold border-none"
      >
        Next
      </button>
    </div>
  );
}

export default function DealbreakersPage() {
  return (
    <Suspense fallback={<div className="w-full flex-1 flex items-center justify-center text-muted">Loading…</div>}>
      <DealbreakersContent />
    </Suspense>
  );
}
