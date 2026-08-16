import "server-only";

import { withinLifespan } from "@/lib/server/lifecycle";
import type { CoChannel, EcosystemId } from "@/data/schema";
import {
  createMeeting,
  listMeetings,
  realtimeConfig,
  type RealtimeConfig,
} from "@/lib/server/realtimekit";

/**
 * Stations people start, stored where they survive.
 *
 * ## Why this is not a row in the server store
 *
 * It was, and it was broken in production the first time somebody used it. A
 * station created by one serverless instance does not exist for the next
 * request, which lands on another — so the page you were redirected to after
 * starting a station said it could not load, intermittently, depending on
 * which instance answered. It looked like a routing bug and was a state bug.
 *
 * So a user's station is a RealtimeKit meeting and nothing else. The meeting
 * has to exist anyway — it is where the talking happens — and its title is
 * wide enough to carry the station with it. One object, one source of truth,
 * no database, and no window in which the room exists and the station does
 * not.
 *
 * The encoding is deliberately terse: a title is not unlimited, and the
 * fields are the whole of what a station is before anybody joins it.
 */

const PREFIX = "freeradio:v1:";

interface Encoded {
  /** station id */
  i: string;
  /** frequency */
  f: number;
  /** ecosystem */
  e: EcosystemId;
  /** host's identity key */
  h: string;
  /** title */
  t: string;
  /** topic */
  o?: string;
}

export function encodeStation(station: Encoded): string {
  return PREFIX + JSON.stringify(station);
}

/**
 * A station out of a meeting title, for callers holding only the title.
 *
 * Live sessions come back naming their meeting and nothing else, so this is
 * how "what is on air" becomes stations without a request per room.
 */
export function stationFromTitle(title: string): CoChannel | null {
  const value = decode(title);
  return value ? toStation(value, undefined) : null;
}

function decode(title: string): Encoded | null {
  if (!title.startsWith(PREFIX)) return null;
  try {
    const value = JSON.parse(title.slice(PREFIX.length)) as Encoded;
    if (!value?.i || typeof value.f !== "number" || !value.e || !value.t) {
      return null;
    }
    return value;
  } catch {
    /* Somebody else's meeting, or a title we no longer understand. */
    return null;
  }
}

function toStation(value: Encoded, createdAt: string | undefined): CoChannel {
  return {
    id: value.i,
    kind: "live",
    title: value.t,
    frequency: value.f,
    ecosystem: value.e,
    /* The host is a wallet key, which is the id `personFromKey` derives. */
    hostId: `wallet-${value.h.slice(0, 16)}`,
    startedAt: createdAt ?? new Date().toISOString(),
    recording: false,
    hasAudio: false,
    topic: value.o,
  };
}

/** Every station somebody has started, newest first. */
export async function userStations(): Promise<CoChannel[]> {
  const config = realtimeConfig();
  if (!config) return [];

  const meetings = await listMeetings(config, {
    search: PREFIX,
    perPage: 100,
  });

  const rows: CoChannel[] = [];
  for (const meeting of meetings) {
    const value = decode(meeting.title ?? "");
    if (!value) continue;
    const station = toStation(value, meeting.created_at);
    /* Past its two hours it is over, whether or not the sweep has reached it
       yet. Reads must not show a station that a write would refuse to let
       anybody into. */
    if (!withinLifespan(station.startedAt)) continue;
    rows.push(station);
  }
  return rows.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

export async function userStation(id: string): Promise<CoChannel | null> {
  const all = await userStations();
  return all.find((s) => s.id === id) ?? null;
}

/**
 * Start a station.
 *
 * Creating the meeting *is* creating the station, so there is no moment where
 * one exists without the other and nothing to reconcile if this fails halfway.
 */
export async function createUserStation(input: {
  title: string;
  ecosystem: EcosystemId;
  frequency: number;
  topic?: string;
  hostKey: string;
}): Promise<CoChannel | null> {
  const config: RealtimeConfig | null = realtimeConfig();
  if (!config) return null;

  /* Derived from the frequency and band rather than random, so the same
     station cannot be created twice and the id says where it is. */
  const id = `cc-${input.ecosystem}-${input.frequency.toFixed(1).replace(".", "")}`;

  const encoded: Encoded = {
    i: id,
    f: input.frequency,
    e: input.ecosystem,
    h: input.hostKey,
    t: input.title.slice(0, 60),
    ...(input.topic ? { o: input.topic.slice(0, 80) } : {}),
  };

  await createMeeting(config, { title: encodeStation(encoded) });
  return toStation(encoded, new Date().toISOString());
}
