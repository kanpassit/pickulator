"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import BottomNav from "@/components/BottomNav";
import NotificationBell from "@/components/NotificationBell";
import { RATING_LABELS } from "@/lib/ratingLabels";

type Member = { id: string; displayName: string; initial: string; tintColor: string; userId: string | null };
type ClosedOccasion = {
  id: string;
  groupId: string;
  type: string;
  closedAt: string | null;
  result: { chosenName: string } | null;
  ratingSummary: { rating: string; count: number }[];
};
type Group = { id: string; name: string; hostUserId: string; members: Member[]; occasions: ClosedOccasion[] };
type OpenRound = {
  occasionId: string;
  groupId: string;
  groupName: string;
  type: string;
  day: string;
  timeSlot: string;
  createdAt: string;
  isHost: boolean;
  hasAnswered: boolean;
  answeredCount: number;
  totalMembers: number;
  waitingOn: string[];
};
type Me = { id: string; name: string; email: string } | null;
type PendingLink = {
  memberId: string;
  displayName: string;
  initial: string;
  tintColor: string;
  group: { id: string; name: string };
};

const OCCASION_LABELS: Record<string, string> = {
  BRUNCH: "Brunch",
  LUNCH: "Lunch",
  DINNER: "Dinner",
  COFFEE: "Coffee",
  DRINKS: "Drinks",
  LATE: "Late night",
};

const DAY_LABELS: Record<string, string> = {
  TODAY: "today",
  TOMORROW: "tomorrow",
  WEEKEND: "this weekend",
  OTHER: "soon",
};

function formatDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function timeAgo(iso: string) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

