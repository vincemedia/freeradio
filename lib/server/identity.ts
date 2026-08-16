import "server-only";

import { cookies } from "next/headers";
import { ME_ID, people } from "@/data/people";
import type { Person } from "@/data/schema";

/**
 * Who is using the app.
 *
 * There is one identity and it comes from the connected wallet. No password
 * exists anywhere in this product, and there is no account switcher: a wallet
 * supplies one key, and that key is the account.
 *
 * The cookie holds the identity key that was *presented*. It is the record of
 * a handshake, not a login — it grants nothing that presenting the key again
 * would not, and deleting it is the whole of disconnecting.
 */

const COOKIE = "fr_identity";

/** The account the demo path connects as, and the one a real key adopts into. */
export const DEMO_IDENTITY = ME_ID;

/** A compressed secp256k1 public key: 33 bytes, hex, 02 or 03 prefixed. */
export function isIdentityKey(value: unknown): value is string {
  return typeof value === "string" && /^0[23][0-9a-fA-F]{64}$/.test(value);
}

export function identityCookieName() {
  return COOKIE;
}

/**
 * The account an identity key belongs to.
 *
 * A key that matches a seeded person is that person. A key that does not —
 * which is every real wallet, since these fixtures were written before any of
 * them existed — is *adopted* into the demo account rather than given a fresh
 * empty one.
 *
 * The alternative was tried in the app this pattern comes from and reverted.
 * The entire fixture world belongs to seeded people: a minted account is in no
 * room, knows nobody, has tuned to nothing and hosts nothing, so connecting a
 * real wallet produces a product that looks broken rather than one that looks
 * new.
 *
 * Adoption changes whose data is on screen, never whose key is on a signature:
 * anything the wallet signs, it signs with its own key, and this record is
 * never consulted for that. The UI says which of the two happened.
 */
export function resolveIdentity(
  publicKey: string,
): { person: Person; adopted: boolean } | null {
  if (!isIdentityKey(publicKey)) return null;
  const seeded = people.find((p) => p.publicKey === publicKey);
  if (seeded) return { person: seeded, adopted: false };
  const demo = people.find((p) => p.id === DEMO_IDENTITY);
  return demo ? { person: demo, adopted: true } : null;
}

/**
 * The connected identity, or null.
 *
 * Null is an ordinary answer: browsing the band and listening to a station
 * both work without a wallet, and only the things that put you in a room ask
 * for one.
 */
export async function connectedPerson(): Promise<{
  person: Person;
  adopted: boolean;
} | null> {
  const store = await cookies();
  const key = store.get(COOKIE)?.value;
  if (!key) return null;
  return resolveIdentity(key);
}
