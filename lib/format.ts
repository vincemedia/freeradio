/**
 * Formatting rules from DESIGN.md, in one place.
 *
 * These are copy decisions as much as display ones, so they live together:
 * a frequency that loses its trailing zero somewhere in the app is a
 * different frequency as far as a reader is concerned.
 */

/** Always one decimal, including at `.0`. The dial does not drop digits. */
export const formatFrequency = (mhz: number) => mhz.toFixed(1);

/**
 * `@handle@ecosystem`, for places that can only take a string.
 *
 * The rendered form pairs the two halves with the wallet mark between them;
 * this is the same identity written out where no mark can be drawn, such as a
 * toast description. Both halves keep their `@`.
 */
export function formatIdentity(person: {
  handle: string;
  username?: string;
  ecosystem: string;
}): string {
  return `@${person.username ?? person.handle}@${person.ecosystem}`;
}

/** Running time, as a clock. Tabular figures keep it from jittering. */
export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

export const elapsedSince = (iso: string) =>
  Math.floor((Date.now() - new Date(iso).getTime()) / 1000);

/** Coarse, for lists. Precision here would be noise. */
export function formatAgo(iso: string): string {
  const s = elapsedSince(iso);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? "yesterday" : `${d} days ago`;
}

/** Clock time, for a transcript line. */
export const formatClock = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });

export const formatCount = (n: number) => n.toLocaleString("en-GB");
