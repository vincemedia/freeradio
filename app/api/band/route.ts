import { NextResponse } from "next/server";
import { BAND, DEFAULT_ECOSYSTEM, FREQUENCY_STEP } from "@/data/ecosystems";
import type { EcosystemId } from "@/data/schema";
import { HOLD_PRICE_USD } from "@/data/pricing";
import { bandListeners } from "@/lib/server/band-listeners";
import { liveCounts } from "@/lib/server/live-counts";
import { bandOccupancy, listHolds } from "@/lib/server/store";
import { userStations } from "@/lib/server/user-stations";

export const dynamic = "force-dynamic";

/**
 * Everything the tuning scale needs, in one call.
 *
 * The gaps matter as much as the stations, so the limits and the step come
 * back with the occupancy rather than being hard-coded into the component
 * that draws the scale.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const ecosystem =
    (url.searchParams.get("ecosystem") as EcosystemId) || DEFAULT_ECOSYSTEM;

  const seeded = bandOccupancy(ecosystem);

  /* Stations people started are on the dial too. Leaving them out is how the
     create dialog ends up offering a frequency the server will then refuse:
     the picker has to see the whole band, not the fixture half of it. */
  let started: Awaited<ReturnType<typeof userStations>> = [];
  try {
    started = (await userStations()).filter((s) => s.ecosystem === ecosystem);
  } catch {
    /* The scale still draws; the picker is briefly optimistic and the create
       route is the backstop that actually refuses a clash. */
  }

  /* A mark's size is its occupancy, so a band whose counts all read nought
     draws as a row of identical ticks. Live rooms are counted from their
     meetings. */
  const counts = await liveCounts().catch(() => new Map<string, number>());

  const stations = [
    ...seeded.map((s) =>
      s.kind === "live" ? { ...s, occupantCount: counts.get(s.id) ?? 0 } : s,
    ),
    ...started.map((s) => ({
      id: s.id,
      kind: s.kind,
      frequency: s.frequency,
      title: s.title,
      occupantCount: counts.get(s.id) ?? 0,
      primaryGate: "open" as const,
      recording: false,
    })),
  ];

  /* Who is actually on this band, anywhere on it. Failure is an empty band
     rather than an error: the scale is the page, and it draws either way. */
  const listeners = await bandListeners(ecosystem).catch(() => []);

  const holds = listHolds(ecosystem);
  const taken = new Set([
    ...stations.map((s) => s.frequency.toFixed(1)),
    ...holds.map((h) => h.frequency.toFixed(1)),
  ]);

  let nextFree: number | null = null;
  for (let f = BAND.min; f <= BAND.max + 1e-9; f += FREQUENCY_STEP) {
    const key = Number(f.toFixed(1));
    if (!taken.has(key.toFixed(1))) {
      nextFree = key;
      break;
    }
  }

  return NextResponse.json({
    ecosystem,
    min: BAND.min,
    max: BAND.max,
    step: FREQUENCY_STEP,
    stations,
    /* Reserved gaps. A frequency nobody is broadcasting on is not necessarily
       free, and the scale should not imply otherwise. */
    holds,
    holdPriceUsd: HOLD_PRICE_USD[ecosystem],
    /* Everybody in a room anywhere on the band, for the facepile. */
    listeners,
    nextFree,
  });
}
