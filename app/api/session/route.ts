import { NextResponse, type NextRequest } from "next/server";
import {
  DEMO_IDENTITY,
  identityCookieName,
  isIdentityKey,
  resolveIdentity,
} from "@/lib/server/identity";
import { people } from "@/data/people";
import { leave, sessionFor } from "@/lib/server/store";
import { connectedPerson } from "@/lib/server/identity";

export const dynamic = "force-dynamic";

/** Who is connected, if anyone. Browsing and listening work without a wallet. */
export async function GET() {
  const connected = await connectedPerson();
  return NextResponse.json(sessionFor(connected));
}

/**
 * Establish a session from a wallet identity.
 *
 * Two paths, and which one happened is visible to the reader rather than
 * hidden.
 *
 * With a real BRC-100 wallet the browser has already called
 * `getPublicKey({ identityKey: true })` and posts the key here.
 * `resolveIdentity` matches it to a seeded person, or adopts it into the demo
 * account — see `lib/server/identity` for why it adopts rather than minting.
 *
 * Without a wallet, `mode: "demo"` connects as the demo account so the
 * prototype can be looked at on a machine that has none, which is most of
 * them. It is labelled as a demo everywhere it surfaces. What it is NOT is a
 * login: there is no password in this product, and the demo path grants
 * nothing a wallet would not.
 */
export async function POST(request: NextRequest) {
  let body: { publicKey?: string; mode?: "wallet" | "demo" } = {};
  try {
    body = await request.json();
  } catch {
    /* An empty body means the demo path. */
  }

  let identityKey: string | undefined;

  if (body.mode === "wallet") {
    if (!isIdentityKey(body.publicKey)) {
      return NextResponse.json(
        { error: "That does not look like a BRC-100 identity key." },
        { status: 400 },
      );
    }
    identityKey = body.publicKey;
  } else {
    identityKey = people.find((p) => p.id === DEMO_IDENTITY)?.publicKey;
  }

  if (!identityKey) {
    return NextResponse.json({ error: "No identity available." }, { status: 500 });
  }

  const resolved = resolveIdentity(identityKey);
  if (!resolved) {
    return NextResponse.json({ error: "No identity available." }, { status: 500 });
  }

  const response = NextResponse.json(sessionFor(resolved));
  /* The key that was presented, not the key of the account it resolved to, so
     the session still knows which wallet is actually attached. */
  response.cookies.set(identityCookieName(), identityKey, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}

/**
 * Disconnect. Nothing is revoked, because nothing was granted beyond the key.
 *
 * Leaving whatever room you were in is part of it: an occupant list is a list
 * of people who are present, and somebody who has disconnected is not.
 */
export async function DELETE() {
  const connected = await connectedPerson();
  if (connected) leave(connected.person.id);

  const response = NextResponse.json(sessionFor(null));
  response.cookies.delete(identityCookieName());
  return response;
}
