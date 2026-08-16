import { NextResponse } from "next/server";
import {
  listSessions,
  realtimeConfig,
  sessionParticipants,
} from "@/lib/server/realtimekit";
import { stationFromTitle } from "@/lib/server/user-stations";
import { getCoChannel } from "@/lib/server/store";
import { isIdentityKey } from "@/lib/server/identity";

export const dynamic = "force-dynamic";

/**
 * Of these people, who is in a room right now.
 *
 * Contacts live in the reader's own browser (see `lib/contacts`), so the
 * server is never told who anybody knows and cannot be asked. It is told a
 * set of keys and answers the one question it can: where each of them is, if
 * anywhere. Nothing is stored, and the answer is only about rooms that are
 * live and public knowledge anyway — the occupant list of a station is on its
 * page.
 *
 * A POST rather than a GET because the keys are the input and there can be
 * two hundred of them. Nothing is created; the method is about the body.
 *
 * One request per live session rather than per contact, so the cost tracks
 * how busy the band is rather than how many people you know. An empty band
 * costs one request.
 */

/** Matches the client's own ceiling; anything past it is ignored, not an error. */
const MAX_KEYS = 200;

/** How a seeded station's meeting is titled. */
const PREFIX = "freeradio:";

export interface OnAirRow {
  key: string;
  coChannel: {
    id: string;
    title: string;
    frequency: number;
    ecosystem: string;
  };
}

export async function POST(request: Request) {
  const config = realtimeConfig();
  if (!config) return NextResponse.json([]);

  const body = (await request.json().catch(() => null)) as {
    keys?: unknown;
  } | null;

  const keys = new Set(
    (Array.isArray(body?.keys) ? body.keys : [])
      .filter(isIdentityKey)
      .slice(0, MAX_KEYS),
  );
  if (keys.size === 0) return NextResponse.json([]);

  let sessions;
  try {
    sessions = await listSessions(config, { live: true });
  } catch {
    /* The band is unreachable. Nobody is reported on air, which reads as a
       quiet moment rather than as a broken page. */
    return NextResponse.json([]);
  }

  const rows: OnAirRow[] = [];

  await Promise.all(
    sessions.map(async (session) => {
      const title = session.meeting_display_name;
      if (!title) return;

      /* A station somebody started carries the whole thing in its title; a
         seeded one is titled after its id and is looked up. A meeting that
         has been ended is renamed out of both shapes, so it resolves to
         nothing and is skipped. */
      const room =
        stationFromTitle(title) ??
        (title.startsWith(PREFIX)
          ? (getCoChannel(title.slice(PREFIX.length)) ?? null)
          : null);
      if (!room) return;

      let present;
      try {
        present = await sessionParticipants(config, session.id);
      } catch {
        return;
      }

      for (const p of present) {
        if (p.left_at) continue;
        if (!keys.has(p.custom_participant_id)) continue;
        rows.push({
          key: p.custom_participant_id,
          coChannel: {
            id: room.id,
            title: room.title,
            frequency: room.frequency,
            ecosystem: room.ecosystem,
          },
        });
      }
    }),
  );

  return NextResponse.json(rows);
}
