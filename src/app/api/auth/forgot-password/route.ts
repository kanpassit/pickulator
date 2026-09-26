import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimited, clientIp } from "@/lib/rateLimit";
import { generateResetToken } from "@/lib/tokens";
import { sendEmail, emailShell } from "@/lib/mail";

const RESET_TOKEN_TTL_MS = 60 * 60_000; // 1 hour

// Always the same shape, whether or not the email matched an account - the
// whole point of this endpoint is to never leak which emails have accounts.
// A fresh NextResponse per call (not a shared module-level instance): the
// underlying body is a one-shot stream, so reusing one object across
// requests would break every call after the first.
function genericResponse() {
  return NextResponse.json({
    message: "If an account exists for that email, we've sent a link to reset the password.",
  });
}

export async function POST(req: NextRequest) {
  // Tighter than the login limiter (10/10min) since a hit here also sends
  // an email, not just a DB lookup.
  if (await rateLimited("forgot-password", clientIp(req), { max: 5, windowMs: 60_000 })) {
    return NextResponse.json({ error: "Too many attempts. Try again in a minute." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { email } = (body ?? {}) as { email?: string };
  if (!email || typeof email !== "string") {
    // Missing input is still safe to reject explicitly - it's a client bug,
    // not a signal about which accounts exist.
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  // Unlike KalQSplit, Pickulator has no passwordless "guest" User rows -
  // GroupMember.userId is what represents a guest, and User.passwordHash is
  // required - so every User row found here does have a password to reset.
  if (user) {
    const token = generateResetToken();
    await prisma.resetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      },
    });

    const resetUrl = `${req.nextUrl.origin}/reset-password?token=${token}`;
    const result = await sendEmail({
      to: user.email,
      subject: "Reset your Pickulator password",
      html: emailShell({
        heading: "Reset your password",
        bodyHtml: `
          <p style="margin:0 0 16px;">Someone requested a password reset for this account. If that was you, pick a new password here - this link expires in 1 hour:</p>
          <p style="margin:0 0 20px;">
            <a href="${resetUrl}" style="display:inline-block;background:#C23B20;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:14px;">Reset password</a>
          </p>
          <p style="margin:0;color:#8A8A8A;font-size:13px;">If you didn't request this, you can ignore this email - your password won't change.</p>
        `,
      }),
    });

    if (!result.sent) {
      // Deliberately never log resetUrl/token here. KalQSplit used to log
      // the live, valid token in plaintext when email wasn't configured -
      // anyone with log access during the 1-hour window could've used it
      // to take over the account. Log that a reset happened, not what it is.
      if (result.reason === "not_configured") {
        console.warn(`Password reset requested for user ${user.id}, but RESEND_API_KEY is not set - no email was sent.`);
      } else {
        console.error(`Password reset email failed to send for user ${user.id} (status ${result.status}): ${result.body}`);
      }
    }
  }

  return genericResponse();
}

/** Token-validity check only, so the reset page can show "invalid or expired" before the user fills out the form. */
export async function GET(req: NextRequest) {
  if (await rateLimited("forgot-password-check", clientIp(req), { max: 30, windowMs: 60_000 })) {
    return NextResponse.json({ error: "Too many attempts. Try again in a minute." }, { status: 429 });
  }

  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ valid: false });
  }

  const resetToken = await prisma.resetToken.findUnique({ where: { token } });
  const valid = !!resetToken && !resetToken.usedAt && resetToken.expiresAt > new Date();

  return NextResponse.json({ valid });
}
