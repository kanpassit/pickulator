"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type GroupJoinData = {
  mode: "group";
  group: { id: string; name: string };
  occasion: { id: string; type: string; day: string; timeSlot: string } | null;
  members: { id: string; displayName: string; initial: string; tintColor: string; hasAccount: boolean; answered: boolean }[];
};

type MemberJoinData = {
  mode: "member";
  group: { id: string; name: string };
  member: { id: string; displayName: string; initial: string; tintColor: string; phone: string | null };
  occasion: { id: string; type: string; day: string; timeSlot: string; hasAnswered: boolean } | null;
  members: { id: string; displayName: string; initial: string; tintColor: string; answered: boolean }[];
};

type JoinData = GroupJoinData | MemberJoinData;

function Header({ groupName, memberCount }: { groupName: string; memberCount: number }) {
  return (
    <>
      <div className="flex items-center justify-center gap-2 h-11 mt-1">
        <svg className="w-7 h-7" viewBox="0 0 1024 1024">
      <path fill="#C23B20" d="M521.906 194.22C546.189 193.765 564.179 195.413 588.11 201.028C647.023 215.471 697.835 252.622 729.465 304.379C760.276 354.775 769.998 415.279 756.529 472.791C731.609 577.45 640.154 647.321 535.4 642.52C518.924 641.765 499.173 641.207 484.716 650.464C449.025 673.316 465.238 710.775 457.306 745.499C448.955 786.69 409.151 826.353 366.246 828.961C328.507 831.255 299.631 802.913 299.095 765.486C298.768 742.726 298.951 720.02 298.966 697.277L298.967 568.768L298.985 470.784C298.958 436.371 296.842 405.217 304.604 371.43C313.332 334.162 331.222 299.661 356.652 271.053C400.164 223.015 457.486 197.338 521.906 194.22Z" />
      <path fill="#FBF6EE" d="M527.481 278.733C551.157 278.494 574.568 283.738 595.881 294.054C628.403 309.56 655.367 339.685 667.41 373.667C680.031 409.192 678.044 448.272 661.886 482.334C640.814 527.156 596.591 556.566 547.107 558.663C520.774 559.944 498.3 556.239 472.292 565.481C444.877 575.401 420.275 593.781 402.205 616.648C399.612 619.93 394.763 627.049 391.313 628.934C388.372 628.277 388.109 625.575 388.086 623.035C387.972 610.593 387.96 598.142 387.949 585.7L387.947 509.547L387.912 447.238C387.877 428.994 386.762 409.052 390.477 391.197C404.417 324.213 460.085 280.94 527.481 278.733Z" />
      <path fill="#C23B20" d="M522.239 326.706C573.716 321.064 622.089 373.273 609.318 424.029C605.882 437.684 596.628 454.783 589.498 466.987C577.5 487.52 563.394 507.656 548.099 525.86C543.458 531.375 538.177 538.702 532.226 542.337C528.082 543.705 522.751 543.364 519.564 540.092C512.044 532.609 504.996 524.101 498.554 515.643C478.919 489.864 457.588 460.214 446.709 429.498C438.2 405.473 446.078 375.236 462.462 356.25C478.513 337.651 497.865 328.914 522.239 326.706Z" />
      <path fill="#FBF6EE" d="M522.04 371.081C540.728 368.114 558.26 380.925 561.111 399.632C563.962 418.338 551.043 435.79 532.319 438.525C513.759 441.237 496.492 428.454 493.665 409.911C490.839 391.368 503.515 374.022 522.04 371.081Z" />
    </svg>
        <div className="font-serif text-xl font-bold">Pickulator</div>
      </div>
      <div className="flex flex-col gap-2.5 mt-2">
        <h1 className="m-0 font-serif text-[32px] font-bold leading-[1.12]">{groupName} wants your vote</h1>
        <div className="text-base leading-[1.45] text-muted">
          {memberCount > 0 ? "A few quick taps and we'll find something that works for everyone." : ""}
        </div>
      </div>
    </>
  );
}

