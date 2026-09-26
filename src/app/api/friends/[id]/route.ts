import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

/**
 * Removes a friendship row - either party can call this. Covers two
 * cases: canceling your own still-pending outgoing request, and
 * unfriending someone once accepted. An incoming pending request should
 * go through /decline instead, which is addressee-only by design.
 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id } = await params;
  const friendship = await prisma.friendship.findUnique({ where: { id } });
  if (!friendship || (friendship.requesterId !== user.id && friendship.addresseeId !== user.id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.friendship.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
