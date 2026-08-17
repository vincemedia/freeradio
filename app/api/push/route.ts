import { NextResponse } from "next/server";
import { connectedPerson, isIdentityKey } from "@/lib/server/identity";
import {
  pushConfigured,
  removeSubscriber,
  saveSubscriber,
} from "@/lib/server/push";

export const dynamic = "force-dynamic";

/**
 * Turning notifications on, off, and keeping the watch list current.
 *
 * A wallet is required, and not as ceremony: a notification is addressed to a
 * person, and without a key there is no person to address it to — only a
 * browser, which is not who anybody's contacts are.
 *
 * The watch list arrives with the subscription because it has to. Contacts live
 * in the browser by design, and the server is normally told nothing about who
 * anybody knows; a push notification is precisely the case where something has
 * to know while the browser is closed. That trade is stated at the switch, and
 * DELETE removes the whole record rather than merely pausing it.
 *
 * PUT rather than POST for the update, because switching this on twice is the
 * same request twice and should leave one subscription rather than two.
 */

/** Matches the client's contact ceiling. Anything past it is ignored. */
const MAX_WATCHING = 200;

export async function PUT(request: Request) {
  if (!pushConfigured()) {
    return NextResponse.json(
      { error: "Notifications are not configured on this deployment." },
      { status: 503 },
    );
  }

  const connected = await connectedPerson();
  if (!connected) {
    return NextResponse.json(
      { error: "Connect a wallet before switching on notifications." },
      { status: 401 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    subscription?: {
      endpoint?: unknown;
      keys?: { p256dh?: unknown; auth?: unknown };
    };
    watching?: unknown;
  } | null;

  const endpoint = body?.subscription?.endpoint;
  const p256dh = body?.subscription?.keys?.p256dh;
  const auth = body?.subscription?.keys?.auth;

  if (
    typeof endpoint !== "string" ||
    typeof p256dh !== "string" ||
    typeof auth !== "string"
  ) {
    return NextResponse.json(
      { error: "That is not a push subscription." },
      { status: 400 },
    );
  }

  /* Only real identity keys, and never your own: a notification telling you
     that you have joined a room is a notification about a button you just
     pressed. */
  const watching = (Array.isArray(body?.watching) ? body.watching : [])
    .filter(isIdentityKey)
    .filter((k) => k !== connected.publicKey)
    .slice(0, MAX_WATCHING);

  await saveSubscriber({
    key: connected.publicKey,
    subscription: { endpoint, keys: { p256dh, auth } },
    watching,
    at: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true, watching: watching.length });
}

export async function DELETE() {
  const connected = await connectedPerson();
  if (!connected) {
    return NextResponse.json({ ok: true });
  }
  await removeSubscriber(connected.publicKey);
  return NextResponse.json({ ok: true });
}
