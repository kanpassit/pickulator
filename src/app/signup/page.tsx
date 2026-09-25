"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Couldn't reach the server. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full flex-1 box-border px-6 pt-5 pb-6 flex flex-col gap-6">
      <div className="flex flex-col gap-2 mt-4">
        <h1 className="m-0 font-serif text-[34px] font-bold leading-[1.12]">Create your account</h1>
        <div className="text-[15px] leading-[1.45] text-muted">Start a group and share one link with everyone.</div>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-3.5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="name" className="text-sm font-semibold">Name</label>
          <input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="box-border h-[52px] px-4 rounded-[14px] border border-[#B8AA98] bg-white text-base"
          />
        </div>
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
        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-sm font-semibold">Password</label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="box-border h-[52px] px-4 rounded-[14px] border border-[#B8AA98] bg-white text-base"
          />
        </div>
        {error && <div className="text-sm text-primary">{error}</div>}
        <button
          type="submit"
          disabled={busy}
          className="h-14 rounded-[14px] bg-primary text-white flex items-center justify-center text-[17px] font-semibold disabled:opacity-60"
        >
          {busy ? "Creating…" : "Create my account"}
        </button>
      </form>

      <div className="text-sm text-center text-muted">
        Already have an account? <Link href="/login" className="font-semibold">Log in</Link>
      </div>
    </div>
  );
}
