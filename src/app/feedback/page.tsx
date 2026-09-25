"use client";

import { useState } from "react";
import Link from "next/link";

const RATINGS = [
  { id: "loved", name: "Loved it", bg: "var(--tint-green)" },
  { id: "fine", name: "It was fine", bg: "var(--tint-yellow)" },
  { id: "no", name: "Not again", bg: "var(--tint-pink)" },
];

export default function FeedbackPage() {
  const [choice, setChoice] = useState("pick");
  const [rating, setRating] = useState("loved");

  return (
    <div className="w-full flex-1 box-border px-6 pt-5 pb-6 flex flex-col gap-[22px]">
      <div className="flex items-center justify-center h-11 text-sm text-muted">Maricon · Check-in</div>

      <div className="flex flex-col gap-2">
        <h1 className="m-0 font-serif text-[34px] font-bold leading-[1.12]">Where did Maricon end up?</h1>
        <div className="text-[15px] leading-[1.45] text-muted">One tap helps me skip repeats and learn what you like.</div>
      </div>

      <div className="flex flex-col gap-2.5">
        <button
          type="button"
          onClick={() => setChoice("pick")}
          className="box-border p-4 rounded-2xl border-2 bg-white flex items-center gap-3"
          style={{ borderColor: choice === "pick" ? "var(--primary)" : "var(--border)" }}
        >
          <div className="flex-grow flex flex-col gap-0.5 text-left">
            <div className="text-[17px] font-bold">Lotus Thai Kitchen</div>
            <div className="text-sm text-muted">Our pick</div>
          </div>
          {choice === "pick" && (
            <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12l5 5L20 7" />
              </svg>
            </div>
          )}
        </button>
        <button
          type="button"
          onClick={() => setChoice("elsewhere")}
          className="box-border p-4 rounded-2xl border-2 bg-white text-[17px] font-semibold text-left"
          style={{ borderColor: choice === "elsewhere" ? "var(--primary)" : "var(--border)" }}
        >
          Somewhere else
        </button>
        <button
          type="button"
          onClick={() => setChoice("no")}
          className="box-border p-4 rounded-2xl border-2 bg-white text-[17px] font-semibold text-left"
          style={{ borderColor: choice === "no" ? "var(--primary)" : "var(--border)" }}
        >
          We didn&apos;t go
        </button>
      </div>

      <div className="rounded-2xl px-[18px] py-4 text-sm leading-[1.45]" style={{ background: "var(--tint-green)", color: "var(--green-dark)" }}>
        Next round I&apos;ll steer away from Thai for a few weeks, unless someone asks for it.
      </div>

      <div className="flex-grow flex flex-col gap-2.5">
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

      <Link
        href="/"
        className="h-14 rounded-[14px] bg-primary text-white flex items-center justify-center text-[17px] font-semibold no-underline"
      >
        Save to Maricon&apos;s history
      </Link>
    </div>
  );
}
