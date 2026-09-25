"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";

type Member = { id: string; displayName: string; initial: string; tintColor: string; userId: string | null };
type Group = { id: string; name: string; hostUserId: string; members: Member[] };
type Me = { id: string; name: string; email: string } | null;

const GROUP_KEY = "pk_group_id";

export default function GroupsPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | undefined>(undefined);
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((body) => setMe(body.user))
      .catch(() => setMe(null));
  }, []);

  function loadGroups() {
    fetch("/api/groups")
      .then((res) => res.json())
      .then((body) => setGroups(body.groups ?? []))
      .catch(() => setGroups([]));
  }

  useEffect(() => {
    if (me) loadGroups();
  }, [me]);

  function selectGroup(id: string) {
    window.localStorage.setItem(GROUP_KEY, id);
    router.push("/");
  }

  async function createGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't create that group");
        return;
      }
      window.localStorage.setItem(GROUP_KEY, data.group.id);
      router.push("/");
    } finally {
      setCreating(false);
    }
  }

  async function deleteGroup(id: string, name: string) {
    if (!window.confirm(`Delete "${name}"? This removes everyone's history and can't be undone.`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/groups/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Couldn't delete that group");
        return;
      }
      const stored = window.localStorage.getItem(GROUP_KEY);
      if (stored === id) window.localStorage.removeItem(GROUP_KEY);
      loadGroups();
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
        <div className="text-[15px] text-muted">Sign in to see your groups.</div>
        <Link href="/login" className="h-14 px-8 rounded-[14px] bg-primary text-white flex items-center justify-center text-[17px] font-semibold no-underline">
          Log in
        </Link>
      </div>
    );
  }

  const activeId = typeof window !== "undefined" ? window.localStorage.getItem(GROUP_KEY) : null;

  return (
    <div className="relative overflow-hidden w-full flex-1 flex flex-col">
      <div className="shrink-0 h-16 px-6 flex items-center border-b border-border bg-background">
        <div className="font-serif text-xl font-bold">Your groups</div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-6 pt-6 pb-4 flex flex-col gap-3">
        {groups === null && <div className="text-muted">Loading…</div>}

        {groups !== null &&
          groups.map((g) => {
            const isHost = g.hostUserId === me.id;
            return (
              <div
                key={g.id}
                className="box-border p-4 rounded-2xl border-2 bg-white flex items-center gap-3"
                style={{ borderColor: g.id === activeId ? "var(--primary)" : "var(--border)" }}
              >
                <button type="button" onClick={() => selectGroup(g.id)} className="flex-grow flex items-center gap-3 text-left">
                  <div className="flex">
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
                  <div className="flex flex-col gap-0.5">
                    <div className="text-base font-bold">{g.name}</div>
                    <div className="text-sm text-muted">
                      {g.members.length} {g.members.length === 1 ? "person" : "people"}
                      {isHost ? " · You're hosting" : ""}
                    </div>
                  </div>
                </button>
                {isHost && (
                  <button
                    type="button"
                    onClick={() => deleteGroup(g.id, g.name)}
                    disabled={deletingId === g.id}
                    aria-label={`Delete ${g.name}`}
                    className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-muted disabled:opacity-50"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m-8 0v12a1 1 0 001 1h6a1 1 0 001-1V7" />
                    </svg>
                  </button>
                )}
              </div>
            );
          })}

        {groups !== null && groups.length === 0 && (
          <div className="text-[15px] text-muted">You're not in any groups yet - create one below.</div>
        )}

        {error && <div className="text-sm text-primary">{error}</div>}

        <form onSubmit={createGroup} className="flex flex-col gap-2 mt-2">
          <div className="text-sm font-semibold">New group</div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. The Regulars"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="flex-grow box-border h-12 px-4 rounded-[14px] border border-[#B8AA98] bg-white text-base"
            />
            <button
              type="submit"
              disabled={creating || !newName.trim()}
              className="h-12 px-5 rounded-[14px] bg-primary text-white text-[15px] font-semibold disabled:opacity-60"
            >
              {creating ? "Creating…" : "Create"}
            </button>
          </div>
        </form>
      </div>

      <BottomNav />
    </div>
  );
}
