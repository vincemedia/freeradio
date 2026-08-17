import "server-only";

import { coChannels } from "@/data/co-channels";
import { meetingTitle } from "@/lib/server/meetings";
import {
  listSessions,
  realtimeConfig,
  sessionParticipants,
  type Session,
} from "@/lib/server/realtimekit";
import { stationFromTitle } from "@/lib/server/user-stations";

/**
 * How many people are in each live station.
 *
 * Every live station reported nobody. The count came from the seeded occupant
 * table, which is deliberately empty for live rooms — their occupants are
 * whoever is in the RealtimeKit meeting, and nothing was asking. So a room you
 * were standing in said "0 in the room", the band listing said every station
 * was empty, and the marks on the tuning scale were all sized for nought.
 *
 * Which is the same class of mistake as the silent audio: the number was
 * rendered from the only source that could not possibly know.
 *
 * ## Faces, not only a number
 *
 * `live_participants` comes back on the session itself, so a count alone would
 * cost one request for the whole band. But the cards want faces, and for the
 * same reason they want a count: the occupant table is empty for live rooms,
 * so every card showed an empty facepile beside its wrong number. A pile of
 * nobody is a stronger claim than a zero — it looks like a room that has been
 * abandoned rather than one nothing has asked about.
 *
 * So the roster is fetched too: one request to list what is on air, then one
 * per *live session* — not per station. A quiet band costs one call, and a
 * band with three rooms going costs four. The count is then the roster's
 * length, so there is one mechanism and the two can never disagree.
 *
 * ## The cache
 *
 * Ten seconds, per process. Occupancy is the most-read number in the product —
 * the front page, the scan page and every card want it — and it does not need
 * to be accurate to the second to be honest. What it must not be is stale for
 * long enough that a room looks empty after somebody has arrived, which ten
 * seconds is comfortably inside.
 *
 * Being per-process means two serverless instances hold their own copy and can
 * disagree by a few seconds. That is fine here in a way it was not for the
 * meeting mapping: a count that is briefly behind is a cosmetic imprecision,
 * whereas two instances disagreeing about *which meeting a station is* put two
 * people in different rooms. Same technique, different stakes.
 */

const TTL_MS = 10_000;

/** Somebody in a live room, as much as the sessions API knows about them. */
export interface LiveOccupant {
  /** their participant id: an identity key, or a per-browser listener seat */
  id: string;
  name: string;
  /** whether their microphone is open, so a card can rank the talkers first */
  micOpen: boolean;
}

interface Cached {
  at: number;
  rosters: Map<string, LiveOccupant[]>;
}

let cache: Cached | null = null;

export async function liveRosters(): Promise<Map<string, LiveOccupant[]>> {
  const config = realtimeConfig();
  if (!config) return new Map();

  if (cache && Date.now() - cache.at < TTL_MS) return cache.rosters;

  let sessions: Session[];
  try {
    sessions = await listSessions(config, { live: true });
  } catch {
    /* Unreachable. The last answer is better than an empty one — empty is a
       claim, and the wrong one. */
    return cache?.rosters ?? new Map();
  }

  /* Seeded stations are found by the title their meeting carries. */
  const seeded = new Map(
    coChannels.map((c) => [meetingTitle(c.id), c.id] as const),
  );

  const rosters = new Map<string, LiveOccupant[]>();

  await Promise.all(
    sessions.map(async (session) => {
      const title = session.meeting_display_name;
      if (!title) return;

      const id = stationFromTitle(title)?.id ?? seeded.get(title);
      if (!id) return;

      let present;
      try {
        present = await sessionParticipants(config, session.id);
      } catch {
        return;
      }

      const here = present
        .filter((p) => !p.left_at)
        .map((p) => ({
          id: p.custom_participant_id,
          name: p.display_name || "Listener",
          /* The sessions API does not report audio state, so this is a guess
             that is only used for ordering. Anybody who was given a preset
             that can talk is put in front of the listeners, which is the
             ranking a facepile wants: the people a room is *about*. */
          micOpen: p.preset_name !== "free-radio-listener",
        }));

      /* A station can in principle have two sessions in the window; merge. */
      rosters.set(id, [...(rosters.get(id) ?? []), ...here]);
    }),
  );

  cache = { at: Date.now(), rosters };
  return rosters;
}

/** How many are in each, derived so it can never disagree with the faces. */
export async function liveCounts(): Promise<Map<string, number>> {
  const rosters = await liveRosters();
  return new Map([...rosters].map(([id, people]) => [id, people.length]));
}

/** Just one, for the room's own page. */
export async function liveCount(id: string): Promise<number> {
  return (await liveRosters()).get(id)?.length ?? 0;
}
