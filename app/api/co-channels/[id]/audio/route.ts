import { NextResponse } from "next/server";
import { STATION_AUDIO } from "@/data/audio";
import { getCoChannel } from "@/lib/server/store";

/**
 * The recording behind a recorded station.
 *
 * A redirect rather than a proxy: the file is a static asset, and streaming it
 * through a serverless function would pay for every byte twice and lose range
 * requests, which are what let somebody scrub a recording rather than wait for
 * it.
 *
 * Only recorded stations have one, and only three of those: the rest are
 * broadcasts whose recording was not kept, and 404 is the honest answer for a
 * file that does not exist.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const room = getCoChannel(id);

  if (!room || room.kind !== "recorded" || !room.hasAudio) {
    return NextResponse.json(
      { error: "No recording was kept of this broadcast." },
      { status: 404 },
    );
  }

  const audio = STATION_AUDIO[id];
  if (!audio) {
    return NextResponse.json({ error: "No recording." }, { status: 404 });
  }

  return NextResponse.redirect(new URL(audio.src, _request.url));
}
