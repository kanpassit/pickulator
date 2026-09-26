"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }
      // Always the generic confirmation, whether or not an account matched -
      // the server response is deliberately identical either way.
      setSent(true);
    } catch {
      setError("Couldn't reach the server. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="w-full flex-1 box-border px-6 pt-5 pb-6 flex flex-col gap-6">
        <div className="flex flex-col gap-2 mt-4">
          <h1 className="m-0 font-serif text-[34px] font-bold leading-[1.12]">Check your email</h1>
          <div className="text-[15px] leading-[1.45] text-muted">
            If an account exists for {email}, we&apos;ve sent a link to reset the password. It expires in 1 hour.
          </div>
        </div>
        <div className="text-sm text-center text-muted">
          <Link href="/login" className="font-semibold">Back to log in</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex-1 box-border px-6 pt-5 pb-6 flex flex-col gap-6">
      <div className="flex flex-col gap-2 mt-4">
        <h1 className="m-0 font-serif text-[34px] font-bold leading-[1.12]">Reset your password</h1>
        <div className="text-[15px] leading-[1.45] text-muted">Enter your email and we&apos;ll send you a reset link.</div>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-3.5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-semibold">Email</label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="box-border h-[52px] px-4 rounded-[14px] border border-[#B8AA98] bg-white text-base"
          />
        </div>
        {error && <div className="text-sm text-primary">{error}</div>}
        <button
          type="submit"
          disabled={busy}
          className="h-14 rounded-[14px] bg-primary text-white flex items-center justify-center text-[17px] font-semibold disabled:opacity-60"
        >
          {busy ? "Sending…" : "Send reset link"}
        </button>
      </form>

      <div className="text-sm text-center text-muted">
        <Link href="/login" className="font-semibold">Back to log in</Link>
      </div>
    </div>
  );
}
