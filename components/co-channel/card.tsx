"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Coins, LockKey, Prohibit, ShieldCheck } from "@phosphor-icons/react";
import { Facepile, Identity } from "@/components/identity";
import { Badge } from "@/components/ui/primitives";
import { RichTooltip, Tooltip } from "@/components/ui/overlays";
import { getToken } from "@/data/tokens";
import type { CoChannelView, GateKind, Gates, Token } from "@/data/schema";
import { GATE_HELP, GATE_LABEL } from "@/lib/gates";
import { formatFrequency } from "@/lib/format";
import { useRadio } from "@/lib/store";
import { useContactsByRoom } from "@/lib/use-on-air";
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

/**
 * The gate on a card, and what it actually asks for.
 *
 * The badge alone says a door has terms; it does not say whether you are
 * likely to get through, which is the only thing anybody wants to know from a
 * browse list. So the terms come with it on hover: the token's own mark, its
 * name and the amount, rather than the word "Token".
 *
 * Falls back to the one-clause explanation when the gate is one without an
 * asset behind it, or when the caller has no gate detail to pass.
 */
export function GateBadge({ gate, gates }: { gate: GateKind; gates?: Gates }) {
  if (gate === "open") return null;
  const Icon = GATE_ICON[gate];

  const badge = (
    <Badge variant="outline" className="gap-1">
      <Icon size={11} />
      {GATE_LABEL[gate]}
    </Badge>
  );

  const terms = gates ? gateTerms(gate, gates) : null;
  if (!terms) return <Tooltip label={GATE_HELP[gate]}>{badge}</Tooltip>;

  return (
    <RichTooltip content={terms}>
      {/* A span, because the card around this is a link and the tooltip
          trigger must not be a nested interactive element. */}
      <span tabIndex={0} className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {badge}
      </span>
    </RichTooltip>
  );
}

/** What the gate holds out for, drawn with the asset's own mark. */
function gateTerms(gate: GateKind, gates: Gates): React.ReactNode | null {
  if (gate === "token" && gates.token.on && gates.token.ids.length > 0) {
    return (
      <span className="flex flex-col gap-1">
        <span className="opacity-70">To join you must hold</span>
        {gates.token.ids.map((id, i) => {
          const token = getToken(id);
          const min = gates.token.minimums?.[id];
          return (
            <span key={id} className="flex items-center gap-1.5">
              {i > 0 && <span className="opacity-70">or</span>}
              <TokenMark token={token} id={id} />
              <span className="font-medium">{token?.name ?? id}</span>
              {min != null && (
                <span className="readout tabular-nums">
                  {min.toLocaleString("en-GB")} {token?.symbol ?? ""}
                </span>
              )}
            </span>
          );
        })}
      </span>
    );
  }

  if (gate === "timelock" && gates.timelock.on) {
    const token = getToken(gates.timelock.assetId ?? "bsv");
    return (
      <span className="flex flex-col gap-1">
        <span className="opacity-70">To join you must have locked</span>
        <span className="flex items-center gap-1.5">
          <TokenMark token={token} id={gates.timelock.assetId ?? "bsv"} />
          <span className="readout tabular-nums font-medium">
            {gates.timelock.amount} {token?.symbol ?? "BSV"}
          </span>
          <span className="opacity-70">
            for {(gates.timelock.minBlocks ?? 0).toLocaleString("en-GB")} more blocks
          </span>
        </span>
      </span>
    );
  }

  return null;
}

/** The token's mark, or its colour when it has no file of its own. */
function TokenMark({ token, id }: { token?: Token; id: string }) {
  if (token?.icon) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img src={token.icon} alt="" width={14} height={14} className="shrink-0 rounded-full" />
    );
  }
  return (
    <span
      aria-hidden
      className="size-3.5 shrink-0 rounded-full ring-1 ring-background/40"
      style={{ background: token?.color ?? "currentColor" }}
      title={token?.symbol ?? id}
    />
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
  /* Counted here rather than sent by the server, which cannot know: contacts
     live in this browser and are never uploaded. */
  const known = useContactsByRoom()[coChannel.id] ?? 0;
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
        /* Hovering lifts the card off the panel rather than tinting it: a
           Braun front panel is one surface with things standing proud of it,
           and it answers a finger with depth, not with colour.

           `lift` is that rule, defined once in globals.css so every card in
           the product rises the same way. Same clay as the buttons, untinted;
           the radius stays the surface radius, because clay is a finish and
           not a shape. */
        "lift group relative flex flex-col gap-3 rounded-lg border border-border bg-card p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
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
          <GateBadge gate={coChannel.primaryGate} gates={coChannel.gates} />
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
          {known > 0 && (
            <span className="block truncate text-foreground">
              {known} you know
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
          {coChannel.host ? (
            <>
              <span className="shrink-0 text-muted-foreground">Host</span>
              <Identity person={coChannel.host} className="min-w-0 text-[11px]" />
            </>
          ) : (
            <span className="text-muted-foreground">Open — no host yet</span>
          )}
        </span>

        <span
          aria-hidden
          className="inline-flex shrink-0 items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground shadow-[var(--shadow-clay-primary)] transition-transform duration-150 ease-[var(--ease-out-quint)] group-active:scale-[0.98] group-active:shadow-[var(--shadow-clay-primary-pressed)]"
        >
          {inThisRoom ? "Back in" : "Tune in"}
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
