"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Coins, LockKey, Prohibit, ShieldCheck } from "@phosphor-icons/react";
import { Facepile, Identity } from "@/components/identity";
import { Badge } from "@/components/ui/primitives";
import type { CoChannelView, GateKind } from "@/data/schema";
import { GATE_LABEL } from "@/lib/gates";
import { formatFrequency } from "@/lib/format";
import { useRadio } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
  coChannelTransitionName,
  navigateWithTransition,
} from "@/lib/view-transition";

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
  const router = useRouter();
  const people = coChannel.occupants.map((o) => o.person);
  const inThisRoom = useRadio((s) => s.session?.coChannelId) === coChannel.id;
  const href = `/co-channel/${coChannel.id}`;

  return (
    <Link
      href={href}
      onClick={(e) => {
        /* Let the browser handle modified clicks: a new tab has nothing to
           transition to. */
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        navigateWithTransition(() => router.push(href), href);
      }}
      /* The dock owns the name while you are in the room, since it is the
         thing on screen that represents it. Two elements claiming one name
         makes the browser abandon the transition entirely. */
      style={
        inThisRoom
          ? undefined
          : ({
              viewTransitionName: coChannelTransitionName(coChannel.id),
            } as React.CSSProperties)
      }
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

      {/* The host on the left, the way in on the right. The whole card is
          already a link to the room, so this is not a second destination: it
          is the same one, named, so the row reads as an action rather than as
          a caption you have to guess is clickable.

          A span rather than a button, because a button inside a link is not a
          thing HTML allows and the outer link is what handles the click. It
          responds to the card's own hover, which is what group-hover is for. */}
      <div className="flex min-w-0 items-center justify-between gap-3 border-t border-border pt-2.5 text-[11px]">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="shrink-0 text-muted-foreground">Host</span>
          <Identity person={coChannel.host} className="min-w-0 text-[11px]" />
        </span>

        <span
          aria-hidden
          className="inline-flex shrink-0 items-center gap-1 rounded-[var(--radius-clay)] bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground shadow-[var(--shadow-clay-primary)] transition-transform duration-150 ease-[var(--ease-out-quint)] group-active:scale-[0.98] group-active:shadow-[var(--shadow-clay-primary-pressed)]"
        >
          {inThisRoom ? "Back in" : "Join"}
        </span>
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
