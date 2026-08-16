import "server-only";

import {
  activeRecording,
  activeSession,
  kickAll,
  listMeetings,
  realtimeConfig,
  renameMeeting,
  stopRecording,
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

/**
 * The hard cap on one recording, and the reason this sweep grew a second job.
 *
 * A recording is the one thing here that keeps costing after everybody has
 * gone. Nothing stops one except the host pressing stop, and a host who
 * closes their tab never presses anything — so a recording could run on an
 * empty room, writing silence, until something else happened to end the
 * station. On the seeded stations, which are permanent and never reaped,
 * nothing else ever would. That is unbounded, and it is unbounded in the one
 * resource that cannot be reclaimed: RealtimeKit has no delete for a
 * recording, so every minute written is paid for permanently.
 *
 * So: a recording on an empty room is stopped, and no recording outlives the
 * longest a station may.
 */
const MAX_RECORDING_MS = MAX_STATION_MS;

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
  /* Before anything else. A station whose recording is still running when it
     ends leaves the recording running, and a recording nobody can stop is a
     bill nobody can stop. */
  await stopAnyRecording(config, meetingId);
  await kickAll(config, meetingId).catch(() => {
    /* Nobody in it, which is the usual case for a reap. */
  });
  await renameMeeting(config, meetingId, ENDED_PREFIX + title.slice(LIVE_PREFIX.length));
}

/** Stop whatever is being recorded here, if anything. */
async function stopAnyRecording(config: RealtimeConfig, meetingId: string) {
  try {
    const running = await activeRecording(config, meetingId);
    if (running?.id) await stopRecording(config, running.id);
  } catch {
    /* No active recording is the common case and 404s. Nothing to do. */
  }
}

export interface SweepResult {
  checked: number;
  endedEmpty: number;
  endedExpired: number;
  recordingsStopped: number;
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
  if (!config) {
    return { checked: 0, endedEmpty: 0, endedExpired: 0, recordingsStopped: 0 };
  }

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

  const recordingsStopped = await sweepRecordings(config);

  return {
    checked: meetings.length,
    endedEmpty,
    endedExpired,
    recordingsStopped,
  };
}

/**
 * Stop every recording that should not still be running.
 *
 * Separate from the station sweep because it has to cover the seeded rooms as
 * well, and those are deliberately never ended — they are the band. A
 * permanent room is exactly where a forgotten recording would run longest.
 *
 * Two reasons to stop one: nobody is in the room, so it is recording nothing;
 * or it has been running longer than a station is allowed to exist, so
 * whatever it was recording is over.
 */
async function sweepRecordings(config: RealtimeConfig): Promise<number> {
  let stopped = 0;

  /* Every meeting this app has made, seeded and started alike. */
  const meetings = await listMeetings(config, {
    search: "freeradio:",
    perPage: 100,
  }).catch(() => []);

  const now = Date.now();

  for (const meeting of meetings) {
    let running;
    try {
      running = await activeRecording(config, meeting.id);
    } catch {
      continue;
    }
    if (!running?.id) continue;

    const began = Date.parse(running.started_time ?? "");
    const tooLong = Number.isFinite(began) && now - began > MAX_RECORDING_MS;

    let empty = false;
    if (!tooLong) {
      const session = await activeSession(config, meeting.id).catch(() => null);
      empty = !session || (session.live_participants ?? 0) === 0;
    }

    if (tooLong || empty) {
      await stopRecording(config, running.id).catch(() => {});
      stopped++;
    }
  }

  return stopped;
}

/** Whether a station that began at this time is still within its two hours. */
export function withinLifespan(startedAt: string): boolean {
  const age = Date.now() - Date.parse(startedAt);
  return Number.isFinite(age) ? age <= MAX_STATION_MS : true;
}
