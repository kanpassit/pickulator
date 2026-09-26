"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import NotificationBell from "@/components/NotificationBell";

type Member = {
  id: string;
  displayName: string;
  initial: string;
  tintColor: string;
  userId: string | null;
  pendingLinkEmail: string | null;
};
type Group = { id: string; name: string; hostUserId: string; members: Member[] };
type Me = { id: string; name: string; email: string } | null;

type Friend = {
  key: string;
  displayName: string;
  initial: string;
  tintColor: string;
  hasAccount: boolean;
  groups: { id: string; name: string }[];
  // Only meaningful for a guest (hasAccount: false) - guests are unique per
  // group (no shared identity across groups), so there's exactly one row.
  groupId: string | null;
  memberId: string | null;
  pendingLinkEmail: string | null;
  // Whether the current user hosts that one group - linking is host-only.
  isHost: boolean;
};

type FriendRequest = { id: string; userId: string; name: string; email: string; createdAt: string };

function initialFor(name: string) {
  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed[0].toUpperCase() : "?";
}

export default function FriendsPage() {
  const [me, setMe] = useState<Me | undefined>(undefined);
  const [friends, setFriends] = useState<Friend[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [incoming, setIncoming] = useState<FriendRequest[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequest[]>([]);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const [addingFriend, setAddingFriend] = useState(false);
  const [addFriendEmail, setAddFriendEmail] = useState("");
  const [addFriendBusy, setAddFriendBusy] = useState(false);
  const [addFriendError, setAddFriendError] = useState<string | null>(null);
  const [addFriendNotice, setAddFriendNotice] = useState<string | null>(null);

  const [linkFormFor, setLinkFormFor] = useState<string | null>(null);
  const [linkEmailValue, setLinkEmailValue] = useState("");
  const [linkBusy, setLinkBusy] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((body) => setMe(body.user))
      .catch(() => setMe(null));
  }, []);

  function loadFriendRequests() {
    fetch("/api/friends")
      .then((res) => res.json())
      .then((body) => {
        setIncoming(body.incoming ?? []);
        setOutgoing(body.outgoing ?? []);
        return (body.friends ?? []) as { userId: string; name: string; email: string }[];
      })
      .then((accepted) => mergeAcceptedFriends(accepted))
      .catch(() => {});
  }

  // Merges the standalone Friendship graph (accepted rows, which may or may
  // not share a group with the caller) into the same list the group-derived
  // lookup already built, so someone you've friended directly shows up here
  // even with zero shared groups - just without the group-only "Link to
  // account" action, which only makes sense for a guest inside one.
  function mergeAcceptedFriends(accepted: { userId: string; name: string; email: string }[]) {
    if (accepted.length === 0) return;
    setFriends((prev) => {
      const list = prev ? [...prev] : [];
      const byUserId = new Map(list.filter((f) => f.hasAccount).map((f) => [f.key, f]));
      for (const a of accepted) {
        if (byUserId.has(a.userId)) continue;
        list.push({
          key: a.userId,
          displayName: a.name,
          initial: initialFor(a.name),
          tintColor: "#DCEAF0",
          hasAccount: true,
          groups: [],
          groupId: null,
          memberId: null,
          pendingLinkEmail: null,
          isHost: false,
        });
      }
      return list.sort((x, y) => x.displayName.localeCompare(y.displayName, undefined, { sensitivity: "base" }));
    });
  }

  function loadFriends() {
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
                groupId: g.id,
                memberId: m.id,
                pendingLinkEmail: m.pendingLinkEmail,
                isHost: g.hostUserId === me.id,
              });
            }
          }
        }

        const list = Array.from(byKey.values()).sort((a, b) =>
          a.displayName.localeCompare(b.displayName, undefined, { sensitivity: "base" })
        );
        setFriends(list);
        loadFriendRequests();
      })
      .catch(() => setFriends([]));
  }

  useEffect(loadFriends, [me]);

  async function sendFriendRequest() {
    const email = addFriendEmail.trim();
    if (!email) return;
    setAddFriendBusy(true);
    setAddFriendError(null);
    setAddFriendNotice(null);
    try {
      const res = await fetch("/api/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAddFriendError(data.error ?? "Couldn't send that request");
        return;
      }
      setAddFriendNotice(
        data.friendship?.status === "ACCEPTED" ? "You're friends now!" : "Friend request sent."
      );
      setAddFriendEmail("");
      loadFriendRequests();
    } finally {
      setAddFriendBusy(false);
    }
  }

  async function respondToRequest(id: string, action: "accept" | "decline") {
    setRespondingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/friends/${id}/${action}`, { method: "POST" });
      if (!res.ok) {
        setError("Couldn't update that request");
        return;
      }
      loadFriendRequests();
    } finally {
      setRespondingId(null);
    }
  }

  async function cancelOutgoing(id: string) {
    setRespondingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/friends/${id}`, { method: "DELETE" });
      if (!res.ok) {
        setError("Couldn't cancel that request");
        return;
      }
      loadFriendRequests();
    } finally {
      setRespondingId(null);
    }
  }

  async function sendLinkRequest(f: Friend) {
    if (!linkEmailValue.trim() || !f.groupId || !f.memberId) return;
    setLinkBusy(true);
    setLinkError(null);
    try {
      const res = await fetch(`/api/groups/${f.groupId}/members/${f.memberId}/link-request`, {
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
      loadFriends();
    } finally {
      setLinkBusy(false);
    }
  }

  async function cancelLinkRequest(f: Friend) {
    if (!f.groupId || !f.memberId) return;
    setError(null);
    const res = await fetch(`/api/groups/${f.groupId}/members/${f.memberId}/link-request`, { method: "DELETE" });
    if (res.ok) loadFriends();
    else setError("Couldn't cancel that request");
  }

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
        {error && <div className="text-sm text-primary">{error}</div>}

        <div className="box-border p-4 rounded-2xl border border-border bg-white flex flex-col gap-2.5">
          {addingFriend ? (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="addFriendEmail" className="text-sm font-semibold">
                Their registered email
              </label>
              <div className="flex gap-2">
                <input
                  id="addFriendEmail"
                  type="email"
                  placeholder="friend@email.com"
                  value={addFriendEmail}
                  onChange={(e) => setAddFriendEmail(e.target.value)}
                  className="flex-grow min-w-0 box-border h-10 px-3 rounded-[10px] border text-sm"
                  style={{ borderColor: "var(--border)" }}
                />
                <button
                  type="button"
                  onClick={sendFriendRequest}
                  disabled={!addFriendEmail.trim() || addFriendBusy}
                  className="shrink-0 h-10 px-3 rounded-[10px] text-sm font-semibold border-none disabled:opacity-60"
                  style={{ background: "var(--primary)", color: "#FFFFFF" }}
                >
                  {addFriendBusy ? "Sending…" : "Send"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAddingFriend(false);
                    setAddFriendError(null);
                    setAddFriendEmail("");
                  }}
                  className="shrink-0 h-10 px-3 rounded-[10px] text-sm font-semibold border-2"
                  style={{ borderColor: "var(--border)" }}
                >
                  Cancel
                </button>
              </div>
              {addFriendError && <div className="text-[13px] text-primary">{addFriendError}</div>}
              {addFriendNotice && <div className="text-[13px] text-muted">{addFriendNotice}</div>}
            </div>
          ) : (
            <button type="button" onClick={() => setAddingFriend(true)} className="self-start text-sm font-semibold text-primary">
              + Add a friend
            </button>
          )}
        </div>

        {incoming.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="text-sm font-semibold text-muted">Friend requests</div>
            {incoming.map((r) => (
              <div key={r.id} className="box-border p-4 rounded-2xl border border-border bg-white flex items-center gap-3">
                <div
                  className="w-11 h-11 shrink-0 rounded-full flex items-center justify-center text-[17px] font-bold"
                  style={{ background: "#E5DCEF" }}
                >
                  {initialFor(r.name)}
                </div>
                <div className="flex-grow min-w-0 flex flex-col gap-0.5">
                  <div className="text-base font-semibold truncate">{r.name}</div>
                  <div className="text-[13px] text-muted truncate">{r.email}</div>
                </div>
                <div className="shrink-0 flex gap-2">
                  <button
                    type="button"
                    onClick={() => respondToRequest(r.id, "accept")}
                    disabled={respondingId === r.id}
                    className="h-9 px-3 rounded-[10px] text-sm font-semibold border-none disabled:opacity-60"
                    style={{ background: "var(--primary)", color: "#FFFFFF" }}
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    onClick={() => respondToRequest(r.id, "decline")}
                    disabled={respondingId === r.id}
                    className="h-9 px-3 rounded-[10px] text-sm font-semibold border-2 disabled:opacity-60"
                    style={{ borderColor: "var(--border)" }}
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {outgoing.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="text-sm font-semibold text-muted">Waiting on them</div>
            {outgoing.map((r) => (
              <div key={r.id} className="box-border p-4 rounded-2xl border border-border bg-white flex items-center justify-between gap-3">
                <div className="text-[13px] text-muted truncate">Friend request sent to {r.email}</div>
                <button
                  type="button"
                  onClick={() => cancelOutgoing(r.id)}
                  disabled={respondingId === r.id}
                  className="shrink-0 text-[13px] font-semibold text-primary"
                >
                  Cancel
                </button>
              </div>
            ))}
          </div>
        )}

        {friends === null && <div className="text-muted">Loading…</div>}

        {friends !== null && friends.length === 0 && incoming.length === 0 && outgoing.length === 0 && (
          <div className="flex flex-col gap-2">
            <div className="text-[15px] text-muted">
              Nobody here yet - add a friend above, or invite people to a group and they&apos;ll show up on this list.
            </div>
            <Link href="/groups" className="text-sm font-semibold text-primary self-start">
              Go to your groups
            </Link>
          </div>
        )}

        {friends !== null &&
          friends.map((f) => {
            const hasSharedGroup = f.groups.length > 0;
            const row = (
              <div className="flex items-center gap-3">
                <div
                  className="w-11 h-11 shrink-0 rounded-full flex items-center justify-center text-[17px] font-bold"
                  style={{ background: f.tintColor }}
                >
                  {f.initial}
                </div>
                <div className="flex-grow min-w-0 flex flex-col gap-0.5">
                  <div className="text-base font-semibold truncate">{f.displayName}</div>
                  <div className="text-[13px] text-muted truncate">
                    {f.hasAccount ? "Friend" : "Guest"}
                    {hasSharedGroup ? ` · In ${f.groups.map((g) => g.name).join(", ")}` : " · No shared groups yet"}
                  </div>
                </div>
              </div>
            );

            return (
              <div key={f.key} className="box-border p-4 rounded-2xl border border-border bg-white flex flex-col gap-2.5">
                {hasSharedGroup ? (
                  <Link href={`/invite?groupId=${f.groups[0].id}`} className="no-underline text-[#2A211B]">
                    {row}
                  </Link>
                ) : (
                  row
                )}

                {!f.hasAccount && f.isHost && f.groupId && f.memberId && (
                  <div className="pl-[56px] flex flex-col gap-2">
                    {f.pendingLinkEmail ? (
                      <div className="flex items-center justify-between gap-2 text-[13px]">
                        <span className="text-muted">Waiting for {f.pendingLinkEmail} to confirm</span>
                        <button type="button" onClick={() => cancelLinkRequest(f)} className="shrink-0 font-semibold text-primary">
                          Cancel
                        </button>
                      </div>
                    ) : linkFormFor === f.key ? (
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
                            onClick={() => sendLinkRequest(f)}
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
                          setLinkFormFor(f.key);
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
            );
          })}
      </div>

      <BottomNav />
    </div>
  );
}
