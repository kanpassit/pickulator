import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import JoinPageClient from "./JoinPageClient";

const APP_DESCRIPTION = "The AI-powered way your group decides where to eat.";

// Read-only lookup for the share-card title only - deliberately does NOT
// touch GroupMember.linkOpenedAt (see src/app/api/join/[token]/route.ts),
// since link-preview crawlers (iMessage, Slack, etc.) hit this before a
// person ever actually opens the link, and that field means "a person
// opened it."
async function lookupGroupName(token: string): Promise<string | null> {
  const group = await prisma.group.findUnique({
    where: { id: token },
    select: { name: true },
  });
  if (group) return group.name;

  const member = await prisma.groupMember.findUnique({
    where: { linkToken: token },
    select: { group: { select: { name: true } } },
  });
  return member?.group.name ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const groupName = await lookupGroupName(token).catch(() => null);

  const title = groupName ? `${groupName} wants your vote - Pickulator` : "Pickulator";
  const description = groupName
    ? `Join "${groupName}" on Pickulator and help pick where to eat.`
    : APP_DESCRIPTION;

  // Next.js doesn't deep-merge nested metadata objects across segments -
  // whatever this returns for `openGraph`/`twitter` replaces the root
  // layout's versions wholesale, so the image/card fields are repeated
  // here rather than relying on inheritance from layout.tsx.
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/og-image.png"],
    },
  };
}

export default function JoinPage() {
  return <JoinPageClient />;
}
