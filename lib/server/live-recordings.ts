import "server-only";

import { coChannels } from "@/data/co-channels";
import { meetingTitle } from "@/lib/server/meetings";
import {
  listMeetings,
  listRecordings,
  realtimeConfig,
} from "@/lib/server/realtimekit";
import type { Recording } from "@/data/schema";

/**
 * Recordings that actually exist, read from RealtimeKit.
 *
 * ## Why there is no webhook and nothing stored
 *
 * A recording finishes asynchronously: `stop` returns before the file exists,
 * and the download URL appears minutes later. The usual answer is a
 * `recording.statusUpdate` webhook writing rows into a database — which here
 * would mean adding a database, and writing to a per-process store that loses
 * them on the next deployment.
 *
 * So nothing is stored. The list is read from RealtimeKit each time it is
 * asked for, which is correct by construction: a recording appears when it is
 * ready and cannot be missed because there is no event to miss. The download
 * URLs are signed and expire, which is the other reason not to keep them.
 *
 * Meetings carry the station id in their title, so a recording knows which
 * frequency it came from without a mapping table.
 */

/** RealtimeKit's own states; anything else is still in progress. */
const READY = new Set(["UPLOADED", "COMPLETED"]);

export async function liveRecordings(): Promise<Recording[]> {
  const config = realtimeConfig();
  if (!config) return [];

  const [recordings, meetings] = await Promise.all([
    listRecordings(config),
    listMeetings(config, { perPage: 100 }),
  ]);

  /* meeting id → station, via the title we set when the meeting was made. */
  const stationOf = new Map<string, (typeof coChannels)[number]>();
  for (const meeting of meetings) {
    const station = coChannels.find((c) => meetingTitle(c.id) === meeting.title);
    if (station) stationOf.set(meeting.id, station);
  }

  const rows: Recording[] = [];

  for (const r of recordings) {
    if (!READY.has(r.status) || !r.download_url) continue;
    const station = stationOf.get(r.meeting_id);
    if (!station) continue;

    const started = r.started_time ? Date.parse(r.started_time) : null;
    const stopped = r.stopped_time ? Date.parse(r.stopped_time) : null;

    rows.push({
      id: `rtk-${r.id}`,
      title: station.title,
      frequency: station.frequency,
      ecosystem: station.ecosystem,
      hostId: station.hostId,
      recordedAt: r.started_time ?? new Date().toISOString(),
      duration:
        started && stopped ? Math.max(1, Math.round((stopped - started) / 1000)) : 0,
      /* Who was in it is a session question, not a recording one, and
         answering it costs a request per row. The host is what a row needs to
         be attributable, and that is on the station. */
      occupantIds: [station.hostId],
      plays: 0,
      audioSrc: r.download_url,
    });
  }

  return rows.sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
}
