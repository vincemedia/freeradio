import { NextResponse } from "next/server";
import { DEFAULT_ECOSYSTEM, FREQUENCY_STEP, bandFor } from "@/data/ecosystems";
import type { EcosystemId } from "@/data/schema";
import { HOLD_PRICE_USD } from "@/data/pricing";
import { bandOccupants, liveRosters } from "@/lib/server/live-counts";
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

  /* The limits this band actually has. Read from the ecosystem rather than from
     one shared constant, or the scale draws Longwave as 87.5–108 and its only
     station sits sixty megahertz off the end of it. */
  const band = bandFor(ecosystem);

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
  const rosters = await liveRosters().catch(
    () => new Map<string, { id: string; name: string; micOpen: boolean }[]>(),
  );
  const counts = new Map([...rosters].map(([id, p]) => [id, p.length]));

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

  /* Who is actually on this band, anywhere on it — filtered out of the rosters
     this route already needs rather than swept again. It used to be a second
     independent fan-out over identical data, so every load of the scan page
     asked Cloudflare the same question twice and cached neither answer. */
  const listeners = await bandOccupants(ecosystem).catch(() => []);

  const holds = listHolds(ecosystem);
  /* Live rooms and reserved gaps. A recording is drawn on the dial but does
     not hold its frequency: the room it came from closed, and the address went
     back into the pool with it. */
  const taken = new Set([
    ...stations
      .filter((s) => s.kind === "live")
      .map((s) => s.frequency.toFixed(1)),
    ...holds.map((h) => h.frequency.toFixed(1)),
  ]);

  let nextFree: number | null = null;
  for (let f = band.min; f <= band.max + 1e-9; f += FREQUENCY_STEP) {
    const key = Number(f.toFixed(1));
    if (!taken.has(key.toFixed(1))) {
      nextFree = key;
      break;
    }
  }

  return NextResponse.json({
    ecosystem,
    min: band.min,
    max: band.max,
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
