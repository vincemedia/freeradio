import { NextResponse } from "next/server";
import { BAND, DEFAULT_ECOSYSTEM, FREQUENCY_STEP } from "@/data/ecosystems";
import type { EcosystemId } from "@/data/schema";
import { HOLD_PRICE_USD } from "@/data/pricing";
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

  const stations = [
    ...seeded,
    ...started.map((s) => ({
      id: s.id,
      kind: s.kind,
      frequency: s.frequency,
      title: s.title,
      occupantCount: 0,
      contactCount: 0,
      primaryGate: "open" as const,
      recording: false,
    })),
  ];

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
    nextFree,
  });
}
