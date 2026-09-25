"use client";

import { useState } from "react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";

type Notification = {
  id: string;
  initial: string;
  tint: string;
  text: string;
  when: string;
  href: string;
  unread: boolean;
};

const NOTIFICATIONS: Notification[] = [
  { id: "n1", initial: "J", tint: "var(--tint-green)", text: "Jo answered for Dinner tonight", when: "2 min ago", href: "/waiting", unread: true },
  { id: "n2", initial: "P", tint: "var(--tint-tan)", text: "Priya accepted your invite to Maricon", when: "1 hr ago", href: "#", unread: true },
  { id: "n3", initial: "S", tint: "var(--tint-yellow)", text: "Sam answered for Dinner tonight", when: "3 hr ago", href: "/waiting", unread: true },
  { id: "n4", initial: "M", tint: "var(--tint-pink)", text: "The pick for Sunday brunch is ready", when: "Sep 20", href: "/result", unread: false },
];

const RECENT = [
  { name: "Smokehouse 9", meta: "BBQ · Sep 12", tag: "Loved it", tone: "green" as const },
  { name: "Nori Bowl Ramen", meta: "Ramen · Sep 5", tag: "It was fine", tone: "yellow" as const },
  { name: "Casa Verde Tacos", meta: "Tacos · Aug 29", tag: "Loved it", tone: "green" as const },
];

export default function Home() {
  const [open, setOpen] = useState(false);
  const [read, setRead] = useState(false);

  const unreadCount = read ? 0 : NOTIFICATIONS.filter((n) => n.unread).length;

  return (
    <div className="relative overflow-hidden w-full flex-1 flex flex-col">
      <div className="shrink-0 h-16 px-3 pl-6 flex items-center justify-between border-b border-border bg-background">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 3v7a2 2 0 002 2v9M11 3v7a2 2 0 01-2 2M17 3c-2 2-3 5-3 8h3v10" />
            </svg>
          </div>
          <div className="font-serif text-xl font-bold">Pickulator</div>
        </div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label="Notifications"
          className="relative w-11 h-11 rounded-full flex items-center justify-center"
          style={{ background: open ? "var(--tint-tan)" : "transparent" }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 16V11a6 6 0 0112 0v5l2 2H4z" />
            <path d="M10 21a2 2 0 004 0" />
          </svg>
          {unreadCount > 0 && (
            <div className="absolute top-[3px] right-[2px] min-w-[18px] h-[18px] px-[5px] rounded-full bg-primary text-white border-2 border-background text-[11px] font-bold leading-[14px] text-center">
              {unreadCount}
            </div>
          )}
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-6 pt-6 pb-4 flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <div className="text-[13px] font-semibold tracking-[0.06em] uppercase text-muted">Your groups</div>
          <h1 className="m-0 font-serif text-4xl font-bold leading-[1.1]">Maricon</h1>
        </div>

        <div className="flex gap-4 items-start">
          {[
            { initial: "M", name: "Mark", tint: "var(--tint-pink)" },
            { initial: "J", name: "Jo", tint: "var(--tint-green)" },
            { initial: "S", name: "Sam", tint: "var(--tint-yellow)" },
          ].map((p) => (
            <div key={p.name} className="flex flex-col items-center gap-1">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold" style={{ background: p.tint }}>
                {p.initial}
              </div>
              <div className="text-[13px] text-muted">{p.name}</div>
            </div>
          ))}
          <div className="flex flex-col items-center gap-1">
            <button
              type="button"
              aria-label="Invite someone"
              className="box-border w-12 h-12 rounded-full border-2 border-dashed flex items-center justify-center"
              style={{ borderColor: "#B8AA98" }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2.5" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
            <div className="text-[13px] text-muted">Invite</div>
          </div>
        </div>

        <div className="bg-white border border-border rounded-[20px] p-5 flex flex-col gap-3.5">
          <div className="flex flex-col gap-1.5">
            <div className="font-serif text-2xl font-semibold">Deciding tonight?</div>
            <div className="text-[15px] leading-[1.45] text-muted">
              Start a round and everyone gets their own link. It takes about 30 seconds each.
            </div>
          </div>
          <Link
            href="/occasion"
            className="h-14 rounded-[14px] bg-primary text-white flex items-center justify-center text-[17px] font-semibold no-underline"
          >
            Start a new round
          </Link>
        </div>

        <div className="flex flex-col gap-1">
          <div className="text-base font-semibold mb-1">Recent nights</div>
          {RECENT.map((r, i) => (
            <div
              key={r.name}
              className={`flex items-center justify-between py-3 ${i < RECENT.length - 1 ? "border-b border-border" : ""}`}
            >
              <div className="flex flex-col gap-0.5">
                <div className="text-base font-semibold">{r.name}</div>
                <div className="text-sm text-muted">{r.meta}</div>
              </div>
              <div
                className="px-3 py-1.5 rounded-full text-[13px] font-semibold"
                style={
                  r.tone === "green"
                    ? { background: "var(--tint-green)", color: "var(--green-dark)" }
                    : { background: "var(--tint-yellow)", color: "var(--yellow-dark)" }
                }
              >
                {r.tag}
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-[20px] p-[18px_20px] flex flex-col gap-2.5" style={{ background: "var(--tint-green)" }}>
          <div className="text-sm font-bold" style={{ color: "var(--green-dark)" }}>
            What I&apos;ve learned about Maricon
          </div>
          <div className="flex flex-wrap gap-2">
            {["Thai", "BBQ", "Tacos", "Mostly $$"].map((tag) => (
              <div key={tag} className="px-3 py-1.5 rounded-full bg-white text-sm font-medium">
                {tag}
              </div>
            ))}
          </div>
          <div className="text-sm leading-[1.4]" style={{ color: "var(--green-dark)" }}>
            Skipping repeats from the last 3 weeks.
          </div>
        </div>
      </div>

      {open && (
        <div className="absolute top-[60px] right-3 w-[330px] z-10 bg-white border border-border rounded-[20px] shadow-[0_12px_32px_rgba(42,33,27,0.18)] overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-3.5 pb-2.5">
            <div className="text-base font-bold">Notifications</div>
            <button
              type="button"
              onClick={() => setRead(true)}
              className="border-none bg-transparent py-1 text-[13px] font-bold text-primary"
            >
              Mark all read
            </button>
          </div>
          {NOTIFICATIONS.map((n) => {
            const unread = n.unread && !read;
            return (
              <Link
                key={n.id}
                href={n.href}
                className="flex items-start gap-3 px-4 py-3 border-t border-border no-underline text-foreground"
                style={{ background: unread ? "#FBF3EA" : "#FFFFFF" }}
              >
                <div
                  className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{ background: n.tint }}
                >
                  {n.initial}
                </div>
                <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                  <div className={`text-sm leading-[1.35] ${unread ? "font-semibold" : "font-normal"}`}>{n.text}</div>
                  <div className="text-xs text-muted">{n.when}</div>
                </div>
                <div
                  className="w-2.5 h-2.5 shrink-0 mt-1.5 rounded-full"
                  style={{ background: unread ? "var(--primary)" : "transparent" }}
                />
              </Link>
            );
          })}
          <div className="block px-4 py-3 border-t border-border text-center text-[13px] font-semibold text-muted">
            Only the latest 20 are kept
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
