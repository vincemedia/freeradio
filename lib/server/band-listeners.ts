import "server-only";

import { coChannels } from "@/data/co-channels";
import type { EcosystemId } from "@/data/schema";
import { meetingTitle } from "@/lib/server/meetings";
import {
  listSessions,
  realtimeConfig,
  sessionParticipants,
} from "@/lib/server/realtimekit";
import { stationFromTitle } from "@/lib/server/user-stations";

/**
 * Everybody listening anywhere on a band, right now.
 *
 * The scan page draws the whole band at once, and the one thing a band-wide
 * view can say that a single station cannot is how many people are on it
 * altogether. A count would do that; faces do it better, because the question
 * behind "is anything happening here" is really "is anybody here".
 *
 * Read from the live sessions rather than from any occupancy we keep, for the
 * same reason everything else about a live room is: there is no occupancy we
 * keep. One request lists what is on air, then one per live session, so a
 * quiet band costs a single call.
 *
 * Names come from the participant's own display name, which is their username
 * or their truncated key. Listeners are included and are simply called
 * "Listener": they are in the room, and a band that showed only the people
 * talking would understate itself.
 */

export interface BandListener {
  /** their participant id — an identity key, or a per-browser listener seat */
  id: string;
  name: string;
}

export async function bandListeners(
  ecosystem: EcosystemId,
): Promise<BandListener[]> {
  const config = realtimeConfig();
  if (!config) return [];

  let sessions;
  try {
    sessions = await listSessions(config, { live: true });
  } catch {
    return [];
  }

  /* Which seeded stations belong to this band, by the title their meeting
     carries. Built once rather than searched per session. */
  const seeded = new Map(
    coChannels
      .filter((c) => c.ecosystem === ecosystem)
      .map((c) => [meetingTitle(c.id), c] as const),
  );

  const found = new Map<string, BandListener>();

  await Promise.all(
    sessions.map(async (session) => {
      const title = session.meeting_display_name;
      if (!title) return;

      const started = stationFromTitle(title);
      const onThisBand = started
        ? started.ecosystem === ecosystem
        : seeded.has(title);
      if (!onThisBand) return;

      let present;
      try {
        present = await sessionParticipants(config, session.id);
      } catch {
        return;
      }

      for (const p of present) {
        if (p.left_at) continue;
        /* Keyed by participant id, so somebody who moved between two rooms
           during the same poll is one person rather than two. */
        found.set(p.custom_participant_id, {
          id: p.custom_participant_id,
          name: p.display_name || "Listener",
        });
      }
    }),
  );

  return [...found.values()];
}
