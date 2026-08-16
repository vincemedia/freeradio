/**
 * Fixture integrity, as a command rather than as a thing somebody remembers.
 *
 * Typecheck cannot see any of this: the shapes are all correct and the
 * meanings are all wrong. Every rule here is one that has actually been broken
 * during this build — the same person in two rooms at once, a frequency
 * issued twice on one band, somebody speaking while the room shows them
 * muted, a station claiming a recording that has no lines behind it.
 *
 * Run with `bun run check`.
 */
import { people } from "../data/people";
import { coChannels, occupants, nestLinks } from "../data/co-channels";
import { recordings } from "../data/recordings";
import { ecosystems, BAND } from "../data/ecosystems";
import { STATION_AUDIO, FIRST_RUN_STATION, ENVELOPE_WINDOW_MS } from "../data/audio";
import { SCRIPTS } from "../data/transcripts";

const problems: string[] = [];
const fail = (message: string) => problems.push(message);

const personIds = new Set(people.map((p) => p.id));
const channelIds = new Set(coChannels.map((c) => c.id));
const bandIds = new Set(ecosystems.map((e) => e.id));

/* ------------------------------------------------------------------ people */

const handles = new Set<string>();
for (const p of people) {
  if (!bandIds.has(p.ecosystem)) fail(`${p.id}: unknown ecosystem ${p.ecosystem}`);
  /* A handle is only unique within its own authority, which is the whole
     point of writing them `@handle@ecosystem`. */
  const key = `${p.handle}@${p.ecosystem}`;
  if (handles.has(key)) fail(`two people answer to @${key}`);
  handles.add(key);
}

/* ------------------------------------------------------------ co-channels */

const frequencies = new Map<string, string>();
for (const c of coChannels) {
  if (!personIds.has(c.hostId)) fail(`${c.id}: unknown host ${c.hostId}`);
  if (!bandIds.has(c.ecosystem)) fail(`${c.id}: unknown band ${c.ecosystem}`);
  if (c.frequency < BAND.min || c.frequency > BAND.max)
    fail(`${c.id}: ${c.frequency} is off the dial`);
  if (Math.round(c.frequency * 10) !== c.frequency * 10)
    fail(`${c.id}: ${c.frequency} is finer than the dial moves`);

  const key = `${c.ecosystem}@${c.frequency.toFixed(1)}`;
  const held = frequencies.get(key);
  if (held) fail(`${key} is held by both ${held} and ${c.id}`);
  frequencies.set(key, c.id);
}

/* One room at a time. The occupant table is effectively keyed by person, and
   a fixture that breaks this puts the same face in two rooms at once. */
const roomOf = new Map<string, string>();
for (const o of occupants) {
  if (!personIds.has(o.personId)) fail(`occupant: unknown person ${o.personId}`);
  if (!channelIds.has(o.coChannelId)) fail(`occupant: unknown room ${o.coChannelId}`);
  const already = roomOf.get(o.personId);
  if (already) fail(`${o.personId} is in ${already} and ${o.coChannelId}`);
  roomOf.set(o.personId, o.coChannelId);
}

for (const c of coChannels) {
  const here = occupants.filter((o) => o.coChannelId === c.id);

  /* A live station is empty until somebody joins it, and its occupants come
     from RealtimeKit rather thanから here. Seeded occupancy on one would be
     faces in a room that cannot hear anybody. */
  if (c.kind === "live") {
    if (here.length > 0)
      fail(`${c.id}: live, so its occupants must come from the meeting`);
    if (c.hasAudio) fail(`${c.id}: live, so it has no recording behind it`);
    continue;
  }

  if (here.length === 0) fail(`${c.id}: recorded and empty, so nobody was in it`);
  const hosts = here.filter((o) => o.role === "host");
  if (hosts.length !== 1) fail(`${c.id}: ${hosts.length} hosts`);
  if (hosts[0] && hosts[0].personId !== c.hostId)
    fail(`${c.id}: hostId and the host occupant disagree`);
}

