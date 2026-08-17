import type { Ecosystem } from "@/data/schema";

/**
 * A band, with how busy it is.
 *
 * Shared because the band list is drawn twice — the dropdown on a desktop, the
 * drill-down panel on a phone — and the two had their own copies of both the
 * type and the sentence. Copies of a sentence about numbers drift: this one was
 * already saying two different things about the same band depending on the width
 * of the window it was read in.
 */
export type Band = Ecosystem & {
  /** live stations on this band, empty ones included; recordings excluded */
  coChannelCount: number;
  /** people actually in those rooms, from the meeting rosters */
  occupantCount: number;
  /** open microphones, which is what "talking" is supposed to mean */
  talkingCount: number;
};

/**
 * How busy a band is, in as few words as are true.
 *
 * The line used to read "N on air, N talking" where the second number was the
 * occupant count — so five people sitting in silence were reported as five people
 * talking, and the word was doing no work at all. Both numbers are real now.
 *
 * The clauses only appear when they say something. A band with nobody on it does
 * not also need to be told it has nobody talking on it, and a room where everyone
 * is listening is a fact worth stating plainly rather than as a zero.
 *
 * `known` is how many of your own contacts are on that band, which only the
 * browser can know — contacts never leave it — so it arrives as an argument
 * rather than as part of the band.
 */
export function howBusy(band: Band, known = 0): string {
  if (band.coChannelCount === 0) return "Nothing on air";

  const parts = [`${band.coChannelCount} on air`];

  if (band.occupantCount === 0) {
    parts.push(band.coChannelCount === 1 ? "nobody in it" : "nobody in them");
  } else {
    parts.push(`${band.occupantCount} listening`);
    if (band.talkingCount > 0) parts.push(`${band.talkingCount} talking`);
  }

  if (known > 0) parts.push(`${known} you know`);
  return parts.join(", ");
}
