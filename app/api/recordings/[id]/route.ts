import { NextResponse } from "next/server";
import { PLATFORM_FEE, RECORDING_PRICE_USD } from "@/data/pricing";
import { getPerson, getRecording } from "@/lib/server/store";

/**
 * One recording, with its people resolved.
 *
 * Recordings have their own address because they are the one thing that
 * outlives a Co-Channel: the room they came from is gone and its frequency
 * has been reissued, so the recording is the only way back to that
 * conversation, and it needs somewhere to be linked to.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const recording = getRecording(id);

  if (!recording) {
    return NextResponse.json({ error: "No such recording." }, { status: 404 });
  }

  return NextResponse.json({
    ...recording,
    host: getPerson(recording.hostId),
    occupantsResolved: recording.occupantIds
      .map((personId) => getPerson(personId))
      .filter(Boolean),
    priceUsd: RECORDING_PRICE_USD[recording.id] ?? 0,
    platformFee: PLATFORM_FEE,
  });
}
