/**
 * The Free Radio schema.
 *
 * Structured as a future database rather than as component props: every table
 * has stable ids and refers to others by id, never by nesting. Reads go
 * through `app/api/*` route handlers, so swapping these fixtures for a real
 * database means changing the route bodies and nothing in the UI.
 *
 * Identity, ecosystems and gates are deliberately the same shapes the Nexus
 * app already uses. A handle that means `@johngalt@twetch` there has to mean the
 * same thing here, or the two apps are describing different people.
 */

import type { BedId } from "./beds";

/* ------------------------------------------------------------------ people */

export type EcosystemId =
  | "nexus"
  | "treechat"
  | "twetch"
  | "yours"
  | "handcash"
  | "commonsource"
  | "mycelia";

/**
 * A wallet authority, per BRC-169.
 *
 * The ecosystem is the sole authority for handles within it: `@kuro@treechat`
 * and `@kuro@twetch` are different people. `alias` is the dotless short form
 * shown in the UI; `domain` is the fully-qualified authority, shown wherever
 * only an unverified alias is known.
 */
export interface Ecosystem {
  id: EcosystemId;
  name: string;
  description: string;
  alias: string;
  domain: string;
  icon: string;
  /** the ecosystem the user is signed into; its handles need no suffix */
  local?: boolean;
  /** ecosystems that number their accounts, where the handle is a number */
  numericHandles?: boolean;
  /** a bare glyph needs a plate behind it to sit on the panel */
  iconPlate?: string;
  /**
   * The band this ecosystem's Co-Channels are tuned on, in MHz.
   *
   * Each ecosystem owns a disjoint band, which is what makes a frequency a
   * usable address: `98.7` is unambiguous once you know the band, and the two
   * together are globally unique without a central registry to ask.
   */
  band: { min: number; max: number };
}

export interface Person {
  id: string;
  name: string;
  /** without `@` or suffix; on numeric ecosystems this is the account number */
  handle: string;
  /** named form of a numeric handle; both address the same identity */
  username?: string;
  ecosystem: EcosystemId;
  role: string;
  bio: string;
  organization: string | null;
  city: string;
  /** avatar path; `null` falls back to the generated marble tile */
  photo: string | null;
  avatarColors: string[];
  registeredAt?: string;
  expertise?: string[];
  /** peer attestations of the handle-to-key binding, per BRC-169 section 10 */
  attestations?: number;
  /** their BRC-100 identity key, for the connected user */
  publicKey?: string;
  /**
   * True when this person is a wallet rather than a row.
   *
   * Their handle is a username they chose or their own key truncated, and it
   * has no ecosystem behind it — nothing has told us which authority the key
   * belongs to, and guessing would put a borrowed suffix on somebody's
   * address. The UI renders them without one.
   */
  keyIdentity?: boolean;
}

/* ------------------------------------------------------------------- gates */

/**
 * Who may join a gated Co-Channel.
 *
 * Each gate is independent and additive: a candidate must pass every gate
 * that is `on`. A gate that is `on` with an empty list is configuration in
 * progress and admits nobody, rather than everybody. Kept structurally
 * identical to the Nexus group-chat gates so a room's terms read the same in
 * both apps.
 */
export interface Gates {
  /** must hold one of these tokens, at `minimums` if the token is fungible */
  token: {
    on: boolean;
    ids: string[];
    minimums?: Record<string, number>;
  };
  /**
   * Must hold value locked out of their own reach.
   *
   * A holding can be borrowed for the moment of the check; a lock cannot.
   * `minBlocks` is rolling rather than a fixed height, so the requirement is
   * re-earned instead of expiring for everyone on the same day. Nobody takes
   * custody: the lock is to the holder's own key.
   */
  timelock: {
    on: boolean;
    assetId?: string;
    amount?: number;
    minBlocks?: number;
  };
  /** must be vouched for by one of these handles */
  vouch: { on: boolean; entityIds: string[] };
  /** anyone renounced by one of these handles cannot join */
  renounce: { on: boolean; entityIds: string[] };
}

export type GateKind = "open" | "token" | "timelock" | "vouch" | "renounce";

export interface Token {
  id: string;
  symbol: string;
  name: string;
  ecosystem: EcosystemId | null;
  icon?: string;
  color: string;
  decimals: number;
  base?: boolean;
  protocol: string;
  blurb: string;
  usdPerUnit: number;
}

/* ------------------------------------------------------------- co-channels */

/**
 * A live voice room.
 *
 * A Co-Channel exists only while somebody is in it. When the last occupant
 * leaves it is deleted and its frequency returns to the pool, which is why
 * frequency is an attribute here rather than a table of allocations: there is
 * nothing to keep once the room is gone.
 */
