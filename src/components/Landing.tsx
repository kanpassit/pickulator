import Link from "next/link";
import Logo from "@/components/Logo";
import GuestWelcomeBack from "@/app/_components/GuestWelcomeBack";

// Server-rendered public landing page. Everything here is static markup so
// crawlers and first-time visitors get real content on the first response
// (the old page was a client-side "Loading…" shell until /api/auth/me
// answered). The "demo" is a static illustration of one round - example
// data only, clearly labelled - rather than a video, so it costs nothing to
// load and can't go stale.

function Chip({ children, tone = "tan" }: { children: React.ReactNode; tone?: "tan" | "pink" | "green" }) {
  const bg = tone === "pink" ? "var(--tint-pink)" : tone === "green" ? "var(--tint-green)" : "var(--tint-tan)";
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-semibold" style={{ background: bg }}>
      {children}
    </span>
  );
}

function Step({ n, title, text, children }: { n: number; title: string; text: string; children: React.ReactNode }) {
  return (
    <li className="list-none m-0 p-0 flex flex-col gap-3 bg-white border border-border rounded-[20px] p-5">
      <div className="flex items-center gap-3">
        <span className="w-8 h-8 shrink-0 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">
          {n}
        </span>
        <h3 className="m-0 font-serif text-xl font-semibold leading-tight">{title}</h3>
      </div>
      <p className="m-0 text-[15px] leading-[1.5] text-muted">{text}</p>
      <div className="rounded-[14px] bg-background border border-border p-3.5 flex flex-col gap-2" aria-hidden="true">
        {children}
      </div>
    </li>
  );
}

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Pickulator",
  url: "https://pickulator.com",
  description:
    "Pickulator helps a group of friends decide where to eat. Everyone privately ranks what they're in the mood for and sets dealbreakers, then AI picks one real restaurant and explains why.",
  applicationCategory: "LifestyleApplication",
  operatingSystem: "Any (web)",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
};

export default function Landing() {
  return (
    <div className="w-full flex-1 box-border flex flex-col">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />

      <header className="h-16 px-6 flex items-center justify-between max-w-[960px] w-full mx-auto box-border">
        <div className="flex items-center gap-2">
          <Logo className="w-7 h-7" />
          <span className="font-serif text-xl font-bold">Pickulator</span>
        </div>
        <Link href="/login" className="text-sm font-semibold no-underline">
          Log in
        </Link>
      </header>

      <section className="px-6 pt-10 pb-12 max-w-[720px] w-full mx-auto box-border flex flex-col items-center text-center gap-6">
        <h1 className="m-0 font-serif text-[40px] sm:text-5xl font-bold leading-[1.08]">
          Decide where to eat together, without the group-chat debate
        </h1>
        <p className="m-0 text-[17px] leading-[1.55] text-muted max-w-[560px]">
          Everyone privately ranks what they&apos;re in the mood for and sets their dealbreakers. Pickulator&apos;s AI
          then finds one real, open place the whole group can say yes to, and tells you why.
        </p>
        <div className="flex flex-col items-center gap-3 w-full max-w-[320px]">
          <Link
            href="/signup"
            className="h-14 w-full box-border rounded-[14px] bg-primary text-white flex items-center justify-center text-[17px] font-semibold no-underline"
          >
            Start a round
          </Link>
          <p className="m-0 text-sm text-muted">Free. Got an invite link? Just open it, no account needed.</p>
        </div>
      </section>

      <GuestWelcomeBack />

      <section aria-labelledby="how" className="px-6 py-10 max-w-[960px] w-full mx-auto box-border flex flex-col gap-6">
        <div className="flex flex-col gap-1.5 text-center">
          <h2 id="how" className="m-0 font-serif text-3xl font-bold">How a round works</h2>
          <p className="m-0 text-sm text-muted">An example round, three steps, about a minute each.</p>
        </div>
        <ol className="m-0 p-0 grid gap-4 md:grid-cols-3">
          <Step n={1} title="Rank your top 3" text="Tap what you're in the mood for, favorite first. Only you can see your picks.">
            <div className="flex items-center gap-2 text-sm font-semibold"><span className="text-primary">1</span> Ramen</div>
            <div className="flex items-center gap-2 text-sm font-semibold"><span className="text-primary">2</span> Thai</div>
            <div className="flex items-center gap-2 text-sm font-semibold"><span className="text-primary">3</span> Tacos</div>
          </Step>
          <Step n={2} title="Set your dealbreakers" text="Rule things out up front, like allergies, a food you hate, or a drive that's too far.">
            <div className="flex flex-wrap gap-2">
              <Chip tone="pink">No seafood</Chip>
              <Chip tone="pink">Vegetarian-friendly</Chip>
              <Chip>Within 15 min</Chip>
            </div>
          </Step>
          <Step n={3} title="Get one pick, with the why" text="Answers stay hidden until everyone's in. Then you get a real restaurant and the reasoning.">
            <div className="font-serif text-lg font-bold leading-tight">Example Ramen House</div>
            <div className="text-[13px] text-muted">Ramen · $$ · 12 min away</div>
            <div className="text-[13px] leading-[1.45]">
              Two of you ranked ramen first, it&apos;s clear of everyone&apos;s dealbreakers, and it has a veggie broth.
            </div>
          </Step>
        </ol>
      </section>

      <section aria-labelledby="why" className="px-6 py-10 max-w-[720px] w-full mx-auto box-border flex flex-col gap-4">
        <h2 id="why" className="m-0 font-serif text-3xl font-bold text-center">Better than swiping or a spin of the wheel</h2>
        <ul className="m-0 pl-5 flex flex-col gap-2.5 text-[16px] leading-[1.5]">
          <li><strong>No peer pressure.</strong> Everyone answers privately, so the loudest voice doesn&apos;t win.</li>
          <li><strong>Dealbreakers come first.</strong> Nobody has to swipe past dozens of places they&apos;d never go to.</li>
          <li><strong>A real place, not a random one.</strong> The AI checks the web so the pick actually exists and is open.</li>
          <li><strong>It learns your group.</strong> Rate where you went and it stops suggesting the spots you didn&apos;t love.</li>
        </ul>
      </section>

      <section className="px-6 pt-6 pb-14 max-w-[720px] w-full mx-auto box-border flex flex-col items-center gap-4 text-center">
        <h2 className="m-0 font-serif text-3xl font-bold">Ready to stop asking &quot;where do you want to eat?&quot;</h2>
        <Link
          href="/signup"
          className="h-14 w-full max-w-[320px] box-border rounded-[14px] bg-primary text-white flex items-center justify-center text-[17px] font-semibold no-underline"
        >
          Start a round
        </Link>
      </section>

      <footer className="mt-auto border-t border-border px-6 py-6 text-sm text-muted">
        <div className="max-w-[960px] mx-auto flex flex-wrap items-center justify-between gap-3">
          <span>© {new Date().getFullYear()} Pickulator</span>
          <nav aria-label="Legal" className="flex gap-4">
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/accessibility">Accessibility</Link>
            <Link href="/login">Log in</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
