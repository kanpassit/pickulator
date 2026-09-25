"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  createdAt: string;
};

const POLL_MS = 60_000;

function timeAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

/**
 * The notification bell: lives in the header of every signed-in page (not
 * per-page state), polls GET /api/notifications every 60s, and shows a
 * dropdown of the 50 most recent. Clicking a notification marks it read and
 * follows its link, if it has one.
 */
export default function NotificationBell() {
  const router = useRouter();
  const [items, setItems] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  const load = useCallback(() => {
    fetch("/api/notifications")
      .then((res) => res.json())
      .then((body) => {
        setItems(body.notifications ?? []);
        setUnreadCount(body.unreadCount ?? 0);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, POLL_MS);
    return () => clearInterval(interval);
  }, [load]);

  async function openNotification(n: Notification) {
    if (!n.read) {
      setItems((cur) => cur.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      setUnreadCount((c) => Math.max(0, c - 1));
      fetch(`/api/notifications/${n.id}/read`, { method: "POST" }).catch(() => {});
    }
    setOpen(false);
    if (n.link) router.push(n.link);
  }

  async function markAllRead() {
    setItems((cur) => cur.map((x) => ({ ...x, read: true })));
    setUnreadCount(0);
    await fetch("/api/notifications/read-all", { method: "POST" }).catch(() => {});
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Notifications"
        onClick={() => setOpen((o) => !o)}
        className="relative w-10 h-10 shrink-0 rounded-full flex items-center justify-center"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 00-12 0c0 5-2 6-2 6h16s-2-1-2-6" />
          <path d="M10.3 21a1.94 1.94 0 003.4 0" />
        </svg>
        {unreadCount > 0 && (
          <div
            className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center"
            style={{ lineHeight: 1 }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </div>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-12 z-20 w-[320px] max-w-[85vw] bg-white border border-border rounded-[16px] shadow-lg flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="text-sm font-bold">Notifications</div>
              {unreadCount > 0 && (
                <button type="button" onClick={markAllRead} className="text-[13px] font-semibold text-primary">
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-[360px] overflow-y-auto">
              {items.length === 0 && (
                <div className="px-4 py-6 text-sm text-muted text-center">No notifications yet.</div>
              )}
              {items.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => openNotification(n)}
                  className="w-full text-left px-4 py-3 border-b border-border last:border-b-0 flex gap-2.5 items-start"
                  style={{ background: n.read ? "transparent" : "var(--tint-pink)" }}
                >
                  {!n.read && <div className="w-2 h-2 mt-1.5 shrink-0 rounded-full bg-primary" />}
                  <div className={`flex-grow min-w-0 flex flex-col gap-0.5 ${n.read ? "pl-[18px]" : ""}`}>
                    <div className="text-[14px] font-semibold leading-[1.3]">{n.title}</div>
                    {n.body && <div className="text-[13px] text-muted leading-[1.35]">{n.body}</div>}
                    <div className="text-[11px] text-muted mt-0.5">{timeAgo(n.createdAt)}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
