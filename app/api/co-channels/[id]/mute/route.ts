import { NextResponse } from "next/server";
import { requireIdentity } from "@/lib/server/require-identity";
import { getCoChannel, setMuted } from "@/lib/server/store";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const who = await requireIdentity();
  if (!who.ok) return who.response;

  const { id } = await params;
  const { muted } = (await request.json()) as { muted: boolean };
  if (!setMuted(Boolean(muted), who.personId)) {
    return NextResponse.json(
      { error: "You are not in a Co-Channel." },
      { status: 409 },
    );
  }
  return NextResponse.json(getCoChannel(id));
}
