import { NextResponse } from "next/server";
import { sweepStations } from "@/lib/server/lifecycle";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * End the stations that should have ended.
 *
 * Runs on a schedule because the two-hour cap has to fire whether or not
 * anybody is looking: a station nobody has opened all afternoon is exactly
 * the one holding a frequency it should have given back. Reads also filter
 * expired stations, so the cap is honoured either way — this is what makes
 * the frequency actually free rather than merely hidden.
 *
 * Vercel signs its cron requests; anything else needs the secret. Sweeping is
 * idempotent, so the worst an unauthorised call could do is the work that was
 * about to happen anyway, but a public endpoint that mutates is still an
 * invitation.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  const fromVercel = request.headers.get("x-vercel-cron") !== null;

  if (!fromVercel && secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Not for you." }, { status: 401 });
  }

  try {
    return NextResponse.json(await sweepStations());
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Sweep failed." },
      { status: 500 },
    );
  }
}
