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
  /* The card and the door use the same verdict, so a room can never offer a
     Join button it will then refuse. */
  return NextResponse.json(coChannel);
}
