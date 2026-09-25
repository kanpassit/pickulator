import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { guestCookieName } from "@/lib/identity";

/**
 * Recognizes a returning guest on the home screen when they're not signed
 * in: reads every per-group guest cookie set the first time they opened a
 * personal invite link, and resolves each to their membership and whatever
 * round is currently open, so they can jump back in without the original
 * link. Signed-in users have their groups via GET /api/groups instead.
 */
export async function GET() {
  const store = await cookies();
  const prefix = guestCookieName("");

  const tokens = store
    .getAll()
    .filter((c) => c.name.startsWith(prefix) && c.value)
    .map((c) => c.value);

  if (tokens.length === 0) {
    return NextResponse.json({ groups: [] });
  }

  const members = await prisma.groupMember.findMany({
    where: { linkToken: { in: tokens } },
    include: { group: true },
  });

  const groups = await Promise.all(
    members.map(async (member) => {
      const occasion = await prisma.occasion.findFirst({
        where: { groupId: member.groupId, status: "OPEN" },
        orderBy: { createdAt: "desc" },
      });

      let hasAnswered = false;
      if (occasion) {
        const answer = await prisma.answer.findUnique({
          where: { occasionId_memberId: { occasionId: occasion.id, memberId: member.id } },
        });
        hasAnswered = Boolean(answer);
      }

      return {
        group: { id: member.group.id, name: member.group.name },
        member: {
          id: member.id,
          displayName: member.displayName,
          initial: member.initial,
          tintColor: member.tintColor,
          linkToken: member.linkToken,
        },
        occasion: occasion
          ? { id: occasion.id, type: occasion.type, day: occasion.day, timeSlot: occasion.timeSlot, hasAnswered }
          : null,
      };
    })
  );

  return NextResponse.json({ groups });
}
