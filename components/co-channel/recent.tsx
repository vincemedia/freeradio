"use client";

import Link from "next/link";
import useFetch from "@/lib/use-fetch";
import { EcosystemMark } from "@/components/identity";
import type { CoChannelView } from "@/data/schema";
import { formatAgo, formatFrequency } from "@/lib/format";
import { useRadio } from "@/lib/store";

/**
 * Stations you have been in.
 *
 * Most of these will be gone. A Co-Channel closes when the last person leaves,
 * so a history of rooms is mostly a history of things that no longer exist,
 * and saying that plainly is more useful than a list of dead links. A closed
 * entry is not an error state: it is the rule working.
 */
export function RecentCoChannels() {
  const recent = useRadio((s) => s.recent);
  const currentId = useRadio((s) => s.tunedTo);

  /* One request for the whole list rather than one per row. */
  const { data: live } = useFetch<CoChannelView[]>(recent.length > 0 ? "/api/co-channels" : null);

  if (recent.length === 0) return null;
  const liveIds = new Set((live ?? []).map((c) => c.id));

  return (
    /* No heading of its own: this sits behind a tab now, and the tab is the
       heading. Two names for one list is one too many.

       Laid out on the same grid and built from the same card as Browse the
       band, because these are the same object seen a second time. A history
       drawn as a strip of chips looked like a different kind of thing, which
       it is not. */
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {recent.map((r) => {
        const stillOn = liveIds.has(r.id);
        const isHere = currentId === r.id;

        /* Most of these will be gone, and a closed one is not a broken link:
           it is the rule working. Dashed, struck through, not clickable. */
        if (!stillOn && live) {
          return (
            <li
              key={r.id}
              className="flex flex-col gap-3 rounded-lg border border-dashed border-border p-4 text-muted-foreground"
              title={`${formatFrequency(r.frequency)} is back in the pool.`}
            >
              <div className="flex items-baseline gap-1.5">
                <span className="readout text-lg leading-none tracking-tight line-through">
                  {formatFrequency(r.frequency)}
                </span>
                <span className="text-[11px]">MHz</span>
              </div>
              <h3 className="line-clamp-2 font-display text-[15px] font-semibold leading-snug tracking-tight line-through">
                {r.title}
              </h3>
              <p className="mt-auto border-t border-border pt-2.5 text-[11px]">
                Closed. The last person left, so the frequency went back into
                the pool.
              </p>
            </li>
          );
        }

        return (
          <li key={r.id}>
            <Link
              href={`/co-channel/${r.id}`}
              className="lift flex h-full flex-col gap-3 rounded-lg border border-border bg-card p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-baseline gap-1.5">
                  <span className="readout text-lg leading-none tracking-tight">
                    {formatFrequency(r.frequency)}
                  </span>
                  <span className="text-[11px] text-muted-foreground">MHz</span>
                </div>
                <EcosystemMark ecosystem={r.ecosystem} size={16} />
              </div>

              <h3 className="line-clamp-2 font-display text-[15px] font-semibold leading-snug tracking-tight text-balance">
                {r.title}
              </h3>

              <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-2.5 text-[11px] text-muted-foreground">
                <span>{isHere ? "Listening now" : `Last tuned ${formatAgo(r.at)}`}</span>
                <span
                  aria-hidden
                  className="inline-flex shrink-0 items-center gap-1 rounded-md bg-primary px-2.5 py-1 font-medium text-primary-foreground shadow-[var(--shadow-clay-primary)] transition-transform duration-150 ease-[var(--ease-out-quint)] group-active:scale-[0.98]"
                >
                  {isHere ? "Listening" : "Tune in"}
                </span>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
