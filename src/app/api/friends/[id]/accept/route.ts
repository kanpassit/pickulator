import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { notifyBestEffort } from "@/lib/notify";

/** Accepts an incoming friend request. Only the addressee can accept it. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id } = await params;
  const friendship = await prisma.friendship.findUnique({ where: { id } });
  if (!friendship || friendship.addresseeId !== user.id) {
    return NextResponse.json({ error: "No matching request" }, { status: 404 });
  }
  if (friendship.status === "ACCEPTED") {
    return NextResponse.json({ friendship: { id: friendship.id, status: "ACCEPTED" } });
  }

  const updated = await prisma.friendship.update({
    where: { id },
    data: { status: "ACCEPTED", respondedAt: new Date() },
  });

  await notifyBestEffort({
    userId: friendship.requesterId,
    type: "FRIEND_REQUEST_ACCEPTED",
    title: `${user.name} accepted your friend request`,
    link: "/friends",
    actorUserId: user.id,
    relatedId: friendship.id,
  });

  return NextResponse.json({ friendship: { id: updated.id, status: "ACCEPTED" } });
}
