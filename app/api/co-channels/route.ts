import { NextResponse } from "next/server";
import type { EcosystemId } from "@/data/schema";
import { listCoChannels } from "@/lib/server/store";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rows = listCoChannels({
    ecosystem: (url.searchParams.get("ecosystem") as EcosystemId) || undefined,
    q: url.searchParams.get("q") ?? undefined,
  });
  return NextResponse.json(rows);
}
