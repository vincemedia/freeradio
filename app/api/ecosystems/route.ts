import { NextResponse } from "next/server";
import { ecosystems } from "@/data/ecosystems";
import { liveRosters, type LiveOccupant } from "@/lib/server/live-counts";
import { listCoChannels } from "@/lib/server/store";
import { userStations } from "@/lib/server/user-stations";

export const dynamic = "force-dynamic";

/**
 * Each band with a count, so the switch can say how busy the others are.
 *
 * ## Why this was wrong
 *
 * It counted rows out of the seeded table and summed their `occupantCount`, and
 * both halves were fiction. A live station's occupants are the people in its
 * RealtimeKit meeting — the seeded table is deliberately empty for them — so
 * every band reported nought talking however many people were in it. And
 * stations somebody had actually started were not counted at all, because they
 * live in RealtimeKit rather than in memory. The one place in the app whose whole
 * job is to say where the people are was the last place still guessing.
 *
 * Now it reads the same two sources the band itself does: the rosters, cached
 * alongside every other live count, and the started stations. The numbers in the
 * switch and the numbers on the band are the same numbers.
 *
 * ## What the two figures mean
 *
 * "On air" counts stations that are live — a recording is a thing that happened,
 * not a room to walk into. "Talking" counts open microphones, which is what the
 * word means; the people who are only listening are counted separately, because
 * on a quiet band the useful signal is that somebody is *there*.
 */
export async function GET() {
  const rosters = await liveRosters().catch(
    () => new Map<string, LiveOccupant[]>(),
  );

  let started: Awaited<ReturnType<typeof userStations>> = [];
  try {
    started = await userStations();
  } catch {
    /* The switch still lists every band; the counts are the part at risk. */
  }

  return NextResponse.json(
    ecosystems.map((e) => {
      const live = [
        ...listCoChannels({ ecosystem: e.id }).filter((c) => c.kind === "live"),
        ...started.filter((s) => s.ecosystem === e.id),
      ];

      let occupantCount = 0;
      let talkingCount = 0;
      for (const station of live) {
        const here = rosters.get(station.id) ?? [];
        occupantCount += here.length;
        talkingCount += here.filter((p) => p.micOpen).length;
      }

      return {
        ...e,
        /* Live stations, empty ones included — an open station nobody has walked
           into is still tuneable, still drawn on the scale, and still somewhere
           to go, which is the entire reason the open ones exist.

           Recordings are not counted, and used to be: a band with two live rooms
           and six recordings claimed eight were on air. A recording is something
           that happened, not a room. */
        coChannelCount: live.length,
        occupantCount,
        talkingCount,
      };
    }),
  );
}
