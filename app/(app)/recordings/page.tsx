"use client";

import Link from "next/link";
import { useState } from "react";
import { LockKey, Record } from "@phosphor-icons/react";
import { toast } from "sonner";
import useFetch from "@/lib/use-fetch";
import { Facepile, Identity } from "@/components/identity";
import { PlayButton } from "@/components/co-channel/play-button";
import { Price, usePriceLabel } from "@/components/price";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState, Skeleton } from "@/components/ui/primitives";
import { getEcosystem } from "@/data/ecosystems";
import type { Person, Recording } from "@/data/schema";
import {
  formatAgo,
  formatCount,
  formatDuration,
  formatFrequency,
  formatIdentity,
} from "@/lib/format";
import { useRadio } from "@/lib/store";

type Row = Recording & {
  host: Person;
  occupantsResolved: Person[];
  priceUsd: number;
  platformFee: number;
};

/**
 * Recordings.
 *
 * The only thing that outlives a Co-Channel, which is why each one carries its
 * own frequency and title: the room is gone and its frequency belongs to
 * somebody else by now.
 *
 * Three of these have a real file behind them and play. The rest are rows
 * with a duration and no audio, and their control says so rather than
 * miming: the same rule the price button follows two lines down.
 */
export default function RecordingsPage() {
  const ecosystem = useRadio((s) => s.ecosystem);
  /* Unlocks are per session, like the rest of the mock money in this app. */
  const [bought, setBought] = useState<Set<string>>(new Set());
  const priceLabel = usePriceLabel();

  const { data, loading } = useFetch<Row[]>(`/api/recordings?ecosystem=${ecosystem}`);

  const band = getEcosystem(ecosystem);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recordings"
        subtitle={`Co-Channels on ${band?.name ?? "this band"} that were recorded before they closed.`}
      />

      {loading && !data ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[4.5rem] w-full rounded-lg" />
          ))}
        </div>
      ) : (data?.length ?? 0) === 0 ? (
        <EmptyState title="Nothing recorded on this band" icon={<Record size={28} />}>
          A Co-Channel is only written down while its host has recording
          switched on. Switch bands from the top bar to see others.
        </EmptyState>
      ) : (
        <ul className="space-y-2">
          {data!.map((r) => {
            const locked = r.priceUsd > 0 && !bought.has(r.id);
            return (
              <li
                key={r.id}
                id={r.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 sm:p-4"
              >
                {/* Locked rows keep both controls: the lock is the price and
                    the play button beside it is what the price buys, greyed
                    until it is paid. Swapping one for the other hid the thing
                    being sold behind the thing selling it. */}
                <div className="flex shrink-0 items-center gap-1.5">
                  {locked && (
                    <Button
                      variant="secondary"
                      size="icon"
                      aria-label={`Unlock ${r.title} for ${priceLabel(r.priceUsd)}`}
                      onClick={() => {
                        setBought((b) => new Set(b).add(r.id));
                        toast.success("Unlocked", {
                          description: `${priceLabel(r.priceUsd)} to ${formatIdentity(r.host)}, less a ${Math.round(r.platformFee * 100)}% platform fee.`,
                        });
                      }}
                    >
                      <LockKey />
                    </Button>
                  )}
                  <PlayButton
                    src={locked ? undefined : r.audioSrc}
                    title={r.title}
                    lockedReason={locked ? "Unlock this recording to play it" : undefined}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="readout text-xs text-muted-foreground">
                      {formatFrequency(r.frequency)}
                    </span>
                    <h2 className="min-w-0 truncate text-sm font-medium">
                      {/* Each recording has its own address now, so a row is
                          somewhere to go rather than a dead end. */}
                      <Link
                        href={`/recordings/${r.id}`}
                        className="rounded-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {r.title}
                      </Link>
                    </h2>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                    <Identity person={r.host} className="text-[11px]" />
                    <span className="readout">{formatDuration(r.duration)}</span>
                    <span>{formatAgo(r.recordedAt)}</span>
                    <span>{formatCount(r.plays)} plays</span>
                    {r.priceUsd > 0 &&
                      (locked ? (
                        <span className="flex items-baseline gap-1 text-foreground">
                          <Price usd={r.priceUsd} inline />
                          to unlock
                        </span>
                      ) : (
                        <span>Unlocked</span>
                      ))}
                  </div>
                </div>

                <Facepile
                  people={r.occupantsResolved}
                  max={3}
                  size={24}
                  className="hidden shrink-0 sm:inline-flex"
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
