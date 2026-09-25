"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type Member = {
  id: string;
  displayName: string;
  initial: string;
  tintColor: string;
  linkToken: string;
  pendingEmail: string | null;
  userId: string | null;
  linkOpenedAt: string | null;
  pendingLinkEmail: string | null;
};

function InviteContent() {
  const groupId = useSearchParams().get("groupId");
  const [members, setMembers] = useState<Member[] | null>(null);
  const [groupName, setGroupName] = useState("");
  const [mode, setMode] = useState<"name" | "email">("name");
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [newLink, setNewLink] = useState<{ name: string; path: string } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const [linkFormFor, setLinkFormFor] = useState<string | null>(null);
  const [linkEmailValue, setLinkEmailValue] = useState("");
  const [linkBusy, setLinkBusy] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  function load() {
    if (!groupId) return;
    fetch(`/api/groups/${groupId}`)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Couldn't load this group");
        return body;
      })
      .then((body) => {
        setGroupName(body.group.name);
        setMembers(body.group.members);
      })
      .catch((err) => setError(err.message));
  }

  useEffect(load, [groupId]);

  async function addPerson(e: React.FormEvent) {
    e.preventDefault();
    if (!groupId || !value.trim()) return;
    setError(null);
    const res = await fetch(`/api/groups/${groupId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mode === "name" ? { mode, name: value } : { mode, email: value }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Couldn't add that person");
      return;
    }
    setNewLink({ name: data.member.displayName, path: data.member.joinPath });
    setValue("");
    load();
  }

  async function copy(id: string, path: string) {
    const url = `${window.location.origin}${path}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(id);
      setTimeout(() => setCopied((c) => (c === id ? null : c)), 2000);
    } catch {
      // clipboard may be unavailable; the link is still shown on screen
    }
  }

  async function resetLink(memberId: string) {
    if (!groupId) return;
    const res = await fetch(`/api/groups/${groupId}/members/${memberId}/reset-link`, { method: "POST" });
    if (res.ok) load();
  }

  async function sendLinkRequest(memberId: string) {
    if (!groupId || !linkEmailValue.trim()) return;
    setLinkBusy(true);
    setLinkError(null);
    try {
      const res = await fetch(`/api/groups/${groupId}/members/${memberId}/link-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: linkEmailValue.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLinkError(data.error ?? "Couldn't send that request");
        return;
      }
      setLinkFormFor(null);
      setLinkEmailValue("");
      load();
    } finally {
      setLinkBusy(false);
    }
  }

  async function cancelLinkRequest(memberId: string) {
    if (!groupId) return;
    const res = await fetch(`/api/groups/${groupId}/members/${memberId}/link-request`, { method: "DELETE" });
    if (res.ok) load();
  }

  if (!groupId) {
    return <div className="w-full flex-1 flex items-center justify-center text-muted">No group selected.</div>;
  }

  return (
    <div className="w-full flex-1 box-border px-6 pt-5 pb-6 flex flex-col gap-[22px]">
      <div className="flex items-center justify-between h-11">
        <Link href="/" aria-label="Back" className="w-11 h-11 -ml-2.5 flex items-center justify-center">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </Link>
        <div className="text-sm text-muted">{groupName || "…"} · Host</div>
        <div className="w-11" />
      </div>

      <div className="flex flex-col gap-2 mt-1">
        <h1 className="m-0 font-serif text-[34px] font-bold leading-[1.12]">Invite people</h1>
        <div className="text-[15px] leading-[1.45] text-muted">
          Everyone gets their own link. It works for every round, so they only need to save it once.
        </div>
      </div>

      {error && <div className="text-sm text-primary">{error}</div>}

      <div className="bg-white border border-border rounded-[20px] px-4 flex flex-col">
        {(members ?? []).map((m, i) => (
          <div
            key={m.id}
            className={`flex flex-col gap-2.5 py-3.5 ${i < (members?.length ?? 0) - 1 ? "border-b border-border" : ""}`}
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 shrink-0 rounded-full flex items-center justify-center text-[17px] font-bold" style={{ background: m.tintColor }}>
                {m.initial}
              </div>
              <div className="flex-grow min-w-0 flex flex-col gap-0.5">
                <div className="text-base font-semibold">{m.displayName}</div>
                <div className="text-[13px] text-muted">
                  {m.userId ? "Account" : m.pendingEmail ? "Invited by email" : "Guest"} ·{" "}
                  {m.linkOpenedAt ? "opened" : "not opened"}
                </div>
              </div>
              <button
                type="button"
                aria-label={`Reset link for ${m.displayName}`}
                onClick={() => resetLink(m.id)}
                className="w-11 h-11 shrink-0 box-border rounded-full border-2 border-border bg-white flex items-center justify-center"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 12a8 8 0 11-2.3-5.6" />
                  <path d="M20 4v5h-5" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => copy(m.id, `/j/${m.linkToken}`)}
                className="w-[92px] h-11 shrink-0 box-border rounded-full border-2 font-bold text-sm"
                style={{
                  borderColor: copied === m.id ? "var(--olive)" : "var(--primary)",
                  background: copied === m.id ? "var(--tint-green)" : "#FFFFFF",
                  color: copied === m.id ? "var(--green-dark)" : "var(--primary)",
                }}
              >
                {copied === m.id ? "Copied" : "Copy link"}
              </button>
            </div>

            {!m.userId && (
              <div className="pl-[56px] flex flex-col gap-2">
                {m.pendingLinkEmail ? (
                  <div className="flex items-center justify-between gap-2 text-[13px]">
                    <span className="text-muted">Waiting for {m.pendingLinkEmail} to confirm</span>
                    <button
                      type="button"
                      onClick={() => cancelLinkRequest(m.id)}
                      className="shrink-0 font-semibold text-primary"
                    >
                      Cancel
                    </button>
                  </div>
                ) : linkFormFor === m.id ? (
                  <div className="flex flex-col gap-1.5">
                    <div className="flex gap-2">
                      <input
                        type="email"
                        placeholder="their-registered@email.com"
                        value={linkEmailValue}
                        onChange={(e) => setLinkEmailValue(e.target.value)}
                        className="flex-grow min-w-0 box-border h-10 px-3 rounded-[10px] border text-sm"
                        style={{ borderColor: "var(--border)" }}
                      />
                      <button
                        type="button"
                        onClick={() => sendLinkRequest(m.id)}
                        disabled={!linkEmailValue.trim() || linkBusy}
                        className="shrink-0 h-10 px-3 rounded-[10px] text-sm font-semibold border-none disabled:opacity-60"
                        style={{ background: "var(--primary)", color: "#FFFFFF" }}
                      >
                        {linkBusy ? "Sending…" : "Send"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setLinkFormFor(null);
                          setLinkError(null);
                          setLinkEmailValue("");
                        }}
                        className="shrink-0 h-10 px-3 rounded-[10px] text-sm font-semibold border-2"
                        style={{ borderColor: "var(--border)" }}
                      >
                        Cancel
                      </button>
                    </div>
                    {linkError && <div className="text-[13px] text-primary">{linkError}</div>}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setLinkFormFor(m.id);
                      setLinkError(null);
                      setLinkEmailValue("");
                    }}
                    className="self-start text-[13px] font-semibold text-primary"
                  >
                    Link to account
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <div className="text-base font-semibold">Add someone</div>
        <div className="grid grid-cols-2 gap-2">
          {(["name", "email"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className="box-border h-12 rounded-[14px] border-2 text-[15px] font-semibold"
              style={{ borderColor: mode === m ? "var(--primary)" : "var(--border)", background: mode === m ? "var(--tint-pink)" : "#FFFFFF" }}
            >
              {m === "name" ? "Just a name" : "By email"}
            </button>
          ))}
        </div>
        <form onSubmit={addPerson} className="flex flex-col gap-1.5">
          <label htmlFor="who" className="text-sm font-semibold">{mode === "email" ? "Email" : "Name"}</label>
          <input
            id="who"
            type={mode === "email" ? "email" : "text"}
            placeholder={mode === "email" ? "alex@example.com" : "e.g. Alex"}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="box-border h-[52px] px-4 rounded-[14px] border border-[#B8AA98] bg-white text-base"
          />
          <button
            type="submit"
            className="mt-2 h-14 rounded-[14px] border-none bg-primary text-white text-[17px] font-semibold"
          >
            Create their link
          </button>
        </form>

        {newLink && (
          <div className="rounded-[20px] p-4 flex flex-col gap-3" style={{ background: "var(--tint-green)" }}>
            <div className="text-base font-bold" style={{ color: "var(--green-dark)" }}>Link ready for {newLink.name}</div>
            <div className="flex items-center gap-2.5">
              <div className="flex-grow min-w-0 box-border h-11 px-3 rounded-xl bg-white flex items-center text-sm overflow-hidden whitespace-nowrap">
                {typeof window !== "undefined" ? `${window.location.origin}${newLink.path}` : newLink.path}
              </div>
              <button
                type="button"
                onClick={() => copy("new", newLink.path)}
                className="shrink-0 w-[92px] h-11 rounded-full border-none bg-primary text-white text-sm font-bold"
              >
                {copied === "new" ? "Copied" : "Copy link"}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex-grow" />
      <div className="flex items-start gap-2 text-sm leading-[1.45] text-muted">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
          <rect x="5" y="11" width="14" height="9" rx="2" />
          <path d="M8 11V8a4 4 0 018 0v3" />
        </svg>
        <span>Anyone with a personal link can answer as that person, so send each one privately.</span>
      </div>
    </div>
  );
}

export default function InvitePage() {
  return (
    <Suspense fallback={<div className="w-full flex-1 flex items-center justify-center text-muted">Loading…</div>}>
      <InviteContent />
    </Suspense>
  );
}
