/**
 * The bed: music under an empty room.
 *
 * A live room with nobody talking in it sounds exactly like a broken one.
 * There is no way for a listener to tell "the host has not started yet" from
 * "my audio is not working", and the second is what people assume, because it
 * is the thing that goes wrong more often. Every broadcast medium solved this
 * the same way and solved it early: you put something under the silence, and
 * the silence stops being alarming.
 *
 * So it is not decoration and it is not a vibe. It is the signal that the
 * channel is alive, and it stops the moment somebody speaks — the instant
 * there is a voice, the voice is the signal and the music is in the way.
 *
 * Two tracks and silence. Not a library: a station picking its own soundtrack
 * is a different product, and choosing between thirty things is a job nobody
 * asked for while they are trying to start talking.
 */

export type BedId = "none" | "piano" | "hiphop";

export interface Bed {
  id: BedId;
  label: string;
  /** what it is for, in the picker */
  hint: string;
  /** null for silence */
  src: string | null;
}

export const BEDS: Bed[] = [
  {
    id: "none",
    label: "Silence",
    hint: "Nothing under the room. Honest, and slightly unnerving.",
    src: null,
  },
  {
    id: "piano",
    label: "Jazz piano",
    hint: "Warm and unhurried. Reads as a room about to start.",
    src: "/audio/piano.mp3",
  },
  {
    id: "hiphop",
    label: "Hip-hop",
    hint: "A beat under the wait. Reads as a room with something on.",
    src: "/audio/hiphop.mp3",
  },
];

export const DEFAULT_BED: BedId = "piano";

export function getBed(id: BedId | undefined): Bed {
  return BEDS.find((b) => b.id === id) ?? BEDS[0];
}

export function isBedId(value: unknown): value is BedId {
  return value === "none" || value === "piano" || value === "hiphop";
}
