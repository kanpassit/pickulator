import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { setSessionCookie } from "@/lib/auth";
import { rateLimited, clientIp } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  if (await rateLimited("reset-password", clientIp(req), { max: 10, windowMs: 10 * 60_000 })) {
    return NextResponse.json({ error: "Too many attempts. Try again in a few minutes." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { token, newPassword } = (body ?? {}) as { token?: string; newPassword?: string };

  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "This link is invalid or expired" }, { status: 400 });
  }
  if (!newPassword || typeof newPassword !== "string" || newPassword.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const resetToken = await prisma.resetToken.findUnique({ where: { token } });
  const tokenValid = !!resetToken && !resetToken.usedAt && resetToken.expiresAt > new Date();
  if (!resetToken || !tokenValid) {
    return NextResponse.json({ error: "This link is invalid or expired" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);

  // One transaction: set the new password, burn this token so it can't be
  // replayed, and bump tokenVersion so every session token issued before
  // this moment - not just the browser doing the reset - stops validating
  // (see the tv field in session.ts; there's no session table to delete
  // rows from, since sessions here are self-verifying signed cookies).
  // Also clears out any other still-live reset tokens for this account, so
  // an older unused email link can't be used after this one already reset
  // the password.
  const user = await prisma.$transaction(async (tx) => {
    const updatedUser = await tx.user.update({
      where: { id: resetToken.userId },
      data: {
        passwordHash,
        tokenVersion: { increment: 1 },
      },
    });

    await tx.resetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    });

    await tx.resetToken.deleteMany({
      where: { userId: resetToken.userId, usedAt: null, id: { not: resetToken.id } },
    });

    return updatedUser;
  });

  // Sign the user straight in, same as signup does right after account
  // creation - they just proved account ownership via the emailed link.
  await setSessionCookie(user.id, user.tokenVersion);

  return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email } });
}