function GroupJoinContent({ token, data }: { token: string; data: GroupJoinData }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");

  async function claim(body: { memberId?: string; name?: string }, busyKey: string) {
    setBusyId(busyKey);
    setError(null);
    try {
      const res = await fetch(`/api/join/${token}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const claimed = await res.json();
      if (!res.ok) {
        setError(claimed.error ?? "Couldn't sign you in");
        return;
      }
      if (claimed.occasion) {
        const dest = claimed.occasion.hasAnswered ? "waiting" : "question";
        router.push(`/${dest}?occasionId=${claimed.occasion.id}&token=${claimed.member.linkToken}`);
      } else {
        router.push("/");
      }
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="w-full flex-1 box-border px-6 pt-5 pb-6 flex flex-col gap-[22px]">
      <Header groupName={data.group.name} memberCount={data.members.length} />

      <div className="bg-white border border-border rounded-[20px] px-5 py-4 flex items-center gap-3">
        <div className="flex">
          {data.members.slice(0, 4).map((m, i) => (
            <div
              key={m.id}
              className="w-9 h-9 rounded-full border-2 border-white flex items-center justify-center text-sm font-bold"
              style={{ background: m.tintColor, marginLeft: i === 0 ? 0 : -8 }}
            >
              {m.initial}
            </div>
          ))}
        </div>
        <div className="text-sm leading-[1.35] text-muted">
          {data.occasion ? "Answers stay hidden until everyone's in." : "No round is open right now - check back soon."}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="text-base font-semibold">Which one are you?</div>
        <div className="bg-white border border-border rounded-[20px] px-4 flex flex-col">
          {data.members.map((m, i) => (
            <div key={m.id} className={`py-1 ${i < data.members.length - 1 ? "border-b border-border" : ""}`}>
              {m.hasAccount ? (
                <div className="flex items-center gap-3 py-2 opacity-60">
                  <div className="w-11 h-11 shrink-0 rounded-full flex items-center justify-center text-[17px] font-bold" style={{ background: m.tintColor }}>
                    {m.initial}
                  </div>
                  <div className="flex-grow flex flex-col gap-0.5">
                    <div className="text-base font-semibold">{m.displayName}</div>
                    <div className="text-[13px] text-muted">Has an account</div>
                  </div>
                  <a href="/login" className="shrink-0 text-sm font-semibold text-primary">
                    Log in
                  </a>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => claim({ memberId: m.id }, m.id)}
                  disabled={busyId !== null}
                  className="w-full flex items-center gap-3 py-2 text-left disabled:opacity-60"
                >
                  <div className="w-11 h-11 shrink-0 rounded-full flex items-center justify-center text-[17px] font-bold" style={{ background: m.tintColor }}>
                    {m.initial}
                  </div>
                  <div className="flex-grow flex flex-col gap-0.5">
                    <div className="text-base font-semibold">{m.displayName}</div>
                    {m.answered && <div className="text-[13px] text-muted">Already answered</div>}
                  </div>
                  <div className="shrink-0 text-sm font-semibold text-primary">
                    {busyId === m.id ? "…" : "That's me"}
                  </div>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {adding ? (
        <div className="flex flex-col gap-2">
          <label htmlFor="newName" className="text-sm font-semibold">
            Not listed? Type your name
          </label>
          <div className="flex gap-2">
            <input
              id="newName"
              type="text"
              placeholder="e.g. Jordan"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="flex-grow min-w-0 box-border h-12 px-4 rounded-[14px] border border-[#B8AA98] bg-white text-base"
            />
            <button
              type="button"
              onClick={() => claim({ name: newName }, "new")}
              disabled={!newName.trim() || busyId !== null}
              className="shrink-0 h-12 px-4 rounded-[14px] bg-primary text-white text-sm font-semibold disabled:opacity-60"
            >
              {busyId === "new" ? "…" : "That's me"}
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setAdding(true)} className="self-start text-sm font-semibold text-primary">
          Not on the list?
        </button>
      )}

      {error && <div className="text-sm text-primary text-center">{error}</div>}
      <div className="flex-grow" />
      <div className="text-center text-sm text-muted">No account needed.</div>
    </div>
  );
}

function MemberJoinContent({ token, data }: { token: string; data: MemberJoinData }) {
  const router = useRouter();
  const [phone, setPhone] = useState(data.member.phone ?? "");
  const [busy, setBusy] = useState(false);

  async function start() {
    setBusy(true);
    try {
      if (phone.trim()) {
        await fetch(`/api/join/${token}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone }),
        }).catch(() => {});
      }
      if (!data.occasion) return;
      const dest = data.occasion.hasAnswered ? "waiting" : "question";
      router.push(`/${dest}?occasionId=${data.occasion.id}&token=${token}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full flex-1 box-border px-6 pt-5 pb-6 flex flex-col gap-[22px]">
      <Header groupName={data.group.name} memberCount={data.members.length} />

      <div className="bg-white border border-border rounded-[20px] px-5 py-4 flex items-center gap-3">
        <div className="flex">
          {data.members.slice(0, 4).map((m, i) => (
            <div
              key={m.id}
              className="w-9 h-9 rounded-full border-2 border-white flex items-center justify-center text-sm font-bold"
              style={{ background: m.tintColor, marginLeft: i === 0 ? 0 : -8 }}
            >
              {m.initial}
            </div>
          ))}
        </div>
        <div className="text-sm leading-[1.35] text-muted">
          {data.occasion ? "Answers stay hidden until everyone's in." : "No round is open right now - check back soon."}
        </div>
      </div>

      <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl" style={{ background: "var(--tint-tan)" }}>
        <div
          className="w-11 h-11 shrink-0 rounded-full flex items-center justify-center text-[17px] font-bold"
          style={{ background: data.member.tintColor }}
        >
          {data.member.initial}
        </div>
        <div className="flex-grow flex flex-col gap-0.5">
          <div className="text-[13px] text-muted">You&apos;re joining as</div>
          <div className="text-[17px] font-bold">{data.member.displayName}</div>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="tel" className="text-sm font-semibold">
          Mobile number <span className="font-normal text-muted">(optional)</span>
        </label>
        <input
          id="tel"
          type="tel"
          placeholder="(619) 555-0123"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="box-border h-[52px] px-4 rounded-[14px] border border-[#B8AA98] bg-white text-base"
        />
      </div>

      <div className="flex-grow" />
      <button
        type="button"
        onClick={start}
        disabled={!data.occasion || busy}
        className="h-14 rounded-[14px] bg-primary text-white flex items-center justify-center text-[17px] font-semibold disabled:opacity-50"
      >
        Start
      </button>
      <div className="text-center text-sm text-muted">No account needed.</div>
    </div>
  );
}

export default function JoinPageClient() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<JoinData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/join/${token}`)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "This link isn't valid anymore");
        return body as JoinData;
      })
      .then((body) => {
        if (!cancelled) setData(body);
      })
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (error) {
    return (
      <div className="w-full flex-1 box-border px-6 pt-5 pb-6 flex flex-col items-center justify-center gap-3 text-center">
        <div className="font-serif text-2xl font-bold">Link not found</div>
        <div className="text-[15px] text-muted">{error}</div>
      </div>
    );
  }

  if (!data) {
    return <div className="w-full flex-1 flex items-center justify-center text-muted">Loading…</div>;
  }

  if (data.mode === "group") {
    return <GroupJoinContent token={token} data={data} />;
  }
  return <MemberJoinContent token={token} data={data} />;
}
