import { NextResponse } from "next/server";
import { connectedPerson, participantIdentity } from "@/lib/server/identity";
import { meetingFor } from "@/lib/server/meetings";
import {
  activeSession,
  addParticipant,
  realtimeConfig,
  sessionParticipants,
} from "@/lib/server/realtimekit";
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
 *
 * ## Open stations, and who ends up running them
 *
 * A station somebody opened has a host in its title and that never moves. The
 * seeded open ones have nobody, and get one here: walk into an empty room and
 * it is yours. Which is decided against the live session rather than anything
 * remembered, because the answer has to be the same for every serverless
 * instance minting a token at the same moment, and RealtimeKit is the only
 * thing all of them can see.
 *
 * The rule is "no host present" rather than "empty room", so a room whose
 * host has left is claimable by the next arrival instead of being stuck
 * without anybody who can mute a troll. Nobody is promoted mid-session — a
 * preset is fixed for the length of a connection — so the promotion lands on
 * the next person through the door, which in a room that has just lost its
 * host is usually soon.
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
  const role = room.hostId
    ? room.hostId === connected.person.id
      ? "host"
      : "speaker"
    : await claimable(meetingId)
      ? "host"
      : "speaker";

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

/**
 * Whether an unclaimed station currently has nobody running it.
 *
 * Two people arriving at the same empty room within the same second can both
 * be told yes. Two hosts in an open room is a far smaller problem than none —
 * they can both mute a troll and neither can do anything the other cannot —
 * so this is left as a race rather than paid for with a lock.
 *
 * A network failure answers no. Handing out the ability to remove people
 * because a request timed out is the wrong way to be wrong.
 */
async function claimable(meetingId: string): Promise<boolean> {
  const config = realtimeConfig();
  if (!config) return false;
  try {
    const session = await activeSession(config, meetingId);
    if (!session) return true;
    const present = await sessionParticipants(config, session.id);
    return !present.some(
      (p) => !p.left_at && p.preset_name === "free-radio-host",
    );
  } catch {
    return false;
  }
}
