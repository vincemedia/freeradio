import "server-only";

import { isIP } from "node:net";
import { lookup } from "node:dns/promises";

/**
 * Fetching from a host somebody else named.
 *
 * Free Radio accepts a handle on any ecosystem, which means a person types a
 * domain and this server makes a request to it. That is server-side request
 * forgery by construction: without a guard, `@alice@169.254.169.254` or
 * `@alice@localhost` turns our own function into a client pointed at whatever
 * the platform exposes on its private network, and the reply comes back through
 * an error message.
 *
 * So every outbound request on behalf of a handle goes through here, and the
 * rules are deliberately blunt:
 *
 *   - HTTPS only. A handle binding read over plaintext is not a binding, since
 *     anybody on the path could write the answer.
 *   - A real, dotted, public hostname. No IP literals, no single labels, none
 *     of the reserved suffixes that mean "inside this network".
 *   - Every address the name resolves to must be public. One private answer
 *     among several is a refusal, not a reason to try the others.
 *   - Redirects are followed by hand, two hops at most, with the destination
 *     guarded again. `redirect: "follow"` would let a public host bounce us to
 *     a private one, which is the standard way this check is defeated.
 *   - A byte cap while reading, so a hostile endpoint cannot answer with an
 *     endless stream and take the function down with it.
 *
 * ## What this does not fix
 *
 * The name is checked and then handed to `fetch`, which resolves it again — so
 * a DNS entry that changes between the two, answering publicly for us and
 * privately for `fetch`, would slip through. Closing that properly means
 * pinning the connection to the address we validated, which Node's `fetch` does
 * not expose. It is written down here rather than left implied, and the residual
 * risk is a request to a private address with the response body only reaching a
 * caller that expects a specific JSON shape.
 */

/** Long enough for a slow registry, short enough not to hold a request open. */
const TIMEOUT_MS = 6000;

/** A manifest and a resolve reply are both small. This is generous for both. */
const MAX_BYTES = 64 * 1024;

/** Enough for `example.com` → `www.example.com` → done. */
const MAX_HOPS = 2;

export class OutboundRefused extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OutboundRefused";
  }
}

const RESERVED_NAMES = new Set(["localhost", "localhost.localdomain"]);

const RESERVED_SUFFIXES = [
  ".localhost",
  ".local",
  ".internal",
  ".intranet",
  ".private",
  ".corp",
  ".home",
  ".lan",
  ".test",
  ".example",
  ".invalid",
  ".onion",
  ".arpa",
];

/**
 * A hostname we are willing to look up, or null.
 *
 * Syntax only — the addresses it resolves to are checked separately, because a
 * perfectly well-formed public name can point anywhere.
 */
export function publicHostname(raw: string): string | null {
  const host = raw.trim().toLowerCase();

  if (!host || host.length > 253) return null;
  /* No scheme, port, path, credentials or whitespace: this must be a bare
     hostname, and anything else means the input was not what we think it is. */
  if (/[^a-z0-9.-]/.test(host)) return null;
  /* An IP literal is never a public ecosystem, and it is how this check is
     most often walked around. */
  if (isIP(host) !== 0) return null;
  if (RESERVED_NAMES.has(host)) return null;
  if (RESERVED_SUFFIXES.some((suffix) => host.endsWith(suffix))) return null;
  /* At least one dot and an alphabetic top-level label. A single label is
     either a reserved name or something only resolvable inside a network. */
  if (!/^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/.test(host)) return null;

  return host;
}

/** Whether an address belongs to a network nobody outside it should reach. */
export function isPrivateAddress(ip: string): boolean {
  const family = isIP(ip);
  if (family === 4) return isPrivateV4(ip);
  if (family === 6) return isPrivateV6(ip);
  /* Unparseable is refused: this may only ever fail closed. */
  return true;
}

function isPrivateV4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return true;
  }
  const [a, b] = parts;
  return (
    a === 0 || // this network
    a === 10 || // private
    a === 127 || // loopback
    (a === 169 && b === 254) || // link-local, and the cloud metadata address
    (a === 172 && b >= 16 && b <= 31) || // private
    (a === 192 && b === 168) || // private
    (a === 100 && b >= 64 && b <= 127) || // carrier-grade NAT
    (a === 192 && b === 0) || // protocol assignments and test nets
    (a === 198 && (b === 18 || b === 19)) || // benchmarking
    a >= 224 // multicast and reserved
  );
}

