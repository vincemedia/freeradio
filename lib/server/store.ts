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
 *   1. You can be in exactly one Co-Channel at a time. Joining a second one
 *      leaves the first.
 *   2. A Co-Channel with nobody in it does not exist. The last occupant to
 *      leave deletes it, and its frequency returns to the pool.
 *   3. A frequency and a title are each unique within one ecosystem, and only
 *      within one ecosystem.
 */
import {
  coChannels as seedChannels,
  nestLinks as seedNest,
  occupants as seedOccupants,
} from "@/data/co-channels";
import { BAND, FREQUENCY_STEP } from "@/data/ecosystems";
import { people, ME_ID } from "@/data/people";
import { recordings as seedRecordings } from "@/data/recordings";
import { SCRIPTS, seedTranscript } from "@/data/transcripts";
import { MY_HOLDINGS } from "@/data/session";
import type {
  CoChannel,
  CoChannelView,
  EcosystemId,
  Gates,
  NestLink,
  Occupant,
  Person,
  Recording,
  TranscriptLine,
  TranscriptLineView,
} from "@/data/schema";
import { evaluateGates, primaryGate } from "@/lib/gates";

/* Next dev reloads modules; hanging the state off globalThis keeps a demo
   from resetting itself every time a file is saved. */
interface State {
  channels: CoChannel[];
  occupants: Occupant[];
  nest: NestLink[];
  transcripts: TranscriptLine[];
  recordings: Recording[];
  seq: number;
}

const globalRef = globalThis as unknown as { __freeRadio?: State };

function seed(): State {
  return {
    channels: [...seedChannels],
    occupants: [...seedOccupants],
    nest: [...seedNest],
    transcripts: seedChannels.flatMap((c) => seedTranscript(c.id, c.startedAt)),
    recordings: [...seedRecordings],
    seq: 0,
  };
}

const state: State = (globalRef.__freeRadio ??= seed());

const nextId = (prefix: string) => `${prefix}-${++state.seq}-${Date.now()}`;

/* ------------------------------------------------------------------ people */

const peopleById = new Map(people.map((p) => [p.id, p]));

export function getPerson(id: string): Person | undefined {
  return peopleById.get(id);
}

export function listPeople(): Person[] {
  return people;
}

/** `@handle`, for naming somebody inside a sentence. */
function shortName(id: string): string {
  const p = peopleById.get(id);
  return p ? `@${p.handle}` : id;
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
  /** only rooms holding at least one of the user's contacts */
  contactsOnly?: boolean;
}

