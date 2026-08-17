/**
 * What a wallet identity looks like, on either side of the wire.
 *
 * The server has its own copy of this in `lib/server/identity`, which cannot
 * be imported into a component: that module reads cookies and would drag the
 * whole request context into the browser bundle. The test itself is a regular
 * expression over a public value, so it lives here as well rather than being
 * approximated in the UI with a length check.
 */

import type { Person } from "@/data/schema";

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
  return `${publicKey.slice(0, 6)}\u2026${publicKey.slice(-4)}`;
}

/**
 * A key as a person the UI already knows how to draw.
 *
 * The one derivation, used on both sides. The server has its own entry point
 * in `lib/server/identity` because it also reads cookies, but the arithmetic
 * that turns a key into an `id` lives here and is imported there — because the
 * `id` is the seed for both the marble tile and the animal on it, so two
 * copies of this that drift by one character give somebody a different face in
 * the room than they have in the top bar.
 *
 * Which is exactly what happened. The occupant grid drew its own avatars
 * straight from `boring-avatars`, seeded on the full public key and with its
 * own palette and no creature, so your own portrait in a station was a
 * different colour and a different thing from the one representing you six
 * inches above it. Now everything that has a key goes through here and the
 * app's own `Avatar`.
 */
export function personFromKey(
  publicKey: string,
  name?: string | null,
  photo?: string | null,
): Person {
  const short = truncateKey(publicKey);
  return {
    /* Sliced, and the slice is load-bearing: it is the avatar seed. */
    id: `wallet-${publicKey.slice(0, 16)}`,
    name: name || short,
    handle: name || short,
    ecosystem: "nexus",
    keyIdentity: true,
    publicKey,
    role: "",
    bio: "",
    organization: null,
    city: "",
    photo: photo ?? null,
    avatarColors: colorsFor(publicKey),
  };
}

const PALETTE = [
  "#eab300", "#cc2e1d", "#4353ff", "#16a34a", "#7c3aed",
  "#0891b2", "#db2777", "#f97316", "#0ea5e9", "#65a30d",
];

/** Derived from the key, so the same person is the same colours every time. */
export function colorsFor(publicKey: string): string[] {
  const n = parseInt(publicKey.slice(-6), 16) || 0;
  return [
    PALETTE[n % PALETTE.length],
    PALETTE[(n >> 3) % PALETTE.length],
    PALETTE[(n >> 6) % PALETTE.length],
  ];
}
