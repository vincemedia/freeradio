import { NextResponse } from "next/server";
import { addNestLink, getCoChannel } from "@/lib/server/store";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { url, title } = (await request.json()) as {
    url?: string;
    title?: string;
  };
  if (!url) {
    return NextResponse.json({ error: "Paste a link first." }, { status: 400 });
  }
  const link = addNestLink(id, url, title ?? "");
  if (!link) {
    return NextResponse.json(
      { error: "That is not a link this room can open." },
      { status: 400 },
    );
  }
  return NextResponse.json(getCoChannel(id), { status: 201 });
}
