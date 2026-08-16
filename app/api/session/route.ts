import { NextResponse, type NextRequest } from "next/server";
import {
  connectedPerson,
  identityCookieName,
  isIdentityKey,
  normaliseUsername,
  personFromKey,
  usernameCookieName,
} from "@/lib/server/identity";
import { leave, sessionFor } from "@/lib/server/store";

export const dynamic = "force-dynamic";

const YEAR = 60 * 60 * 24 * 365;

/** Who is connected, if anyone. Browsing and listening work without a wallet. */
export async function GET() {
  return NextResponse.json(sessionFor(await connectedPerson()));
}

/**
 * Establish a session from a wallet identity.
 *
 * The browser has already asked the wallet for `getPublicKey({ identityKey:
 * true })` and posts the key here. There is nothing to resolve it against and
 * nothing to look up: the key *is* the account. What arrives is who they are.
 *
 * A username may come with it, or later, or never. It is a display name for a
 * key and nothing more — it grants nothing, it is not checked for uniqueness
 * against anybody, and without one the key itself is shown, truncated. Storing
 * it beside the key is what lets the rest of the app put a name to an identity
 * wherever one is needed, including as the name other people see in a room.
 */
export async function POST(request: NextRequest) {
  let body: { publicKey?: string; username?: string } = {};
  try {
    body = await request.json();
  } catch {
    /* An empty body is a malformed connect, handled below. */
  }

  if (!isIdentityKey(body.publicKey)) {
    return NextResponse.json(
      { error: "That does not look like a BRC-100 identity key." },
      { status: 400 },
    );
  }

  /* A username that fails the rules is dropped rather than rejected: the
     connection is the point, and a name can be set again. */
  const username = body.username ? normaliseUsername(body.username) : null;

  const response = NextResponse.json(
    sessionFor({ person: personFromKey(body.publicKey, username), username }),
  );
  const options = {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: YEAR,
  };
  response.cookies.set(identityCookieName(), body.publicKey, options);
  if (username) response.cookies.set(usernameCookieName(), username, options);
  return response;
}

/**
 * Set or change the username, without reconnecting.
 *
 * Separate from POST because first run asks for a name *before* the wallet:
 * choosing what to be called should not require having connected, and the
 * name is kept for whichever key connects next.
 */
export async function PATCH(request: NextRequest) {
  let body: { username?: string } = {};
  try {
    body = await request.json();
  } catch {
    /* Handled by the validation below. */
  }

  const username = normaliseUsername(body.username ?? "");
  if (!username) {
    return NextResponse.json(
      {
        error:
          "Two to twenty-four characters: letters, numbers, dashes and underscores.",
      },
      { status: 400 },
    );
  }

  const connected = await connectedPerson();
  const response = NextResponse.json(
    sessionFor(
      connected
        ? { person: personFromKey(connected.publicKey, username), username }
        : null,
    ),
  );
  response.cookies.set(usernameCookieName(), username, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: YEAR,
  });
  return response;
}

/**
 * Disconnect.
 *
 * Leaving whatever room you were in is part of it: an occupant list is a list
 * of people who are present, and somebody who has disconnected is not. The
 * username survives, because it belongs to the key rather than to the session
 * and reconnecting the same wallet should not ask again.
 */
export async function DELETE() {
  const connected = await connectedPerson();
  if (connected) leave(connected.person.id);

  const response = NextResponse.json(sessionFor(null));
  response.cookies.delete(identityCookieName());
  return response;
}
