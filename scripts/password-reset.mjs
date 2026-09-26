#!/usr/bin/env node
// Admin fallback for the "forgot password" flow: sets an account's password
// directly, for use when email delivery isn't an option (RESEND_API_KEY
// unset, or Resend itself is down) and someone with database access needs
// to get a person back into their account right now.
//
// Deliberately bypasses the ResetToken table entirely - this is a separate,
// out-of-band path, not a replacement for it, so it can't be confused with
// (or accidentally reuse/invalidate) a real emailed reset link.
//
// Usage:
//   npm run password:reset -- someone@example.com "temporary-password-here"
//
// Bumps tokenVersion the same way a normal reset does, so this also signs
// the account out everywhere else it's currently logged in.

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const [, , email, newPassword] = process.argv;

if (!email || !newPassword) {
  console.error("Usage: npm run password:reset -- <email> <new-password>");
  process.exit(1);
}

if (newPassword.length < 8) {
  console.error("Password must be at least 8 characters.");
  process.exit(1);
}

const prisma = new PrismaClient();

try {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  if (!user) {
    console.error(`No account found for ${normalizedEmail}`);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      tokenVersion: { increment: 1 },
    },
  });

  console.log(`Password updated for ${normalizedEmail} (${user.id}). All existing sessions for this account are now signed out.`);
} finally {
  await prisma.$disconnect();
}
