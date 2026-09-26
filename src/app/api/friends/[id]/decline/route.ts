import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

/**
 * Declines an incoming friend request - deletes the row outright rather
 * than leaving it in a DECLINED state, so the same person can send a new
 * request later without it looking stuck.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id } = await params;
  const friendship = await prisma.friendship.findUnique({ where: { id } });
  if (!friendship || friendship.addresseeId !== user.id || friendship.status !== "PENDING") {
    return NextResponse.json({ error: "No matching request" }, { status: 404 });
  }

  await prisma.friendship.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
