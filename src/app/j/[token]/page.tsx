"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type JoinData = {
  group: { id: string; name: string };
  member: { id: string; displayName: string; initial: string; tintColor: string; phone: string | null };
  occasion: { id: string; type: string; day: string; timeSlot: string; hasAnswered: boolean } | null;
  members: { id: string; displayName: string; initial: string; tintColor: string; answered: boolean }[];
};

export default function JoinPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [data, setData] = useState<JoinData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phone, setPhone] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/join/${token}`)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "This link isn't valid anymore");
        return body as JoinData;
      })
      .then((body) => {
        if (cancelled) return;
        setData(body);
        setPhone(body.member.phone ?? "");
      })
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function start() {
    if (phone.trim()) {
      await fetch(`/api/join/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      }).catch(() => {});
    }
    if (!data?.occasion) return;
    const dest = data.occasion.hasAnswered ? "waiting" : "question";
    router.push(`/${dest}?occasionId=${data.occasion.id}&token=${token}`);
  }

  if (error) {
    return (
      <div className="w-full flex-1 box-border px-6 pt-5 pb-6 flex flex-col items-center justify-center gap-3 text-center">
        <div className="font-serif text-2xl font-bold">Link not found</div>
        <div className="text-[15px] text-muted">{error}</div>
      </div>
    );
  }

  if (!data) {
    return <div className="w-full flex-1 flex items-center justify-center text-muted">Loading…</div>;
  }

  return (
    <div className="w-full flex-1 box-border px-6 pt-5 pb-6 flex flex-col gap-[22px]">
      <div className="flex items-center justify-center gap-2 h-11 mt-1">
        <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 3v7a2 2 0 002 2v9M11 3v7a2 2 0 01-2 2M17 3c-2 2-3 5-3 8h3v10" />
          </svg>
        </div>
        <div className="font-serif text-xl font-bold">Pickulator</div>
      </div>

      <div className="flex flex-col gap-2.5 mt-2">
        <h1 className="m-0 font-serif text-[32px] font-bold leading-[1.12]">
          {data.group.name} wants your vote
        </h1>
        <div className="text-base leading-[1.45] text-muted">
          A few quick taps and we&apos;ll find something that works for everyone.
        </div>
      </div>

      <div className="bg-white border border-border rounded-[20px] px-5 py-4 flex items-center gap-3">
        <div className="flex">
          {data.members.slice(0, 4).map((m, i) => (
            <div
              key={m.id}
              className="w-9 h-9 rounded-full border-2 border-white flex items-center justify-center text-sm font-bold"
              style={{ background: m.tintColor, marginLeft: i === 0 ? 0 : -8 }}
            >
              {m.initial}
            </div>
          ))}
        </div>
        <div className="text-sm leading-[1.35] text-muted">
          {data.occasion
            ? "Answers stay hidden until everyone's in."
            : "No round is open right now — check back soon."}
        </div>
      </div>

      <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl" style={{ background: "var(--tint-tan)" }}>
        <div
          className="w-11 h-11 shrink-0 rounded-full flex items-center justify-center text-[17px] font-bold"
          style={{ background: data.member.tintColor }}
        >
          {data.member.initial}
        </div>
        <div className="flex-grow flex flex-col gap-0.5">
          <div className="text-[13px] text-muted">You&apos;re joining as</div>
          <div className="text-[17px] font-bold">{data.member.displayName}</div>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="tel" className="text-sm font-semibold">
          Mobile number <span className="font-normal text-muted">(optional)</span>
        </label>
        <input
          id="tel"
          type="tel"
          placeholder="(619) 555-0123"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="box-border h-[52px] px-4 rounded-[14px] border border-[#B8AA98] bg-white text-base"
        />
      </div>

      <div className="flex-grow" />
      <button
        type="button"
        onClick={start}
        disabled={!data.occasion}
        className="h-14 rounded-[14px] bg-primary text-white flex items-center justify-center text-[17px] font-semibold disabled:opacity-50"
      >
        Start
      </button>
      <div className="text-center text-sm text-muted">No account needed.</div>
    </div>
  );
}