export function listCoChannels(opts: ListOptions = {}): CoChannelView[] {
  let rows = state.channels.map(toView);

  if (opts.ecosystem) rows = rows.filter((c) => c.ecosystem === opts.ecosystem);
  if (opts.contactsOnly) rows = rows.filter((c) => c.contactCount > 0);

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

export function getCoChannelByFrequency(
  ecosystem: EcosystemId,
  frequency: number,
): CoChannelView | undefined {
  const row = state.channels.find(
    (c) =>
      c.ecosystem === ecosystem &&
      Math.abs(c.frequency - frequency) < FREQUENCY_STEP / 2,
  );
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

/** The lowest free tenth on a band, for a new room that did not pick one. */
export function nextFreeFrequency(ecosystem: EcosystemId): number | null {
  const taken = new Set(
    state.channels
      .filter((c) => c.ecosystem === ecosystem)
      .map((c) => c.frequency.toFixed(1)),
  );
  for (let f = BAND.min; f <= BAND.max + 1e-9; f += FREQUENCY_STEP) {
    const key = f.toFixed(1);
    if (!taken.has(key)) return Number(key);
  }
  return null;
}

export function isFrequencyFree(
  ecosystem: EcosystemId,
  frequency: number,
): boolean {
  return !state.channels.some(
    (c) => c.ecosystem === ecosystem && c.frequency.toFixed(1) === frequency.toFixed(1),
  );
}

export function isTitleFree(ecosystem: EcosystemId, title: string): boolean {
  const t = title.trim().toLowerCase();
  return !state.channels.some(
    (c) => c.ecosystem === ecosystem && c.title.trim().toLowerCase() === t,
  );
}

/* -------------------------------------------------------------- occupancy */

export function currentCoChannelId(personId = ME_ID): string | null {
  return state.occupants.find((o) => o.personId === personId)?.coChannelId ?? null;
}

/**
 * Remove somebody from whatever room they are in.
 *
 * Returns the id of a room that was deleted because they were the last one in
 * it, so the caller can say so rather than the room silently vanishing.
 */
export function leave(personId = ME_ID): { closed: string | null } {
  const at = state.occupants.find((o) => o.personId === personId);
  if (!at) return { closed: null };

  state.occupants = state.occupants.filter((o) => o.personId !== personId);

  const remaining = state.occupants.filter(
    (o) => o.coChannelId === at.coChannelId,
  );
  if (remaining.length > 0) return { closed: null };

  /* Last one out. The room stops existing and the frequency is free again. */
  state.channels = state.channels.filter((c) => c.id !== at.coChannelId);
  state.nest = state.nest.filter((n) => n.coChannelId !== at.coChannelId);
  state.transcripts = state.transcripts.filter(
    (t) => t.coChannelId !== at.coChannelId,
  );
  return { closed: at.coChannelId };
}

export type JoinResult =
  | { ok: true; coChannel: CoChannelView; left: string | null; closed: string | null }
  | { ok: false; error: string; reasons?: string[] };

export function join(coChannelId: string, personId = ME_ID): JoinResult {
  const channel = state.channels.find((c) => c.id === coChannelId);
  if (!channel) return { ok: false, error: "That Co-Channel has closed." };

  const already = state.occupants.find((o) => o.personId === personId);
  if (already?.coChannelId === coChannelId) {
    return { ok: true, coChannel: toView(channel), left: null, closed: null };
  }

  /* The host is exempt from their own door, so a room cannot lock out the
     person holding it. Everyone else is evaluated. */
  if (personId !== channel.hostId) {
    const verdict = evaluateGates(channel.gates, MY_HOLDINGS, shortName);
    if (!verdict.passes) {
      return {
        ok: false,
        error: "You do not meet this Co-Channel's terms.",
        reasons: verdict.reasons,
      };
    }
  }

  const left = already?.coChannelId ?? null;
  const { closed } = leave(personId);

  state.occupants.push({
    id: nextId("occ"),
    coChannelId,
    personId,
    role: channel.hostId === personId ? "host" : "speaker",
    /* You arrive muted. Joining a live conversation with an open microphone
       is a mistake the room hears before you do. */
    muted: true,
    joinedAt: new Date().toISOString(),
  });

  /* Re-read: leaving may have deleted a different room, never this one. */
  const fresh = state.channels.find((c) => c.id === coChannelId)!;
  return { ok: true, coChannel: toView(fresh), left, closed };
}

export function setMuted(muted: boolean, personId = ME_ID): boolean {
  const at = state.occupants.find((o) => o.personId === personId);
  if (!at) return false;
  at.muted = muted;
  return true;
}

export function setRecording(coChannelId: string, recording: boolean): boolean {
  const channel = state.channels.find((c) => c.id === coChannelId);
  if (!channel) return false;
  channel.recording = recording;
  return true;
}

export interface CreateInput {
  title: string;
  ecosystem: EcosystemId;
  frequency?: number;
  topic?: string;
  gates?: Gates;
}

export type CreateResult =
  | { ok: true; coChannel: CoChannelView }
  | { ok: false; error: string; field?: "title" | "frequency" };

export function createCoChannel(
  input: CreateInput,
  personId = ME_ID,
): CreateResult {
  const title = input.title.trim();
  if (title.length < 3) {
    return { ok: false, error: "Give the Co-Channel a name.", field: "title" };
  }
  if (!isTitleFree(input.ecosystem, title)) {
    return {
      ok: false,
      error: "That name is taken on this band. Pick another.",
      field: "title",
    };
  }

  const frequency = input.frequency ?? nextFreeFrequency(input.ecosystem);
  if (frequency === null) {
    return { ok: false, error: "The band is full.", field: "frequency" };
  }
  if (!isFrequencyFree(input.ecosystem, frequency)) {
    return {
      ok: false,
      error: `${frequency.toFixed(1)} is taken on this band.`,
      field: "frequency",
    };
  }

  /* Opening a room leaves the one you were in, same as joining. */
  leave(personId);

  const id = nextId("cc");
  state.channels.push({
    id,
    title,
    frequency: Number(frequency.toFixed(1)),
    ecosystem: input.ecosystem,
    hostId: personId,
    startedAt: new Date().toISOString(),
    recording: false,
    topic: input.topic?.trim() || undefined,
    ...(input.gates ? { gates: input.gates } : {}),
  });

  state.occupants.push({
    id: nextId("occ"),
    coChannelId: id,
    personId,
    role: "host",
    /* The host opens unmuted. They called the room; somebody has to talk. */
    muted: false,
    joinedAt: new Date().toISOString(),
  });

  return { ok: true, coChannel: getCoChannel(id)! };
}

/* ----------------------------------------------------------------- nest */

export function addNestLink(
  coChannelId: string,
  url: string,
  title: string,
  personId = ME_ID,
): NestLink | null {
  if (!state.channels.some((c) => c.id === coChannelId)) return null;
  let site: string;
  try {
    site = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
  const link: NestLink = {
    id: nextId("nest"),
    coChannelId,
    postedById: personId,
    url,
    title: title.trim() || site,
    site,
    postedAt: new Date().toISOString(),
  };
  state.nest.push(link);
  return link;
}

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
 */
export function speakNext(
  coChannelId: string,
): { personId: string; line: TranscriptLineView } | null {
  const script = SCRIPTS[coChannelId];
  if (!script || script.length === 0) return null;

  const said = state.transcripts.filter((t) => t.coChannelId === coChannelId);
  const [personId, text] = script[said.length % script.length];

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

/* --------------------------------------------------------------- session */

export function getSession() {
  const at = currentCoChannelId();
  const occupant = state.occupants.find((o) => o.personId === ME_ID);
  return {
    me: peopleById.get(ME_ID)!,
    coChannelId: at,
    muted: occupant?.muted ?? true,
    holdings: MY_HOLDINGS,
  };
}

/** Whether the signed-in user may open a given room's door. */
export function gateCheck(channel: CoChannel) {
  return evaluateGates(channel.gates, MY_HOLDINGS, shortName);
}
