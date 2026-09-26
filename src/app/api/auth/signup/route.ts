import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { setSessionCookie } from "@/lib/auth";
import { rateLimited, clientIp } from "@/lib/rateLimit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  if (await rateLimited("signup", clientIp(req), { max: 5, windowMs: 60 * 60_000 })) {
    return NextResponse.json({ error: "Too many accounts created from this connection. Try again later." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { name, email, password, claimToken } = (body ?? {}) as {
    name?: string;
    email?: string;
    password?: string;
    claimToken?: string;
  };

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (!email || typeof email !== "string" || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
  }
  if (!password || typeof password !== "string" || password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    return NextResponse.json({ error: "An account with that email already exists" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
    },
  });

  // Optional: claim a guest GroupMember row created from a personal link (the
  // "Keep your spot" flow), so past/pending answers now belong to this account.
  if (claimToken && typeof claimToken === "string") {
    const member = await prisma.groupMember.findUnique({ where: { linkToken: claimToken } });
    if (member && !member.userId) {
      await prisma.groupMember.update({
        where: { id: member.id },
        data: { userId: user.id, pendingEmail: null },
      });
    }
  }

  await setSessionCookie(user.id);

  return NextResponse.json(
    { user: { id: user.id, name: user.name, email: user.email } },
    { status: 201 }
  );
}
