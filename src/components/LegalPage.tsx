import Link from "next/link";
import type { ReactNode } from "react";
import { CONTACT_EMAIL, LEGAL_LAST_UPDATED } from "@/lib/site";

export default function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="w-full flex-1 box-border px-6 pt-6 pb-12">
      <div className="max-w-[680px] mx-auto flex flex-col gap-5">
        <Link href="/" className="text-sm font-semibold no-underline">
          ← Pickulator
        </Link>
        <h1 className="m-0 font-serif text-[34px] font-bold leading-[1.12]">{title}</h1>
        <div className="text-sm text-muted">Last updated {LEGAL_LAST_UPDATED}</div>
        <div className="flex flex-col gap-4 text-[15px] leading-[1.6] [&_h2]:font-serif [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-3 [&_h2]:mb-0 [&_ul]:m-0 [&_ul]:pl-5 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1.5 [&_p]:m-0">
          {children}
          {CONTACT_EMAIL && (
            <>
              <h2>Contact</h2>
              <p>
                Questions about this page? Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
              </p>
            </>
          )}
        </div>
        <div className="flex gap-4 text-sm pt-4 border-t border-border">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </div>
      </div>
    </main>
  );
}
