import { NextResponse } from "next/server";
import { requireIdentity } from "@/lib/server/require-identity";
import { getCoChannel, setRecording } from "@/lib/server/store";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const who = await requireIdentity();
  if (!who.ok) return who.response;

  const { id } = await params;
  const room = getCoChannel(id);
  /* Only the host decides whether the room is written down. */
  if (room && room.hostId !== who.personId) {
    return NextResponse.json(
      { error: "Only the host can record this Co-Channel." },
      { status: 403 },
    );
  }

  const { recording } = (await request.json()) as { recording: boolean };
  if (!setRecording(id, Boolean(recording))) {
    return NextResponse.json(
      { error: "That Co-Channel has closed." },
      { status: 404 },
    );
  }
  return NextResponse.json(getCoChannel(id));
}
