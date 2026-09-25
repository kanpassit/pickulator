import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { generateLinkToken, initialFor, tintForIndex } from "@/lib/tokens";

/** Lists groups the current user hosts or belongs to. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const groups = await prisma.group.findMany({
    where: {
      OR: [{ hostUserId: user.id }, { members: { some: { userId: user.id } } }],
    },
    include: {
      members: { orderBy: { createdAt: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ groups });
}

/** Creates a new group with the current user as host, and as its first member. */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { name } = (body ?? {}) as { name?: string };
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Group name is required" }, { status: 400 });
  }

  const group = await prisma.group.create({
    data: {
      name: name.trim(),
      hostUserId: user.id,
      members: {
        create: {
          userId: user.id,
          displayName: user.name,
          initial: initialFor(user.name),
          tintColor: tintForIndex(0),
          role: "HOST",
          linkToken: generateLinkToken(),
        },
      },
    },
    include: { members: true },
  });

  return NextResponse.json({ group }, { status: 201 });
}
