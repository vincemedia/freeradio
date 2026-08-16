import { NextResponse } from "next/server";
import { getCoChannel } from "@/lib/server/store";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const coChannel = getCoChannel(id);
  if (!coChannel) {
    return NextResponse.json(
      { error: "That Co-Channel has closed." },
      { status: 404 },
    );
  }
  /* No signed-in holdings to check a gate against, so a room's terms are
     reported rather than judged: the badge says what the door asks for and
     stops short of claiming you would get through it. */
  return NextResponse.json(coChannel);
}
