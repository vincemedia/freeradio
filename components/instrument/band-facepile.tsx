"use client";

import { Avatar } from "@/components/identity";
import { isIdentityKey, personFromKey } from "@/lib/identity-key";

/**
 * Everybody on the band, in one row.
 *
 * A count tells you a band is busy; faces tell you it is inhabited, and the
 * difference is what makes a stranger press a button. This sits beside the
 * scan controls because the band-wide view is the only screen that can answer
 * the question at all — every other one is about a single room.
 *
 * Nine faces and then a number. Past nine they stop being people and become
 * texture, and the number is the honest way to say "and more".
 *
 * The avatars are the app's own, derived from each participant's identity, so
 * a face here is the same face they have in a room and in the top bar. Most
 * people on a band are strangers with no picture, and a row of identical grey
 * circles would say less than nothing; a generated tile with a creature on it
 * is at least consistently theirs.
 */

const SHOWN = 9;

export function BandFacepile({
  listeners,
}: {
  listeners: { id: string; name: string }[];
}) {
  /* Nothing rather than an empty state. A quiet band already says so with an
     empty scale, and a row explaining that nobody is here would be a second
     apology for the same fact. */
  if (listeners.length === 0) return null;

  const shown = listeners.slice(0, SHOWN);
  const rest = listeners.length - shown.length;

  return (
    <div className="flex min-w-0 items-center gap-2">
      <ul
        className="flex items-center"
        aria-label={`${listeners.length} listening on this band`}
      >
        {shown.map((l) => (
          <li key={l.id} className="-mr-1.5 last:mr-0" title={l.name}>
            <span className="block rounded-full ring-2 ring-[var(--panel)]">
              <Avatar person={faceFor(l)} size={24} />
            </span>
          </li>
        ))}
        {rest > 0 && (
          <li className="ml-1">
            <span className="readout flex size-6 items-center justify-center rounded-full bg-muted text-[10px] text-muted-foreground ring-2 ring-[var(--panel)]">
              +{rest}
            </span>
          </li>
        )}
      </ul>
      <span className="hidden text-xs text-muted-foreground lg:inline">
        listening
      </span>
    </div>
  );
}

/** A listener as a person, so the face matches everywhere else it appears. */
function faceFor(l: { id: string; name: string }) {
  const person = personFromKey(
    isIdentityKey(l.id) ? l.id : `02${"0".repeat(64)}`,
    l.name,
  );
  return isIdentityKey(l.id) ? person : { ...person, id: l.id };
}
