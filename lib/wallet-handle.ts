"use client";

import { HANDLE_CERTIFICATE_TYPE, formatHandle, parseHandle } from "@/lib/handle";
import type { WalletClient } from "@bsv/sdk";

/**
 * Asking a wallet what it is called, without asking its owner.
 *
 * BRC-169 binds a handle to an identity key with a BRC-52 certificate that the
 * ecosystem signs. A wallet holding that certificate is holding proof of its own
 * handle, and BRC-100 already has two ways to ask for it — so an application
 * that wants somebody's handle should never have to make them type it.
 *
 * That is the design. What follows is also the honest state of it.
 *
 * ## This returns nothing today, and that is not a bug here
 *
 * BRC-169 resolves handle → key and defines no reverse lookup, so there is no
 * endpoint anywhere that answers "what is this key called". The certificate is
 * the only route, and:
 *
 *   - `listCertificates` reads what this wallet holds. HandCash Desktop, the
 *     one shipping implementation, receives the certificate when a handle is
 *     claimed and then discards it — the handle is written to the wallet's own
 *     local storage and the certificate is dropped on the floor. So there is
 *     nothing of this type to list.
 *   - `discoverByIdentityKey` asks overlay lookup services what has been
 *     published about a key. Handle certificates are not being published to one.
 *   - HandCash Desktop does expose a `getClaimedCloudHandle` method that would
 *     answer this outright, but it is gated to `handcash.io`, their market hosts,
 *     and localhost. Our production origin gets a 403. Worth knowing that this
 *     means the method works in development and fails once deployed, which is
 *     the most expensive shape a feature can have — so it is not used at all.
 *
 * Both calls are made anyway, because they cost one round trip to a local wallet
 * on connect, they are the correct mechanism, and the day a wallet keeps its
 * certificate this feature starts working for everybody with no deploy. Until
 * then the claim field is the path, and it verifies rather than trusts.
 *
 * ## Nothing here is trusted
 *
 * Whatever comes back is a string from a local process, and it is sent to the
 * server as a claim to be resolved against the registry like any other. A wallet
 * that lied about its handle would be caught by the same check that catches
 * somebody typing a handle that is not theirs.
 */

/** A wallet call that hangs is a wallet call that never happened. */
const TIMEOUT_MS = 4000;

/*
 * Neither call asks the person anything.
 *
 * Both run during connect, so a permission dialog for something nobody
 * requested would be worse than not knowing their handle. `listCertificates`
 * and `discoverByIdentityKey` are both outside the set of methods HandCash
 * Desktop prompts for — reading what a wallet holds is not a signing operation —
 * and a wallet that decided otherwise would time out into null below rather than
 * hold up the connection.
 */

/**
 * The handle this wallet says it holds, as `@alice@handcash.io`, or null.
 *
 * Null is the overwhelmingly common answer and is not an error: most wallets
 * have no handle, and no wallet yet exposes the one it has.
 */
export async function discoverHandle(
  wallet: WalletClient,
  identityKey: string,
): Promise<string | null> {
  return (
    (await fromOwnCertificates(wallet)) ??
    (await fromOverlay(wallet, identityKey))
  );
}

/** Certificates this wallet holds about itself. */
async function fromOwnCertificates(wallet: WalletClient): Promise<string | null> {
  try {
    const result = await limit(
      wallet.listCertificates({
        /* No certifier filter: any ecosystem's attestation is one we will check,
           because the app accepts a handle on any domain. Which certifier signed
           it is the registry's business, and the registry is asked next. */
        certifiers: [],
        types: [HANDLE_CERTIFICATE_TYPE],
        limit: 10,
      }),
    );
    return firstHandleIn(result?.certificates);
  } catch {
    /* A wallet that does not implement this, or refuses, is the normal case. */
    return null;
  }
}

/** Certificates the wider network has published about this key. */
async function fromOverlay(
  wallet: WalletClient,
  identityKey: string,
): Promise<string | null> {
  try {
    const result = await limit(
      wallet.discoverByIdentityKey({ identityKey, limit: 10 }),
    );
    return firstHandleIn(result?.certificates);
  } catch {
    return null;
  }
}

interface HandleCertificate {
  type?: string;
  fields?: Record<string, string>;
  decryptedFields?: Record<string, string>;
}

/**
 * The first handle among some certificates.
 *
 * `decryptedFields` where the wallet provided them, `fields` otherwise — a
 * handle and its domain are public by nature, so an ecosystem has no reason to
 * encrypt them, but the shape differs between the two BRC-100 calls.
 */
function firstHandleIn(
  certificates: HandleCertificate[] | undefined,
): string | null {
  for (const certificate of certificates ?? []) {
    if (certificate.type !== HANDLE_CERTIFICATE_TYPE) continue;

    const fields = certificate.decryptedFields ?? certificate.fields ?? {};
    const handle = fields.handle?.trim();
    if (!handle) continue;

    const domain = fields.domain?.trim();
    /* Parsed rather than concatenated, so a malformed certificate produces
       nothing instead of a display string nothing can resolve. */
    const parsed = parseHandle(domain ? `@${handle}@${domain}` : `@${handle}`);
    if (parsed) return formatHandle(parsed);
  }
  return null;
}

function limit<T>(promise: Promise<T>): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), TIMEOUT_MS)),
  ]);
}
