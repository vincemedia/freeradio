"use client";

import Link from "next/link";
import { Coins, LockKey, Prohibit, ShieldCheck } from "@phosphor-icons/react";
import { Facepile, Identity } from "@/components/identity";
import { Badge } from "@/components/ui/primitives";
import type { CoChannelView, GateKind } from "@/data/schema";
import { GATE_LABEL } from "@/lib/gates";
import { formatFrequency } from "@/lib/format";
import { cn } from "@/lib/utils";

const GATE_ICON: Record<Exclude<GateKind, "open">, React.ComponentType<{ size?: number }>> = {
  token: Coins,
  timelock: LockKey,
  vouch: ShieldCheck,
  renounce: Prohibit,
};

export function GateBadge({ gate }: { gate: GateKind }) {
  if (gate === "open") return null;
  const Icon = GATE_ICON[gate];
  return (
    <Badge variant="outline" className="gap-1">
      <Icon size={11} />
      {GATE_LABEL[gate]}
    </Badge>
  );
}

/**
 * A Co-Channel in a list.
 *
 * The frequency leads, because on this band it is the address and it is
 * shorter to read than the title. Then the title, then who is in there: the
 * facepile answers "is this for me" faster than any description does, which is
 * why it sits below the title rather than beside the metadata.
 *
 * The whole card is one link, since it represents exactly one object.
 */
export function CoChannelCard({
  coChannel,
  className,
}: {
  coChannel: CoChannelView;
  className?: string;
}) {
  const people = coChannel.occupants.map((o) => o.person);

  return (
    <Link
      href={`/co-channel/${coChannel.id}`}
      className={cn(
        "group relative flex flex-col gap-3 rounded-lg border border-border bg-card p-4 transition-[transform,background-color] duration-150 ease-[var(--ease-out-quint)] hover:bg-muted/40 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        {/* No on-air lamp here. Every room in a browse list is on air, so a
            lamp on each one would be decoration; red is kept for recording,
            where it still tells you something. */}
        <div className="flex items-baseline gap-1.5">
          <span className="readout text-lg leading-none tracking-tight">
            {formatFrequency(coChannel.frequency)}
          </span>
          <span className="text-[11px] text-muted-foreground">MHz</span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {coChannel.recording && (
            <Badge variant="signal" className="gap-1">
              <span
                aria-hidden
                className="lamp-pulse size-1.5 rounded-full bg-current"
              />
              REC
            </Badge>
          )}
          <GateBadge gate={coChannel.primaryGate} />
        </div>
      </div>

      <div className="min-w-0">
        <h3 className="line-clamp-2 font-display text-[15px] font-semibold leading-snug tracking-tight text-balance">
          {coChannel.title}
        </h3>
        {coChannel.topic && (
          <p className="mt-1 line-clamp-1 text-[13px] text-muted-foreground">
            {coChannel.topic}
          </p>
        )}
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 pt-1">
        <Facepile people={people} max={3} size={28} />
        <span className="min-w-0 text-right text-[11px] leading-tight text-muted-foreground">
          <span className="block truncate">
            {coChannel.occupantCount} in the room
          </span>
          {coChannel.contactCount > 0 && (
            <span className="block truncate text-foreground">
              {coChannel.contactCount} you know
            </span>
          )}
        </span>
      </div>

      <div className="flex min-w-0 items-center gap-1.5 border-t border-border pt-2.5 text-[11px]">
        <span className="shrink-0 text-muted-foreground">Host</span>
        <Identity person={coChannel.host} className="min-w-0 text-[11px]" />
      </div>
    </Link>
  );
}

export function CoChannelCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <div className="h-5 w-20 animate-pulse rounded-sm bg-border" />
      <div className="h-4 w-full animate-pulse rounded-sm bg-border" />
      <div className="h-4 w-2/3 animate-pulse rounded-sm bg-border" />
      <div className="mt-2 flex items-center justify-between">
        <div className="h-7 w-20 animate-pulse rounded-full bg-border" />
        <div className="h-3 w-16 animate-pulse rounded-sm bg-border" />
      </div>
    </div>
  );
}
