"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Member = { id: string; displayName: string; initial: string; tintColor: string; answered: boolean };
type OccData = {
  occasion: { id: string; status: string };
  group: { id: string; name: string; hostUserId: string };
  members: Member[];
  answeredCount: number;
  totalMembers: number;
};

function WaitingContent() {
  const params = useSearchParams();
  const occasionId = params.get("occasionId");
  const token = params.get("token");
  const router = useRouter();

  const [data, setData] = useState<OccData | null>(null);
  const [meId, setMeId] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!occasionId) return;
    fetch(`/api/occasions/${occasionId}`)
      .then((res) => res.json())
      .then((body) => setData(body))
      .catch(() => {});
  }, [occasionId]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((body) => setMeId(body.user?.id ?? null))
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 4000);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    if (data?.occasion.status === "CLOSED") {
      const q = new URLSearchParams({ occasionId: occasionId ?? "" });
      if (token) q.set("token", token);
      router.push(`/result?${q.toString()}`);
    }
  }, [data, occasionId, token, router]);

  async function closeRound() {
    if (!occasionId) return;
    setClosing(true);
    setError(null);
    try {
      const res = await fetch(`/api/occasions/${occasionId}/close`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Couldn't close this round");
        return;
      }
      const q = new URLSearchParams({ occasionId });
      if (token) q.set("token", token);
      router.push(`/result?${q.toString()}`);
    } finally {
      setClosing(false);
    }
  }

  if (!data) {
    return <div className="w-full flex-1 flex items-center justify-center text-muted">Loading…</div>;
  }

  const isHost = meId !== null && meId === data.group.hostUserId;

  return (
    <div className="w-full flex-1 box-border px-6 pt-5 pb-6 flex flex-col gap-6">
      <div className="flex items-center justify-center h-11 text-sm text-muted">{data.group.name}</div>

      <div className="flex flex-col items-center gap-1.5 mt-4 text-center">
        <div className="font-serif text-[88px] font-bold leading-none text-primary">
          {data.answeredCount} of {data.totalMembers}
        </div>
        <div className="text-xl font-semibold">have answered</div>
        <div className="text-[15px] leading-[1.45] text-muted max-w-[280px] mt-1">
          Everyone&apos;s answers stay hidden until the round closes.
        </div>
      </div>

      <div className="bg-white border border-border rounded-[20px] px-5 flex flex-col">
        {data.members.map((p, i) => (
          <div key={p.id} className={`flex items-center gap-3.5 py-3.5 ${i < data.members.length - 1 ? "border-b border-border" : ""}`}>
            <div className="w-11 h-11 rounded-full flex items-center justify-center text-[17px] font-bold" style={{ background: p.tintColor }}>
              {p.initial}
            </div>
            <div className="flex-grow text-[17px] font-semibold">{p.displayName}</div>
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

      {isHost && (
        <div className="flex flex-col gap-3">
          {error && <div className="text-sm text-primary text-center">{error}</div>}
          <button
            type="button"
            onClick={closeRound}
            disabled={closing || data.answeredCount === 0}
            className="h-14 rounded-[14px] bg-primary text-white flex items-center justify-center text-[17px] font-semibold disabled:opacity-60"
          >
            {closing ? "Deciding…" : "Decide with what we have"}
          </button>
          <div className="text-sm leading-[1.45] text-muted text-center">
            Deciding now leaves out anyone who hasn&apos;t answered yet. Finding a real pick can take up to a
            minute.
          </div>
        </div>
      )}
    </div>
  );
}

export default function WaitingPage() {
  return (
    <Suspense fallback={<div className="w-full flex-1 flex items-center justify-center text-muted">Loading…</div>}>
      <WaitingContent />
    </Suspense>
  );
}
