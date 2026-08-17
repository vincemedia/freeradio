/**
 * BRC-169 handles: the grammar, and how one is written down.
 *
 * A handle is an address, not a name. `@alice@handcash.io` is issued by an
 * ecosystem — a domain that is the sole authority for handles within it — and
 * bound to an identity key by a certificate that ecosystem signs. It is
 * therefore the opposite of the username this app has always had: that one is a
 * label somebody typed, owned by nobody, checked against nothing.
 *
 * Which is why a handle replaces it outright rather than sitting beside it. Two
 * display names for one person is a question the UI would have to answer in
 * every list, and the attested one wins every time it is asked.
 *
 * ## Why the ecosystem is always shown
 *
 * BRC-169 is explicit that handles are unique *within* an ecosystem and that
 * global uniqueness is neither required nor assumed. `@alice@handcash.io` and
 * `@alice@somewhere.else` are two different people, and this app accepts any
 * domain a person names — so writing `@alice` alone would be a display that
 * cannot be trusted to mean anybody in particular. The domain is not decoration
 * here; it is the half that makes the other half an identity.
 *
 * ## The tag is parsed and then dropped
 *
 * The grammar allows `@alice+work@handcash.io`. Per the spec a tag is an
 * organisational suffix that needs no registration and does not affect
 * uniqueness — the handle resolves the same with or without it. So it is
 * accepted on input and discarded, rather than becoming a second way to write
 * one person's name in a room.
 */

/**
 * Where a bare handle is assumed to live.
 *
 * Somebody typing `$alice` almost always means the ecosystem they got the
 * handle from, and today that is HandCash for effectively everybody. Anyone on
 * another registry writes the domain, which is the form the app displays back
 * to them.
 */
export const DEFAULT_ECOSYSTEM_DOMAIN = "handcash.io";

/**
 * Short names for ecosystems, per BRC-169's `aliases`.
 *
 * A convenience on input only. Nothing is ever displayed as an alias, because
 * an alias is not what a registry answers for.
 */
const ALIASES: Record<string, string> = {
  handcash: "handcash.io",
};

export interface HandleName {
  /** normalised, lowercase, without sigil or tag */
  handle: string;
  /** the ecosystem's domain, lowercase */
  domain: string;
}

/** 1–64 characters, alphanumeric with internal dots, underscores and dashes. */
const HANDLE = "[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?";

/** A tag, accepted so the rest of the address parses, then thrown away. */
const TAG = "(?:\\+[a-z0-9][a-z0-9._-]{0,31})?";

/** A domain: at least one dot and an alphabetic top level. */
const DOMAIN = "[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*\\.[a-z]{2,}";

/** `@alice@handcash.io`, `$alice@handcash.io`, `alice@handcash.io` — sigil optional. */
const QUALIFIED = new RegExp(`^[$@]?(${HANDLE})${TAG}@(${DOMAIN}|[a-z0-9-]+)$`, "i");

/** `@alice` or `$alice` — a sigil makes the ecosystem optional. */
const SIGILLED = new RegExp(`^[$@](${HANDLE})${TAG}$`, "i");

/**
 * `alice` — no sigil, no domain.
 *
 * Must begin with a letter, which is the whole reason this is a separate
 * pattern: it keeps an identity key (`02…`, `03…`) and a P2PKH address (`1…`,
 * `3…`) from being read as somebody's handle. HandCash's own client draws the
 * line in the same place.
 */
const BARE = /^([a-z][a-z0-9._-]{0,62}[a-z0-9]|[a-z])(?:\+[a-z0-9][a-z0-9._-]{0,31})?$/i;

/**
 * A handle from whatever somebody typed, or null.
 *
 * Accepts HandCash's `$` and BRC-169's `@`, qualified or not, plus the
 * paymail-shaped `alice@domain` that people paste out of habit. Null is an
 * ordinary answer: most strings are not handles.
 */
export function parseHandle(raw: string): HandleName | null {
  const input = raw.trim();
  if (!input || input.length > 200) return null;

  const qualified = QUALIFIED.exec(input);
  if (qualified) {
    const domain = resolveAlias(qualified[2].toLowerCase());
    return domain ? { handle: qualified[1].toLowerCase(), domain } : null;
  }

  const sigilled = SIGILLED.exec(input);
  if (sigilled) {
    return {
      handle: sigilled[1].toLowerCase(),
      domain: DEFAULT_ECOSYSTEM_DOMAIN,
    };
  }

  const bare = BARE.exec(input);
  if (bare) {
    return { handle: bare[1].toLowerCase(), domain: DEFAULT_ECOSYSTEM_DOMAIN };
  }

  return null;
}

/**
 * An alias to the domain it stands for, or the domain unchanged.
 *
 * Anything that is neither a known alias nor a dotted domain is refused rather
 * than guessed at: a single label with no dot cannot be fetched from, so
 * treating it as an ecosystem would only produce a confusing failure later.
 */
function resolveAlias(value: string): string | null {
  if (ALIASES[value]) return ALIASES[value];
  return value.includes(".") ? value : null;
}

/** `@alice@handcash.io` — the one way this app writes a handle down. */
export function formatHandle({ handle, domain }: HandleName): string {
  return `@${handle}@${domain}`;
}

/**
 * A handle back out of its displayed form.
 *
 * The formatted string is what travels in the session cookie and what the UI
 * holds, so reading it back has to be exact rather than forgiving — this is not
 * the place to accept what somebody typed.
 */
export function parseFormatted(value: string): HandleName | null {
  const match = new RegExp(`^@(${HANDLE})@(${DOMAIN})$`).exec(value);
  return match ? { handle: match[1], domain: match[2] } : null;
}

/** Whether a string is a handle in the form this app stores and displays. */
export function isFormattedHandle(value: unknown): value is string {
  return typeof value === "string" && parseFormatted(value) !== null;
}

/**
 * The BRC-52 certificate type for a handle binding, from BRC-169.
 *
 * A wallet holding one of these is holding proof of its own handle, which is
 * the only way an application can learn it without asking.
 */
export const HANDLE_CERTIFICATE_TYPE =
  "XgCFdUfxEcI+3xtDjsIuSAjMl5EwzCUjsQc45ds1lC8=";
