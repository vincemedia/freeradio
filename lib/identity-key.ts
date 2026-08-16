/**
 * What a wallet identity looks like, on either side of the wire.
 *
 * The server has its own copy of this in `lib/server/identity`, which cannot
 * be imported into a component: that module reads cookies and would drag the
 * whole request context into the browser bundle. The test itself is a regular
 * expression over a public value, so it lives here as well rather than being
 * approximated in the UI with a length check.
 */

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
