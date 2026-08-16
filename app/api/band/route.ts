import { NextResponse } from "next/server";
import { BAND, DEFAULT_ECOSYSTEM, FREQUENCY_STEP } from "@/data/ecosystems";
import type { EcosystemId } from "@/data/schema";
import { HOLD_PRICE_USD } from "@/data/pricing";
import { bandOccupancy, listHolds, nextFreeFrequency } from "@/lib/server/store";

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

  return NextResponse.json({
    ecosystem,
    min: BAND.min,
    max: BAND.max,
    step: FREQUENCY_STEP,
    stations: bandOccupancy(ecosystem),
    /* Reserved gaps. A frequency nobody is broadcasting on is not necessarily
       free, and the scale should not imply otherwise. */
    holds: listHolds(ecosystem),
    holdPriceUsd: HOLD_PRICE_USD[ecosystem],
    nextFree: nextFreeFrequency(ecosystem),
  });
}
