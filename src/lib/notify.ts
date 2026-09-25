import { prisma } from "@/lib/prisma";

type NotifyInput = {
  userId: string;
  type: string;
  title: string;
  body?: string | null;
  link?: string | null;
  actorUserId?: string | null;
  groupId?: string | null;
  relatedId?: string | null;
};

/**
 * Creates one notification. Every trigger site should call this rather than
 * prisma.notification.create() directly, for two reasons:
 *
 * 1. Two rules apply everywhere, so call sites shouldn't have to remember
 *    them: only registered users get notified (guests have no login to see
 *    one - structurally guaranteed here since userId is always a real
 *    User.id), and nobody gets notified about their own action.
 * 2. A failed write can never break the request it's attached to - this
 *    never throws.
 */
export async function notifyBestEffort(input: NotifyInput): Promise<void> {
  if (input.actorUserId && input.actorUserId === input.userId) return;

  try {
    await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        link: input.link ?? null,
        actorUserId: input.actorUserId ?? null,
        groupId: input.groupId ?? null,
        relatedId: input.relatedId ?? null,
      },
    });
  } catch (err) {
    console.error("notifyBestEffort failed:", err);
  }
}
