import { NextResponse } from "next/server";
import { PLATFORM_FEE, RECORDING_PRICE_USD } from "@/data/pricing";
import type { EcosystemId } from "@/data/schema";
import { getPerson, listRecordings } from "@/lib/server/store";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const ecosystem =
    (url.searchParams.get("ecosystem") as EcosystemId) || undefined;

  /* Resolved here rather than in the component: a recording is only useful
     with faces on it, and the UI should not be doing lookups. */
  const rows = listRecordings(ecosystem).map((r) => ({
    ...r,
    host: getPerson(r.hostId),
    occupantsResolved: r.occupantIds
      .map((id) => getPerson(id))
      .filter(Boolean),
    /* Most recordings are free. A price is the host's decision, and the
       platform's cut is stated rather than folded into the number. */
    priceUsd: RECORDING_PRICE_USD[r.id] ?? 0,
    platformFee: PLATFORM_FEE,
  }));

  return NextResponse.json(rows);
}
