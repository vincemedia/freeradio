import "server-only";

import {
  activeSession,
  kickAll,
  listMeetings,
  realtimeConfig,
  renameMeeting,
  type RealtimeConfig,
} from "@/lib/server/realtimekit";

/**
 * Ending a station, and the two reasons one ends.
 *
 * The product has always claimed that a Co-Channel exists only while somebody
 * is in it, and that its frequency returns to the pool when the last person
 * leaves. That was easy to honour when rooms were fixtures and false the
 * moment they became real: a RealtimeKit meeting persists whether or not
 * anybody is in it, so without this every station anybody ever started would
 * hold its frequency forever.
 *
 * ## How a station is deleted when nothing can delete it
 *
 * There is no DELETE for a meeting, and `status: INACTIVE` on the update
 * endpoint is accepted and then ignored — the meeting keeps listing as
 * ACTIVE. But the title *is* the station: it carries the id, frequency, band
 * and host, and listings find stations by searching for its prefix. So ending
 * one is renaming it out of that prefix. The meeting stays, inert and
 * unfindable, and the frequency is free the moment the rename lands.
 *
 * ## The two reasons
 *
 * Empty: no active session, and old enough that this is not simply the gap
 * between creating a station and the host's browser connecting to it.
 *
 * Expired: two hours, whatever is happening in it. A frequency is a scarce
 * address and an unattended room holding one indefinitely is the failure this
 * cap exists to prevent — so the cap is wall-clock and not idle time.
 */

/** Nothing is reaped before this, so a station survives its own creation. */
const GRACE_MS = 10 * 60 * 1000;

/** The hard cap. A station is over two hours after it began, either way. */
export const MAX_STATION_MS = 2 * 60 * 60 * 1000;

const LIVE_PREFIX = "freeradio:v1:";
const ENDED_PREFIX = "freeradio:ended:";

export function isEndedTitle(title: string) {
  return title.startsWith(ENDED_PREFIX);
}

/**
 * End one station.
 *
 * Everybody is removed first, so the last thing anybody in the room
 * experiences is being disconnected rather than talking into something that
 * has already stopped existing.
 */
export async function endStation(
  config: RealtimeConfig,
  meetingId: string,
  title: string,
) {
  await kickAll(config, meetingId).catch(() => {
    /* Nobody in it, which is the usual case for a reap. */
  });
  await renameMeeting(config, meetingId, ENDED_PREFIX + title.slice(LIVE_PREFIX.length));
}

export interface SweepResult {
  checked: number;
  endedEmpty: number;
  endedExpired: number;
}

/**
 * End every station that should have ended.
 *
 * Safe to run from anywhere and as often as anybody likes: it reads the truth
 * and acts on it, so two of these racing reach the same answer and the second
 * rename is a no-op.
 */
export async function sweepStations(): Promise<SweepResult> {
  const config = realtimeConfig();
  if (!config) return { checked: 0, endedEmpty: 0, endedExpired: 0 };

  const meetings = await listMeetings(config, {
    search: LIVE_PREFIX,
    perPage: 100,
  });

  const now = Date.now();
  let endedEmpty = 0;
  let endedExpired = 0;

  for (const meeting of meetings) {
    const title = meeting.title ?? "";
    if (!title.startsWith(LIVE_PREFIX)) continue;

    const age = now - Date.parse(meeting.created_at ?? "");
    if (!Number.isFinite(age)) continue;

    if (age > MAX_STATION_MS) {
      await endStation(config, meeting.id, title);
      endedExpired++;
      continue;
    }

    if (age < GRACE_MS) continue;

    /* No active session means nobody is connected. The endpoint 404s in that
       case, which `activeSession` reports as null rather than throwing. */
    const session = await activeSession(config, meeting.id);
    if (!session || (session.live_participants ?? 0) === 0) {
      await endStation(config, meeting.id, title);
      endedEmpty++;
    }
  }

  return { checked: meetings.length, endedEmpty, endedExpired };
}

/** Whether a station that began at this time is still within its two hours. */
export function withinLifespan(startedAt: string): boolean {
  const age = Date.now() - Date.parse(startedAt);
  return Number.isFinite(age) ? age <= MAX_STATION_MS : true;
}
