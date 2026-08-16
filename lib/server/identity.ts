import "server-only";

import { cookies } from "next/headers";
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

export function identityCookieName() {
  return COOKIE;
}

export function usernameCookieName() {
  return NAME_COOKIE;
}

/** A compressed secp256k1 public key: 33 bytes, hex, 02 or 03 prefixed. */
export function isIdentityKey(value: unknown): value is string {
  return typeof value === "string" && /^0[23][0-9a-fA-F]{64}$/.test(value);
}

/**
 * A key, shortened enough to read and long enough to be one person.
 *
 * Both ends, because both ends are what distinguish two keys — the middle of
 * a hex string tells you nothing at a glance.
 */
export function truncateKey(publicKey: string): string {
  return `${publicKey.slice(0, 6)}…${publicKey.slice(-4)}`;
}

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
export function personFromKey(publicKey: string, username: string | null): Person {
  const short = truncateKey(publicKey);
  return {
    id: `wallet-${publicKey.slice(0, 16)}`,
    name: username ?? short,
    handle: username ?? short,
    /* The key is its own authority. There is no ecosystem to claim without
       asking the wallet which one it belongs to, and guessing would put a
       borrowed suffix on somebody's address. */
    ecosystem: "nexus",
    keyIdentity: true,
    publicKey,
    role: "",
    bio: "",
    organization: null,
    city: "",
    photo: null,
    /* Derived from the key, so the same person is the same colours every
       time without storing anything. */
    avatarColors: colorsFor(publicKey),
  };
}

const PALETTE = [
  "#eab300", "#cc2e1d", "#4353ff", "#16a34a", "#7c3aed",
  "#0891b2", "#db2777", "#f97316", "#0ea5e9", "#65a30d",
];

function colorsFor(publicKey: string): string[] {
  const n = parseInt(publicKey.slice(-6), 16) || 0;
  return [
    PALETTE[n % PALETTE.length],
    PALETTE[(n >> 3) % PALETTE.length],
    PALETTE[(n >> 6) % PALETTE.length],
  ];
}

export interface Connected {
  person: Person;
  publicKey: string;
  username: string | null;
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
  return { person: personFromKey(key, username), publicKey: key, username };
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
