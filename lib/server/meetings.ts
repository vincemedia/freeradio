import "server-only";

import {
  createMeeting,
  listMeetings,
  realtimeConfig,
  type RealtimeConfig,
} from "@/lib/server/realtimekit";

/**
 * Which RealtimeKit meeting a station is.
 *
 * ## Why this is not a column in the store
 *
 * The obvious implementation is to remember the meeting id next to the station
 * and be done. It is also broken the moment this is deployed, and broken in a
 * way that never shows up on one machine.
 *
 * `lib/server/store` hangs its state off `globalThis`, which is per process. On
 * Vercel each serverless instance seeds its own copy, so a meeting id written
 * by the instance that handled your join does not exist for the instance that
 * handles mine. Mine finds nothing, creates a *second* meeting for the same
 * frequency, and the two of us sit in different rooms unable to hear each
 * other while both interfaces claim we are in the same one. Every local test
 * passes, because locally there is one process.
 *
 * So the mapping lives somewhere that is already shared: RealtimeKit. A
 * meeting's title is the station id, and finding a station's meeting is a
 * search rather than a lookup in memory. There is exactly one source of truth
 * and no database to add.
 *
 * The cache below is a latency optimisation and nothing more. A miss costs one
 * extra request; a stale entry cannot happen, because a meeting id never
 * changes and a meeting is never deleted here.
 */

/** Meeting titles are the station id, prefixed so the list stays legible. */
const TITLE_PREFIX = "freeradio:";

export function meetingTitle(coChannelId: string) {
  return `${TITLE_PREFIX}${coChannelId}`;
}

/* Per process, and safe to be: it only ever holds facts that cannot change. */
const cache = new Map<string, string>();

/**
 * The meeting for a station, creating it the first time anybody asks.
 *
 * Two people arriving at an unused station at the same moment can both find
 * nothing and both create one. The loser's meeting is orphaned rather than
 * harmful — nobody is ever given its id, because the search that follows is
 * ordered and both callers then agree on the same winner.
 */
export async function meetingFor(coChannelId: string): Promise<string | null> {
  const config = realtimeConfig();
  if (!config) return null;

  const cached = cache.get(coChannelId);
  if (cached) return cached;

  /* A station somebody started *is* a meeting: its title carries the station,
     so there is nothing to create and nothing to look up twice. */
  const started = await findUserMeeting(config, coChannelId);
  if (started) {
    cache.set(coChannelId, started);
    return started;
  }

  const id = await resolve(config, coChannelId);
  if (id) cache.set(coChannelId, id);
  return id;
}

async function resolve(
  config: RealtimeConfig,
  coChannelId: string,
): Promise<string | null> {
  const title = meetingTitle(coChannelId);

  const existing = await findByTitle(config, title);
  if (existing) return existing;

  await createMeeting(config, { title });

  /* Read back rather than trusting the id we just made. If two instances
     created one at once, this is where they agree: both search, both sort the
     same way, both take the same meeting, and the other is left unused. */
  return findByTitle(config, title);
}

/** The meeting whose encoded title names this station. */
async function findUserMeeting(config: RealtimeConfig, coChannelId: string) {
  const rows = await listMeetings(config, {
    search: "freeradio:v1:",
    perPage: 100,
  });
  const match = rows.find((m) => (m.title ?? "").includes(`"i":"${coChannelId}"`));
  return match?.id ?? null;
}

async function findByTitle(config: RealtimeConfig, title: string) {
  const rows = await listMeetings(config, { search: title, perPage: 100 });
  const matches = rows
    .filter((m) => m.title === title)
    /* Oldest wins, so the answer is stable for everybody asking. */
    .sort((a, b) => (a.created_at ?? "").localeCompare(b.created_at ?? ""));
  return matches[0]?.id ?? null;
}

/** For tests and the bootstrap; never needed in a request. */
export function forgetMeetings() {
  cache.clear();
}
