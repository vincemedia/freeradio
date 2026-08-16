import { NextResponse } from "next/server";
import { listTranscript, speakNext } from "@/lib/server/store";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return NextResponse.json(listTranscript(id));
}

/**
 * Advance the room's script by one line.
 *
 * There is no audio, so this is what "somebody is speaking" means. The
 * response says who, and the client lights that person's ring for as long as
 * the line lasts. One call, one speaker, one transcript line: the ring and
 * the words cannot disagree.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const spoken = speakNext(id);
  if (!spoken) {
    return NextResponse.json(
      { error: "That Co-Channel has closed." },
      { status: 404 },
    );
  }
  return NextResponse.json(spoken);
}
