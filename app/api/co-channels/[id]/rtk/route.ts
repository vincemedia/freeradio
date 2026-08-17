import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { connectedPerson, participantIdentity } from "@/lib/server/identity";
import { meetingFor } from "@/lib/server/meetings";
import {
  activeSession,
  addParticipant,
  realtimeConfig,
  sessionParticipants,
  type SessionParticipant,
} from "@/lib/server/realtimekit";
import { notifyWatchers } from "@/lib/server/push";
import { anyStation } from "@/lib/server/user-stations";

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
 *
 * ## Two limits
 *
 * A room holds two hundred people. Not a product decision so much as a floor
 * under the bill: nothing here needs more than that, and a script pointed at
 * an open station could otherwise open connections until somebody noticed.
 *
 * And a listener gets the same participant id every time this browser asks.
 * Without that, every refresh minted a new one and left the old sitting in
 * the session until RealtimeKit timed it out, so a reader who reloaded twice
 * appeared as three people and the room's own occupant count lied.
 */

/** The ceiling on one room, and a cost control rather than a rule. */
const MAX_IN_ROOM = 200;

/** Names this browser's listener seat, so refreshing reuses it. */
const LISTENER_COOKIE = "fr_listener";

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

  const room = await anyStation(id);
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

  const roster = await presentIn(meetingId);
  if (roster && roster.length >= MAX_IN_ROOM) {
    return NextResponse.json(
      { error: "This station is full. Try again in a moment." },
      { status: 503 },
    );
  }

  const connected = await connectedPerson();

  /* No wallet, no identity to put in the room: a listener is anonymous to
     RealtimeKit as well as to the occupant list, so the id carries nothing
     about them. It is per browser rather than per visit, though, so that
     reloading the page returns to the same seat instead of leaving the last
     one occupied by a ghost until it times out. */
  if (!connected) {
    const store = await cookies();
    const seat =
      store.get(LISTENER_COOKIE)?.value ?? `listener-${crypto.randomUUID()}`;

    const participant = await addParticipant(realtimeConfig()!, meetingId, {
      name: "Listener",
      presetName: "free-radio-listener",
      customParticipantId: seat,
    });

    const response = NextResponse.json({
      meetingId,
      authToken: participant.token,
      role: "listener" as const,
    });
    response.cookies.set(LISTENER_COOKIE, seat, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return response;
  }

  const identity = participantIdentity(connected);
  const role = room.hostId
    ? room.hostId === connected.person.id
      ? "host"
      : "speaker"
    : roster && !roster.some((p) => p.preset_name === "free-radio-host")
      ? "host"
      : "speaker";

  const participant = await addParticipant(realtimeConfig()!, meetingId, {
    name: identity.name,
    presetName: `free-radio-${role}`,
    customParticipantId: identity.id,
    picture: connected.person.photo ?? undefined,
  });

  /* Anybody who has asked to hear about this person hears about it now. Not
     awaited: a notification is worth nothing to the person joining, and making
     them wait on a fan-out to Apple and Google before their own room opens
     would be charging them for somebody else's benefit.

     Only when the room was empty of them beforehand, so a refresh, a reconnect
     or a second tab is not three notifications about one arrival. */
  const alreadyHere = roster?.some(
    (p) => p.custom_participant_id === identity.id,
  );
  if (!alreadyHere) {
    void announceArrival(connected.publicKey, identity.name, room);
  }

  return NextResponse.json({
    meetingId,
    authToken: participant.token,
    role,
  });
}

/**
 * Who is in this room right now, or null if that could not be established.
 *
 * Null rather than an empty array, because the two mean opposite things and
 * both callers care which they got: an empty room is claimable and has space,
 * an unknown one is neither. A network failure must not hand somebody the
 * power to remove people, and must not lock everybody out of a working
 * station either — so the cap treats null as "no evidence it is full" and the
 * host claim treats it as "no evidence it is free".
 */
async function presentIn(meetingId: string): Promise<SessionParticipant[] | null> {
  const config = realtimeConfig();
  if (!config) return null;
  try {
    const session = await activeSession(config, meetingId);
    if (!session) return [];
    const seen = await sessionParticipants(config, session.id);
    return seen.filter((p) => !p.left_at);
  } catch {
    return null;
  }
}

/**
 * Tell this person's watchers where they are.
 *
 * Fire and forget, and quiet about failing: nothing the person joining does
 * depends on it, and a push service having a bad minute is not their problem.
 * The tag is the station, so somebody moving between rooms replaces their own
 * previous notification rather than stacking a history of their evening on
 * everybody's lock screen.
 */
async function announceArrival(
  publicKey: string,
  name: string,
  room: { id: string; title: string; frequency: number },
) {
  try {
    await notifyWatchers(publicKey, {
      title: `${name} is on air`,
      body: `${room.frequency.toFixed(1)} MHz — ${room.title}`,
      url: `/co-channel/${room.id}`,
      tag: `arrival:${publicKey.slice(0, 12)}`,
    });
  } catch {
    /* Nothing to do and nobody to tell. */
  }
}
