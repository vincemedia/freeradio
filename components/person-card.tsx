"use client";

import Link from "next/link";
import { HoverCard } from "radix-ui";
import { useState } from "react";
import { Broadcast } from "@phosphor-icons/react";
import useFetch from "@/lib/use-fetch";
import { Avatar, EcosystemMark, Identity } from "@/components/identity";
import { GateBadge } from "@/components/co-channel/card";
import { Badge } from "@/components/ui/primitives";
import type { EcosystemId, GateKind, Person } from "@/data/schema";
import { formatFrequency } from "@/lib/format";
import { cn } from "@/lib/utils";

type PersonResponse = {
  person: Person;
  coChannel: {
    id: string;
    title: string;
    frequency: number;
    ecosystem: EcosystemId;
    occupantCount: number;
    primaryGate: GateKind;
    recording: boolean;
  } | null;
};

/**
 * The card behind a handle.
 *
 * This is the route into a Co-Channel from outside it: you meet somebody
 * anywhere in the suite, and the card tells you whether they are on air and
 * takes you straight to the frequency. That is why the room, not the
 * biography, is the part with the strongest contrast on it.
 *
 * Fetches only once opened. Rendering forty of these in a transcript would
 * otherwise be forty requests for cards nobody looked at.
 */
export function PersonCard({
  person,
  children,
  className,
}: {
  person: Person;
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const { data } = useFetch<PersonResponse>(open ? `/api/people/${person.id}` : null);

  const room = data?.coChannel;

  return (
    <HoverCard.Root
      open={open}
      onOpenChange={setOpen}
      openDelay={220}
      closeDelay={120}
    >
      {/* A button, so the card is reachable by keyboard and by tap, not only
          by a pointer that can hover. */}
      <HoverCard.Trigger asChild>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "min-w-0 rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            className,
          )}
        >
          {children}
        </button>
      </HoverCard.Trigger>

      <HoverCard.Portal>
        <HoverCard.Content
          sideOffset={8}
          collisionPadding={12}
          className="z-50 w-[min(20rem,calc(100vw-1.5rem))] rounded-lg border border-border bg-popover p-4 shadow-[var(--shadow-overlay)] data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:zoom-in-95"
        >
          <div className="flex items-start gap-3">
            <Avatar person={person} size={44} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{person.name}</p>
              <Identity person={person} className="text-[11px]" />
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                {person.role}
                {person.organization ? ` · ${person.organization}` : ""}
              </p>
            </div>
          </div>

          <p className="mt-2.5 line-clamp-3 text-[13px] leading-relaxed text-muted-foreground">
            {person.bio}
          </p>

          {room ? (
            <Link
              href={`/co-channel/${room.id}`}
              onClick={() => setOpen(false)}
              className="mt-3 block rounded-md border border-border bg-card p-2.5 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex items-center gap-1.5">
                <Broadcast size={13} className="shrink-0 text-muted-foreground" />
                <span className="readout text-xs">
                  {formatFrequency(room.frequency)}
                </span>
                <EcosystemMark ecosystem={room.ecosystem} size={12} />
                <span className="ml-auto flex shrink-0 items-center gap-1">
                  {room.recording && (
                    <Badge variant="signal" className="gap-1">
                      <span
                        aria-hidden
                        className="lamp-pulse size-1.5 rounded-full bg-current"
                      />
                      REC
                    </Badge>
                  )}
                  <GateBadge gate={room.primaryGate} />
                </span>
              </span>
              <span className="mt-1 block truncate text-[13px] font-medium">
                {room.title}
              </span>
              <span className="mt-0.5 block text-[11px] text-muted-foreground">
                On air with {room.occupantCount - 1} other
                {room.occupantCount - 1 === 1 ? "" : "s"}. Tune in.
              </span>
            </Link>
          ) : (
            <p className="mt-3 rounded-md border border-dashed border-border px-2.5 py-2 text-[12px] text-muted-foreground">
              Not on air right now.
            </p>
          )}
        </HoverCard.Content>
      </HoverCard.Portal>
    </HoverCard.Root>
  );
}
