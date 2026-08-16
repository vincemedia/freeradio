import { NextResponse } from "next/server";

/**
 * The BSV price, from WhatsOnChain.
 *
 * Proxied rather than fetched from the browser for two reasons: the rate is
 * the same for everybody, so one cached request an interval serves every
 * reader rather than one per tab; and it keeps the client from depending on
 * a third party's CORS policy.
 *
 * Prices are quoted in satoshis first everywhere in this app, which only
 * means anything if the conversion is live. When the upstream is unreachable
 * the response says so rather than inventing a number: a stale rate silently
 * presented as current is worse than no rate at all, because every price on
 * the screen is then quietly wrong.
 */
const UPSTREAM = "https://api.whatsonchain.com/v1/bsv/main/exchangerate";

/** Seconds. Long enough to be cheap, short enough that the number is today's. */
const TTL = 120;

export const revalidate = 120;

export async function GET() {
  try {
    const upstream = await fetch(UPSTREAM, {
      next: { revalidate: TTL },
      signal: AbortSignal.timeout(6000),
    });
    if (!upstream.ok) throw new Error(String(upstream.status));

    const body = (await upstream.json()) as {
      rate: number;
      time: number;
      currency: string;
    };
    if (typeof body.rate !== "number" || !Number.isFinite(body.rate) || body.rate <= 0) {
      throw new Error("no rate");
    }

    return NextResponse.json(
      {
        /* USD for one whole BSV. */
        usdPerBsv: body.rate,
        currency: body.currency ?? "USD",
        at: new Date(body.time * 1000).toISOString(),
        source: "WhatsOnChain",
      },
      { headers: { "cache-control": `public, s-maxage=${TTL}` } },
    );
  } catch {
    return NextResponse.json(
      { error: "The exchange rate is unavailable." },
      { status: 503 },
    );
  }
}
