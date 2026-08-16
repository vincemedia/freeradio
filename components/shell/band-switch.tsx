"use client";

import { DropdownMenu } from "radix-ui";
import { CaretDown, Check } from "@phosphor-icons/react";
import useSWRLike from "@/lib/use-fetch";
import { EcosystemMark } from "@/components/identity";
import type { Ecosystem } from "@/data/schema";
import { useRadio } from "@/lib/store";
import { useOnAir } from "@/lib/use-on-air";
import { cn } from "@/lib/utils";

type Band = Ecosystem & {
  coChannelCount: number;
  occupantCount: number;
};

/**
 * The band switch.
 *
 * Literally a band switch: changing it re-populates the whole scale, because
 * a frequency is only unique within one ecosystem. Each option carries how
 * busy that band is, since the only reason to leave the one you are on is
 * that something is happening elsewhere.
 */
export function BandSwitch({ className }: { className?: string }) {
  const { data: bands } = useSWRLike<Band[]>("/api/ecosystems");
  const ecosystem = useRadio((s) => s.ecosystem);
  const setEcosystem = useRadio((s) => s.setEcosystem);
  const followed = useRadio((s) => s.followed);

  /* How many people you know are on each band, counted from your own
     contacts. The server has no idea and should not: contacts never leave
     this browser. */
  const onAir = useOnAir();
  const known: Record<string, number> = {};
  for (const { room } of onAir) known[room.ecosystem] = (known[room.ecosystem] ?? 0) + 1;

  const current = bands?.find((b) => b.id === ecosystem);

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        className={cn(
          "inline-flex h-9 items-center gap-2 rounded-md border border-border bg-card px-2.5 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          className,
        )}
      >
        <EcosystemMark ecosystem={ecosystem} size={16} />
        <span className="max-w-[9rem] truncate">
          {current?.name ?? "Band"}
        </span>
        {current && current.coChannelCount > 0 && (
          <span className="readout text-xs text-muted-foreground">
            {current.coChannelCount}
          </span>
        )}
        <CaretDown size={12} className="text-muted-foreground" />
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          className="z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-border bg-popover p-1 shadow-[var(--shadow-overlay)] data-[state=open]:animate-in data-[state=open]:fade-in"
        >
          {/* Followed bands first, the rest under their own heading. The
              onboarding choice has to change something, and this is the thing
              it changes: what you reach for is not buried under what you do
              not follow. */}
          {(
            [
              ["Following", bands?.filter((b) => followed.includes(b.id)) ?? []],
              ["Other bands", bands?.filter((b) => !followed.includes(b.id)) ?? []],
            ] as const
          ).map(([heading, rows]) =>
            rows.length === 0 ? null : (
              <div key={heading}>
                <p className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                  {heading}
                </p>
                {rows.map((b) => (
                  <DropdownMenu.Item
                    key={b.id}
                    onSelect={() => setEcosystem(b.id)}
                    className="flex cursor-pointer items-start gap-2.5 rounded-md px-2 py-2 text-sm outline-none data-[highlighted]:bg-muted"
                  >
                    <EcosystemMark ecosystem={b.id} size={18} className="mt-0.5" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate font-medium">{b.name}</span>
                        {b.local && (
                          <span className="shrink-0 text-[11px] text-muted-foreground">
                            you are here
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {b.coChannelCount === 0
                          ? "Nothing on air"
                          : `${b.coChannelCount} on air, ${b.occupantCount} talking`}
                        {(known[b.id] ?? 0) > 0 && `, ${known[b.id]} you know`}
                      </span>
                    </span>
                    {b.id === ecosystem && (
                      <Check size={14} className="mt-1 shrink-0 text-foreground" />
                    )}
                  </DropdownMenu.Item>
                ))}
              </div>
            ),
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
