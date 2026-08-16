"use client";

import BoringAvatar from "boring-avatars";
import Image from "next/image";
import { getEcosystem } from "@/data/ecosystems";
import type { Person } from "@/data/schema";
import { formatFrequency } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * The fixed fallback palette from DESIGN.md.
 *
 * Identical across every app in the suite and never adapted to the brand, so
 * an identity marble stays recognisable as the same person wherever you meet
 * them. Exempt from the oklch rule because the library's API expects hex.
 */
const MARBLE = ["#5b1d99", "#0074b4", "#00b34c", "#ffd41f", "#fc6e3d"];

export function Avatar({
  person,
  size = 40,
  className,
}: {
  person: Person;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "relative inline-block shrink-0 overflow-hidden rounded-full bg-muted",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {person.photo ? (
        <Image
          src={person.photo}
          alt=""
          width={size}
          height={size}
          className="size-full object-cover"
          unoptimized
        />
      ) : (
        <BoringAvatar
          size={size}
          name={person.id}
          variant="marble"
          colors={MARBLE}
        />
      )}
    </span>
  );
}

/**
 * The wallet mark of an ecosystem.
 *
 * Sits immediately before the ecosystem part of an identity, the same way it
 * does elsewhere in the suite. Some marks are bare glyphs and need a plate
 * behind them or they vanish into the panel.
 */
export function EcosystemMark({
  ecosystem,
  size = 14,
  className,
}: {
  ecosystem: string;
  size?: number;
  className?: string;
}) {
  const eco = getEcosystem(ecosystem);
  if (!eco) return null;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xs align-middle",
        className,
      )}
      style={{
        width: size,
        height: size,
        backgroundColor: eco.iconPlate ?? undefined,
        padding: eco.iconPlate ? 1 : 0,
      }}
      title={eco.domain}
    >
      <Image
        src={eco.icon}
        alt=""
        width={size}
        height={size}
        className="size-full object-contain"
        unoptimized
      />
    </span>
  );
}

/**
 * `@handle@ecosystem`, with the wallet mark before the ecosystem part.
 *
 * The suffix is never dropped, even on the local band: two people in one room
 * can hold the same handle on different hosts, and this is the only thing
 * telling them apart. On numeric ecosystems the account number is the handle,
 * so the name people actually say is shown first and the number follows.
 */
export function Identity({
  person,
  className,
  showName = false,
}: {
  person: Person;
  className?: string;
  showName?: boolean;
}) {
  const eco = getEcosystem(person.ecosystem);
  return (
    <span
      className={cn("inline-flex min-w-0 max-w-full items-center gap-1", className)}
    >
      {showName && (
        <span className="truncate font-medium text-foreground">
          {person.name}
        </span>
      )}
      <span className="inline-flex min-w-0 max-w-full items-center gap-0.5 text-muted-foreground">
        {/* The handle truncates and the ecosystem does not: the suffix is what
            distinguishes two people with the same handle, so losing it would
            defeat the reason the suffix is always shown. */}
        <span className="truncate">
          @{person.username ?? person.handle}
        </span>
        <EcosystemMark ecosystem={person.ecosystem} className="shrink-0" />
        <span className="shrink-0">@{eco?.alias ?? person.ecosystem}</span>
      </span>
    </span>
  );
}

/**
 * A frequency and the band it is on.
 *
 * A frequency alone does not identify a room: 98.7 exists on every band and
 * means something different on each. Anywhere one is quoted back to somebody,
 * notably a toast fired the moment they act, the band comes with it.
 */
export function BandLine({
  frequency,
  ecosystem,
  className,
}: {
  frequency: number;
  ecosystem: string;
  className?: string;
}) {
  const eco = getEcosystem(ecosystem);
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className="readout">{formatFrequency(frequency)}</span>
      <span>MHz</span>
      <span aria-hidden>·</span>
      <EcosystemMark ecosystem={ecosystem} size={12} />
      <span>@{eco?.alias ?? ecosystem}</span>
    </span>
  );
}

/**
 * Overlapping avatars, densest first.
 *
 * The count that follows is the number *not* shown, which is what people read
 * it as. Showing the total instead makes a room of four look like a room of
 * seven.
 */
export function Facepile({
  people,
  max = 3,
  size = 32,
  className,
}: {
  people: Person[];
  max?: number;
  size?: number;
  className?: string;
}) {
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;
  return (
    <span className={cn("inline-flex items-center", className)}>
      {shown.map((p, i) => (
        <span
          key={p.id}
          className="relative rounded-full ring-2 ring-card"
          style={{
            marginLeft: i === 0 ? 0 : -size * 0.34,
            zIndex: shown.length - i,
          }}
        >
          <Avatar person={p} size={size} />
        </span>
      ))}
      {rest > 0 && (
        <span className="readout ml-1.5 text-xs text-muted-foreground">
          +{rest}
        </span>
      )}
    </span>
  );
}
