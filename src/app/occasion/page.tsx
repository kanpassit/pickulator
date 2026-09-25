"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

const OCCASIONS = [
  { id: "BRUNCH", name: "Brunch", hint: "Late morning, eggs and something sweet", tint: "var(--tint-yellow)", icon: "M12 7a5 5 0 100 10 5 5 0 000-10zM12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" },
  { id: "LUNCH", name: "Lunch", hint: "Midday, quick or lingering", tint: "var(--tint-green)", icon: "M3 12h18a9 9 0 01-18 0zM8 8c0-2 1-3 1-5M13 8c0-2 1-3 1-5" },
  { id: "DINNER", name: "Dinner", hint: "A proper sit-down evening", tint: "var(--tint-pink)", icon: "M7 3v7a2 2 0 002 2v9M11 3v7a2 2 0 01-2 2M17 21V3c-2 1-3.5 4-3.5 8h3.5" },
  { id: "COFFEE", name: "Coffee", hint: "Cafes, tea, something sweet", tint: "var(--tint-tan)", icon: "M4 9h12v5a5 5 0 01-5 5h-2a5 5 0 01-5-5V9zM16 10h1.5a2.5 2.5 0 010 5H16M8 3v2M12 3v2" },
  { id: "DRINKS", name: "Drinks", hint: "Bars, cocktails, small plates", tint: "#E6DCCB", icon: "M4 4h16l-8 9-8-9zM12 13v7M8 20h8" },
  { id: "LATE", name: "Late night", hint: "After 9, somewhere still open", tint: "var(--tint-pink)", icon: "M20 14.5A8.5 8.5 0 019.5 4 7 7 0 1020 14.5z" },
] as const;

const DISTANCES = [
  { id: "5 miles", name: "5 mi" },
  { id: "10 miles", name: "10 mi" },
  { id: "20 miles", name: "20 mi" },
  { id: "No limit", name: "No limit" },
];

const DAYS = [
  { id: "TODAY", name: "Today" },
  { id: "TOMORROW", name: "Tomorrow" },
  { id: "WEEKEND", name: "Weekend" },
  { id: "OTHER", name: "Pick date" },
];

// Sensible default clock time per occasion, 24h "HH:MM" for <input type="time">.
const DEFAULT_TIMES: Record<string, string> = {
  BRUNCH: "10:30",
  LUNCH: "12:00",
  DINNER: "18:30",
  COFFEE: "14:30",
  DRINKS: "18:00",
  LATE: "21:30",
};

function formatTime12h(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(":");
  let h = parseInt(hStr, 10);
  const m = mStr ?? "00";
  if (Number.isNaN(h)) return hhmm;
  const period = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return m === "00" ? `${h} ${period}` : `${h}:${m} ${period}`;
}

