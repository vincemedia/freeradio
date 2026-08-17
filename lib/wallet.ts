"use client";

import { WalletClient } from "@bsv/sdk";
import { SESSION_PROTOCOL } from "@/lib/session-protocol";

/**
 * BRC-100 wallet access.
 *
 * The wallet is the user's, runs on their machine, and is reached through
 * @bsv/sdk's WalletClient, which negotiates a substrate — a browser extension,
 * an XDM channel, or a local HTTP port — on first use. Nothing here ever sees
 * a private key: the wallet returns an identity public key and signs on
 * request, and that is the whole surface.
 *
 * ## Why everything races a deadline
 *
 * `connectToSubstrate` does not fail fast when no wallet is installed. It
 * tries each transport in turn and can simply sit there, so a plain
 * `await wallet.getPublicKey(...)` leaves the Connect button spinning forever
 * in the overwhelmingly common case of a visitor with no BSV wallet at all.
 * Every call here has a timeout and reports "no wallet" as an ordinary answer
 * rather than as an error.
 */

/** How long to wait for a local wallet before concluding there is not one. */
const PROBE_TIMEOUT_MS = 2500;

/** Long, because a person is being asked to approve something. */
const ACTION_TIMEOUT_MS = 60_000;

export class NoWalletError extends Error {
  constructor() {
    super("No BRC-100 wallet answered in this browser");
    this.name = "NoWalletError";
  }
}

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  onTimeout: () => Error,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(onTimeout()), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/*
 * One client per page.
 *
 * WalletClient caches its substrate negotiation, so reusing the instance
 * avoids re-probing on every call. Created lazily, because constructing it
 * during a server render would reach for browser globals.
 */
let client: WalletClient | null = null;

function getClient(): WalletClient {
  if (!client) client = new WalletClient();
  return client;
}

export interface WalletIdentity {
  publicKey: string;
  network: string;
}

/**
 * Is there a wallet, and is it unlocked?
 *
 * Returns false rather than throwing, because "no wallet" is the normal case
 * for most visitors and listening to a station does not require one.
 */
export async function probeWallet(): Promise<boolean> {
  try {
    const { authenticated } = await withTimeout(
      getClient().isAuthenticated({}),
      PROBE_TIMEOUT_MS,
      () => new NoWalletError(),
    );
    return Boolean(authenticated);
  } catch {
    return false;
  }
}

/**
 * Connect, and return the identity the wallet reports.
 *
 * `waitForAuthentication` is what prompts an installed-but-locked wallet to
 * ask its owner to unlock and approve. It gets the long timeout because
 * somebody is being asked to make a decision, and cutting that off after two
 * seconds would make a working wallet look broken.
 */
/**
 * Sign a challenge, proving the key is this wallet's.
 *
 * The counterpart to the server's nonce. `createSignature` is the wallet
 * operation that requires the private key, and the whole point of asking for it
 * is that a public key alone proves nothing — anybody can quote one.
 *
 * The counterparty is `anyone`, which is what makes it verifiable by a server
 * that holds no private key of yours: the derived public key can be computed
 * from your public identity, while only your wallet can produce the signature.
 */
export async function signChallenge(challenge: string): Promise<string> {
  const wallet = getClient();
  const { signature } = await withTimeout(
    wallet.createSignature({
      data: Array.from(new TextEncoder().encode(challenge)),
      protocolID: SESSION_PROTOCOL,
      /* The challenge is the key id as well as the payload, so the key this is
         signed with is specific to this one login attempt. */
      keyID: challenge,
      /* `anyone`, so the server can verify it. A signature for `self` is
         checkable only by the wallet that made it, which is no use to anybody
         being asked to believe it — that mistake is what broke connecting. */
      counterparty: "anyone",
    }),
    ACTION_TIMEOUT_MS,
    () => new NoWalletError(),
  );
  return signature.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function connectWallet(): Promise<WalletIdentity> {
  const wallet = getClient();

  if (!(await probeWallet())) {
    await withTimeout(
      wallet.waitForAuthentication({}),
      ACTION_TIMEOUT_MS,
      () => new NoWalletError(),
    ).catch(() => {
      throw new NoWalletError();
    });
  }

  const { publicKey } = await withTimeout(
    wallet.getPublicKey({ identityKey: true }),
    ACTION_TIMEOUT_MS,
    () => new NoWalletError(),
  );

  let network = "unknown";
  try {
    const result = await withTimeout(
      wallet.getNetwork({}),
      PROBE_TIMEOUT_MS,
      () => new NoWalletError(),
    );
    network = result.network;
  } catch {
    /* Not fatal. The identity key is what matters; the network is a label. */
  }

  return { publicKey, network };
}
