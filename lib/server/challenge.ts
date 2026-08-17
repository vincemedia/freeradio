import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Proof that a key is yours.
 *
 * ## What was wrong, and how badly
 *
 * `POST /api/session` took a public key and believed it. A public key is
 * public — it is printed in every room its owner walks into — so anybody who
 * had ever seen somebody else's key could become them by posting it, or by
 * setting one cookie by hand. That bought their name, their avatar, their push
 * subscription, and a **host** token on any station whose host they were: the
 * ability to mute and remove people and to start recording, in somebody else's
 * name.
 *
 * There was no exploit to write. The impersonation *was* the normal code path
 * with a different string in it.
 *
 * ## The fix
 *
 * A key is now only accepted with a signature over a nonce this server issued.
 * Public keys are public; signatures over a fresh challenge are not, because
 * making one requires the private key the wallet holds and never reveals. That
 * is the entire difference between claiming an identity and demonstrating one.
 *
 * ## Why the nonce needs no storage
 *
 * There is no session table to keep it in, and adding one for a thirty-second
 * value would be the wrong shape. Instead the nonce carries its own expiry and
 * an HMAC of itself under a server secret: this server can tell that it issued
 * a given nonce, and when, without having remembered anything. The secret is
 * the VAPID private key — already present, already secret, already never sent
 * anywhere — used through an HMAC so nothing about it is recoverable.
 *
 * The one thing this shape does not give is single use: a nonce works twice
 * inside its window. That matters if a signature can be stolen in transit, and
 * over HTTPS it cannot be, so the window is kept to two minutes rather than
 * paid for with a database.
 */

const WINDOW_MS = 2 * 60 * 1000;

function secret(): string {
  /* Any server-side secret would do; this one is guaranteed to exist wherever
     the app is configured, and is never sent to a client. */
  return (
    process.env.VAPID_PRIVATE_KEY ??
    process.env.CLOUDFLARE ??
    "free-radio-development-only"
  );
}

function sign(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

/** A fresh challenge: random, stamped, and self-authenticating. */
export function issueChallenge(): string {
  const body = `${Date.now()}.${randomBytes(16).toString("base64url")}`;
  return `${body}.${sign(body)}`;
}

/** Whether this server issued that challenge, recently. */
export function challengeIsOurs(challenge: string): boolean {
  const parts = challenge.split(".");
  if (parts.length !== 3) return false;
  const [stamp, nonce, mac] = parts;

  const expected = sign(`${stamp}.${nonce}`);
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;

  const issued = Number(stamp);
  if (!Number.isFinite(issued)) return false;
  const age = Date.now() - issued;
  /* Rejecting the future as well as the past: a clock that has gone backwards
     should fail closed rather than mint a long-lived challenge. */
  return age >= 0 && age <= WINDOW_MS;
}
