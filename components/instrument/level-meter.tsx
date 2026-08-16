"use client";

import { cn } from "@/lib/utils";

/** How many bars a meter draws. Odd, so there is a middle to peak around. */
const BARS = 5;

/**
 * A level meter, in the instrument's language.
 *
 * Bars rather than a waveform: this is a VU reading, not a recording, and the
 * question it answers is "is this person talking, and how loudly", which one
 * column per band answers better than a wiggling line.
 *
 * Scaled with `transform`, never `height`, so a meter running at 10Hz beside
 * six avatars does not relayout the grid on every tick. The bars are drawn at
 * full height and squashed, which is why the origin is the bottom.
 */
export function LevelMeter({
  /** 0 to 1; anything at or below zero is silence and the meter rests */
  level,
  className,
  barClassName,
}: {
  level: number;
  className?: string;
  barClassName?: string;
}) {
  /* A single number becomes a shape: the middle band carries the most, the
     outer bands less, so a voice reads as a peak rather than a block. */
  const weights = [0.55, 0.8, 1, 0.75, 0.5];

  return (
    <span
      aria-hidden
      className={cn("flex items-end gap-[2px]", className)}
      style={{ height: 14 }}
    >
      {Array.from({ length: BARS }).map((_, i) => {
        const scale = Math.max(0.12, Math.min(1, level * weights[i]));
        return (
          <span
            key={i}
            className={cn(
              "w-[2px] flex-none rounded-full bg-[var(--ring-speaking)] transition-transform duration-100 ease-out motion-reduce:transition-none",
              barClassName,
            )}
            style={{ height: 14, transformOrigin: "bottom", transform: `scaleY(${scale})` }}
          />
        );
      })}
    </span>
  );
}
