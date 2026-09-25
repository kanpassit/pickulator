"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Member = { id: string; initial: string; tintColor: string };
type Group = { id: string; name: string; members: Member[] };

export default function StartPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/groups")
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Couldn't load your groups");
        return body;
      })
      .then((body) => {
        const list: Group[] = body.groups ?? [];
        setGroups(list);
        if (list.length === 1) {
          router.replace(`/occasion?groupId=${list[0].id}`);
        }
      })
      .catch((err) => setError(err.message));
  }, [router]);

  if (error) {
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center gap-3 text-center px-6">
        <div className="text-[15px] text-muted">{error}</div>
        <Link href="/" className="text-sm font-semibold text-primary">
          Back home
        </Link>
      </div>
    );
  }

  if (groups === null || groups.length === 1) {
    return <div className="w-full flex-1 flex items-center justify-center text-muted">Loading…</div>;
  }

  if (groups.length === 0) {
    return (
      <div className="w-full flex-1 box-border px-6 pt-16 pb-6 flex flex-col items-center gap-4 text-center">
        <div className="font-serif text-2xl font-bold">Start a group first</div>
        <div className="text-[15px] leading-[1.45] text-muted max-w-[280px]">
          You&apos;ll need a group before you can start a round.
        </div>
        <Link
          href="/groups"
          className="h-14 px-8 rounded-[14px] bg-primary text-white flex items-center justify-center text-[17px] font-semibold no-underline"
        >
          Create a group
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full flex-1 box-border px-6 pt-5 pb-6 flex flex-col gap-5">
      <div className="flex items-center justify-between h-11">
        <Link href="/" aria-label="Back" className="w-11 h-11 -ml-2.5 flex items-center justify-center">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </Link>
        <div className="text-sm text-muted">New round</div>
        <div className="w-11" />
      </div>

      <div className="flex flex-col gap-2 mt-1">
        <h1 className="m-0 font-serif text-[34px] font-bold leading-[1.12]">Which group?</h1>
        <div className="text-[15px] leading-[1.45] text-muted">Pick who&apos;s deciding tonight.</div>
      </div>

      <div className="flex flex-col gap-3">
        {groups.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => router.push(`/occasion?groupId=${g.id}`)}
            className="box-border p-4 rounded-2xl border-2 bg-white flex items-center gap-3 text-left"
            style={{ borderColor: "var(--border)" }}
          >
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
            <div className="text-base font-bold flex-grow">{g.name}</div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}
