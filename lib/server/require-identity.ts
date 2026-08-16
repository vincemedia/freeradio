import { NextResponse } from "next/server";
import { connectedPerson } from "@/lib/server/identity";

/** Every write in this app is somebody doing something, so it needs a wallet. */
export async function requireIdentity() {
  const connected = await connectedPerson();
  if (connected) return { ok: true as const, personId: connected.person.id };
  return {
    ok: false as const,
    response: NextResponse.json(
      { error: "Connect a wallet first.", reasons: ["Nothing is connected."] },
      { status: 401 },
    ),
  };
}
