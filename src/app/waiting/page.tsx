"use client";

import { useState } from "react";
import Link from "next/link";

const MODES = [
  { id: "all", name: "When everyone is in", note: "I'll decide the moment the last answer comes in." },
  { id: "time", name: "At 5:30 pm", note: "At 5:30 pm I'll decide with whoever has answered." },
  { id: "manual", name: "I will decide", note: "Nothing happens until you tap Decide." },
];

const PEOPLE = [
  { initial: "M", name: "Mark", suffix: "(you, host)", tint: "var(--tint-pink)", answered: true },
  { initial: "J", name: "Jo", suffix: "", tint: "var(--tint-green)", answered: true },
  { initial: "S", name: "Sam", suffix: "", tint: "var(--tint-yellow)", answered: false },
];

export default function WaitingPage() {
  const [mode, setMode] = useState("all");
  const [remind, setRemind] = useState(true);

  const answeredCount = PEOPLE.filter((p) => p.answered).length;
  const modeNote = MODES.find((m) => m.id === mode)!.note;

  return (
    <div className="w-full flex-1 box-border px-6 pt-5 pb-6 flex flex-col gap-6">
      <div className="flex items-center justify-center h-11 text-sm text-muted">Maricon · Mark&apos;s round</div>

      <div className="flex flex-col items-center gap-1.5 mt-4 text-center">
        <div className="font-serif text-[88px] font-bold leading-none text-primary">
          {answeredCount} of {PEOPLE.length}
        </div>
        <div className="text-xl font-semibold">have answered</div>
        <div className="text-[15px] leading-[1.45] text-muted max-w-[280px] mt-1">
          Everyone&apos;s answers stay hidden until the last one comes in.
        </div>
      </div>

      <div className="bg-white border border-border rounded-[20px] px-5 flex flex-col">
        {PEOPLE.map((p, i) => (
          <div
            key={p.name}
            className={`flex items-center gap-3.5 py-3.5 ${i < PEOPLE.length - 1 ? "border-b border-border" : ""}`}
          >
            <div className="w-11 h-11 rounded-full flex items-center justify-center text-[17px] font-bold" style={{ background: p.tint }}>
              {p.initial}
            </div>
            <div className="flex-grow text-[17px] font-semibold">
              {p.name} {p.suffix && <span className="font-normal text-muted text-sm">{p.suffix}</span>}
            </div>
            <div
              className="px-3 py-1.5 rounded-full text-[13px] font-semibold"
              style={
                p.answered
                  ? { background: "var(--tint-green)", color: "var(--green-dark)" }
                  : { background: "var(--tint-tan)", color: "#5A4E44" }
              }
            >
              {p.answered ? "Answered" : "Not yet"}
            </div>
          </div>
        ))}
      </div>

      <div className="flex-grow" />

      <div className="flex flex-col gap-3.5">
        <div className="text-[13px] font-semibold tracking-[0.06em] uppercase text-muted">Close this round</div>
        <div className="grid grid-cols-3 gap-2">
          {MODES.map((m) => {
            const on = m.id === mode;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id)}
                className="box-border h-14 px-1.5 rounded-[14px] border-2 text-sm font-semibold leading-tight"
                style={{ borderColor: on ? "var(--primary)" : "var(--border)", background: on ? "var(--tint-pink)" : "#FFFFFF" }}
              >
                {m.name}
              </button>
            );
          })}
        </div>
        <div className="text-sm leading-[1.45] text-muted">{modeNote}</div>

        <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-[14px] bg-white border border-border">
          <div className="flex flex-col gap-0.5">
            <div className="text-[15px] font-semibold">Text reminders</div>
            <div className="text-[13px] text-muted">{remind ? "Sam gets one text at 4:30 pm" : "Off. Only nudges you send."}</div>
          </div>
          <button
            type="button"
            onClick={() => setRemind((r) => !r)}
            aria-label="Toggle text reminders"
            className="relative w-[52px] h-8 shrink-0 rounded-full border-none p-0"
            style={{ background: remind ? "var(--olive)" : "#B8AA98" }}
          >
            <div
              className="absolute top-[3px] w-[26px] h-[26px] rounded-full bg-white transition-all"
              style={{ left: remind ? 23 : 3 }}
            />
          </button>
        </div>

        <button
          type="button"
          className="h-14 rounded-[14px] border-2 bg-white font-semibold text-[17px]"
          style={{ borderColor: "var(--primary)", color: "var(--primary)" }}
        >
          Nudge Sam now
        </button>
        <Link
          href="/result"
          className="h-14 rounded-[14px] bg-primary text-white flex items-center justify-center text-[17px] font-semibold no-underline"
        >
          Decide with what we have
        </Link>
        <div className="text-sm leading-[1.45] text-muted text-center">
          Deciding now leaves out Sam&apos;s tastes and location. I&apos;ll say so in the pick.
        </div>
      </div>
    </div>
  );
}
