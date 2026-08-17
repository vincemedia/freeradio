import "server-only";

import { isIdentityKey } from "@/lib/identity-key";
import { formatHandle, type HandleName } from "@/lib/handle";
import { guardedGet, OutboundRefused, publicHostname } from "@/lib/server/outbound";

/**
 * Resolving a BRC-169 handle to the key it belongs to.
 *
 * ## Why this runs on the server and not in the browser
 *
 * The answer decides what name everybody in a room sees, so the check has to
 * happen where the client cannot reach it. A browser that resolved its own
 * handle and posted the result would be posting a claim, and this app already
 * learned once — expensively — what happens when a public value is believed
 * because somebody sent it: `POST /api/session` used to accept any identity key
 * and hand back a host token for it. A handle is the same shape of mistake
 * waiting to be made, so the client sends the string somebody typed and nothing
 * else, and the server does the resolving.
 *
 * ## The direction the standard runs
 *
 * BRC-169 resolves handle → identity key, and defines no reverse lookup. There
 * is no way to ask "what is this key called"; there is only "who does this name
 * belong to", and the answer is a key we can compare against the one the wallet
 * already proved. That inversion is the whole design of the claim flow: the
 * person names their handle, and the registry — not the person — says whose it
 * is.
 *
 * ## Two ways to find a registry
 *
 * The spec says an ecosystem publishes `metanet.handles.resolve` in the manifest
 * at its own domain, and for a domain that does that, this reads it and follows
 * it. HandCash does not, yet: `handcash.io/manifest.json` is an ordinary web-app
 * manifest, and the registry actually lives on a separate host that their own
 * desktop wallet has hard-coded. So known ecosystems get an entry in the table
 * below, and everybody else gets manifest discovery. The table is the exception;
 * discovery is the rule.
 */

/**
 * Ecosystems whose registry cannot be discovered from their own domain.
 *
 * One entry, and it should be deleted the day `handcash.io` publishes a metanet
 * manifest. Environment-overridable because the registry is somebody else's
 * infrastructure and its address is not ours to freeze into a build.
 */
const KNOWN_REGISTRIES: Record<string, string> = {
  "handcash.io":
    process.env.METANET_HANDLES_BASE_URL ??
    "https://brc-cloud.bcryderman.workers.dev",
};

/** How long a discovered registry address stands. Manifests barely move. */
const MANIFEST_TTL_MS = 5 * 60 * 1000;

const registryCache = new Map<string, { at: number; base: string }>();

export class HandleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HandleError";
  }
}

export interface ResolvedHandle extends HandleName {
  /** the key the registry says this handle belongs to */
  identityKey: string;
  /** the ecosystem's certifier key, when it publishes one */
  certifier: string | null;
}

/**
 * How a URL is read, so the reading can be substituted in a test.
 *
 * The one impure thing in this module, and the reason it is a parameter: there
 * is no registered handle on any live registry to resolve — HandCash's is
 * deployed and empty, and the `lkup.net` in the spec does not exist — so the
 * only way to prove that a correct binding is accepted and a wrong one refused
 * is to serve both and see. Defaults to the guarded fetch everywhere in the app;
 * nothing in production passes this.
 */
export type Fetcher = (url: string) => Promise<string>;

/**
 * Who a handle belongs to, according to its ecosystem.
 *
 * Throws `HandleError` with something worth showing somebody for every failure,
 * including the ones that are the registry's fault rather than theirs. A person
 * who typed their own handle correctly and got "handcash.io did not answer in
 * time" is owed that sentence rather than "invalid handle".
 */
