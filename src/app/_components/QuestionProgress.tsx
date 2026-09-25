"use client";

export function QuestionProgress({
  step,
  total,
  label,
  backHref,
}: {
  step: number;
  total: number;
  label: string;
  backHref?: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between h-11">
        {backHref ? (
          <a href={backHref} aria-label="Back" className="w-11 h-11 -ml-2.5 flex items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </a>
        ) : (
          <div className="w-11 h-11" />
        )}
        <div className="text-sm text-muted">{label}</div>
        <div className="text-sm font-semibold w-11 text-right">
          {step} of {total}
        </div>
      </div>
      <div className="flex gap-1.5">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className="flex-1 h-1.5 rounded-full"
            style={{ background: i < step ? "var(--primary)" : "var(--border)" }}
          />
        ))}
      </div>
    </div>
  );
}
