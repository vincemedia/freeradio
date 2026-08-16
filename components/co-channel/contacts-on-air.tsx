"use client";

import Link from "next/link";
import useFetch from "@/lib/use-fetch";
import { Avatar, EcosystemMark } from "@/components/identity";
import { Lamp } from "@/components/instrument/parts";
import { ScrollRail } from "@/components/ui/scroll-rail";
import type { EcosystemId, Person } from "@/data/schema";
import { formatFrequency } from "@/lib/format";

type Row = {
  person: Person;
  coChannel: {
    id: string;
    title: string;
    frequency: number;
    ecosystem: EcosystemId;
  } | null;
};

/**
 * Contacts you can hear right now.
 *
 * A horizontal rail rather than a grid: it is a glance, not a destination, and
 * it should never push the band listing below the fold. Contacts live in
 * another app, so this only ever reads them.
 *
 * Renders nothing at all when no contact is on air. An empty state here would
 * be a permanent apology on the busiest screen in the product.
 */
export function ContactsOnAir() {
  const { data } = useFetch<Row[]>("/api/contacts");
  const onAir = (data ?? []).filter((r) => r.coChannel !== null);

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
          {onAir.map(({ person, coChannel }) => (
            <li key={person.id}>
              <Link
                href={`/co-channel/${coChannel!.id}`}
                className="flex w-[15rem] items-center gap-2.5 rounded-lg border border-border bg-card p-2.5 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Avatar person={person} size={36} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1 text-[13px] font-medium">
                    <span className="truncate">{person.name}</span>
                    <EcosystemMark ecosystem={person.ecosystem} size={12} />
                  </span>
                  <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className="readout">
                      {formatFrequency(coChannel!.frequency)}
                    </span>
                    <span className="truncate">{coChannel!.title}</span>
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