// "Sam", "Sam and Alex", "Sam, Alex +2"
function waitingLabel(names: string[]) {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names[0]}, ${names[1]} +${names.length - 2}`;
}

// Open rounds grouped by group, so six rounds for one group read as one
// section with distinguishable rows instead of six look-alike cards. Groups
// (and rounds within them) that need *my* answer sort first.
function groupOpenRounds(rounds: OpenRound[]) {
  const byGroup = new Map<string, { groupId: string; groupName: string; rounds: OpenRound[] }>();
  for (const r of rounds) {
    const entry = byGroup.get(r.groupId) ?? { groupId: r.groupId, groupName: r.groupName, rounds: [] };
    entry.rounds.push(r);
    byGroup.set(r.groupId, entry);
  }
  const needsMe = (r: OpenRound) => (r.hasAnswered ? 1 : 0);
  const newest = (a: OpenRound, b: OpenRound) => b.createdAt.localeCompare(a.createdAt);
  const sections = Array.from(byGroup.values());
  for (const g of sections) g.rounds.sort((a, b) => needsMe(a) - needsMe(b) || newest(a, b));
  sections.sort(
    (a, b) =>
      Math.min(...a.rounds.map(needsMe)) - Math.min(...b.rounds.map(needsMe)) || newest(a.rounds[0], b.rounds[0])
  );
  return sections;
}

export default function HomeClient({ user }: { user: NonNullable<Me> }) {
  const router = useRouter();
  const me = user;
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [openRounds, setOpenRounds] = useState<OpenRound[]>([]);
  const [newGroupName, setNewGroupName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingLinks, setPendingLinks] = useState<PendingLink[]>([]);
  const [linkActionBusy, setLinkActionBusy] = useState<string | null>(null);
  const [deletingOccasionId, setDeletingOccasionId] = useState<string | null>(null);

  function loadGroups() {
    fetch("/api/groups")
      .then((res) => res.json())
      .then((body) => {
        setGroups(body.groups ?? []);
        setOpenRounds(body.openRounds ?? []);
      })
      .catch(() => {
        setGroups([]);
        setOpenRounds([]);
      });
  }

  function loadPendingLinks() {
    fetch("/api/pending-links")
      .then((res) => res.json())
      .then((body) => setPendingLinks(body.requests ?? []))
      .catch(() => setPendingLinks([]));
  }

  useEffect(() => {
    loadGroups();
    loadPendingLinks();
  }, [user.id]);

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
    // The home route is server-rendered: refreshing re-evaluates the session
    // and swaps this dashboard for the public landing page.
    router.refresh();
  }

  const recentPicks = (groups ?? [])
    .flatMap((g) => g.occasions.map((o) => ({ ...o, groupName: g.name, isHost: g.hostUserId === me.id })))
    .sort((a, b) => (b.closedAt ?? "").localeCompare(a.closedAt ?? ""))
    .slice(0, 6);

  return (
    <div className="relative overflow-hidden w-full flex-1 flex flex-col">
      <div className="shrink-0 h-16 px-3 pl-6 flex items-center justify-between border-b border-border bg-background">
        <div className="flex items-center gap-2">
          <Logo className="w-7 h-7" />
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
                Give it a name, then share one link with the people who&apos;ll be deciding with you.
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

        {groups !== null && groups.length > 0 && (
          <>
            {openRounds.length > 0 && (
              <div className="flex flex-col gap-4">
                <div className="text-[13px] font-semibold tracking-[0.06em] uppercase text-muted">Open rounds</div>
                {groupOpenRounds(openRounds).map((section) => (
                  <section key={section.groupId} aria-label={section.groupName} className="flex flex-col gap-2">
                    <div className="flex items-baseline justify-between gap-2">
                      <h2 className="m-0 font-serif text-lg font-semibold truncate">{section.groupName}</h2>
                      <span className="shrink-0 text-[13px] text-muted">
                        {section.rounds.length} open {section.rounds.length === 1 ? "round" : "rounds"}
                      </span>
                    </div>
                    {section.rounds.map((r) => {
                      const pct = r.totalMembers > 0 ? Math.round((r.answeredCount / r.totalMembers) * 100) : 0;
                      const status = r.hasAnswered
                        ? r.waitingOn.length > 0
                          ? `Waiting on ${waitingLabel(r.waitingOn)}`
                          : "Everyone's answered"
                        : "Your turn";
                      return (
                        <Link
                          key={r.occasionId}
                          href={r.hasAnswered ? `/waiting?occasionId=${r.occasionId}` : `/question?occasionId=${r.occasionId}`}
                          className="box-border p-4 rounded-2xl border-2 bg-white flex flex-col gap-3 no-underline text-[#2A211B]"
                          style={{ borderColor: r.hasAnswered ? "var(--border)" : "var(--primary)" }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex-grow flex flex-col gap-0.5 min-w-0">
                              <div className="text-base font-bold truncate">
                                {OCCASION_LABELS[r.type] ?? r.type} · {DAY_LABELS[r.day] ?? r.day}, {r.timeSlot}
                              </div>
                              <div className="text-sm text-muted truncate">
                                {status} · started {timeAgo(r.createdAt)}
                              </div>
                            </div>
                            <div
                              className="shrink-0 px-3 py-1.5 rounded-full text-sm font-semibold"
                              style={{
                                background: r.hasAnswered ? "var(--tint-tan)" : "var(--primary)",
                                color: r.hasAnswered ? "var(--foreground)" : "#FFFFFF",
                              }}
                            >
                              {r.hasAnswered ? "Waiting" : "Answer now"}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div
                              className="flex-grow h-1.5 rounded-full overflow-hidden"
                              style={{ background: "var(--tint-tan)" }}
                              role="progressbar"
                              aria-valuemin={0}
                              aria-valuemax={r.totalMembers}
                              aria-valuenow={r.answeredCount}
                              aria-label="Answered so far"
                            >
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "var(--olive)" }} />
                            </div>
                            <div className="shrink-0 text-[13px] font-semibold text-muted">
                              {r.answeredCount} of {r.totalMembers} answered
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </section>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div className="text-[13px] font-semibold tracking-[0.06em] uppercase text-muted">Your groups</div>
                <Link href="/groups" className="text-sm font-semibold text-primary">
                  Manage
                </Link>
              </div>
              {groups.map((g) => (
                <div key={g.id} className="box-border p-4 rounded-2xl border border-border bg-white flex items-center gap-3">
                  <Link href={`/invite?groupId=${g.id}`} className="flex-grow flex items-center gap-3 no-underline text-[#2A211B] min-w-0">
                    <div className="flex shrink-0">
                      {g.members.slice(0, 3).map((m, i) => (
                        <div
                          key={m.id}
                          className="w-9 h-9 rounded-full border-2 border-white flex items-center justify-center text-sm font-bold"
                          style={{ background: m.tintColor, marginLeft: i === 0 ? 0 : -8 }}
                        >
                          {m.initial}
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <div className="text-base font-bold truncate">{g.name}</div>
                      <div className="text-sm text-muted">
                        {g.members.length} {g.members.length === 1 ? "person" : "people"}
                      </div>
                    </div>
                  </Link>
                  <Link
                    href={`/occasion?groupId=${g.id}`}
                    className="shrink-0 h-10 px-4 rounded-full bg-primary text-white flex items-center justify-center text-sm font-semibold no-underline"
                  >
                    Start a round
                  </Link>
                </div>
              ))}
            </div>

            {recentPicks.length > 0 && (
              <div className="flex flex-col gap-1">
                <div className="text-[13px] font-semibold tracking-[0.06em] uppercase text-muted mb-1">History</div>
                {recentPicks.map((o, i) => {
                  const chosenName = o.result?.chosenName ?? "No pick";
                  return (
                    <div
                      key={o.id}
                      className={`flex items-center justify-between py-3 ${i < recentPicks.length - 1 ? "border-b border-border" : ""}`}
                    >
                      <div className="flex flex-col gap-1 min-w-0">
                        <div className="text-base font-semibold truncate">{chosenName}</div>
                        <div className="text-sm text-muted truncate">
                          {o.groupName} · {o.type} · {formatDate(o.closedAt)}
                        </div>
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
                        {o.isHost && (
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
