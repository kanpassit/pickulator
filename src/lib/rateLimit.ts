import { prisma } from "@/lib/prisma";

/**
 * Basic per-key request throttle, backed by a small Postgres table
 * (RateLimitHit) rather than a separate Redis/KV service - this app
 * doesn't have one, and traffic is low enough that one extra upsert per
 * gated request is cheap. Windows are fixed-size buckets keyed by
 * Math.floor(now / windowMs), not a true sliding window - a deliberate
 * simplification that's still enough to blunt brute-force login guesses
 * and invite-link enumeration without new infrastructure.
 *
 * Call near the top of a route handler, before doing real work:
 *
 *   const ip = clientIp(req);
 *   if (await rateLimited("login", ip, { max: 10, windowMs: 10 * 60_000 })) {
 *     return NextResponse.json({ error: "Too many attempts. Try again shortly." }, { status: 429 });
 *   }
 */
export async function rateLimited(
  bucket: string,
  key: string,
  opts: { max: number; windowMs: number }
): Promise<boolean> {
  const windowStart = new Date(Math.floor(Date.now() / opts.windowMs) * opts.windowMs);

  try {
    const hit = await prisma.rateLimitHit.upsert({
      where: { bucket_key_windowStart: { bucket, key, windowStart } },
      create: { bucket, key, windowStart },
      update: { count: { increment: 1 } },
    });

    // Opportunistic prune so this table doesn't grow forever - cheap
    // (indexed delete), fire-and-forget, and only runs on a small
    // fraction of requests so it's not extra latency on the common path.
    if (Math.random() < 0.02) {
      const cutoff = new Date(Date.now() - Math.max(opts.windowMs, 60 * 60_000) * 4);
      prisma.rateLimitHit.deleteMany({ where: { windowStart: { lt: cutoff } } }).catch(() => {});
    }

    return hit.count > opts.max;
  } catch (err) {
    // Never let the limiter itself take down a route - fail open.
    console.error("rateLimited() failed, allowing the request through", err);
    return false;
  }
}

/** Best-effort client IP from Vercel's forwarded headers, for use as a rate-limit key. */
export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
