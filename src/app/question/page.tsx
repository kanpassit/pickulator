"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { QuestionProgress } from "../_components/QuestionProgress";
import { setsFor, ALL, type Option } from "@/lib/cuisineOptions";

type CustomOption = { id: string; label: string; hint: string | null; createdByMemberId: string };

function QuestionContent() {
  const params = useSearchParams();
  const occasionId = params.get("occasionId");
  const token = params.get("token");
  const router = useRouter();

  const [picks, setPicks] = useState<string[]>(() => {
    const raw = params.get("picks");
    return raw ? raw.split(",").filter(Boolean) : [];
  });
  const [set, setSet] = useState(0);
  const [label, setLabel] = useState("New round");
  const [occasionType, setOccasionType] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [isRegistered, setIsRegistered] = useState(false);
  const [memberNames, setMemberNames] = useState<Record<string, string>>({});
  const [customOptions, setCustomOptions] = useState<CustomOption[]>([]);
  const [myMemberId, setMyMemberId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newHint, setNewHint] = useState("");
  const [addBusy, setAddBusy] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  useEffect(() => {
    if (!occasionId) return;
    fetch(`/api/occasions/${occasionId}${token ? `?token=${encodeURIComponent(token)}` : ""}`)
      .then((res) => res.json())
      .then((body) => {
        if (body.group && body.occasion) {
          setLabel(`${body.group.name} · ${body.occasion.type[0]}${body.occasion.type.slice(1).toLowerCase()}`);
          setOccasionType(body.occasion.type);
        }
        if (Array.isArray(body.customOptions)) setCustomOptions(body.customOptions);
        if (Array.isArray(body.members)) {
          setMemberNames(Object.fromEntries(body.members.map((m: { id: string; displayName: string }) => [m.id, m.displayName])));
        }
        if (typeof body.myMemberId === "string") setMyMemberId(body.myMemberId);
        setIsHost(!!body.isHost);
      })
      .catch(() => {});
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((body) => setIsRegistered(!!body.user))
      .catch(() => {});
  }, [occasionId, token]);

  const full = picks.length >= 3;
  const sets = setsFor(occasionType);
  const opts = sets[set % sets.length];

  const customById: Record<string, Option> = Object.fromEntries(
    customOptions.map((o) => [o.id, { id: o.id, name: o.label, hint: o.hint ?? "Added by your group", dot: "var(--tint-tan)" }])
  );
  const allById: Record<string, Option> = { ...ALL, ...customById };

  function toggle(id: string) {
    setPicks((cur) => {
      if (cur.includes(id)) return cur.filter((x) => x !== id);
      if (cur.length < 3) return [...cur, id];
      return cur;
    });
  }

  function goNext() {
    if (!occasionId || !full) return;
    setError(null);
    const q = new URLSearchParams({ occasionId, picks: picks.join(",") });
    if (token) q.set("token", token);
    router.push(`/vibe?${q.toString()}`);
  }

  async function addCustomOption() {
    if (!occasionId || !newLabel.trim()) return;
    setAddBusy(true);
    setAddError(null);
    try {
      const res = await fetch(`/api/occasions/${occasionId}/custom-options`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: newLabel.trim(), hint: newHint.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAddError(data.error ?? "Couldn't add that option");
        return;
      }
      setCustomOptions((cur) => [...cur, data.option]);
      setNewLabel("");
      setNewHint("");
      setShowAddForm(false);
    } finally {
      setAddBusy(false);
    }
  }

  function canDelete(o: CustomOption) {
    return isHost || (!!myMemberId && o.createdByMemberId === myMemberId);
  }

  async function deleteCustomOption(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/custom-options/${id}`, { method: "DELETE" });
      if (res.ok) {
        setCustomOptions((cur) => cur.filter((o) => o.id !== id));
        setPicks((cur) => cur.filter((p) => p !== id));
      }
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="w-full flex-1 box-border px-6 pt-5 pb-6 flex flex-col gap-5">
      <QuestionProgress step={1} total={4} label={label} />

      <div className="flex flex-col gap-2 mt-2">
        <h1 className="m-0 font-serif text-[34px] font-bold leading-[1.12]">Pick your top 3</h1>
        <div className="text-[15px] leading-[1.4] text-muted">
          What are you in the mood for? Tap in order, favorite first. Only you can see your picks.
        </div>
      </div>

      <div className="flex gap-2">
        {[0, 1, 2].map((i) => {
          const id = picks[i];
          const on = !!id;
          return (
            <div
              key={i}
              className="flex-1 min-w-0 box-border h-10 px-2.5 rounded-full border-2 flex items-center gap-2 overflow-hidden"
              style={{
                borderStyle: on ? "solid" : "dashed",
                borderColor: on ? "var(--primary)" : "#B8AA98",
                background: on ? "#FFFFFF" : "transparent",
              }}
            >
              <div
                className="w-[22px] h-[22px] shrink-0 rounded-full flex items-center justify-center text-[13px] font-bold"
                style={{ background: on ? "var(--primary)" : "var(--tint-tan)", color: on ? "#FFFFFF" : "var(--muted)" }}
              >
                {i + 1}
              </div>
              <div
                className="text-sm font-semibold whitespace-nowrap overflow-hidden text-ellipsis"
                style={{ color: on ? "var(--foreground)" : "var(--muted)" }}
              >
                {on ? (allById[id]?.name ?? "Pick") : "Empty"}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {opts.map((o) => {
          const idx = picks.indexOf(o.id);
          const on = idx >= 0;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => toggle(o.id)}
              className="box-border h-[152px] px-4 py-3.5 rounded-[20px] border-2 bg-white flex flex-col justify-between items-start text-left"
              style={{ borderColor: on ? "var(--primary)" : "var(--border)", opacity: !on && full ? 0.5 : 1 }}
            >
              <div className="flex items-center justify-between w-full">
                <div className="w-9 h-9 rounded-full" style={{ background: o.dot }} />
                {on && (
                  <div className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-[15px] font-bold">
                    {idx + 1}
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <div className="text-xl font-bold">{o.name}</div>
                <div className="text-sm leading-[1.35] text-muted">{o.hint}</div>
              </div>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => setSet((s) => (s + 1) % sets.length)}
        className="-mt-2 h-[52px] rounded-[14px] border-none flex items-center justify-center gap-2 text-base font-semibold"
        style={{ background: "var(--tint-tan)" }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 12a8 8 0 11-2.3-5.6" />
          <path d="M20 4v5h-5" />
        </svg>
        <span>Give me more options</span>
      </button>

      {(customOptions.length > 0 || isRegistered) && (
        <div className="flex flex-col gap-2.5">
          <div className="text-base font-semibold">From your group</div>

          {customOptions.map((o) => {
            const idx = picks.indexOf(o.id);
            const on = idx >= 0;
            const removable = canDelete(o);
            return (
              <div
                key={o.id}
                className="box-border rounded-2xl border-2 bg-white flex items-center"
                style={{ borderColor: on ? "var(--primary)" : "var(--border)", opacity: !on && full ? 0.5 : 1 }}
              >
                <button
                  type="button"
                  onClick={() => toggle(o.id)}
                  className={`flex-grow min-w-0 p-4 flex items-center gap-3 text-left border-none bg-transparent ${removable ? "pr-2" : ""}`}
                >
                  <div className="flex-grow min-w-0 flex flex-col gap-0.5">
                    <div className="text-base font-bold">{o.label}</div>
                    <div className="text-xs text-muted">
                      {o.hint ? o.hint + " · " : ""}Added by {memberNames[o.createdByMemberId] ?? "a member"}
                    </div>
                  </div>
                  {on && (
                    <div className="w-7 h-7 shrink-0 rounded-full bg-primary text-white flex items-center justify-center text-[15px] font-bold">
                      {idx + 1}
                    </div>
                  )}
                </button>
                {removable && (
                  <button
                    type="button"
                    onClick={() => deleteCustomOption(o.id)}
                    disabled={deletingId === o.id}
                    aria-label={`Remove ${o.label}`}
                    className="shrink-0 w-11 h-11 mr-1 rounded-full flex items-center justify-center border-none bg-transparent disabled:opacity-50"
                    style={{ color: "var(--muted)" }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </button>
                )}
              </div>
            );
          })}

          {isRegistered && !showAddForm && (
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="h-12 rounded-[14px] border-2 border-dashed flex items-center justify-center gap-2 text-sm font-semibold"
              style={{ borderColor: "var(--border)", color: "var(--muted)" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span>Add your own option</span>
            </button>
          )}

          {isRegistered && showAddForm && (
            <div className="flex flex-col gap-2 p-4 rounded-2xl border-2 bg-white" style={{ borderColor: "var(--border)" }}>
              <input
                type="text"
                placeholder="e.g. Poke"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                maxLength={40}
                className="box-border h-11 px-3 rounded-[10px] border text-base"
                style={{ borderColor: "var(--border)" }}
              />
              <input
                type="text"
                placeholder="Short hint (optional)"
                value={newHint}
                onChange={(e) => setNewHint(e.target.value)}
                maxLength={80}
                className="box-border h-11 px-3 rounded-[10px] border text-sm"
                style={{ borderColor: "var(--border)" }}
              />
              {addError && <div className="text-sm text-primary">{addError}</div>}
              <div className="flex gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setAddError(null);
                    setNewLabel("");
                    setNewHint("");
                  }}
                  className="flex-1 h-11 rounded-[10px] border-2 text-sm font-semibold"
                  style={{ borderColor: "var(--border)" }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={addCustomOption}
                  disabled={!newLabel.trim() || addBusy}
                  className="flex-1 h-11 rounded-[10px] text-sm font-semibold border-none disabled:opacity-60"
                  style={{ background: "var(--primary)", color: "#FFFFFF" }}
                >
                  {addBusy ? "Adding…" : "Add"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex-grow" />
      <div className="flex items-center justify-center gap-2 text-sm text-muted">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="5" y="11" width="14" height="9" rx="2" />
          <path d="M8 11V8a4 4 0 018 0v3" />
        </svg>
        <span>Hidden until everyone has answered</span>
      </div>
      {error && <div className="text-sm text-primary text-center">{error}</div>}
      <button
        type="button"
        onClick={goNext}
        disabled={!full || !occasionId}
        className="h-14 rounded-[14px] flex items-center justify-center text-[17px] font-semibold border-none disabled:cursor-not-allowed"
        style={{
          background: full ? "var(--primary)" : "var(--border)",
          color: full ? "#FFFFFF" : "var(--muted)",
        }}
      >
        {full ? "Next" : `Pick ${3 - picks.length} more`}
      </button>
    </div>
  );
}

export default function QuestionPage() {
  return (
    <Suspense fallback={<div className="w-full flex-1 flex items-center justify-center text-muted">Loading…</div>}>
      <QuestionContent />
    </Suspense>
  );
}
