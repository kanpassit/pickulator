"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
  isHost: boolean;
  hasAnswered: boolean;
};
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

export default function Home() {
  const [me, setMe] = useState<Me | undefined>(undefined); // undefined = loading
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [openRounds, setOpenRounds] = useState<OpenRound[]>([]);
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
        <svg className="w-11 h-11" viewBox="0 0 1024 1024">
      <path fill="#C23B20" d="M521.906 194.22C546.189 193.765 564.179 195.413 588.11 201.028C647.023 215.471 697.835 252.622 729.465 304.379C760.276 354.775 769.998 415.279 756.529 472.791C731.609 577.45 640.154 647.321 535.4 642.52C518.924 641.765 499.173 641.207 484.716 650.464C449.025 673.316 465.238 710.775 457.306 745.499C448.955 786.69 409.151 826.353 366.246 828.961C328.507 831.255 299.631 802.913 299.095 765.486C298.768 742.726 298.951 720.02 298.966 697.277L298.967 568.768L298.985 470.784C298.958 436.371 296.842 405.217 304.604 371.43C313.332 334.162 331.222 299.661 356.652 271.053C400.164 223.015 457.486 197.338 521.906 194.22Z" />
      <path fill="#FBF6EE" d="M527.481 278.733C551.157 278.494 574.568 283.738 595.881 294.054C628.403 309.56 655.367 339.685 667.41 373.667C680.031 409.192 678.044 448.272 661.886 482.334C640.814 527.156 596.591 556.566 547.107 558.663C520.774 559.944 498.3 556.239 472.292 565.481C444.877 575.401 420.275 593.781 402.205 616.648C399.612 619.93 394.763 627.049 391.313 628.934C388.372 628.277 388.109 625.575 388.086 623.035C387.972 610.593 387.96 598.142 387.949 585.7L387.947 509.547L387.912 447.238C387.877 428.994 386.762 409.052 390.477 391.197C404.417 324.213 460.085 280.94 527.481 278.733Z" />
      <path fill="#C23B20" d="M522.239 326.706C573.716 321.064 622.089 373.273 609.318 424.029C605.882 437.684 596.628 454.783 589.498 466.987C577.5 487.52 563.394 507.656 548.099 525.86C543.458 531.375 538.177 538.702 532.226 542.337C528.082 543.705 522.751 543.364 519.564 540.092C512.044 532.609 504.996 524.101 498.554 515.643C478.919 489.864 457.588 460.214 446.709 429.498C438.2 405.473 446.078 375.236 462.462 356.25C478.513 337.651 497.865 328.914 522.239 326.706Z" />
      <path fill="#FBF6EE" d="M522.04 371.081C540.728 368.114 558.26 380.925 561.111 399.632C563.962 418.338 551.043 435.79 532.319 438.525C513.759 441.237 496.492 428.454 493.665 409.911C490.839 391.368 503.515 374.022 522.04 371.081Z" />
    </svg>
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

  const recentPicks = (groups ?? [])
    .flatMap((g) => g.occasions.map((o) => ({ ...o, groupName: g.name, isHost: g.hostUserId === me.id })))
    .sort((a, b) => (b.closedAt ?? "").localeCompare(a.closedAt ?? ""))
    .slice(0, 6);

  return (
    <div className="relative overflow-hidden w-full flex-1 flex flex-col">
      <div className="shrink-0 h-16 px-3 pl-6 flex items-center justify-between border-b border-border bg-background">
        <div className="flex items-center gap-2">
          <svg className="w-7 h-7" viewBox="0 0 1024 1024">
      <path fill="#C23B20" d="M521.906 194.22C546.189 193.765 564.179 195.413 588.11 201.028C647.023 215.471 697.835 252.622 729.465 304.379C760.276 354.775 769.998 415.279 756.529 472.791C731.609 577.45 640.154 647.321 535.4 642.52C518.924 641.765 499.173 641.207 484.716 650.464C449.025 673.316 465.238 710.775 457.306 745.499C448.955 786.69 409.151 826.353 366.246 828.961C328.507 831.255 299.631 802.913 299.095 765.486C298.768 742.726 298.951 720.02 298.966 697.277L298.967 568.768L298.985 470.784C298.958 436.371 296.842 405.217 304.604 371.43C313.332 334.162 331.222 299.661 356.652 271.053C400.164 223.015 457.486 197.338 521.906 194.22Z" />
      <path fill="#FBF6EE" d="M527.481 278.733C551.157 278.494 574.568 283.738 595.881 294.054C628.403 309.56 655.367 339.685 667.41 373.667C680.031 409.192 678.044 448.272 661.886 482.334C640.814 527.156 596.591 556.566 547.107 558.663C520.774 559.944 498.3 556.239 472.292 565.481C444.877 575.401 420.275 593.781 402.205 616.648C399.612 619.93 394.763 627.049 391.313 628.934C388.372 628.277 388.109 625.575 388.086 623.035C387.972 610.593 387.96 598.142 387.949 585.7L387.947 509.547L387.912 447.238C387.877 428.994 386.762 409.052 390.477 391.197C404.417 324.213 460.085 280.94 527.481 278.733Z" />
      <path fill="#C23B20" d="M522.239 326.706C573.716 321.064 622.089 373.273 609.318 424.029C605.882 437.684 596.628 454.783 589.498 466.987C577.5 487.52 563.394 507.656 548.099 525.86C543.458 531.375 538.177 538.702 532.226 542.337C528.082 543.705 522.751 543.364 519.564 540.092C512.044 532.609 504.996 524.101 498.554 515.643C478.919 489.864 457.588 460.214 446.709 429.498C438.2 405.473 446.078 375.236 462.462 356.25C478.513 337.651 497.865 328.914 522.239 326.706Z" />
      <path fill="#FBF6EE" d="M522.04 371.081C540.728 368.114 558.26 380.925 561.111 399.632C563.962 418.338 551.043 435.79 532.319 438.525C513.759 441.237 496.492 428.454 493.665 409.911C490.839 391.368 503.515 374.022 522.04 371.081Z" />
    </svg>
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
              <div className="flex flex-col gap-2.5">
                <div className="text-[13px] font-semibold tracking-[0.06em] uppercase text-muted">Open rounds</div>
                {openRounds.map((r) => (
                  <Link
                    key={r.occasionId}
                    href={r.hasAnswered ? `/waiting?occasionId=${r.occasionId}` : `/question?occasionId=${r.occasionId}`}
                    className="box-border p-4 rounded-2xl border-2 bg-white flex items-center gap-3 no-underline text-[#2A211B]"
                    style={{ borderColor: "var(--primary)" }}
                  >
                    <div className="flex-grow flex flex-col gap-0.5 min-w-0">
                      <div className="text-base font-bold truncate">
                        {r.groupName} · {OCCASION_LABELS[r.type] ?? r.type}
                      </div>
                      <div className="text-sm text-muted truncate">
                        {DAY_LABELS[r.day] ?? r.day}, {r.timeSlot}
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
                  </Link>
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
