"use client";

import { useState } from "react";
import Link from "next/link";

const G = { bg: "var(--tint-green)", color: "var(--green-dark)" };
const Y = { bg: "var(--tint-yellow)", color: "var(--yellow-dark)" };

const PICKS = [
  {
    name: "Lotus Thai Kitchen",
    meta: "Thai · $$ · Open until 10 pm",
    chips: [
      { label: "New for the crew", ...Y },
      { label: "Fits everyone's budget", ...G },
      { label: "Meets everyone's dietary needs", ...G },
    ],
    why: "Thai showed up in all three of your top 3s, and Ramen and Tacos each made two. Lotus has big noodle plates that cover the overlap. It's new for Maricon, since your last three nights were BBQ, ramen and tacos, and nobody ruled it out.",
    trips: [
      { who: "Mark · Drive", min: 12, width: 55 },
      { who: "Jo · Drive", min: 15, width: 68 },
      { who: "Sam · Transit", min: 22, width: 100 },
    ],
    tripNote: "Nobody travels more than 22 minutes.",
    others: [
      { name: "Saffron Table", meta: "Indian · $$", note: "25 min max" },
      { name: "Pho Corner", meta: "Vietnamese · $", note: "19 min max" },
    ],
  },
  {
    name: "Saffron Table",
    meta: "Indian · $$ · Open until 9:30 pm",
    chips: [
      { label: "Fits everyone's budget", ...G },
      { label: "Meets everyone's dietary needs", ...G },
    ],
    why: "Indian made two of your top 3s. Saffron has plenty of vegetarian and gluten-free dishes and big share plates. It's a bit farther for Sam, but still under 25 minutes.",
    trips: [
      { who: "Mark · Drive", min: 14, width: 56 },
      { who: "Jo · Drive", min: 18, width: 72 },
      { who: "Sam · Transit", min: 25, width: 100 },
    ],
    tripNote: "Nobody travels more than 25 minutes.",
    others: [
      { name: "Pho Corner", meta: "Vietnamese · $", note: "19 min max" },
      { name: "Lotus Thai Kitchen", meta: "Thai · $$ · vetoed by Mark", note: "22 min max" },
    ],
  },
];

export default function ResultPage() {
  const [vetoed, setVetoed] = useState(false);
  const [shared, setShared] = useState(false);

  const p = PICKS[vetoed ? 1 : 0];

  return (
    <div className="w-full flex-1 box-border px-6 pt-5 pb-6 flex flex-col gap-[22px]">
      <div className="flex items-center justify-center h-11 text-sm text-muted">Maricon · Everyone&apos;s in</div>

      {vetoed && (
        <div className="rounded-2xl px-4 py-3.5 text-sm leading-[1.45]" style={{ background: "var(--tint-yellow)", color: "var(--yellow-dark)" }}>
          Mark used their veto on Lotus Thai Kitchen. This is the next best pick.
        </div>
      )}

      <div className="flex flex-col gap-2.5">
        <div className="text-[13px] font-bold tracking-[0.08em] uppercase text-primary">
          {vetoed ? "Next best pick" : "Tonight's pick"}
        </div>
        <div className="bg-white border border-border rounded-[24px] p-6 flex flex-col gap-3.5">
          <div className="flex flex-col gap-1.5">
            <div className="font-serif text-[34px] font-bold leading-[1.1]">{p.name}</div>
            <div className="text-[15px] text-muted">{p.meta}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            {p.chips.map((c) => (
              <div key={c.label} className="px-3 py-1.5 rounded-full text-[13px] font-semibold" style={{ background: c.bg, color: c.color }}>
                {c.label}
              </div>
            ))}
          </div>
          <div className="h-px bg-border" />
          <div className="flex flex-col gap-1.5">
            <div className="text-sm font-bold">Why this one</div>
            <div className="text-[15px] leading-[1.5]">{p.why}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        <a href="#" className="box-border h-[68px] rounded-[14px] border-2 border-border bg-white flex flex-col items-center justify-center gap-1 text-[13px] font-semibold no-underline text-foreground">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 3h12v18l-6-4-6 4z" />
          </svg>
          <span>Reserve</span>
        </a>
        <a href="#" className="box-border h-[68px] rounded-[14px] border-2 border-border bg-white flex flex-col items-center justify-center gap-1 text-[13px] font-semibold no-underline text-foreground">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="5" width="16" height="16" rx="2" />
            <path d="M4 10h16M9 3v4M15 3v4" />
          </svg>
          <span>Calendar</span>
        </a>
        <button
          type="button"
          onClick={() => setShared((s) => !s)}
          className="box-border h-[68px] rounded-[14px] border-2 flex flex-col items-center justify-center gap-1 text-[13px] font-semibold"
          style={{ borderColor: shared ? "var(--olive)" : "var(--border)", background: shared ? "var(--tint-green)" : "#FFFFFF" }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 15V4M8 8l4-4 4 4M5 12v7h14v-7" />
          </svg>
          <span>{shared ? "Link copied" : "Share"}</span>
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <div className="text-base font-semibold">Getting there</div>
        {p.trips.map((t) => (
          <div key={t.who} className="flex flex-col gap-1.5">
            <div className="flex justify-between text-[15px]">
              <span>{t.who}</span>
              <span className="font-semibold">{t.min} min</span>
            </div>
            <div className="h-2 rounded-full" style={{ background: "var(--tint-tan)" }}>
              <div className="h-2 rounded-full" style={{ width: `${t.width}%`, background: "var(--olive)" }} />
            </div>
          </div>
        ))}
        <div className="text-sm text-muted">{p.tripNote}</div>
      </div>

      <div className="flex flex-col gap-1">
        <div className="text-base font-semibold mb-1">Also considered</div>
        {p.others.map((o, i) => (
          <div key={o.name} className={`flex items-center justify-between py-3 ${i < p.others.length - 1 ? "border-b border-border" : ""}`}>
            <div className="flex flex-col gap-0.5">
              <div className="text-base font-semibold">{o.name}</div>
              <div className="text-sm text-muted">{o.meta}</div>
            </div>
            <div className="text-sm text-muted">{o.note}</div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-border rounded-[20px] px-5 py-[18px] flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <div className="text-base font-bold">Not feeling it?</div>
          <div className="text-sm leading-[1.45] text-muted">
            {vetoed
              ? "You've used your veto for this round. Jo and Sam still have theirs."
              : "Each of you gets one veto per round. Tap it and I will show the next best pick."}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setVetoed((v) => !v)}
          className="h-[52px] rounded-[14px] border-2 bg-white font-semibold text-base"
          style={{ borderColor: vetoed ? "#B8AA98" : "var(--primary)", color: vetoed ? "var(--muted)" : "var(--primary)" }}
        >
          {vetoed ? "Undo my veto" : "Use my veto"}
        </button>
      </div>

      <div className="flex-grow" />
      <div className="flex flex-col gap-3">
        <button type="button" className="h-14 rounded-[14px] border-none bg-primary text-white font-semibold text-[17px]">
          Get directions
        </button>
        <Link
          href="/feedback"
          className="h-14 box-border rounded-[14px] border-2 border-primary bg-white text-primary flex items-center justify-center text-[17px] font-semibold no-underline"
        >
          We went here
        </Link>
      </div>
    </div>
  );
}
