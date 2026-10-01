"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type GuestGroup = {
  group: { id: string; name: string };
  member: { id: string; displayName: string; initial: string; tintColor: string; linkToken: string };
  occasion: { id: string; type: string; hasAnswered: boolean } | null;
};

/**
 * Returning guests (no account) are recognized by per-group cookies, which
 * only the browser/API can read per-request - so this is the one
 * client-side island on the otherwise server-rendered landing page. It
 * renders nothing until it finds a returning guest, so it never affects what
 * crawlers or first-time visitors see.
 */
export default function GuestWelcomeBack() {
  const [guestGroups, setGuestGroups] = useState<GuestGroup[]>([]);

  useEffect(() => {
    fetch("/api/guest-groups")
      .then((res) => res.json())
      .then((body) => setGuestGroups(body.groups ?? []))
      .catch(() => setGuestGroups([]));
  }, []);

  if (guestGroups.length === 0) return null;

  return (
    <section aria-label="Continue as a guest" className="flex flex-col gap-3 w-full max-w-[360px] mx-auto text-left">
      <div className="text-[13px] font-semibold tracking-[0.06em] uppercase text-muted text-center">Welcome back</div>
      {guestGroups.map((g) => (
        <Link
          key={g.member.id}
          href={
            g.occasion
              ? g.occasion.hasAnswered
                ? `/waiting?occasionId=${g.occasion.id}&token=${g.member.linkToken}`
                : `/question?occasionId=${g.occasion.id}&token=${g.member.linkToken}`
              : `/j/${g.member.linkToken}`
          }
          className="box-border p-4 rounded-[14px] border border-border bg-white flex items-center gap-3 no-underline text-[#2A211B]"
        >
          <div
            className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-sm font-bold"
            style={{ background: g.member.tintColor }}
          >
            {g.member.initial}
          </div>
          <div className="flex flex-col gap-0.5 min-w-0">
            <div className="text-[15px] font-semibold truncate">Continue as {g.member.displayName}</div>
            <div className="text-[13px] text-muted truncate">
              {g.group.name}
              {g.occasion ? (g.occasion.hasAnswered ? " · waiting on the group" : " · a round is open") : ""}
            </div>
          </div>
        </Link>
      ))}
    </section>
  );
}
