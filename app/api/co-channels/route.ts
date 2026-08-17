import { NextResponse } from "next/server";
import { MAX_STATIONS_PER_BAND, getEcosystem } from "@/data/ecosystems";
import { DEFAULT_BED, isBedId, type BedId } from "@/data/beds";
import type { EcosystemId, Gates } from "@/data/schema";
import { connectedPerson } from "@/lib/server/identity";
import { liveRosters, type LiveOccupant } from "@/lib/server/live-counts";
import { listCoChannels } from "@/lib/server/store";
import { createUserStation, userStations } from "@/lib/server/user-stations";

export const dynamic = "force-dynamic";

const bandName = (id: EcosystemId) => getEcosystem(id)?.name ?? id;

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
      nest: [],
      primaryGate: "open" as const,
    }));

  /* Live rooms are counted from the meeting, because that is where their
     occupants are. The seeded table is deliberately empty for them and would
     report every station as abandoned. */
  const rosters = await liveRosters().catch(() => new Map<string, LiveOccupant[]>());

  const withCounts = [...mine, ...seeded].map((c) => {
    if (c.kind !== "live") return c;
    const here = rosters.get(c.id) ?? [];
    return {
      ...c,
      occupantCount: here.length,
      /* Talkers first: a facepile of three from a room of twenty should be
         the people it is about, not whoever the API happened to list. */
      liveOccupants: [...here].sort(
        (a, b) => Number(b.micOpen) - Number(a.micOpen),
      ),
    };
  });

  return NextResponse.json(withCounts);
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
    bed?: BedId;
    gates?: Gates;
  };

  if (!body.title || !body.ecosystem) {
    return NextResponse.json(
      { error: "A station needs a name and a band." },
      { status: 400 },
    );
  }

  const onBand = [
    ...(await userStations()).filter((s) => s.ecosystem === body.ecosystem),
    ...listCoChannels({ ecosystem: body.ecosystem }).filter((s) => s.kind === "live"),
  ];

  /* A full band is a full band: the answer is no, and the reason is not the
     applicant's fault, so it says what is actually true rather than blaming
     the request. */
  if (onBand.length >= MAX_STATIONS_PER_BAND) {
    return NextResponse.json(
      {
        error: `${bandName(body.ecosystem)} is full — ${MAX_STATIONS_PER_BAND} stations are on air. Try another band, or wait for one to close.`,
        field: "ecosystem",
      },
      { status: 409 },
    );
  }

  /* Only what is on air reserves a frequency. A recorded broadcast is the
     past — its room closed and, as the product has said from the beginning,
     its frequency went back into the pool. Counting recordings as taken kept
     dozens of addresses locked up by conversations that had finished, and
     contradicted the rule out loud on the same page that states it. */
  const taken = new Set(
    [
      ...(await userStations()),
      ...listCoChannels({ ecosystem: body.ecosystem }).filter(
        (c) => c.kind === "live",
      ),
    ].map((s) => s.frequency.toFixed(1)),
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
    bed: isBedId(body.bed) ? body.bed : DEFAULT_BED,
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
