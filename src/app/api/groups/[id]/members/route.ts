import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { generateLinkToken, initialFor, tintForIndex } from "@/lib/tokens";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Invites a new person to the group: a guest by name, or an account-holder by email. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id } = await params;
  const group = await prisma.group.findUnique({
    where: { id },
    include: { members: true },
  });
  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

  // Only the host invites people, matching the Invite screen's "Host" affordance.
  if (group.hostUserId !== user.id) {
    return NextResponse.json({ error: "Only the host can invite people" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { mode, name, email } = (body ?? {}) as { mode?: string; name?: string; email?: string };

  let displayName: string;
  let pendingEmail: string | null = null;
  let linkedUserId: string | null = null;

  if (mode === "email") {
    if (!email || typeof email !== "string" || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
    }
    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    displayName = existingUser?.name ?? normalizedEmail;
    pendingEmail = normalizedEmail;
    // Not auto-joined: the design's "request to accept" flow is intentionally not
    // wired up yet, so we do not set linkedUserId here even if an account exists.
    void linkedUserId;
  } else {
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "A name is required" }, { status: 400 });
    }
    displayName = name.trim();
  }

  const member = await prisma.groupMember.create({
    data: {
      groupId: group.id,
      displayName,
      initial: initialFor(displayName),
      tintColor: tintForIndex(group.members.length),
      role: "MEMBER",
      pendingEmail,
      linkToken: generateLinkToken(),
    },
  });

  return NextResponse.json(
    {
      member: {
        id: member.id,
        displayName: member.displayName,
        initial: member.initial,
        tintColor: member.tintColor,
        pendingEmail: member.pendingEmail,
        linkToken: member.linkToken,
        joinPath: `/j/${member.linkToken}`,
      },
    },
    { status: 201 }
  );
}