function isPrivateV6(ip: string): boolean {
  const address = ip.toLowerCase().split("%")[0];

  /* An IPv4 address wearing an IPv6 hat resolves to the same machine, so it is
     judged as the address it actually is. */
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(address);
  if (mapped) return isPrivateV4(mapped[1]);

  if (address === "::" || address === "::1") return true;
  /* fc00::/7 unique-local, fe80::/10 link-local, ff00::/8 multicast. */
  return /^(f[cd]|fe[89ab]|ff)/.test(address);
}

/**
 * Every address a name answers with, all of which must be public.
 *
 * `all: true` matters: a name with one public and one private answer is a
 * standard way to get a check like this to pass and then connect somewhere
 * else, because which address `fetch` picks is not ours to decide.
 */
async function assertPublic(host: string): Promise<void> {
  let addresses: { address: string }[];
  try {
    addresses = await lookup(host, { all: true });
  } catch {
    throw new OutboundRefused(`${host} does not resolve.`);
  }
  if (addresses.length === 0) {
    throw new OutboundRefused(`${host} does not resolve.`);
  }
  if (addresses.some((a) => isPrivateAddress(a.address))) {
    throw new OutboundRefused(`${host} resolves to a private address.`);
  }
}

/**
 * A guarded GET, returning the body as text.
 *
 * Everything about the destination is re-checked on every hop, because the
 * point of the guard is the address actually connected to rather than the one
 * originally asked for.
 */
export async function guardedGet(url: string): Promise<string> {
  let target = url;

  for (let hop = 0; hop <= MAX_HOPS; hop++) {
    const parsed = safeUrl(target);
    await assertPublic(parsed.hostname);

    const response = await fetchOnce(parsed);

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      /* Drain the redirect body so the socket is not left half-read. */
      await response.body?.cancel().catch(() => {});
      if (!location) {
        throw new OutboundRefused(`${parsed.hostname} redirected to nowhere.`);
      }
      target = new URL(location, parsed).toString();
      continue;
    }

    if (!response.ok) {
      await response.body?.cancel().catch(() => {});
      throw new OutboundRefused(
        `${parsed.hostname} answered ${response.status}.`,
      );
    }

    return readCapped(response);
  }

  throw new OutboundRefused("Too many redirects.");
}

/** An HTTPS URL on a public host, or a refusal. */
function safeUrl(raw: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new OutboundRefused("That is not a URL.");
  }
  if (parsed.protocol !== "https:") {
    throw new OutboundRefused("Only HTTPS endpoints are read.");
  }
  if (parsed.username || parsed.password) {
    throw new OutboundRefused("A URL with credentials in it is refused.");
  }
  /* A non-standard port is not itself dangerous, but every legitimate registry
     serves on 443 and allowing arbitrary ports widens this for nothing. */
  if (parsed.port && parsed.port !== "443") {
    throw new OutboundRefused("Only port 443 is read.");
  }
  if (!publicHostname(parsed.hostname)) {
    throw new OutboundRefused(`${parsed.hostname} is not a public host.`);
  }
  return parsed;
}

async function fetchOnce(url: URL): Promise<Response> {
  const abort = AbortSignal.timeout(TIMEOUT_MS);
  try {
    return await fetch(url, {
      method: "GET",
      /* Followed by hand instead, so each destination is guarded. */
      redirect: "manual",
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: abort,
    });
  } catch (error) {
    if ((error as Error)?.name === "TimeoutError") {
      throw new OutboundRefused(`${url.hostname} did not answer in time.`);
    }
    throw new OutboundRefused(`${url.hostname} could not be reached.`);
  }
}

/**
 * The body, up to a limit.
 *
 * Streamed rather than buffered whole, because `text()` on an endless response
 * is a way to exhaust the function's memory from outside.
 */
async function readCapped(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return "";

  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) {
        throw new OutboundRefused("That reply is too large to be a handle.");
      }
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => {});
  }

  const joined = new Uint8Array(size);
  let at = 0;
  for (const chunk of chunks) {
    joined.set(chunk, at);
    at += chunk.byteLength;
  }
  return new TextDecoder().decode(joined);
}
