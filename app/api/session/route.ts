import { NextResponse, type NextRequest } from "next/server";
import {
  connectedPerson,
  identityCookieName,
  isIdentityKey,
  normaliseUsername,
  personFromKey,
  usernameCookieName,
} from "@/lib/server/identity";
import { ProtoWallet } from "@bsv/sdk";
import { SESSION_PROTOCOL } from "@/lib/session-protocol";
import {
  challengeIsOurs,
  issueChallenge,
  sealKey,
} from "@/lib/server/challenge";
import { leave, sessionFor } from "@/lib/server/store";

export const dynamic = "force-dynamic";

const YEAR = 60 * 60 * 24 * 365;

/** Who is connected, if anyone. Browsing and listening work without a wallet. */
export async function GET() {
  return NextResponse.json(sessionFor(await connectedPerson()));
}

/** A challenge to sign. Issued freely; worthless without the private key. */
export async function PUT() {
  return NextResponse.json({ challenge: issueChallenge() });
}

/**
 * Establish a session by *proving* a wallet identity.
 *
 * This used to take a public key and believe it. A public key is public — it is
 * printed in every room its owner walks into — so anybody who had ever seen
 * somebody else's could become them by posting it, or by setting one cookie by
 * hand. That bought their name, their avatar, their notifications, and a host
 * token on any station they hosted: muting, removing and recording, in their
 * name. There was no exploit to write, because the impersonation was this code
 * path with a different string in it.
 *
 * So the key now arrives with a signature over a challenge this server issued,
 * and the signature is checked against the key. Public keys are public;
 * signatures over a fresh nonce are not, because producing one needs the private
 * key the wallet holds and never hands over.
 *
 * A username may come with it, or later, or never. It is a display name for a
 * key and nothing more — it grants nothing, it is not checked for uniqueness
 * against anybody, and without one the key itself is shown, truncated.
 */
export async function POST(request: NextRequest) {
  let body: {
    publicKey?: string;
    username?: string;
    challenge?: string;
    signature?: string;
  } = {};
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

  if (typeof body.challenge !== "string" || !challengeIsOurs(body.challenge)) {
    return NextResponse.json(
      { error: "That challenge was not issued here, or has expired." },
      { status: 400 },
    );
  }

  if (
    typeof body.signature !== "string" ||
    !(await signedByKey(body.publicKey, body.challenge, body.signature))
  ) {
    return NextResponse.json(
      { error: "That signature does not come from that key." },
      { status: 401 },
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
  /* Sealed, so it cannot be forged by hand. */
  response.cookies.set(identityCookieName(), sealKey(body.publicKey), options);
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

/**
 * Whether that identity signed that challenge.
 *
 * The first version of this verified against the identity key directly and
 * could never have worked, which broke connecting outright: a BRC-100 wallet
 * does not sign with the identity key. It signs with a key *derived* from it
 * per BRC-42, from the protocol, the key id and the counterparty — so verifying
 * against the identity key is checking the wrong key entirely.
 *
 * The counterparty is what makes this verifiable at all. A signature made for
 * `anyone` uses the well-known counterparty key, so anybody holding the
 * signer's public identity — which is public — can derive the same public key
 * and check the signature, while only the wallet could have produced it. That
 * is exactly the asymmetry a login needs, and `ProtoWallet('anyone')` is the
 * SDK's own side of it.
 *
 * The challenge is the key id as well as the data, so the derived key is
 * specific to this one login attempt.
 *
 * Anything unparseable is a refusal rather than an error. A check like this may
 * only ever fail closed.
 */
async function signedByKey(
  publicKey: string,
  challenge: string,
  signature: string,
): Promise<boolean> {
  try {
    const bytes = signature.match(/../g)?.map((h) => parseInt(h, 16));
    if (!bytes || bytes.some((b) => Number.isNaN(b))) return false;

    const { valid } = await new ProtoWallet("anyone").verifySignature({
      data: Array.from(new TextEncoder().encode(challenge)),
      signature: bytes,
      protocolID: SESSION_PROTOCOL,
      keyID: challenge,
      counterparty: publicKey,
    });
    return valid === true;
  } catch {
    return false;
  }
}
