import "server-only";

import { coChannels } from "@/data/co-channels";
import { meetingTitle } from "@/lib/server/meetings";
import {
  listSessions,
  realtimeConfig,
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
 * ## One call, not one per station
 *
 * `live_participants` comes back on the session itself, so the whole band
 * costs a single request — no per-room follow-up, unlike the facepile, which
 * needs the actual roster and pays for it. Every page that shows a count uses
 * this, so a quiet band is one call and a busy one is still one call.
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

interface Cached {
  at: number;
  counts: Map<string, number>;
}

let cache: Cached | null = null;

export async function liveCounts(): Promise<Map<string, number>> {
  const config = realtimeConfig();
  if (!config) return new Map();

  if (cache && Date.now() - cache.at < TTL_MS) return cache.counts;

  let sessions: Session[];
  try {
    sessions = await listSessions(config, { live: true });
  } catch {
    /* Unreachable. The last answer is better than zero — zero is a claim, and
       the wrong one. */
    return cache?.counts ?? new Map();
  }

  /* Seeded stations are found by the title their meeting carries. */
  const seeded = new Map(
    coChannels.map((c) => [meetingTitle(c.id), c.id] as const),
  );

  const counts = new Map<string, number>();

  for (const session of sessions) {
    const title = session.meeting_display_name;
    if (!title) continue;

    const id = stationFromTitle(title)?.id ?? seeded.get(title);
    if (!id) continue;

    const live = session.live_participants ?? 0;
    counts.set(id, (counts.get(id) ?? 0) + live);
  }

  cache = { at: Date.now(), counts };
  return counts;
}

/** Just one, for the room's own page. */
export async function liveCount(id: string): Promise<number> {
  return (await liveCounts()).get(id) ?? 0;
}
