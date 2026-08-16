import { NextResponse } from "next/server";
import type { EcosystemId, Gates } from "@/data/schema";
import { connectedPerson } from "@/lib/server/identity";
import { listCoChannels } from "@/lib/server/store";
import { createUserStation, userStations } from "@/lib/server/user-stations";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const ecosystem = (url.searchParams.get("ecosystem") as EcosystemId) || undefined;
  const q = url.searchParams.get("q") ?? undefined;

  const seeded = listCoChannels({ ecosystem, q });

  /* Stations people started live in RealtimeKit rather than in memory, so
     they survive the instance that made them. A failure to read them leaves
     the seeded band rather than an empty one. */
  let started: Awaited<ReturnType<typeof userStations>> = [];
  try {
    started = await userStations();
  } catch {
    /* Nothing to say: the band still renders. */
  }

  const mine = started
    .filter((s) => !ecosystem || s.ecosystem === ecosystem)
    .filter((s) =>
      q
        ? s.title.toLowerCase().includes(q.toLowerCase()) ||
          s.frequency.toFixed(1) === q
        : true,
    )
    .map((s) => ({
      ...s,
      host: null,
      occupants: [],
      occupantCount: 0,
      contactCount: 0,
      nest: [],
      primaryGate: "open" as const,
    }));

  return NextResponse.json([...mine, ...seeded]);
}

export async function POST(request: Request) {
  /* Starting a station makes you its host, which is a thing only somebody
     can be. */
  const connected = await connectedPerson();
  if (!connected) {
    return NextResponse.json(
      { error: "Connect a wallet first." },
      { status: 401 },
    );
  }

  const body = (await request.json()) as {
    title?: string;
    ecosystem?: EcosystemId;
    frequency?: number;
    topic?: string;
    gates?: Gates;
  };

  if (!body.title || !body.ecosystem) {
    return NextResponse.json(
      { error: "A station needs a name and a band." },
      { status: 400 },
    );
  }

  const taken = new Set(
    [...(await userStations()), ...listCoChannels({ ecosystem: body.ecosystem })].map(
      (s) => s.frequency.toFixed(1),
    ),
  );
  const frequency = body.frequency ?? firstFree(taken);
  if (frequency === null) {
    return NextResponse.json({ error: "The band is full." }, { status: 409 });
  }
  if (taken.has(frequency.toFixed(1))) {
    return NextResponse.json(
      { error: `${frequency.toFixed(1)} is taken on this band.`, field: "frequency" },
      { status: 409 },
    );
  }

  const station = await createUserStation({
    title: body.title,
    ecosystem: body.ecosystem,
    frequency,
    topic: body.topic,
    hostKey: connected.publicKey,
  });

  if (!station) {
    return NextResponse.json(
      { error: "Live audio is not configured on this deployment." },
      { status: 503 },
    );
  }
  return NextResponse.json(station, { status: 201 });
}

/** The lowest tenth nobody is on. */
function firstFree(taken: Set<string>): number | null {
  for (let f = 87.5; f <= 108.0 + 1e-9; f += 0.1) {
    const key = Number(f.toFixed(1)).toFixed(1);
    if (!taken.has(key)) return Number(key);
  }
  return null;
}
