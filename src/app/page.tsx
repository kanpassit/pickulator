"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import NotificationBell from "@/components/NotificationBell";
import { RATING_LABELS } from "@/lib/ratingLabels";

type Member = { id: string; displayName: string; initial: string; tintColor: string; userId: string | null };
type ClosedOccasion = {
  id: string;
  type: string;
  closedAt: string | null;
  result: { chosenName: string } | null;
  ratingSummary: { rating: string; count: number }[];
};
type Group = { id: string; name: string; hostUserId: string; members: Member[]; occasions: ClosedOccasion[] };
type Me = { id: string; name: string; email: string } | null;
type GuestGroup = {
  group: { id: string; name: string };
  member: { id: string; displayName: string; initial: string; tintColor: string; linkToken: string };
  occasion: { id: string; type: string; hasAnswered: boolean } | null;
};
type PendingLink = {
  memberId: string;
  displayName: string;
  initial: string;
  tintColor: string;
  group: { id: string; name: string };
};

const GROUP_KEY = "pk_group_id";

function formatDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function Home() {
  const [me, setMe] = useState<Me | undefined>(undefined); // undefined = loading
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guestGroups, setGuestGroups] = useState<GuestGroup[] | null>(null);
  const [pendingLinks, setPendingLinks] = useState<PendingLink[]>([]);
  const [linkActionBusy, setLinkActionBusy] = useState<string | null>(null);
  const [deletingOccasionId, setDeletingOccasionId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((body) => setMe(body.user))
      .catch(() => setMe(null));
  }, []);

  function loadGroups() {
    fetch("/api/groups")
      .then((res) => res.json())
      .then((body) => {
        const list: Group[] = body.groups ?? [];
        setGroups(list);
        const stored = typeof window !== "undefined" ? window.localStorage.getItem(GROUP_KEY) : null;
        const fallback = list.find((g) => g.id === stored) ?? list[0];
        setActiveId(fallback?.id ?? null);
      })
      .catch(() => setGroups([]));
  }

  function loadPendingLinks() {
    fetch("/api/pending-links")
      .then((res) => res.json())
      .then((body) => setPendingLinks(body.requests ?? []))
      .catch(() => setPendingLinks([]));
  }

  useEffect(() => {
    if (me) {
      loadGroups();
      loadPendingLinks();
    }
  }, [me]);

  async function respondToLink(memberId: string, action: "accept" | "decline") {
    setLinkActionBusy(memberId);
    try {
      const res = await fetch(`/api/pending-links/${memberId}/${action}`, { method: "POST" });
      if (res.ok) {
        loadPendingLinks();
        if (action === "accept") loadGroups();
      }
    } finally {
      setLinkActionBusy(null);
    }
  }

  async function deleteOccasion(occasionId: string, chosenName: string) {
    if (!window.confirm(`Delete "${chosenName}"? This removes it from everyone's history and can't be undone.`)) return;
    setDeletingOccasionId(occasionId);
    try {
      const res = await fetch(`/api/occasions/${occasionId}`, { method: "DELETE" });
      if (res.ok) loadGroups();
    } finally {
      setDeletingOccasionId(null);
    }
  }

  useEffect(() => {
    if (me === null) {
      fetch("/api/guest-groups")
        .then((res) => res.json())
        .then((body) => setGuestGroups(body.groups ?? []))
        .catch(() => setGuestGroups([]));
    }
  }, [me]);

  async function createGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newGroupName }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't create that group");
        return;
      }
      setNewGroupName("");
      loadGroups();
    } finally {
      setCreating(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setMe(null);
    setGroups(null);
  }

  if (me === undefined) {
    return <div className="w-full flex-1 flex items-center justify-center text-muted">Loading…</div>;
  }

  if (me === null) {
    return (
      <div className="w-full flex-1 box-border px-6 pt-16 pb-6 flex flex-col items-center gap-6 text-center">
        <div className="w-11 h-11 rounded-full bg-primary flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 3v7a2 2 0 002 2v9M11 3v7a2 2 0 01-2 2M17 3c-2 2-3 5-3 8h3v10" />
          </svg>
        </div>
        <h1 className="m-0 font-serif text-3xl font-bold">Pickulator</h1>

        {guestGroups && guestGroups.length > 0 && (
          <div className="flex flex-col gap-3 w-full max-w-[280px] text-left">
            <div className="text-[13px] font-semibold tracking-[0.06em] uppercase text-muted text-center">
              Welcome back
            </div>
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
          </div>
        )}

        <div className="text-[15px] leading-[1.45] text-muted max-w-[280px]">
          Sign in to see your groups, or create an account to start one.
        </div>
        <div className="flex flex-col gap-3 w-full max-w-[280px]">
          <Link href="/login" className="h-14 rounded-[14px] bg-primary text-white flex items-center justify-center text-[17px] font-semibold no-underline">
            Log in
          </Link>
          <Link href="/signup" className="h-14 box-border rounded-[14px] border-2 border-primary text-primary flex items-center justify-center text-[17px] font-semibold no-underline">
            Sign up
          </Link>
        </div>
      </div>
    );
  }

  const active = groups?.find((g) => g.id === activeId) ?? null;

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
        <div className="flex items-center gap-1">
          <NotificationBell />
          <button type="button" onClick={logout} className="text-sm font-semibold text-muted">
            Log out
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-6 pt-6 pb-4 flex flex-col gap-6">
        {pendingLinks.length > 0 && (
          <div className="flex flex-col gap-2.5">
            {pendingLinks.map((p) => (
              <div key={p.memberId} className="bg-white border-2 border-primary rounded-[16px] p-4 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: p.tintColor }}>
                    {p.initial}
                  </div>
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <div className="text-[15px] font-semibold">Link your account to &quot;{p.displayName}&quot;?</div>
                    <div className="text-[13px] text-muted truncate">
                      In {p.group.name} — this brings over their past answers and history.
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => respondToLink(p.memberId, "decline")}
                    disabled={linkActionBusy === p.memberId}
                    className="flex-1 h-11 rounded-[10px] border-2 text-sm font-semibold disabled:opacity-60"
                    style={{ borderColor: "var(--border)" }}
                  >
                    Decline
                  </button>
                  <button
                    type="button"
                    onClick={() => respondToLink(p.memberId, "accept")}
                    disabled={linkActionBusy === p.memberId}
                    className="flex-1 h-11 rounded-[10px] text-sm font-semibold border-none disabled:opacity-60"
                    style={{ background: "var(--primary)", color: "#FFFFFF" }}
                  >
                    Accept
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {groups === null && <div className="text-muted">Loading your groups…</div>}

        {groups !== null && groups.length === 0 && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <div className="font-serif text-2xl font-semibold">Start your first group</div>
              <div className="text-[15px] leading-[1.45] text-muted">
                Give it a name, then invite the people who&apos;ll be deciding with you.
              </div>
            </div>
            <form onSubmit={createGroup} className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="e.g. The Regulars"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="box-border h-[52px] px-4 rounded-[14px] border border-[#B8AA98] bg-white text-base"
              />
              {error && <div className="text-sm text-primary">{error}</div>}
              <button
                type="submit"
                disabled={creating}
                className="h-14 rounded-[14px] bg-primary text-white text-[17px] font-semibold disabled:opacity-60"
              >
                {creating ? "Creating…" : "Create group"}
              </button>
            </form>
          </div>
        )}

        {active && (
          <>
            <div className="flex flex-col gap-1">
              <div className="text-[13px] font-semibold tracking-[0.06em] uppercase text-muted">Your groups</div>
              <h1 className="m-0 font-serif text-4xl font-bold leading-[1.1]">{active.name}</h1>
            </div>

            <div className="flex gap-4 items-start flex-wrap">
              {active.members.map((m) => (
                <div key={m.id} className="flex flex-col items-center gap-1">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold" style={{ background: m.tintColor }}>
                    {m.initial}
                  </div>
                  <div className="text-[13px] text-muted">{m.displayName}</div>
                </div>
              ))}
              <div className="flex flex-col items-center gap-1">
                <Link
                  href={`/invite?groupId=${active.id}`}
                  aria-label="Invite someone"
                  className="box-border w-12 h-12 rounded-full border-2 border-dashed flex items-center justify-center"
                  style={{ borderColor: "#B8AA98" }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </Link>
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
                href={`/occasion?groupId=${active.id}`}
                className="h-14 rounded-[14px] bg-primary text-white flex items-center justify-center text-[17px] font-semibold no-underline"
              >
                Start a new round
              </Link>
            </div>

            {active.occasions.length > 0 && (
              <div className="flex flex-col gap-1">
                <div className="text-base font-semibold mb-1">Recent nights</div>
                {active.occasions.map((o, i) => {
                  const isHost = active.hostUserId === me.id;
                  const chosenName = o.result?.chosenName ?? "No pick";
                  return (
                    <div
                      key={o.id}
                      className={`flex items-center justify-between py-3 ${i < active.occasions.length - 1 ? "border-b border-border" : ""}`}
                    >
                      <div className="flex flex-col gap-1">
                        <div className="text-base font-semibold">{chosenName}</div>
                        <div className="text-sm text-muted">{o.type} · {formatDate(o.closedAt)}</div>
                        {o.ratingSummary.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-0.5">
                            {o.ratingSummary.map((r) => (
                              <div
                                key={r.rating}
                                className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
                                style={{ background: RATING_LABELS[r.rating]?.bg ?? "var(--tint-tan)" }}
                              >
                                {RATING_LABELS[r.rating]?.label ?? r.rating}
                                {r.count > 1 ? ` ×${r.count}` : ""}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <Link href={`/result?occasionId=${o.id}`} className="text-sm font-semibold text-primary">
                          View
                        </Link>
                        {isHost && (
                          <button
                            type="button"
                            aria-label={`Delete ${chosenName}`}
                            onClick={() => deleteOccasion(o.id, chosenName)}
                            disabled={deletingOccasionId === o.id}
                            className="w-8 h-8 flex items-center justify-center text-muted disabled:opacity-50"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6h16z" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
