import { NextResponse } from "next/server";
import type { EcosystemId, Gates } from "@/data/schema";
import { createCoChannel, listCoChannels } from "@/lib/server/store";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rows = listCoChannels({
    ecosystem: (url.searchParams.get("ecosystem") as EcosystemId) || undefined,
    q: url.searchParams.get("q") ?? undefined,
    contactsOnly: url.searchParams.get("contacts") === "1",
  });
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    title?: string;
    ecosystem?: EcosystemId;
    frequency?: number;
    topic?: string;
    gates?: Gates;
  };

  if (!body.title || !body.ecosystem) {
    return NextResponse.json(
      { error: "A Co-Channel needs a name and a band." },
      { status: 400 },
    );
  }

  const result = createCoChannel({
    title: body.title,
    ecosystem: body.ecosystem,
    frequency: body.frequency,
    topic: body.topic,
    gates: body.gates,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, field: result.field },
      { status: 409 },
    );
  }
  return NextResponse.json(result.coChannel, { status: 201 });
}