/**
 * What a station is.
 *
 * `live` is a real voice room on Cloudflare RealtimeKit: joining it opens a
 * microphone and the people in it are whoever actually joined.
 *
 * `recorded` is a broadcast that already happened. There is nobody in it and
 * nothing to join — you play it. Its occupants are the people who were there
 * at the time, which is history rather than a claim about now.
 *
 * The distinction is the honest version of what this prototype used to do,
 * which was to present invented occupancy as if it were live.
 */
export type CoChannelKind = "live" | "recorded";

export interface CoChannel {
  id: string;
  kind: CoChannelKind;
  /** unique within its ecosystem, case-insensitively */
  title: string;
  /**
   * MHz, one decimal, unique within the ecosystem's band.
   *
   * Stored as a number so the scale can position it, formatted to one decimal
   * everywhere it is shown, including at `.0`.
   */
  frequency: number;
  ecosystem: EcosystemId;
  /**
   * Who runs it, or `""` when nobody does yet.
   *
   * A station somebody opened has a host from the moment it exists. An open
   * station seeded by the app has none: naming one would put somebody's face
   * and handle on a room they have never been in, which is the kind of small
   * lie that makes everything next to it suspect. So it is empty, and the
   * first person to walk into an empty one claims it.
   */
  hostId: string;
  /** ISO; drives the running time in the header */
  startedAt: string;
  /**
   * What plays under the room while nobody is talking.
   *
   * A property of the station rather than of the listener: the host chose it,
   * and everybody in the room hears the same thing, the way they would on a
   * real station. Absent on the seeded rooms, which start silent and can be
   * given one by whoever claims them.
   */
  bed?: BedId;
  /** present only when at least one gate is `on` */
  gates?: Gates;
  /** whether the host has recording switched on right now */
  recording: boolean;
  /**
   * Whether a recorded station has its audio.
   *
   * Three of them do, and those are the ones with a real transcript behind
   * them. The rest are broadcasts whose recording was never kept, which the
   * page says rather than pretending the file is loading.
   *
   * Meaningless on a live station, where the audio is the room itself.
   */
  hasAudio: boolean;
  /** short line under the title in browse; the host's own description */
  topic?: string;
}

export type OccupantRole = "host" | "speaker";

/**
 * Somebody currently in a Co-Channel.
 *
 * The join table, not a nested list, because a person can be in exactly one
 * Co-Channel at a time and that constraint belongs to the relationship rather
 * than to either side of it.
 *
 * There is no listener role and no anonymous occupancy: everybody in the room
 * is visible as `@handle@ecosystem` with their avatar, which is the main way
 * this differs from Twitter Spaces.
 */
export interface Occupant {
  id: string;
  coChannelId: string;
  personId: string;
  role: OccupantRole;
  /** shown for every occupant at all times, never only on hover */
  muted: boolean;
  joinedAt: string;
}

/** A link somebody pinned above the occupant grid. */
export interface NestLink {
  id: string;
  coChannelId: string;
  postedById: string;
  url: string;
  title: string;
  /** the site's own name, shown adjacent to the title rather than floating */
  site: string;
  postedAt: string;
}

export interface TranscriptLine {
  id: string;
  coChannelId: string;
  personId: string;
  text: string;
  at: string;
}

/**
 * A Co-Channel that was recorded and outlived it.
 *
 * Recordings are the one thing that survives a Co-Channel closing, so they
 * carry their own copy of the title and frequency: the room they came from no
 * longer exists to be joined, and its frequency has already been reissued.
 */
export interface Recording {
  id: string;
  title: string;
  frequency: number;
  ecosystem: EcosystemId;
  hostId: string;
  recordedAt: string;
  /** seconds */
  duration: number;
  occupantIds: string[];
  plays: number;
  /**
   * The file, where one exists.
   *
   * Three of these are real recordings and play; the rest are fixture rows
   * with a duration and no sound behind it. The UI reads this rather than
   * assuming, so a play control is only offered where pressing it does
   * something.
   */
  audioSrc?: string;
}

/* -------------------------------------------------------------- view types */

/**
 * A Co-Channel with the joins the UI needs resolved.
 *
 * Assembled by the route handlers, never by components. Components receive
 * this shape and do no lookups of their own, so the day the fixtures become
 * queries there is nothing in the UI to rewrite.
 */
export interface CoChannelView extends CoChannel {
  /** null while an open station is unclaimed */
  host: Person | null;
  occupants: (Occupant & { person: Person })[];
  /**
   * Who is in a live room right now, read from the meeting.
   *
   * Separate from `occupants`, which is the seeded table and describes a
   * recorded broadcast's past. A live room has no rows there — its people are
   * in RealtimeKit — so anything drawing faces for one reads this instead.
   */
  liveOccupants?: { id: string; name: string; micOpen: boolean }[];
  occupantCount: number;
  nest: (NestLink & { postedBy: Person })[];
  /** the single gate to show as a badge, when several are on */
  primaryGate: GateKind;
}

export interface TranscriptLineView extends TranscriptLine {
  person: Person;
}
