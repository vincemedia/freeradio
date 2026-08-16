/**
 * The server owns the state.
 *
 * An in-memory store seeded from the fixtures, mutated by the route handlers.
 * It has no persistence, no scaling and no security, and that is fine: what it
 * preserves is the architecture. The browser asks the server what exists and
 * tells the server what changed, so replacing this file with a real database
 * touches nothing in the UI.
 *
 * The rules that live here rather than in a component, because they are facts
 * about the system and not about a screen:
 *
 *   1. A Co-Channel with nobody in it does not exist. Its frequency returns
 *      to the pool.
 *   2. A frequency and a title are each unique within one ecosystem, and only
 *      within one ecosystem.
 *
 * Nobody is signed in, so there is nothing here that joins, mutes, pins or
 * records. Everything below is read, plus the one write that keeps a live
 * room talking.
 */
import {
  coChannels as seedChannels,
  nestLinks as seedNest,
  occupants as seedOccupants,
} from "@/data/co-channels";
import { BAND, FREQUENCY_STEP } from "@/data/ecosystems";
import { people } from "@/data/people";
import { heldFrequencies } from "@/data/pricing";
import { recordings as seedRecordings } from "@/data/recordings";
import { SCRIPTS, lineTiming, seedTranscript } from "@/data/transcripts";
import type { HeldFrequency } from "@/data/pricing";
import type {
  CoChannel,
  CoChannelView,
  EcosystemId,
  NestLink,
  Occupant,
  Person,
  Recording,
  TranscriptLine,
  TranscriptLineView,
} from "@/data/schema";
import { primaryGate } from "@/lib/gates";

/* Next dev reloads modules; hanging the state off globalThis keeps a demo
   from resetting itself every time a file is saved. */
interface State {
  channels: CoChannel[];
  occupants: Occupant[];
  nest: NestLink[];
  transcripts: TranscriptLine[];
  recordings: Recording[];
  holds: HeldFrequency[];
  seq: number;
}

/**
 * Bump when the shape of `State` changes.
 *
 * The cache below survives a dev reload on purpose, which means it also
 * survives adding a field: the old object stays, the new field is `undefined`,
 * and the first thing to read it throws. Versioning the key makes a shape
 * change reseed instead of half-applying.
 */
const STATE_VERSION = 5;

const globalRef = globalThis as unknown as {
  __freeRadio?: { version: number; state: State };
};

function seed(): State {
  return {
    channels: [...seedChannels],
    occupants: [...seedOccupants],
    nest: [...seedNest],
    transcripts: seedChannels.flatMap((c) => seedTranscript(c.id, c.startedAt)),
    recordings: [...seedRecordings],
    holds: [...heldFrequencies],
    seq: 0,
  };
}

if (globalRef.__freeRadio?.version !== STATE_VERSION) {
  globalRef.__freeRadio = { version: STATE_VERSION, state: seed() };
}
const state: State = globalRef.__freeRadio.state;

const nextId = (prefix: string) => `${prefix}-${++state.seq}-${Date.now()}`;

/* ------------------------------------------------------------------ people */

const peopleById = new Map(people.map((p) => [p.id, p]));

export function getPerson(id: string): Person | undefined {
  return peopleById.get(id);
}

export function listPeople(): Person[] {
  return people;
}

/* ------------------------------------------------------------ co-channels */

function occupantsOf(coChannelId: string) {
  return state.occupants
    .filter((o) => o.coChannelId === coChannelId)
    .map((o) => ({ ...o, person: peopleById.get(o.personId)! }))
    .filter((o) => o.person)
    .sort((a, b) => {
      /* Host first, then join order. The host is the one fact about a room
         you need before you know anything else about it. */
      if (a.role !== b.role) return a.role === "host" ? -1 : 1;
      return a.joinedAt.localeCompare(b.joinedAt);
    });
}

