import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

/**
 * Marks one notification read. Scoped to the caller's own userId via
 * updateMany, so a bad id or someone else's notification id is a quiet
 * no-op (count: 0), never a leak or an error revealing it exists.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id } = await params;
  await prisma.notification.updateMany({
    where: { id, userId: user.id, read: false },
    data: { read: true, readAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