function OccasionContent() {
  const groupId = useSearchParams().get("groupId");
  const router = useRouter();
  const [occ, setOcc] = useState<string>("DINNER");
  const [day, setDay] = useState("TODAY");
  const [timeMode, setTimeMode] = useState<"SPECIFIC" | "FLEXIBLE">("SPECIFIC");
  const [timeValue, setTimeValue] = useState(DEFAULT_TIMES.DINNER);
  const [location, setLocation] = useState("");
  const [maxDistance, setMaxDistance] = useState<string | null>(null);
  const [avoidRepeats, setAvoidRepeats] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function chooseOccasion(id: string) {
    setOcc(id);
    setTimeValue(DEFAULT_TIMES[id] ?? "18:00");
  }

  const timeSlot = timeMode === "FLEXIBLE" ? "Flexible" : formatTime12h(timeValue);

  async function send() {
    if (!groupId) {
      setError("No group selected.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/occasions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId,
          type: occ,
          day,
          timeSlot,
          location,
          maxDistance: location.trim() ? maxDistance : null,
          avoidRepeats,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't start that round");
        return;
      }
      router.push(`/question?occasionId=${data.occasion.id}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full flex-1 box-border px-6 pt-5 pb-6 flex flex-col gap-[22px]">
      <div className="flex items-center justify-between h-11">
        <Link href="/" aria-label="Back" className="w-11 h-11 -ml-2.5 flex items-center justify-center">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </Link>
        <div className="text-sm text-muted">New round</div>
        <div className="w-11" />
      </div>

      <div className="flex flex-col gap-2 mt-2">
        <h1 className="m-0 font-serif text-[34px] font-bold leading-[1.12]">What&apos;s the occasion?</h1>
        <div className="text-[15px] leading-[1.45] text-muted">You set this once and everyone in the group answers for it.</div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {OCCASIONS.map((o) => {
          const on = o.id === occ;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => chooseOccasion(o.id)}
              className="box-border h-32 p-3.5 rounded-[20px] border-2 bg-white flex flex-col justify-between items-start text-left"
              style={{ borderColor: on ? "var(--primary)" : "var(--border)" }}
            >
              <div className="flex items-center justify-between w-full">
                <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: o.tint }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d={o.icon} />
                  </svg>
                </div>
                {on && (
                  <div className="w-[26px] h-[26px] rounded-full bg-primary flex items-center justify-center">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12l5 5L20 7" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-0.5">
                <div className="text-lg font-bold">{o.name}</div>
                <div className="text-[13px] leading-[1.3] text-muted">{o.hint}</div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="text-base font-semibold">Which day?</div>
        <div className="grid grid-cols-4 gap-2">
          {DAYS.map((d) => {
            const on = d.id === day;
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => setDay(d.id)}
                className="box-border h-11 rounded-full border-2 text-sm font-semibold"
                style={{ borderColor: on ? "var(--primary)" : "var(--border)", background: on ? "var(--tint-pink)" : "#FFFFFF" }}
              >
                {d.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="text-base font-semibold">What time?</div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setTimeMode("SPECIFIC")}
            className="box-border h-11 rounded-full border-2 text-sm font-semibold"
            style={{
              borderColor: timeMode === "SPECIFIC" ? "var(--primary)" : "var(--border)",
              background: timeMode === "SPECIFIC" ? "var(--tint-pink)" : "#FFFFFF",
            }}
          >
            Pick a time
          </button>
          <button
            type="button"
            onClick={() => setTimeMode("FLEXIBLE")}
            className="box-border h-11 rounded-full border-2 text-sm font-semibold"
            style={{
              borderColor: timeMode === "FLEXIBLE" ? "var(--primary)" : "var(--border)",
              background: timeMode === "FLEXIBLE" ? "var(--tint-pink)" : "#FFFFFF",
            }}
          >
            Flexible
          </button>
        </div>
        {timeMode === "SPECIFIC" && (
          <input
            type="time"
            step={900}
            value={timeValue}
            onChange={(e) => e.target.value && setTimeValue(e.target.value)}
            className="box-border h-[52px] px-4 rounded-[14px] border border-[#B8AA98] bg-white text-base"
          />
        )}
        <div className="text-sm leading-[1.4] text-muted">
          {timeMode === "SPECIFIC"
            ? "15-minute increments. We'll aim for right around this time."
            : "Flexible lets me search a wider window."}
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="text-base font-semibold">
          Where are you deciding? <span className="font-normal text-muted">(optional)</span>
        </div>
        <input
          type="text"
          placeholder="e.g. San Diego, CA or a zip code"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="box-border h-[52px] px-4 rounded-[14px] border border-[#B8AA98] bg-white text-base"
        />
        <div className="text-sm leading-[1.4] text-muted">
          Give me a place to search near and I&apos;ll name an actual restaurant instead of just a cuisine.
        </div>
      </div>

      {location.trim().length > 0 && (
        <div className="flex flex-col gap-2.5">
          <div className="text-base font-semibold">How far are you willing to drive?</div>
          <div className="grid grid-cols-4 gap-2">
            {DISTANCES.map((d) => {
              const on = d.id === maxDistance;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setMaxDistance(on ? null : d.id)}
                  className="box-border h-11 rounded-full border-2 text-sm font-semibold"
                  style={{ borderColor: on ? "var(--primary)" : "var(--border)", background: on ? "var(--tint-pink)" : "#FFFFFF" }}
                >
                  {d.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setAvoidRepeats((v) => !v)}
        className="box-border p-4 rounded-2xl border-2 bg-white flex items-center gap-3 text-left"
        style={{ borderColor: avoidRepeats ? "var(--primary)" : "var(--border)" }}
      >
        <div className="flex-grow flex flex-col gap-0.5">
          <div className="text-base font-semibold">Give us something new</div>
          <div className="text-sm text-muted">Skip places this group has already been</div>
        </div>
        <div
          className="w-6 h-6 shrink-0 rounded-full border-2 flex items-center justify-center"
          style={{
            borderColor: avoidRepeats ? "var(--primary)" : "var(--border)",
            background: avoidRepeats ? "var(--primary)" : "transparent",
          }}
        >
          {avoidRepeats && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12l5 5L20 7" />
            </svg>
          )}
        </div>
      </button>

      <div className="flex-grow" />
      {error && <div className="text-sm text-primary text-center">{error}</div>}
      <div className="text-sm leading-[1.45] text-muted text-center">Everyone in the group gets a link to answer 4 quick questions.</div>
      <button
        type="button"
        onClick={send}
        disabled={busy || !groupId}
        className="h-14 rounded-[14px] bg-primary text-white flex items-center justify-center text-[17px] font-semibold disabled:opacity-60"
      >
        {busy ? "Starting…" : "Send links to the group"}
      </button>
    </div>
  );
}

export default function OccasionPage() {
  return (
    <Suspense fallback={<div className="w-full flex-1 flex items-center justify-center text-muted">Loading…</div>}>
      <OccasionContent />
    </Suspense>
  );
}
