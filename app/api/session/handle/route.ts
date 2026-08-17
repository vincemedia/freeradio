import { NextResponse, type NextRequest } from "next/server";
import { formatHandle, parseHandle } from "@/lib/handle";
import { sealHandle } from "@/lib/server/challenge";
import {
  connectedPerson,
  handleCookieName,
  personFromKey,
} from "@/lib/server/identity";
import { HandleError, handleBelongsTo } from "@/lib/server/handle-resolve";
import { sessionFor } from "@/lib/server/store";

export const dynamic = "force-dynamic";

const YEAR = 60 * 60 * 24 * 365;

/**
 * How often one wallet may ask us to fetch a domain of its choosing.
 *
 * Claiming makes an outbound request to whatever ecosystem was named, which
 * makes this endpoint a way to point our server at a public host — and without a
 * ceiling, at whatever rate somebody likes. The address guard refuses private
 * networks; it does nothing about being used as a relay toward a public one.
 *
 * Six a minute is far more than claiming a handle needs — it is done once, and
 * corrected once if it was mistyped — and turns a usable amplifier back into a
 * form.
 *
 * Per instance rather than global, because there is no shared store here and
 * inventing one for this would be the wrong trade. A caller who reaches enough
 * instances gets proportionally more, which is a real limit of this and is worth
 * knowing; it is still the difference between a handful of requests and an
 * unbounded stream.
 */
const CLAIMS_PER_WINDOW = 6;
const WINDOW_MS = 60_000;

const recent = new Map<string, number[]>();

function tooMany(publicKey: string): boolean {
  const now = Date.now();
  const times = (recent.get(publicKey) ?? []).filter((at) => now - at < WINDOW_MS);
  times.push(now);
  recent.set(publicKey, times);

  /* Swept while we are here, so a long-lived instance does not accumulate a row
     per wallet that ever tried. */
  if (recent.size > 500) {
    for (const [key, at] of recent) {
      if (at.every((t) => now - t >= WINDOW_MS)) recent.delete(key);
    }
  }

  return times.length > CLAIMS_PER_WINDOW;
}

/**
 * Claiming a BRC-169 handle.
 *
 * ## Why there is a field here at all
 *
 * The intended shape of this feature has no field in it: a wallet that holds a
 * handle certificate hands it over on request and the app simply knows. That
 * path is tried first and costs nothing when it works — see `lib/wallet-handle`.
 * It returns nothing today, because BRC-169 defines resolution in one direction
 * only (handle → key, never key → handle) and the wallets that issue handles do
 * not yet keep the certificate anywhere an application can read it.
 *
 * So this is the fallback, and it is not a username field wearing a new label.
 * Nothing typed here is believed. The handle is resolved against its ecosystem's
 * registry, the registry says which key it belongs to, and that key is compared
 * with the one this wallet already proved by signature. Type somebody else's
 * handle and you are told whose it is not.
 *
 * The direction is what makes it sound: the person names the handle, and the
 * registry names the person.
 */
export async function POST(request: NextRequest) {
  const connected = await connectedPerson();
  if (!connected) {
    return NextResponse.json(
      { error: "Connect a wallet first — a handle belongs to a key." },
      { status: 401 },
    );
  }

  if (tooMany(connected.publicKey)) {
    return NextResponse.json(
      { error: "Too many attempts. Wait a minute and try again." },
      { status: 429 },
    );
  }

  let body: { handle?: string } = {};
  try {
    body = await request.json();
  } catch {
    /* Handled below. */
  }

  const name = parseHandle(body.handle ?? "");
  if (!name) {
    return NextResponse.json(
      {
        error:
          "Write it as @you@ecosystem — for example @alice@handcash.io, or just $alice.",
      },
      { status: 400 },
    );
  }

  try {
    await handleBelongsTo(name, connected.publicKey);
  } catch (error) {
    /* The registry's answer, verbatim, because every one of these sentences is
       something the person can act on: a typo, the wrong ecosystem, somebody
       else's handle, or a host that is down and not their fault at all. */
    return NextResponse.json(
      {
        error:
          error instanceof HandleError
            ? error.message
            : "That handle could not be checked.",
      },
      { status: error instanceof HandleError ? 400 : 502 },
    );
  }

  const handle = formatHandle(name);
  const response = NextResponse.json(
    sessionFor({
      person: personFromKey(connected.publicKey, handle, connected.photo),
      username: connected.username,
      handle,
    }),
  );
  response.cookies.set(handleCookieName(), sealHandle(connected.publicKey, handle), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: YEAR,
  });
  return response;
}

/**
 * Releasing it.
 *
 * Not a way to rename yourself past the attestation — dropping the handle puts
 * you back to your username, or to your key if you never chose one, and
 * connecting again re-adopts the handle because the registry still says it is
 * yours. It exists because a person is allowed to stop advertising which
 * ecosystem they belong to, and because a handle that has genuinely moved on
 * should not need a support request to shake off.
 */
export async function DELETE() {
  const connected = await connectedPerson();
  const response = NextResponse.json(
    sessionFor(
      connected
        ? {
            person: personFromKey(
              connected.publicKey,
              connected.username,
              connected.photo,
            ),
            username: connected.username,
            handle: null,
          }
        : null,
    ),
  );
  response.cookies.delete(handleCookieName());
  return response;
}
