"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";

type FullMe = {
  id: string;
  name: string;
  email: string;
  dietary: string[];
  dietaryNotes: string | null;
  travelMode: string | null;
} | null;

const DIETARY_OPTIONS = ["Vegetarian", "Vegan", "Gluten-free", "Dairy-free", "Nut allergy", "Shellfish allergy", "Halal", "Kosher"];
const MODES = [
  { id: "DRIVE", name: "Driving" },
  { id: "TRANSIT", name: "Transit" },
  { id: "WALK", name: "Walking" },
  { id: "BIKE", name: "Biking" },
];

export default function AccountPage() {
  const router = useRouter();
  const [me, setMe] = useState<FullMe | undefined>(undefined);
  const [name, setName] = useState("");
  const [dietary, setDietary] = useState<string[]>([]);
  const [dietaryNotes, setDietaryNotes] = useState("");
  const [travelMode, setTravelMode] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((body) => {
        setMe(body.user);
        if (body.user) {
          setName(body.user.name);
          setDietary(body.user.dietary ?? []);
          setDietaryNotes(body.user.dietaryNotes ?? "");
          setTravelMode(body.user.travelMode ?? null);
        }
      })
      .catch(() => setMe(null));
  }, []);

  function toggleDietary(id: string) {
    setSaved(false);
    setDietary((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, dietary, dietaryNotes, travelMode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't save those changes");
        return;
      }
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  if (me === undefined) {
    return <div className="w-full flex-1 flex items-center justify-center text-muted">Loading…</div>;
  }

  if (me === null) {
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center gap-4 text-center px-6">
        <div className="text-[15px] text-muted">Sign in to see your account.</div>
        <Link href="/login" className="h-14 px-8 rounded-[14px] bg-primary text-white flex items-center justify-center text-[17px] font-semibold no-underline">
          Log in
        </Link>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden w-full flex-1 flex flex-col">
      <div className="shrink-0 h-16 px-6 flex items-center border-b border-border bg-background">
        <div className="font-serif text-xl font-bold">Account</div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-6 pt-6 pb-4 flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-primary text-white flex items-center justify-center text-xl font-bold">
            {me.name.trim()[0]?.toUpperCase() ?? "?"}
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="text-lg font-bold">{me.name}</div>
            <div className="text-sm text-muted">{me.email}</div>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="name" className="text-sm font-semibold">
            Display name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => {
              setSaved(false);
              setName(e.target.value);
            }}
            className="box-border h-12 px-4 rounded-[14px] border border-[#B8AA98] bg-white text-base"
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="text-sm font-semibold">
            Dietary needs <span className="font-normal text-muted">(applies to every round automatically)</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {DIETARY_OPTIONS.map((d) => {
              const on = dietary.includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDietary(d)}
                  className="h-10 px-4 rounded-full border-2 text-sm font-semibold"
                  style={{
                    borderColor: on ? "var(--primary)" : "var(--border)",
                    background: on ? "var(--primary)" : "#FFFFFF",
                    color: on ? "#FFFFFF" : "var(--foreground)",
                  }}
                >
                  {d}
                </button>
              );
            })}
          </div>
          <input
            type="text"
            placeholder="Anything else? (optional)"
            value={dietaryNotes}
            onChange={(e) => {
              setSaved(false);
              setDietaryNotes(e.target.value);
            }}
            className="box-border h-12 px-4 rounded-[14px] border border-[#B8AA98] bg-white text-base"
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="text-sm font-semibold">Usually getting there by</div>
          <div className="flex flex-wrap gap-2">
            {MODES.map((m) => {
              const on = travelMode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setSaved(false);
                    setTravelMode(on ? null : m.id);
                  }}
                  className="h-10 px-4 rounded-full border-2 text-sm font-semibold"
                  style={{
                    borderColor: on ? "var(--primary)" : "var(--border)",
                    background: on ? "var(--primary)" : "#FFFFFF",
                    color: on ? "#FFFFFF" : "var(--foreground)",
                  }}
                >
                  {m.name}
                </button>
              );
            })}
          </div>
        </div>

        {error && <div className="text-sm text-primary">{error}</div>}
        <button
          type="button"
          onClick={save}
          disabled={saving || !name.trim()}
          className="h-14 rounded-[14px] bg-primary text-white text-[17px] font-semibold disabled:opacity-60"
        >
          {saving ? "Saving…" : saved ? "Saved" : "Save changes"}
        </button>

        <button
          type="button"
          onClick={logout}
          className="h-14 rounded-[14px] border-2 border-primary bg-white text-primary text-[17px] font-semibold"
        >
          Log out
        </button>
      </div>

      <BottomNav />
    </div>
  );
}
