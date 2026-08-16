import { NextResponse } from "next/server";
import { connectedPerson, participantIdentity } from "@/lib/server/identity";
import { meetingFor } from "@/lib/server/meetings";
import { addParticipant, realtimeConfig } from "@/lib/server/realtimekit";
import { getCoChannel } from "@/lib/server/store";

export const dynamic = "force-dynamic";

/**
 * The token that lets this browser into this station's voice room.
 *
 * Minted per person per meeting and returned to exactly one caller. The
 * account token that signs it never leaves the server; this one carries a
 * single identity and a single preset and can do nothing else.
 *
 * Which preset you get is the whole permission model:
 *
 *   host      — it is your station. Talk, mute anyone, remove anyone, record.
 *   speaker   — you connected a wallet. Talk.
 *   listener  — you did not. Hear the room, transmit nothing.
 *
 * Listening is the only one of the three that needs no identity, which is why
 * this route answers rather than refusing when nothing is connected.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!realtimeConfig()) {
    return NextResponse.json(
      { error: "Live audio is not configured on this deployment." },
      { status: 503 },
    );
  }

  const room = getCoChannel(id);
  if (!room) {
    return NextResponse.json(
      { error: "That Co-Channel has closed." },
      { status: 404 },
    );
  }

  const meetingId = await meetingFor(id);
  if (!meetingId) {
    return NextResponse.json(
      { error: "Could not reach the voice network." },
      { status: 502 },
    );
  }

  const connected = await connectedPerson();

  /* No wallet, no identity to put in the room: a listener is anonymous to
     RealtimeKit as well as to the occupant list, so the id is per browser
     rather than per person and carries nothing about them. */
  if (!connected) {
    const participant = await addParticipant(realtimeConfig()!, meetingId, {
      name: "Listener",
      presetName: "free-radio-listener",
      customParticipantId: `listener-${crypto.randomUUID()}`,
    });
    return NextResponse.json({
      meetingId,
      authToken: participant.token,
      role: "listener" as const,
    });
  }

  const identity = participantIdentity(connected);
  const role = room.hostId === connected.person.id ? "host" : "speaker";

  const participant = await addParticipant(realtimeConfig()!, meetingId, {
    name: identity.name,
    presetName: `free-radio-${role}`,
    customParticipantId: identity.id,
    picture: connected.person.photo ?? undefined,
  });

  return NextResponse.json({
    meetingId,
    authToken: participant.token,
    role,
  });
}
