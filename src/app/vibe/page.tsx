"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { QuestionProgress } from "../_components/QuestionProgress";

const VIBES = [
  { id: "Casual", hint: "Come as you are", dot: "var(--tint-yellow)" },
  { id: "Dressed up", hint: "A nicer night out", dot: "var(--tint-pink)" },
  { id: "Lively & loud", hint: "Music, energy, a scene", dot: "var(--tint-green)" },
  { id: "Quiet & chill", hint: "Easy to talk over dinner", dot: "var(--tint-tan)" },
  { id: "Patio weather", hint: "Outside if we can", dot: "var(--tint-yellow)" },
  { id: "Family-friendly", hint: "Good with kids in tow", dot: "var(--tint-pink)" },
] as const;

function VibeContent() {
  const params = useSearchParams();
  const occasionId = params.get("occasionId");
  const token = params.get("token");
  const picks = params.get("picks") ?? "";
  const router = useRouter();

  const [vibe, setVibe] = useState<string | null>(params.get("vibe"));

  const backQ = new URLSearchParams({ occasionId: occasionId ?? "", picks });
  if (token) backQ.set("token", token);
  const backHref = `/question?${backQ.toString()}`;

  function next() {
    const q = new URLSearchParams({ occasionId: occasionId ?? "", picks });
    if (token) q.set("token", token);
    if (vibe) q.set("vibe", vibe);
    router.push(`/budget?${q.toString()}`);
  }

  return (
    <div className="w-full flex-1 box-border px-6 pt-5 pb-6 flex flex-col gap-5">
      <QuestionProgress step={2} total={5} label="What's the vibe?" backHref={backHref} />

      <div className="flex flex-col gap-2 mt-2">
        <h1 className="m-0 font-serif text-[34px] font-bold leading-[1.12]">What's the vibe?</h1>
        <div className="text-[15px] leading-[1.4] text-muted">Optional - helps me weigh the pick. Tap to select, tap again to clear.</div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {VIBES.map((v) => {
          const on = vibe === v.id;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => setVibe(on ? null : v.id)}
              className="box-border h-[128px] px-4 py-3.5 rounded-[20px] border-2 bg-white flex flex-col justify-between items-start text-left"
              style={{ borderColor: on ? "var(--primary)" : "var(--border)" }}
            >
              <div className="w-9 h-9 rounded-full" style={{ background: v.dot }} />
              <div className="flex flex-col gap-1">
                <div className="text-lg font-bold">{v.id}</div>
                <div className="text-sm leading-[1.35] text-muted">{v.hint}</div>
              </div>
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

export default function VibePage() {
  return (
    <Suspense fallback={<div className="w-full flex-1 flex items-center justify-center text-muted">Loading…</div>}>
      <VibeContent />
    </Suspense>
  );
}
