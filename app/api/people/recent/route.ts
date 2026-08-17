import { NextResponse } from "next/server";
import { connectedPerson, isIdentityKey } from "@/lib/server/identity";
import {
  listSessions,
  realtimeConfig,
  sessionParticipants,
} from "@/lib/server/realtimekit";

export const dynamic = "force-dynamic";

/**
 * People who have been on air lately.
 *
 * Contacts start empty, and an empty list with nothing but an instruction in
 * it is the worst screen in any product: it tells somebody what to do rather
 * than letting them do it. The instruction here is also circular — go and
 * find somebody in a room — which is fine advice on a busy night and useless
 * on a quiet one.
 *
 * So the empty state offers the people who have actually been here recently.
 * Not a directory and not a suggestion engine: there is no social graph to
 * mine and nothing is being inferred about who you would like. It is the
 * plain fact of who has spoken on this service lately, in the order they last
 * did, which is the same fact the recordings page is made of.
 *
 * Only wallet identities. A listener's participant id is a seat rather than a
 * person and would be nobody to add. Whoever is asking is excluded, since
 * adding yourself is not a thing anybody wants to have done.
 *
 * ## What this deliberately does not expose
 *
 * A public key and a display name, both of which are already visible to
 * anybody who was in a room with them. No timestamps beyond ordering, no
 * count of how often, and no indication of which station — where somebody was
 * is theirs, and a page that quietly assembled a history of it would be a
 * different and worse product than one that says who is about.
 */

/**
 * Sessions to look back through.
 *
 * Twelve, not sixty. Each one costs a request for its participants, and this
 * walked sixty of them *one at a time* — the endpoint took twenty-one seconds
 * in production, on a page that opens as soon as somebody presses Contacts. A
 * dozen recent sessions is easily enough to fill a screenful of names, and the
 * requests now go out together rather than in a queue.
 */
const LOOK_BACK = 12;

/**
 * How long an answer stands.
 *
 * "Who has been on air lately" is a fact about the last few hours; recomputing
 * it per page load was paying a fan-out for a value that barely moves. A minute
 * is invisible to anybody reading it and turns the common case into no upstream
 * work at all.
 */
const TTL_MS = 60_000;

let cache: { at: number; rows: RecentPerson[] } | null = null;

/** How many to offer. A screenful; past that it is a directory. */
const MOST = 12;

export interface RecentPerson {
  key: string;
  name: string;
}

export async function GET() {
  const config = realtimeConfig();
  if (!config) return NextResponse.json([]);

  const connected = await connectedPerson();
  const self = connected?.publicKey;

  /* Cached without the viewer in it, then filtered per request: the expensive
     part is the same for everybody, and only the exclusion is personal. */
  if (cache && Date.now() - cache.at < TTL_MS) {
    return NextResponse.json(cache.rows.filter((r) => r.key !== self));
  }

  let sessions;
  try {
    sessions = await listSessions(config, { perPage: LOOK_BACK });
  } catch {
    return NextResponse.json([]);
  }

  /* Only this app's rooms. The account could hold meetings made by something
     else, and a stranger from another product is not somebody who has been
     here. */
  const ours = sessions.filter((s) =>
    (s.meeting_display_name ?? "").startsWith("freeradio:"),
  );

  /* All at once. Serially, this was twenty-one seconds of waiting for a list of
     names — sixty round trips end to end, on a page that opens on a keypress. */
  const rosters = await Promise.all(
    ours.map((session) =>
      sessionParticipants(config, session.id).catch(() => []),
    ),
  );

  /* Newest session first, so the first time a key is seen is the last time they
     were on air, and insertion order is the order to show them in. */
  const found = new Map<string, RecentPerson>();
  for (const present of rosters) {
    for (const p of present) {
      const key = p.custom_participant_id;
      if (!isIdentityKey(key)) continue;
      if (found.has(key)) continue;
      found.set(key, { key, name: p.display_name || "Someone" });
    }
  }

  const rows = [...found.values()].slice(0, MOST);
  cache = { at: Date.now(), rows };

  return NextResponse.json(rows.filter((r) => r.key !== self));
}
