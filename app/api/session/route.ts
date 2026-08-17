import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import {
  connectedPerson,
  handleCookieName,
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
  sealHandle,
  sealKey,
  unsealHandle,
} from "@/lib/server/challenge";
import { formatHandle, parseFormatted, parseHandle } from "@/lib/handle";
import { handleBelongsTo } from "@/lib/server/handle-resolve";
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
 *
 * A BRC-169 handle is the other thing entirely, and connecting is where it is
 * settled. If the wallet volunteered one, it is resolved against the key that
 * just proved itself; if a previously verified handle is already sealed into a
 * cookie, it is resolved again for the same reason. A handle can be revoked or
 * transferred to somebody else's wallet, and neither event sends us a message —
 * so connecting is the moment to ask, and a handle that no longer answers to
 * this key is dropped rather than carried.
 */
export async function POST(request: NextRequest) {
  let body: {
    publicKey?: string;
    username?: string;
    challenge?: string;
    signature?: string;
    /** a handle the wallet produced by itself, still to be verified here */
    handle?: string;
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

  const handle = await settleHandle(body.publicKey, body.handle);

  const options = {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: YEAR,
  };

  const response = NextResponse.json(
    sessionFor({
      /* The handle is the name when there is one, which is what makes the
         username field disappear rather than quietly lose an argument. */
      person: personFromKey(body.publicKey, handle ?? username),
      username,
      handle,
    }),
  );
  /* Sealed, so it cannot be forged by hand. */
  response.cookies.set(identityCookieName(), sealKey(body.publicKey), options);
  if (username) response.cookies.set(usernameCookieName(), username, options);
  if (handle) {
    response.cookies.set(
      handleCookieName(),
      sealHandle(body.publicKey, handle),
      options,
    );
  } else {
    /* Explicitly cleared. A handle that has been revoked or moved to another
       wallet must not survive as a stale cookie, and this is the only moment we
       ever find out that it has. */
    response.cookies.delete(handleCookieName());
  }
  return response;
}

/**
 * The handle this connection is entitled to, if any.
 *
 * Two sources, both untrusted in the same way. One is whatever the wallet
 * volunteered, which reaches us as a string in a request body and is therefore
 * a claim. The other is the sealed cookie from last time, which this server did
 * issue — but to a binding that may since have been revoked or transferred, so
 * age makes it a claim again.
 *
 * Either way the registry decides, and any failure is silent. Nobody connecting
 * to listen to the radio should be stopped, or even interrupted, because an
 * ecosystem's endpoint is down: the cost of a failed check is being called by
 * your username, which is what everybody without a handle is called anyway.
 */
async function settleHandle(
  publicKey: string,
  offered: string | undefined,
): Promise<string | null> {
  const previous = unsealHandle(
    publicKey,
    (await cookies()).get(handleCookieName())?.value,
  );

  /* What the wallet offered comes first; the cookie is the fallback. A wallet
     that has since been given a different handle should not be held to the old
     one just because we remembered it. */
  const candidate = offered?.trim() || previous;
  if (!candidate) return null;

  const name = parseFormatted(candidate) ?? parseHandle(candidate);
  if (!name) return null;

  try {
    await handleBelongsTo(name, publicKey);
    return formatHandle(name);
  } catch {
    return null;
  }
}

/**
 * Set or change the username, without reconnecting.
 *
 * Separate from POST because first run asks for a name *before* the wallet:
 * choosing what to be called should not require having connected, and the
 * name is kept for whichever key connects next.
 *
 * Refused outright for anybody holding a verified handle. The UI hides the field
 * in that case, but a hidden field is a suggestion and this is the rule: a name
 * an ecosystem attested cannot be overwritten by one somebody typed, or the
 * attestation means nothing.
 */
export async function PATCH(request: NextRequest) {
  let body: { username?: string } = {};
  try {
    body = await request.json();
  } catch {
    /* Handled by the validation below. */
  }

  const connected = await connectedPerson();
  if (connected?.handle) {
    return NextResponse.json(
      {
        error: `You are ${connected.handle}, which your wallet's ecosystem issued. Release it before choosing a name.`,
      },
      { status: 409 },
    );
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
 *
 * The handle does not survive. It is sealed against the key that proved itself,
 * so it would be inert anyway — but leaving it behind would mean a browser with
 * nothing connected still holding somebody's attested identity, and the honest
 * state of a disconnected app is that it knows nothing about you.
 */
export async function DELETE() {
  const connected = await connectedPerson();
  if (connected) leave(connected.person.id);

  const response = NextResponse.json(sessionFor(null));
  response.cookies.delete(identityCookieName());
  response.cookies.delete(handleCookieName());
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
