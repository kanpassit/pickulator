import Link from "next/link";

export default function BottomNav() {
  return (
    <div className="shrink-0 h-[76px] px-2 flex items-center justify-between border-t border-border bg-white">
      <Link
        href="/"
        className="flex-1 flex flex-col items-center gap-1 text-primary text-xs font-bold"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 11l8-7 8 7v9a1 1 0 01-1 1h-4v-6H9v6H5a1 1 0 01-1-1z" />
        </svg>
        <span>Home</span>
      </Link>
      <button className="flex-1 flex flex-col items-center gap-1 text-muted text-xs font-semibold" type="button">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="8" r="3.5" />
          <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
          <path d="M16 4.5a3.5 3.5 0 010 7M18 14.4c2 .7 3.5 2.5 3.5 5.6" />
        </svg>
        <span>Groups</span>
      </button>
      <div className="flex-1 flex justify-center">
        <Link
          href="/"
          aria-label="Start a new round"
          className="w-14 h-14 -mt-[22px] rounded-full bg-primary border-4 border-white shadow-[0_6px_16px_rgba(194,59,32,0.35)] flex items-center justify-center box-border"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.8" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </Link>
      </div>
      <button className="flex-1 flex flex-col items-center gap-1 text-muted text-xs font-semibold" type="button">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
        <span>History</span>
      </button>
      <button className="flex-1 flex flex-col items-center gap-1 text-muted text-xs font-semibold" type="button">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
        </svg>
        <span>Account</span>
      </button>
    </div>
  );
}
