import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { notifyBestEffort } from "@/lib/notify";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Lists the signed-in user's friend graph: confirmed friends, requests
 * waiting on them to accept, and their own outgoing requests still
 * waiting on someone else. Friends page renders all three sections from
 * this one call.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const rows = await prisma.friendship.findMany({
    where: { OR: [{ requesterId: user.id }, { addresseeId: user.id }] },
    include: {
      requester: { select: { id: true, name: true, email: true } },
      addressee: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const friends: { id: string; userId: string; name: string; email: string }[] = [];
  const incoming: { id: string; userId: string; name: string; email: string; createdAt: Date }[] = [];
  const outgoing: { id: string; userId: string; name: string; email: string; createdAt: Date }[] = [];

  for (const row of rows) {
    const iAmRequester = row.requesterId === user.id;
    const other = iAmRequester ? row.addressee : row.requester;

    if (row.status === "ACCEPTED") {
      friends.push({ id: row.id, userId: other.id, name: other.name, email: other.email });
    } else if (iAmRequester) {
      outgoing.push({ id: row.id, userId: other.id, name: other.name, email: other.email, createdAt: row.createdAt });
    } else {
      incoming.push({ id: row.id, userId: other.id, name: other.name, email: other.email, createdAt: row.createdAt });
    }
  }

  return NextResponse.json({ friends, incoming, outgoing });
}

/**
 * Sends a friend request by email. If that person already has a pending
 * request in to the caller, this accepts it instead of leaving two rows
 * pointed at each other - matches how "add a friend" behaves when you'd
 * already been added first.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { email } = (body ?? {}) as { email?: string };
  if (!email || typeof email !== "string" || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
  }
  const normalizedEmail = email.trim().toLowerCase();

  if (normalizedEmail === user.email) {
    return NextResponse.json({ error: "That's your own email" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!target) {
    return NextResponse.json({ error: "No account found with that email" }, { status: 404 });
  }

  const reverse = await prisma.friendship.findUnique({
    where: { requesterId_addresseeId: { requesterId: target.id, addresseeId: user.id } },
  });

  if (reverse) {
    if (reverse.status === "ACCEPTED") {
      return NextResponse.json({ error: "You're already friends" }, { status: 409 });
    }
    // They'd already requested us - accept it rather than create a
    // second, opposite-direction row.
    const accepted = await prisma.friendship.update({
      where: { id: reverse.id },
      data: { status: "ACCEPTED", respondedAt: new Date() },
    });
    await notifyBestEffort({
      userId: target.id,
      type: "FRIEND_REQUEST_ACCEPTED",
      title: `${user.name} accepted your friend request`,
      link: "/friends",
      actorUserId: user.id,
      relatedId: accepted.id,
    });
    return NextResponse.json({ friendship: { id: accepted.id, status: "ACCEPTED" } }, { status: 201 });
  }

  const existing = await prisma.friendship.findUnique({
    where: { requesterId_addresseeId: { requesterId: user.id, addresseeId: target.id } },
  });
  if (existing) {
    return NextResponse.json(
      { error: existing.status === "ACCEPTED" ? "You're already friends" : "Request already sent" },
      { status: 409 }
    );
  }

  const created = await prisma.friendship.create({
    data: { requesterId: user.id, addresseeId: target.id },
  });

  await notifyBestEffort({
    userId: target.id,
    type: "FRIEND_REQUEST",
    title: `${user.name} sent you a friend request`,
    link: "/friends",
    actorUserId: user.id,
    relatedId: created.id,
  });

  return NextResponse.json({ friendship: { id: created.id, status: "PENDING" } }, { status: 201 });
}
