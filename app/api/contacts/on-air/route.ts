import { NextResponse } from "next/server";
import { realtimeConfig } from "@/lib/server/realtimekit";
import { whereTheseAre } from "@/lib/server/live-counts";
import { anyStation } from "@/lib/server/user-stations";
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
 * A POST rather than a GET because the keys are the input and there can be two
 * hundred of them. Nothing is created; the method is about the body.
 *
 * The lookup itself is free: it reads the roster every other page already needs
 * (see `lib/server/live-counts`) rather than sweeping the sessions again, which
 * is what it used to do on every poll of every open tab.
 */

/** Matches the client's own ceiling; anything past it is ignored, not an error. */
const MAX_KEYS = 200;

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

  /* A lookup in the shared roster rather than a sweep of its own. This ran its
     own fan-out on every poll, so a few open tabs meant a few independent
     sweeps a minute asking exactly what the cache already held. */
  const found = await whereTheseAre(keys).catch(() => []);

  const rows: OnAirRow[] = [];
  for (const { key, stationId } of found) {
    const room = await anyStation(stationId).catch(() => null);
    if (!room) continue;
    rows.push({
      key,
      coChannel: {
        id: room.id,
        title: room.title,
        frequency: room.frequency,
        ecosystem: room.ecosystem,
      },
    });
  }

  return NextResponse.json(rows);
}