export function toView(channel: CoChannel): CoChannelView {
  const occ = occupantsOf(channel.id);
  return {
    ...channel,
    host: peopleById.get(channel.hostId)!,
    occupants: occ,
    occupantCount: occ.length,
    contactCount: occ.filter((o) => o.person.isContact).length,
    nest: state.nest
      .filter((n) => n.coChannelId === channel.id)
      .map((n) => ({ ...n, postedBy: peopleById.get(n.postedById)! }))
      .sort((a, b) => b.postedAt.localeCompare(a.postedAt)),
    primaryGate: primaryGate(channel.gates),
  };
}

export interface ListOptions {
  ecosystem?: EcosystemId;
  /** matches title, topic, host handle, or an exact frequency */
  q?: string;
}

export function listCoChannels(opts: ListOptions = {}): CoChannelView[] {
  let rows = state.channels.map(toView);

  if (opts.ecosystem) rows = rows.filter((c) => c.ecosystem === opts.ecosystem);

  const q = opts.q?.trim().toLowerCase();
  if (q) {
    rows = rows.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        (c.topic ?? "").toLowerCase().includes(q) ||
        c.host.handle.toLowerCase().includes(q) ||
        c.frequency.toFixed(1) === q ||
        c.occupants.some((o) => o.person.handle.toLowerCase().includes(q)),
    );
  }

  /* Busiest first. A room with people in it is more useful than a newer one
     with nobody, and "newest" would put every empty room at the top. */
  return rows.sort(
    (a, b) => b.occupantCount - a.occupantCount || a.frequency - b.frequency,
  );
}

export function getCoChannel(id: string): CoChannelView | undefined {
  const row = state.channels.find((c) => c.id === id);
  return row ? toView(row) : undefined;
}

/* --------------------------------------------------------------- the band */

/**
 * Every occupied position on one band, for the tuning scale.
 *
 * Returned for the whole band rather than per-station so the scale can be
 * drawn in one pass, and so the gaps are as legible as the stations. The gaps
 * are what make it a scanner rather than a list.
 */
export function bandOccupancy(ecosystem: EcosystemId) {
  return listCoChannels({ ecosystem }).map((c) => ({
    id: c.id,
    frequency: c.frequency,
    title: c.title,
    occupantCount: c.occupantCount,
    contactCount: c.contactCount,
    primaryGate: c.primaryGate,
    recording: c.recording,
  }));
}

/**
 * A hold that has not lapsed.
 *
 * Checked by date rather than removed on expiry, so a demo left running does
 * not need a sweeper to stay correct.
 */
function activeHold(ecosystem: EcosystemId, frequency: number) {
  const now = Date.now();
  return state.holds.find(
    (h) =>
      h.ecosystem === ecosystem &&
      h.frequency.toFixed(1) === frequency.toFixed(1) &&
      new Date(h.until).getTime() > now,
  );
}

/** Every live hold on a band, so the scale can show reserved gaps. */
export function listHolds(ecosystem: EcosystemId) {
  const now = Date.now();
  return state.holds
    .filter((h) => h.ecosystem === ecosystem && new Date(h.until).getTime() > now)
    .map((h) => ({ ...h, holder: peopleById.get(h.holderId) }));
}

/** The lowest free tenth on a band, for a new room that did not pick one. */
export function nextFreeFrequency(ecosystem: EcosystemId): number | null {
  for (let f = BAND.min; f <= BAND.max + 1e-9; f += FREQUENCY_STEP) {
    const key = Number(f.toFixed(1));
    if (isFrequencyFree(ecosystem, key)) return key;
  }
  return null;
}

/**
 * Whether a frequency can be taken.
 *
 * Free means nothing is on air there and nobody is paying to keep it. There
 * is no signed-in holder to make an exception for any more, so a hold blocks
 * the frequency for everyone who is not its owner — which, from here, is
 * everyone.
 */
export function isFrequencyFree(
  ecosystem: EcosystemId,
  frequency: number,
): boolean {
  const onAir = state.channels.some(
    (c) =>
      c.ecosystem === ecosystem &&
      c.frequency.toFixed(1) === frequency.toFixed(1),
  );
  if (onAir) return false;
  return !activeHold(ecosystem, frequency);
}

export function isTitleFree(ecosystem: EcosystemId, title: string): boolean {
  const t = title.trim().toLowerCase();
  return !state.channels.some(
    (c) => c.ecosystem === ecosystem && c.title.trim().toLowerCase() === t,
  );
}

