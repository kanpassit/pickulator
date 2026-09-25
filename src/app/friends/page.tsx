"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import NotificationBell from "@/components/NotificationBell";

type Member = { id: string; displayName: string; initial: string; tintColor: string; userId: string | null };
type Group = { id: string; name: string; members: Member[] };
type Me = { id: string; name: string; email: string } | null;

type Friend = {
  key: string;
  displayName: string;
  initial: string;
  tintColor: string;
  hasAccount: boolean;
  groups: { id: string; name: string }[];
};

export default function FriendsPage() {
  const [me, setMe] = useState<Me | undefined>(undefined);
  const [friends, setFriends] = useState<Friend[] | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((body) => setMe(body.user))
      .catch(() => setMe(null));
  }, []);

  useEffect(() => {
    if (!me) return;
    fetch("/api/groups")
      .then((res) => res.json())
      .then((body) => {
        const groups: Group[] = body.groups ?? [];
        const byKey = new Map<string, Friend>();

        for (const g of groups) {
          for (const m of g.members) {
            if (m.userId === me.id) continue; // that's you
            const key = m.userId ?? `guest:${m.id}`;
            const existing = byKey.get(key);
            if (existing) {
              if (!existing.groups.some((gr) => gr.id === g.id)) {
                existing.groups.push({ id: g.id, name: g.name });
              }
            } else {
              byKey.set(key, {
                key,
                displayName: m.displayName,
                initial: m.initial,
                tintColor: m.tintColor,
                hasAccount: Boolean(m.userId),
                groups: [{ id: g.id, name: g.name }],
              });
            }
          }
        }

        const list = Array.from(byKey.values()).sort((a, b) =>
          a.displayName.localeCompare(b.displayName, undefined, { sensitivity: "base" })
        );
        setFriends(list);
      })
      .catch(() => setFriends([]));
  }, [me]);

  if (me === undefined) {
    return <div className="w-full flex-1 flex items-center justify-center text-muted">Loading…</div>;
  }

  if (me === null) {
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center gap-4 text-center px-6">
        <div className="text-[15px] text-muted">Sign in to see your friends.</div>
        <Link href="/login" className="h-14 px-8 rounded-[14px] bg-primary text-white flex items-center justify-center text-[17px] font-semibold no-underline">
          Log in
        </Link>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden w-full flex-1 flex flex-col">
      <div className="shrink-0 h-16 px-6 flex items-center justify-between border-b border-border bg-background">
        <div className="font-serif text-xl font-bold">Friends</div>
        <NotificationBell />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-6 pt-6 pb-4 flex flex-col gap-3">
        {friends === null && <div className="text-muted">Loading…</div>}

        {friends !== null && friends.length === 0 && (
          <div className="flex flex-col gap-2">
            <div className="text-[15px] text-muted">
              Nobody here yet - invite people to a group and they&apos;ll show up on this list.
            </div>
            <Link href="/groups" className="text-sm font-semibold text-primary self-start">
              Go to your groups
            </Link>
          </div>
        )}

        {friends !== null &&
          friends.map((f) => (
            <Link
              key={f.key}
              href={`/invite?groupId=${f.groups[0].id}`}
              className="box-border p-4 rounded-2xl border border-border bg-white flex items-center gap-3 no-underline text-[#2A211B]"
            >
              <div
                className="w-11 h-11 shrink-0 rounded-full flex items-center justify-center text-[17px] font-bold"
                style={{ background: f.tintColor }}
              >
                {f.initial}
              </div>
              <div className="flex-grow min-w-0 flex flex-col gap-0.5">
                <div className="text-base font-semibold truncate">{f.displayName}</div>
                <div className="text-[13px] text-muted truncate">
                  {f.hasAccount ? "Account" : "Guest"} · In {f.groups.map((g) => g.name).join(", ")}
                </div>
              </div>
            </Link>
          ))}
      </div>

      <BottomNav />
    </div>
  );
}
