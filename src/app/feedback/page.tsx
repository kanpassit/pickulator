"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const CHOICES = [
  { id: "WENT", name: "We went here" },
  { id: "ELSEWHERE", name: "Somewhere else" },
  { id: "DIDNT_GO", name: "We didn't go" },
] as const;

const RATINGS = [
  { id: "LOVED", name: "Loved it", bg: "var(--tint-green)" },
  { id: "FINE", name: "It was fine", bg: "var(--tint-yellow)" },
  { id: "NOT_AGAIN", name: "Not again", bg: "var(--tint-pink)" },
] as const;

function FeedbackContent() {
  const params = useSearchParams();
  const occasionId = params.get("occasionId");
  const token = params.get("token");
  const router = useRouter();

  const [pickName, setPickName] = useState<string | null>(null);
  const [choice, setChoice] = useState<string>("WENT");
  const [rating, setRating] = useState<string>("LOVED");
  const [elsewhereName, setElsewhereName] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!occasionId) return;
    fetch(`/api/occasions/${occasionId}${token ? `?token=${encodeURIComponent(token)}` : ""}`)
      .then((res) => res.json())
      .then((body) => setPickName(body.result?.chosenName ?? null))
      .catch(() => {});
  }, [occasionId, token]);

  const ratedChoice = choice === "WENT" || choice === "ELSEWHERE";
  const canSave = !busy && !!occasionId && (choice !== "ELSEWHERE" || elsewhereName.trim().length > 0);

  async function save() {
    if (!occasionId || !canSave) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/occasions/${occasionId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(token ? { linkToken: token } : {}),
          choice,
          rating: ratedChoice ? rating : null,
          notes: choice === "ELSEWHERE" ? elsewhereName.trim() : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't save your check-in");
        return;
      }
      setSaved(true);
      setTimeout(() => router.push("/"), 700);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full flex-1 box-border px-6 pt-5 pb-6 flex flex-col gap-[22px]">
      <div className="flex items-center justify-center h-11 text-sm text-muted">Check-in</div>

      <div className="flex flex-col gap-2">
        <h1 className="m-0 font-serif text-[34px] font-bold leading-[1.12]">Where did you end up?</h1>
        <div className="text-[15px] leading-[1.45] text-muted">One tap helps skip repeats and learn what you like.</div>
      </div>

      <div className="flex flex-col gap-2.5">
        {CHOICES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setChoice(c.id)}
            className="box-border p-4 rounded-2xl border-2 bg-white flex items-center gap-3 text-left text-[17px] font-bold"
            style={{ borderColor: choice === c.id ? "var(--primary)" : "var(--border)" }}
          >
            <div className="flex-grow flex flex-col gap-0.5">
              <div>{c.id === "WENT" && pickName ? pickName : c.name}</div>
              {c.id === "WENT" && pickName && <div className="text-sm font-normal text-muted">Our pick</div>}
            </div>
            {choice === c.id && (
              <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12l5 5L20 7" />
                </svg>
              </div>
            )}
          </button>
        ))}
      </div>

      {ratedChoice && (
        <div className="flex-grow flex flex-col gap-2.5">
          {choice === "ELSEWHERE" && (
            <div className="flex flex-col gap-2">
              <div className="text-base font-semibold">Where did you go?</div>
              <input
                type="text"
                placeholder="e.g. The Taco Stand"
                value={elsewhereName}
                onChange={(e) => setElsewhereName(e.target.value)}
                className="box-border h-[52px] px-4 rounded-[14px] border-2 bg-white text-base"
                style={{ borderColor: "var(--border)" }}
              />
            </div>
          )}
          <div className="text-base font-semibold">How was it?</div>
          <div className="grid grid-cols-3 gap-2">
            {RATINGS.map((r) => {
              const on = r.id === rating;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRating(r.id)}
                  className="box-border h-14 rounded-[14px] border-2 text-[15px] font-semibold"
                  style={{ borderColor: on ? "var(--primary)" : "var(--border)", background: on ? r.bg : "#FFFFFF" }}
                >
                  {r.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {!ratedChoice && <div className="flex-grow" />}

      {error && <div className="text-sm text-primary">{error}</div>}
      <button
        type="button"
        onClick={save}
        disabled={!canSave || saved}
        className="h-14 rounded-[14px] flex items-center justify-center text-[17px] font-semibold disabled:opacity-100"
        style={{ background: saved ? "var(--olive)" : "var(--primary)", color: "#FFFFFF" }}
      >
        {saved ? "Saved" : busy ? "Saving…" : "Save"}
      </button>
    </div>
  );
}

export default function FeedbackPage() {
  return (
    <Suspense fallback={<div className="w-full flex-1 flex items-center justify-center text-muted">Loading…</div>}>
      <FeedbackContent />
    </Suspense>
  );
}
