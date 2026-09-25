"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { QuestionProgress } from "../_components/QuestionProgress";

const BUDGETS = [
  { id: "$", name: "$", hint: "Keep it cheap" },
  { id: "$$", name: "$$", hint: "Reasonable, nothing fancy" },
  { id: "$$$", name: "$$$", hint: "Willing to spend a bit" },
  { id: "$$$$", name: "$$$$", hint: "Let's treat ourselves" },
] as const;

function BudgetContent() {
  const params = useSearchParams();
  const occasionId = params.get("occasionId");
  const token = params.get("token");
  const picks = params.get("picks") ?? "";
  const vibe = params.get("vibe");
  const router = useRouter();

  const [budget, setBudget] = useState<string | null>(params.get("budget"));

  const backQ = new URLSearchParams({ occasionId: occasionId ?? "", picks });
  if (token) backQ.set("token", token);
  if (vibe) backQ.set("vibe", vibe);
  const backHref = `/vibe?${backQ.toString()}`;

  function next() {
    const q = new URLSearchParams({ occasionId: occasionId ?? "", picks });
    if (token) q.set("token", token);
    if (vibe) q.set("vibe", vibe);
    if (budget) q.set("budget", budget);
    router.push(`/dealbreakers?${q.toString()}`);
  }

  return (
    <div className="w-full flex-1 box-border px-6 pt-5 pb-6 flex flex-col gap-5">
      <QuestionProgress step={3} total={4} label="What's the budget?" backHref={backHref} />

      <div className="flex flex-col gap-2 mt-2">
        <h1 className="m-0 font-serif text-[34px] font-bold leading-[1.12]">What's the budget?</h1>
        <div className="text-[15px] leading-[1.4] text-muted">Optional - I'll try to keep the pick in this range.</div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {BUDGETS.map((b) => {
          const on = budget === b.id;
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => setBudget(on ? null : b.id)}
              className="box-border h-[104px] px-4 py-3.5 rounded-[20px] border-2 bg-white flex flex-col justify-center items-center gap-1 text-center"
              style={{ borderColor: on ? "var(--primary)" : "var(--border)" }}
            >
              <div className="text-2xl font-bold" style={{ color: on ? "var(--primary)" : "var(--foreground)" }}>
                {b.name}
              </div>
              <div className="text-sm leading-[1.3] text-muted">{b.hint}</div>
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

export default function BudgetPage() {
  return (
    <Suspense fallback={<div className="w-full flex-1 flex items-center justify-center text-muted">Loading…</div>}>
      <BudgetContent />
    </Suspense>
  );
}
