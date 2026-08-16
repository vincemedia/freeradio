import { NextResponse } from "next/server";
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
  }));

  return NextResponse.json(rows);
}
