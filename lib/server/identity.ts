import "server-only";

import { cookies } from "next/headers";
import {
  isIdentityKey as isKey,
  personFromKey as fromKey,
  truncateKey as shorten,
} from "@/lib/identity-key";
import type { Person } from "@/data/schema";

/**
 * Who is using the app.
 *
 * There is one identity and it is the wallet's key. No password, no account
 * switcher, and — since this build — no seeded persona standing in for a real
 * person either.
 *
 * ## Why there is no demo account any more
 *
 * Every unrecognised key used to resolve to a seeded account so a real wallet
 * landed somewhere furnished. That was right while the rooms were invented,
 * and wrong the moment two people are in one: both were the same person id, so
 * RealtimeKit saw one participant and the second arrival took the first's
 * seat, and both were called the same name on screen.
 *
 * So a connection is now itself. The key is the account, the display name is
 * whatever they chose during first run, and the fallback — before they choose,
 * or if they never do — is the key, truncated. A truncated key is not a
 * friendly name, but it is *theirs*, which a borrowed one never was.
 *
 * Two cookies, both plain: the key that was presented, and the name they
 * picked for it. Neither grants anything. Deleting them is the whole of
 * disconnecting.
 */

const COOKIE = "fr_identity";
const NAME_COOKIE = "fr_username";
const AVATAR_COOKIE = "fr_avatar";

export function identityCookieName() {
  return COOKIE;
}

export function usernameCookieName() {
  return NAME_COOKIE;
}

export function avatarCookieName() {
  return AVATAR_COOKIE;
}

/* Re-exported rather than redefined. The derivation these share is the seed
   for somebody's avatar, so a second copy that drifts by one character gives
   them a different face on the server's pages than in the room. */
export const isIdentityKey = isKey;

export const truncateKey = shorten;

/**
 * What a username has to be to be usable as a handle.
 *
 * Handles are addresses in this product, so the same rules apply as anywhere
 * else: lowercase, no spaces, and short enough to sit in an occupant list.
 */
export function normaliseUsername(input: string): string | null {
  const value = input.trim().toLowerCase().replace(/^@+/, "");
  if (!/^[a-z0-9][a-z0-9_-]{1,23}$/.test(value)) return null;
  return value;
}

/**
 * The connected identity as a Person the UI already knows how to draw.
 *
 * Synthesised rather than looked up: there is no row for this person, because
 * the wallet is the row. `id` is derived from the key so it is stable across
 * sessions and unique across people, which is what both the occupant list and
 * RealtimeKit need of it.
 */
export function personFromKey(
  publicKey: string,
  username: string | null,
  photo: string | null = null,
): Person {
  return fromKey(publicKey, username, photo);
}

export interface Connected {
  person: Person;
  publicKey: string;
  username: string | null;
  photo: string | null;
}

/**
 * The connected identity, or null.
 *
 * Null is ordinary: browsing the band, playing a recorded station and
 * listening to a live one all work without a wallet.
 */
export async function connectedPerson(): Promise<Connected | null> {
  const store = await cookies();
  const key = store.get(COOKIE)?.value;
  if (!isIdentityKey(key)) return null;
  const username = store.get(NAME_COOKIE)?.value ?? null;
  const photo = store.get(AVATAR_COOKIE)?.value ?? null;
  return {
    person: personFromKey(key, username, photo),
    publicKey: key,
    username,
    photo,
  };
}

/**
 * Who this connection is to the voice network.
 *
 * The key, because it is unique per wallet, and a display name that is
 * theirs. Two people who have not chosen a username are still two
 * participants with two different truncated keys.
 */
export function participantIdentity(connected: Connected) {
  return { id: connected.publicKey, name: connected.person.name };
}
