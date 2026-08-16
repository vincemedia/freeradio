import { NextResponse } from "next/server";
import { requireIdentity } from "@/lib/server/require-identity";
import { addNestLink, getCoChannel } from "@/lib/server/store";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const who = await requireIdentity();
  if (!who.ok) return who.response;

  const { id } = await params;
  const { url, title } = (await request.json()) as {
    url?: string;
    title?: string;
  };
  if (!url) {
    return NextResponse.json({ error: "Paste a link first." }, { status: 400 });
  }
  const link = addNestLink(id, url, title ?? "", who.personId);
  if (!link) {
    return NextResponse.json(
      { error: "That is not a link this room can open." },
      { status: 400 },
    );
  }
  return NextResponse.json(getCoChannel(id), { status: 201 });
}
