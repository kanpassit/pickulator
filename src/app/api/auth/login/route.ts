import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { setSessionCookie } from "@/lib/auth";
import { rateLimited, clientIp } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  if (await rateLimited("login", clientIp(req), { max: 10, windowMs: 10 * 60_000 })) {
    return NextResponse.json({ error: "Too many attempts. Try again in a few minutes." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { email, password } = (body ?? {}) as { email?: string; password?: string };

  if (!email || typeof email !== "string" || !password || typeof password !== "string") {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  // Same generic error whether the email is unknown or the password is wrong,
  // so we don't leak which accounts exist.
  const genericError = () => NextResponse.json({ error: "Incorrect email or password" }, { status: 401 });

  if (!user) return genericError();

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return genericError();

  await setSessionCookie(user.id);

  return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email } });
}