for (const l of nestLinks) {
  if (!channelIds.has(l.coChannelId)) fail(`nest link: unknown room ${l.coChannelId}`);
  if (roomOf.get(l.postedById) !== l.coChannelId)
    fail(`${l.coChannelId}: ${l.postedById} pinned a link but is not in the room`);
}

/* ------------------------------------------------------------------ audio */

const claimed = coChannels.filter((c) => c.hasAudio).map((c) => c.id).sort();
const supplied = Object.keys(STATION_AUDIO).sort();
if (claimed.join() !== supplied.join())
  fail(`hasAudio says [${claimed}] but STATION_AUDIO has [${supplied}]`);

if (!supplied.includes(FIRST_RUN_STATION))
  fail(`first run lands on ${FIRST_RUN_STATION}, which has no audio`);

for (const [id, audio] of Object.entries(STATION_AUDIO)) {
  if (!channelIds.has(id)) fail(`${id}: has audio but no room`);
  if (audio.envelope.length === 0) fail(`${id}: empty envelope`);
  if (audio.envelope.some((v) => v < 0 || v > 100))
    fail(`${id}: envelope is not normalised to 0-100`);

  const here = new Set(
    occupants.filter((o) => o.coChannelId === id).map((o) => o.personId),
  );
  const muted = new Set(
    occupants.filter((o) => o.coChannelId === id && o.muted).map((o) => o.personId),
  );

  let previous = -1;
  for (const line of audio.lines) {
    if (!here.has(line.personId)) fail(`${id}: ${line.personId} speaks but is not in the room`);
    if (muted.has(line.personId)) fail(`${id}: ${line.personId} speaks while shown as muted`);
    if (line.until < line.at) fail(`${id}: a line at ${line.at} ends before it starts`);
    if (line.at < previous) fail(`${id}: a line at ${line.at} goes backwards`);
    if (!line.text.trim()) fail(`${id}: an empty line at ${line.at}`);
    previous = line.at;
  }

  /* The transcript cannot run past the end of the file it claims to be. */
  const seconds = (audio.envelope.length * ENVELOPE_WINDOW_MS) / 1000;
  const last = audio.lines.at(-1);
  if (last && last.until > seconds + 0.5)
    fail(`${id}: last line ends at ${last.until}s, past the ${seconds}s file`);

  if (SCRIPTS[id]?.length !== audio.lines.length)
    fail(`${id}: script and transcript are different lengths`);
}

/* ------------------------------------------------------------- transcripts */

for (const [id, script] of Object.entries(SCRIPTS)) {
  if (!channelIds.has(id)) fail(`script for ${id}, which is not a room`);
  for (const [personId] of script)
    if (!personIds.has(personId)) fail(`${id}: script names unknown ${personId}`);
}

/* Only a recorded station has words: it already happened. A live one says
   whatever the people in it say. */
for (const c of coChannels)
  if (c.kind === "recorded" && !SCRIPTS[c.id])
    fail(`${c.id}: recorded with no transcript`);

/* ------------------------------------------------------------- recordings */

for (const r of recordings) {
  if (!personIds.has(r.hostId)) fail(`${r.id}: unknown host ${r.hostId}`);
  for (const p of r.occupantIds)
    if (!personIds.has(p)) fail(`${r.id}: unknown occupant ${p}`);
  if (!r.occupantIds.includes(r.hostId)) fail(`${r.id}: host is not in its own recording`);
  if (r.duration <= 0) fail(`${r.id}: no duration`);
}

/* ---------------------------------------------------------------- report */

if (problems.length > 0) {
  for (const p of problems) console.error(`  ${p}`);
  console.error(`\n${problems.length} problem${problems.length === 1 ? "" : "s"}.`);
  process.exit(1);
}

console.log(
  `fixtures ok — ${people.length} people, ${coChannels.length} stations, ` +
    `${occupants.length} occupants, ${recordings.length} recordings, ` +
    `${supplied.length} with audio`,
);