export async function resolveHandle(
  name: HandleName,
  read: Fetcher = guardedGet,
): Promise<ResolvedHandle> {
  const base = await registryFor(name.domain, read);
  const url = `${base}/.well-known/metanet-handles/resolve?handle=${encodeURIComponent(name.handle)}`;

  let body: string;
  try {
    body = await read(url);
  } catch (error) {
    if (error instanceof OutboundRefused) {
      /* A 404 from a registry is the ordinary "no such handle", and it arrives
         here as a refusal because the fetch was not ok. Told apart by the code
         the registry sent rather than by guessing. */
      if (/answered 404/.test(error.message)) {
        throw new HandleError(
          `${formatHandle(name)} is not registered on ${name.domain}.`,
        );
      }
      throw new HandleError(error.message);
    }
    throw new HandleError(`${name.domain} could not be reached.`);
  }

  const data = parseJson(body);

  /* Revocation is checked before the key, because a revoked binding that still
     names the right key is still not a handle anybody may wear. */
  if (data.revoked === true) {
    throw new HandleError(`${formatHandle(name)} has been revoked.`);
  }

  if (!isIdentityKey(data.identityKey)) {
    throw new HandleError(`${name.domain} did not answer with an identity key.`);
  }

  /* The registry's own idea of the handle and domain wins over the input: a host
     may normalise, and the binding is to what it says it signed. Anything wildly
     different from what was asked for is a refusal rather than a silent swap. */
  const handle = typeof data.handle === "string" ? data.handle.toLowerCase() : "";
  if (handle !== name.handle) {
    throw new HandleError(
      `${name.domain} answered about ${handle || "nothing"} rather than ${name.handle}.`,
    );
  }

  return {
    handle: name.handle,
    domain: name.domain,
    identityKey: data.identityKey.toLowerCase(),
    certifier: isIdentityKey(data.certifier) ? data.certifier : certifierIn(data),
  };
}

interface ResolveReply {
  handle?: unknown;
  domain?: unknown;
  identityKey?: unknown;
  certifier?: unknown;
  certificate?: { certifier?: unknown };
  revoked?: unknown;
}

function parseJson(body: string): ResolveReply {
  try {
    const parsed = JSON.parse(body) as unknown;
    if (!parsed || typeof parsed !== "object") throw new Error("not an object");
    return parsed as ResolveReply;
  } catch {
    throw new HandleError("That registry did not answer with JSON.");
  }
}

/** The certifier inside the BRC-52 certificate, when the reply carries one. */
function certifierIn(data: ResolveReply): string | null {
  const key = data.certificate?.certifier;
  return isIdentityKey(key) ? key : null;
}

/**
 * Where a domain's resolve endpoint lives.
 *
 * The known table first, then the manifest the spec describes. Cached, because
 * a handle is re-checked on every connect and a manifest is not news.
 */
async function registryFor(domain: string, read: Fetcher): Promise<string> {
  const known = KNOWN_REGISTRIES[domain];
  if (known) return known.replace(/\/+$/, "");

  const cached = registryCache.get(domain);
  if (cached && Date.now() - cached.at < MANIFEST_TTL_MS) return cached.base;

  if (!publicHostname(domain)) {
    throw new HandleError(`${domain} is not an ecosystem this can reach.`);
  }

  let body: string;
  try {
    body = await read(`https://${domain}/manifest.json`);
  } catch (error) {
    throw new HandleError(
      error instanceof OutboundRefused
        ? error.message
        : `${domain} could not be reached.`,
    );
  }

  let manifest: {
    metanet?: { handles?: { resolve?: unknown } };
  };
  try {
    manifest = JSON.parse(body);
  } catch {
    throw new HandleError(`${domain} does not publish a metanet manifest.`);
  }

  const resolve = manifest.metanet?.handles?.resolve;
  if (typeof resolve !== "string" || !resolve) {
    throw new HandleError(`${domain} does not publish a handle registry.`);
  }

  /* The endpoint may sit on another host — HandCash's does — so the base is
     taken from the URL the manifest gives rather than assumed to be the domain.
     It is guarded on use like any other outbound address. */
  let base: string;
  try {
    const url = new URL(resolve);
    base = `${url.origin}${url.pathname.replace(/\/\.well-known\/metanet-handles\/resolve\/?$/, "")}`.replace(
      /\/+$/,
      "",
    );
  } catch {
    throw new HandleError(`${domain} published a registry address we cannot read.`);
  }

  registryCache.set(domain, { at: Date.now(), base });
  return base;
}

/**
 * Whether a handle belongs to a particular key, right now.
 *
 * The one question the app actually asks. Separated from `resolveHandle` so the
 * two callers — claiming, and re-checking on connect — cannot drift apart on
 * what counts as a match.
 */
export async function handleBelongsTo(
  name: HandleName,
  publicKey: string,
  read: Fetcher = guardedGet,
): Promise<ResolvedHandle> {
  const resolved = await resolveHandle(name, read);
  if (resolved.identityKey !== publicKey.toLowerCase()) {
    throw new HandleError(
      `${formatHandle(name)} belongs to a different wallet.`,
    );
  }
  return resolved;
}
