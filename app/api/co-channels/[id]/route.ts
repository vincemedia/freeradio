import { NextResponse } from "next/server";
import { getCoChannel } from "@/lib/server/store";
import { userStation } from "@/lib/server/user-stations";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let coChannel = getCoChannel(id);

  /* A station somebody started lives in RealtimeKit, not in memory. Looked up
     second because the seeded band is the common case and needs no request. */
  if (!coChannel) {
    const started = await userStation(id);
    if (started) {
      coChannel = {
        ...started,
        /* Nobody has claimed it yet; the view type says so honestly now. */
        host: null,
        occupants: [],
        occupantCount: 0,
        nest: [],
        primaryGate: "open",
      };
    }
  }

  if (!coChannel) {
    return NextResponse.json(
      { error: "That Co-Channel has closed." },
      { status: 404 },
    );
  }
  /* The card and the door use the same verdict, so a room can never offer a
     Join button it will then refuse. */
  return NextResponse.json(coChannel);
}
