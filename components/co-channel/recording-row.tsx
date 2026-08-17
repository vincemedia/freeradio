"use client";

import Link from "next/link";
import { LockKey } from "@phosphor-icons/react";
import { Facepile, Identity } from "@/components/identity";
import { PlayButton } from "@/components/co-channel/play-button";
import { RecordingActions } from "@/components/co-channel/recording-actions";
import { Scrubber } from "@/components/co-channel/scrubber";
import { Price, usePriceLabel } from "@/components/price";
import { Button } from "@/components/ui/button";
import type { Person, Recording } from "@/data/schema";
import { formatAgo, formatCount, formatFrequency } from "@/lib/format";
import { useTrack } from "@/lib/use-track";
import { cn } from "@/lib/utils";

export type RecordingRowData = Recording & {
  /** null when the station it came from was an open one nobody had claimed */
  host: Person | null;
  /** amplitude per 100ms window, where the file has been measured */
  envelope?: number[];
  occupantsResolved: Person[];
  priceUsd: number;
  platformFee: number;
};

/**
 * One recording, as a row you can operate.
 *
 * The row is the control. Clicking it anywhere that is not already a button or
 * a link plays it, which is what a list of playable things should do — hunting
 * for a small round target in order to hear the thing the row is about is a
 * step that exists only because the markup happened that way.
 *
 * That means the row owns the playback rather than the button inside it, so the
 * two cannot disagree and the scrubber has a position to draw. It lifts on
 * hover like every other card in the product, because it is one.
 */
export function RecordingRow({
  recording: r,
  locked,
  onUnlock,
}: {
  recording: RecordingRowData;
  locked: boolean;
  onUnlock: () => void;
}) {
  const priceLabel = usePriceLabel();
  const src = locked ? undefined : r.audioSrc;
  const { playing, toggle } = useTrack(src);

  return (
    <li
      id={r.id}
      /* Not a button: it contains a link and two buttons, and a button
         containing interactive elements is not something HTML allows. The
         handler checks what was actually hit instead, so every control inside
         keeps its own behaviour. */
      onClick={(e) => {
        if (!src) return;
        const el = e.target as HTMLElement;
        if (el.closest("button,a,[role='slider']")) return;
        void toggle();
      }}
      className={cn(
        "lift flex items-center gap-3 rounded-lg border border-border bg-card p-3 sm:p-4",
        src && "cursor-pointer",
      )}
    >
      {/* Locked rows keep both controls: the lock is the price and the play
          button beside it is what the price buys, greyed until it is paid.
          Swapping one for the other hid the thing being sold behind the thing
          selling it. */}
      <div className="flex shrink-0 items-center gap-1.5">
        {locked && (
          <Button
            variant="secondary"
            size="icon"
            aria-label={`Unlock ${r.title} for ${priceLabel(r.priceUsd)}`}
            onClick={onUnlock}
          >
            <LockKey />
          </Button>
        )}
        <PlayButton
          src={src}
          title={r.title}
          lockedReason={locked ? "Unlock this recording to play it" : undefined}
          playing={playing}
          onToggle={() => void toggle()}
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="readout text-xs text-muted-foreground">
            {formatFrequency(r.frequency)}
          </span>
          <h2 className="min-w-0 text-sm font-medium">
            {/* Each recording has its own address, so a row is somewhere to go
                as well as something to play. */}
            <Link
              href={`/recordings/${r.id}`}
              className="rounded-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {r.title}
            </Link>
          </h2>
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          {r.host ? (
            <Identity person={r.host} className="text-[11px]" />
          ) : (
            <span>Open station</span>
          )}
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

        {/* The shape of the thing, and where you are in it. Under the title
            rather than beside it, because it wants the width — a waveform
            squeezed into a corner is a texture rather than a map. The duration
            moved here too: it was one of five numbers on the line above, and
            the one place it is genuinely useful is beside the position it is
            counting towards. */}
        {src && (
          <Scrubber
            duration={r.duration}
            envelope={r.envelope}
            active={playing}
            className="mt-2"
          />
        )}
      </div>

      {/* Who was in it, then what you can do with it, both hard right. */}
      <div className="flex shrink-0 items-center gap-2">
        <Facepile
          people={r.occupantsResolved}
          max={3}
          size={24}
          className="hidden sm:inline-flex"
        />
        <RecordingActions recording={r} />
      </div>
    </li>
  );
}
