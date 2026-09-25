import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const TRAVEL_MODES = ["DRIVE", "TRANSIT", "WALK", "BIKE"] as const;

export async function GET() {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) return NextResponse.json({ user: null });

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { id: true, name: true, email: true, dietary: true, dietaryNotes: true, travelMode: true },
  });

  return NextResponse.json({ user });
}

/** Updates the signed-in user's own profile - name and the dietary/travel
 * defaults that apply automatically to every round (Profile.dc.html). */
export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { name, dietary, dietaryNotes, travelMode } = (body ?? {}) as {
    name?: unknown;
    dietary?: unknown;
    dietaryNotes?: unknown;
    travelMode?: unknown;
  };

  const data: {
    name?: string;
    dietary?: string[];
    dietaryNotes?: string | null;
    travelMode?: (typeof TRAVEL_MODES)[number] | null;
  } = {};

  if (name !== undefined) {
    if (typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Name can't be empty" }, { status: 400 });
    }
    data.name = name.trim();
  }

  if (dietary !== undefined) {
    if (!Array.isArray(dietary) || !dietary.every((d) => typeof d === "string")) {
      return NextResponse.json({ error: "dietary must be a list of strings" }, { status: 400 });
    }
    data.dietary = dietary;
  }

  if (dietaryNotes !== undefined) {
    data.dietaryNotes = typeof dietaryNotes === "string" && dietaryNotes.trim() ? dietaryNotes.trim() : null;
  }

  if (travelMode !== undefined) {
    if (travelMode !== null && !TRAVEL_MODES.includes(travelMode as (typeof TRAVEL_MODES)[number])) {
      return NextResponse.json({ error: `travelMode must be one of ${TRAVEL_MODES.join(", ")}` }, { status: 400 });
    }
    data.travelMode = (travelMode as (typeof TRAVEL_MODES)[number] | null) ?? null;
  }

  const updated = await prisma.user.update({ where: { id: user.id }, data });

  return NextResponse.json({
    user: {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      dietary: updated.dietary,
      dietaryNotes: updated.dietaryNotes,
      travelMode: updated.travelMode,
    },
  });
}
