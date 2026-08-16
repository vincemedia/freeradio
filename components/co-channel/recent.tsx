"use client";

import Link from "next/link";
import useFetch from "@/lib/use-fetch";
import { EcosystemMark } from "@/components/identity";
import type { CoChannelView } from "@/data/schema";
import { formatAgo, formatFrequency } from "@/lib/format";
import { useRadio } from "@/lib/store";

/**
 * Co-Channels you have been in.
 *
 * Most of these will be gone. A Co-Channel closes when the last person leaves,
 * so a history of rooms is mostly a history of things that no longer exist,
 * and saying that plainly is more useful than a list of dead links. A closed
 * entry is not an error state: it is the rule working.
 */
export function RecentCoChannels() {
  const recent = useRadio((s) => s.recent);
  const currentId = useRadio((s) => s.session?.coChannelId);

  /* One request for the whole list rather than one per row. */
  const { data: live } = useFetch<CoChannelView[]>(recent.length > 0 ? "/api/co-channels" : null);

  if (recent.length === 0) return null;
  const liveIds = new Set((live ?? []).map((c) => c.id));

  return (
    <section className="space-y-2">
      <h2 className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
        You were in
      </h2>
      <ul className="flex flex-wrap gap-2">
        {recent.map((r) => {
          const stillOn = liveIds.has(r.id);
          const isHere = currentId === r.id;

          if (!stillOn && live) {
            return (
              <li
                key={r.id}
                className="flex items-center gap-2 rounded-md border border-dashed border-border px-2.5 py-1.5 text-[11px] text-muted-foreground"
                title={`Closed. ${formatFrequency(r.frequency)} is back in the pool.`}
              >
                <span className="readout line-through">
                  {formatFrequency(r.frequency)}
                </span>
                <span className="max-w-[10rem] truncate line-through">
                  {r.title}
                </span>
                <span className="shrink-0">closed</span>
              </li>
            );
          }

          return (
            <li key={r.id}>
              <Link
                href={`/co-channel/${r.id}`}
                className="flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1.5 text-[11px] transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <EcosystemMark ecosystem={r.ecosystem} size={12} />
                <span className="readout">{formatFrequency(r.frequency)}</span>
                <span className="max-w-[10rem] truncate">{r.title}</span>
                <span className="shrink-0 text-muted-foreground">
                  {isHere ? "you are here" : formatAgo(r.at)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
