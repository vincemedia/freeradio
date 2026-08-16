import { NextResponse } from "next/server";
import { getCoChannel, setRecording } from "@/lib/server/store";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { recording } = (await request.json()) as { recording: boolean };
  if (!setRecording(id, Boolean(recording))) {
    return NextResponse.json(
      { error: "That Co-Channel has closed." },
      { status: 404 },
    );
  }
  return NextResponse.json(getCoChannel(id));
}
