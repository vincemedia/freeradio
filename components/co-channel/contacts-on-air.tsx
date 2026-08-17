"use client";

import Link from "next/link";
import { Avatar } from "@/components/identity";
import { Lamp } from "@/components/instrument/parts";
import { ScrollRail } from "@/components/ui/scroll-rail";
import { personFromKey } from "@/lib/identity-key";
import { formatFrequency } from "@/lib/format";
import { useOnAir } from "@/lib/use-on-air";

/**
 * Contacts you can hear right now.
 *
 * A horizontal rail rather than a grid: it is a glance, not a destination, and
 * it should never push the band listing below the fold.
 *
 * Renders nothing at all when no contact is on air — which includes the very
 * common case of not having added anybody yet. An empty state here would be a
 * permanent apology on the busiest screen in the product, and an invitation to
 * add contacts is no use on a screen with nobody on it to add.
 *
 * The avatars are derived from the identity key rather than fetched, and by
 * the same function the top bar uses, so a contact looks the same here as
 * they do standing in a room. A contact is a key and a name captured when you
 * added them; there is no directory of wallet identities to ask for a current
 * picture, and inventing one would mean the face in your list changing under
 * you.
 */
export function ContactsOnAir() {
  const onAir = useOnAir();

  if (onAir.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
          <Lamp state="live" label="" />
          People you know, on air
        </h2>
        <Link
          href="/contacts"
          className="shrink-0 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          All contacts
        </Link>
      </div>

      {/* Scrolls inside itself; the page body never scrolls sideways. Aligned
          to the container rather than bleeding past it, so the rail starts and
          ends exactly where the band listing below does. */}
      <ScrollRail label="People you know, on air">
        <ul className="flex w-max gap-2 pb-1">
          {onAir.map(({ contact, room }) => (
            <li key={contact.key}>
              <Link
                href={`/co-channel/${room.id}`}
                className="lift flex w-[15rem] items-center gap-2.5 rounded-lg border border-border bg-card p-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Avatar
                  person={personFromKey(contact.key, contact.name, contact.photo)}
                  size={36}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium">
                    {contact.name}
                  </span>
                  <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className="readout">
                      {formatFrequency(room.frequency)}
                    </span>
                    <span className="truncate">{room.title}</span>
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </ScrollRail>
    </section>
  );
}