/* -------------------------------------------------------------- occupancy */

/**
 * The room somebody is in, if any.
 *
 * Still needed with nobody signed in: it answers "where is this person" for
 * a hover card, which is the whole reason a handle is worth clicking.
 */
export function currentCoChannelId(personId: string): string | null {
  return state.occupants.find((o) => o.personId === personId)?.coChannelId ?? null;
}

/* Nothing creates a Co-Channel from here any more. Starting a station makes
   you its host, and there is no identity in this build to be one. */

/* ----------------------------------------------------------- transcripts */

export function listTranscript(coChannelId: string): TranscriptLineView[] {
  return state.transcripts
    .filter((t) => t.coChannelId === coChannelId)
    .map((t) => ({ ...t, person: peopleById.get(t.personId)! }))
    .filter((t) => t.person)
    .sort((a, b) => a.at.localeCompare(b.at));
}

/**
 * Advance a room's script by one line.
 *
 * The line that comes back is both what the transcript gains and who the
 * speaking ring should light up, so the two can never drift apart. Loops when
 * the script runs out: a room that falls permanently silent reads as broken.
 *
 * The timing comes back with it, because how long a turn lasts is a property
 * of the turn and not of the client's timer. On the transcribed stations it
 * is the real one, `audioAtMs` included, which is what lets the room seek its
 * recording to the line it is about to show.
 */
export function speakNext(coChannelId: string): {
  personId: string;
  line: TranscriptLineView;
  holdMs: number;
  gapMs: number;
  audioAtMs?: number;
} | null {
  const script = SCRIPTS[coChannelId];
  if (!script || script.length === 0) return null;

  const said = state.transcripts.filter((t) => t.coChannelId === coChannelId);
  const index = said.length % script.length;
  const [personId, text] = script[index];

  /* Only somebody actually in the room can speak in it. If the scripted
     speaker has left, hand the line to whoever is unmuted instead. */
  const here = state.occupants.filter((o) => o.coChannelId === coChannelId);
  if (here.length === 0) return null;
  const speaker = here.some((o) => o.personId === personId)
    ? personId
    : (here.find((o) => !o.muted) ?? here[0]).personId;

  const row: TranscriptLine = {
    id: nextId("tr"),
    coChannelId,
    personId: speaker,
    text,
    at: new Date().toISOString(),
  };
  state.transcripts.push(row);
  return {
    personId: speaker,
    line: { ...row, person: peopleById.get(speaker)! },
    ...lineTiming(coChannelId, index),
  };
}

/* ------------------------------------------------------------ recordings */

export function listRecordings(ecosystem?: EcosystemId): Recording[] {
  const rows = ecosystem
    ? state.recordings.filter((r) => r.ecosystem === ecosystem)
    : state.recordings;
  return [...rows].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
}

export function getRecording(id: string): Recording | undefined {
  return state.recordings.find((r) => r.id === id);
}

/* -------------------------------------------------------------- contacts */

/**
 * The user's contacts, and where each of them is.
 *
 * Contacts are owned by another app; this only reads the flag and answers the
 * one question Free Radio can answer about them, which is whether you can
 * hear them right now.
 */
export function listContacts(): {
  person: Person;
  coChannel: { id: string; title: string; frequency: number; ecosystem: EcosystemId } | null;
}[] {
  return people
    .filter((p) => p.isContact)
    .map((person) => {
      const at = state.occupants.find((o) => o.personId === person.id);
      const channel = at
        ? state.channels.find((c) => c.id === at.coChannelId)
        : undefined;
      return {
        person,
        coChannel: channel
          ? {
              id: channel.id,
              title: channel.title,
              frequency: channel.frequency,
              ecosystem: channel.ecosystem,
            }
          : null,
      };
    })
    .sort((a, b) => {
      /* On air first: the only reason to open this list is to find somebody
         you can hear right now. */
      if (!!a.coChannel !== !!b.coChannel) return a.coChannel ? -1 : 1;
      return a.person.name.localeCompare(b.person.name);
    });
}
