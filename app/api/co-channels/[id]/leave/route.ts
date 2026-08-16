import { NextResponse } from "next/server";
import { connectedPerson } from "@/lib/server/identity";
import { leave, sessionFor } from "@/lib/server/store";

/**
 * Leave the room, without disconnecting the wallet.
 *
 * These used to be the same call, because the only way to be in a room was to
 * be the one signed-in person and the only way to stop was to end the session.
 * They are different acts now: leaving puts you back outside the door, still
 * connected and still able to walk through another one.
 */
export async function POST() {
  const connected = await connectedPerson();
  if (!connected) {
    return NextResponse.json({ error: "Nothing is connected." }, { status: 401 });
  }

  const { closed } = leave(connected.person.id);
  return NextResponse.json({ ...sessionFor(connected), closed });
}
