import { NextResponse } from "next/server";
import { currentCoChannelId, getCoChannel, getPerson } from "@/lib/server/store";

/**
 * A person, and the room they are in.
 *
 * The second half is what makes the hover card useful: you can reach a
 * Co-Channel from anybody who happens to be in one, from anywhere in the
 * suite, without going to Free Radio first.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const person = getPerson(id);
  if (!person) {
    return NextResponse.json({ error: "No such handle." }, { status: 404 });
  }

  const at = currentCoChannelId(id);
  const coChannel = at ? getCoChannel(at) : null;

  return NextResponse.json({
    person,
    coChannel: coChannel
      ? {
          id: coChannel.id,
          title: coChannel.title,
          frequency: coChannel.frequency,
          ecosystem: coChannel.ecosystem,
          occupantCount: coChannel.occupantCount,
          primaryGate: coChannel.primaryGate,
          recording: coChannel.recording,
        }
      : null,
  });
}
