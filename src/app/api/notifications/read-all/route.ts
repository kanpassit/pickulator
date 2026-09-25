import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

/** Marks every unread notification for the caller as read. */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  await prisma.notification.updateMany({
    where: { userId: user.id, read: false },
    data: { read: true, readAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
