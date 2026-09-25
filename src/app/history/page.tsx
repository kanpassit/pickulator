"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import NotificationBell from "@/components/NotificationBell";

type ClosedOccasion = {
  id: string;
  type: string;
  closedAt: string | null;
  result: { chosenName: string } | null;
};
type Group = { id: string; name: string; hostUserId: string; occasions: ClosedOccasion[] };
type Me = { id: string; name: string; email: string } | null;

type Row = {
  occasionId: string;
  groupName: string;
  type: string;
  closedAt: string | null;
  chosenName: string;
  isHost: boolean;
};

function formatDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function HistoryPage() {
  const [me, setMe] = useState<Me | undefined>(undefined);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((body) => setMe(body.user))
      .catch(() => setMe(null));
  }, []);

  function loadHistory() {
    if (!me) return;
    fetch("/api/groups")
      .then((res) => res.json())
      .then((body) => {
        const groups: Group[] = body.groups ?? [];
        const flat: Row[] = groups.flatMap((g) =>
          g.occasions.map((o) => ({
            occasionId: o.id,
            groupName: g.name,
            type: o.type,
            closedAt: o.closedAt,
            chosenName: o.result?.chosenName ?? "No pick",
            isHost: me !== null && me !== undefined && g.hostUserId === me.id,
          }))
        );
        flat.sort((a, b) => (b.closedAt ?? "").localeCompare(a.closedAt ?? ""));
        setRows(flat);
      })
      .catch(() => setRows([]));
  }

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me]);

  async function deleteOccasion(occasionId: string, chosenName: string) {
    if (!window.confirm(`Delete "${chosenName}"? This removes it from everyone's history and can't be undone.`)) return;
    setDeletingId(occasionId);
    try {
      const res = await fetch(`/api/occasions/${occasionId}`, { method: "DELETE" });
      if (res.ok) loadHistory();
    } finally {
      setDeletingId(null);
    }
  }

  if (me === undefined) {
    return <div className="w-full flex-1 flex items-center justify-center text-muted">Loading…</div>;
  }

  if (me === null) {
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center gap-4 text-center px-6">
        <div className="text-[15px] text-muted">Sign in to see your history.</div>
        <Link href="/login" className="h-14 px-8 rounded-[14px] bg-primary text-white flex items-center justify-center text-[17px] font-semibold no-underline">
          Log in
        </Link>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden w-full flex-1 flex flex-col">
      <div className="shrink-0 h-16 px-6 flex items-center justify-between border-b border-border bg-background">
        <div className="font-serif text-xl font-bold">History</div>
        <NotificationBell />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-6 pt-6 pb-4 flex flex-col gap-1">
        {rows === null && <div className="text-muted">Loading…</div>}

        {rows !== null && rows.length === 0 && (
          <div className="text-[15px] text-muted">No decided rounds yet - they&apos;ll show up here once a round closes.</div>
        )}

        {rows !== null &&
          rows.map((r, i) => (
            <div
              key={r.occasionId}
              className={`flex items-center justify-between py-3.5 ${i < rows.length - 1 ? "border-b border-border" : ""}`}
            >
              <div className="flex flex-col gap-0.5">
                <div className="text-base font-semibold">{r.chosenName}</div>
                <div className="text-sm text-muted">
                  {r.groupName} · {r.type[0]}{r.type.slice(1).toLowerCase()} · {formatDate(r.closedAt)}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-3">
                <Link href={`/result?occasionId=${r.occasionId}`} className="text-sm font-semibold text-primary">
                  View
                </Link>
                {r.isHost && (
                  <button
                    type="button"
                    aria-label={`Delete ${r.chosenName}`}
                    onClick={() => deleteOccasion(r.occasionId, r.chosenName)}
                    disabled={deletingId === r.occasionId}
                    className="w-8 h-8 flex items-center justify-center text-muted disabled:opacity-50"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6h16z" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
      </div>

      <BottomNav />
    </div>
  );
}
