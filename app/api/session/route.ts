import { NextResponse } from "next/server";
import { getSession, leave } from "@/lib/server/store";

export async function GET() {
  return NextResponse.json(getSession());
}

/** Leaving is a change to the session, not to a room you name. */
export async function DELETE() {
  const { closed } = leave();
  return NextResponse.json({ ...getSession(), closed });
}
