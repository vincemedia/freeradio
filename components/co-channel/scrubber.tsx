"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as player from "@/lib/player";
import { formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Where you are in a recording, and how to be somewhere else.
 *
 * ## Why the shape is real, or absent
 *
 * Where an envelope exists it is drawn: the file decoded to mono, the RMS of
 * every 100ms window, normalised. That is a picture of the recording, and it
 * is useful in the way a waveform is useful — the gaps are where nobody spoke,
 * so you can see the shape of a conversation and aim at the part you want.
 *
 * Where no envelope exists, no shape is drawn. Recordings made through
 * RealtimeKit have no envelope: computing one means fetching and decoding the
 * whole file in the browser, which for an hour of audio is tens of megabytes
 * pulled off Cloudflare to draw a picture nobody asked for. The alternative —
 * a plausible-looking waveform generated from the id — was the first thing
 * that came to mind and is exactly the kind of decoration that makes every
 * true thing beside it suspect. So those get a plain bar, which is honest
 * about being a position and not a portrait, and seeks just as well.
 *
 * ## Seeking
 *
 * Click anywhere. Arrow keys move by five seconds, which is the unit of "I
 * missed that" — shorter and you press it repeatedly, longer and you overshoot
 * the sentence. Home and End for the ends. It is a real slider to assistive
 * technology, with the time as its value text, because "42 percent" is not
 * what anybody wants read out.
 */

/** What one arrow press moves. The size of a missed sentence. */
const STEP = 5;

export function Scrubber({
  duration,
  envelope,
  /** whether this scrubber's recording is the one the player currently holds */
  active,
  className,
}: {
  duration: number;
  envelope?: number[];
  active: boolean;
  className?: string;
}) {
  const [at, setAt] = useState(0);
  const track = useRef<HTMLDivElement>(null);

  /* Followed from the element rather than counted here: a timer that thinks it
     knows where the audio is will disagree with it after any stall. */
  useEffect(() => {
    if (!active) return;
    const read = () => setAt(player.position());
    /* Subscribed rather than read here: `timeupdate` fires immediately enough
       that there is nothing to catch up on, and reading in the effect body
       would be a setState cascade for a value arriving a frame later anyway. */
    const offTime = player.listen("timeupdate", read);
    const offSeek = player.listen("seeked", read);
    return () => {
      offTime();
      offSeek();
      /* Back to the start when this recording is no longer the one playing:
       the position belonged to the playback, not to the row. */
      setAt(0);
    };
  }, [active]);

  const fraction = duration > 0 ? Math.min(1, at / duration) : 0;

  const seekTo = useCallback(
    (seconds: number) => {
      const clamped = Math.max(0, Math.min(duration, seconds));
      setAt(clamped);
      if (active) player.seek(clamped);
    },
    [active, duration],
  );

  const seekFromPointer = (clientX: number) => {
    const box = track.current?.getBoundingClientRect();
    if (!box || box.width === 0) return;
    seekTo(((clientX - box.left) / box.width) * duration);
  };

  return (
    <div className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <div
        ref={track}
        role="slider"
        tabIndex={0}
        aria-label="Position in this recording"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(at)}
        aria-valuetext={`${formatDuration(Math.round(at))} of ${formatDuration(duration)}`}
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          e.currentTarget.setPointerCapture(e.pointerId);
          seekFromPointer(e.clientX);
        }}
        onPointerMove={(e) => {
          if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
          seekFromPointer(e.clientX);
        }}
        onKeyDown={(e) => {
          const by =
            e.key === "ArrowRight" ? STEP : e.key === "ArrowLeft" ? -STEP : 0;
          if (by !== 0) {
            e.preventDefault();
            e.stopPropagation();
            seekTo(at + by);
            return;
          }
          if (e.key === "Home") {
            e.preventDefault();
            seekTo(0);
          }
          if (e.key === "End") {
            e.preventDefault();
            seekTo(duration);
          }
        }}
        className="group relative min-w-0 flex-1 cursor-pointer rounded-sm py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {envelope && envelope.length > 0 ? (
          <Waveform envelope={envelope} fraction={fraction} />
        ) : (
          <Bar fraction={fraction} />
        )}
      </div>

      {/* Both ends of the journey, in the instrument's numerals. Tabular so
          the row does not twitch as the seconds tick. */}
      <span className="readout shrink-0 text-[11px] tabular-nums text-muted-foreground">
        {formatDuration(Math.round(at))}
        <span className="px-0.5 opacity-50">/</span>
        {formatDuration(duration)}
      </span>
    </div>
  );
}

/**
 * The recording's own shape.
 *
 * Fixed number of columns regardless of how long the file is, so a five-minute
 * broadcast and an hour-long one are read the same way: each column is the
 * loudest moment in its slice, because a mean would flatten every pause into
 * the same mid-grey and the pauses are the information.
 */
const COLUMNS = 96;

function Waveform({
  envelope,
  fraction,
}: {
  envelope: number[];
  fraction: number;
}) {
  const per = envelope.length / COLUMNS;
  const columns = Array.from({ length: COLUMNS }, (_, i) => {
    const from = Math.floor(i * per);
    const to = Math.max(from + 1, Math.floor((i + 1) * per));
    let peak = 0;
    for (let j = from; j < to && j < envelope.length; j++) {
      if (envelope[j] > peak) peak = envelope[j];
    }
    return peak / 100;
  });

  return (
    <span aria-hidden className="flex h-6 items-center gap-px">
      {columns.map((value, i) => {
        const played = i / COLUMNS <= fraction;
        return (
          <span
            key={i}
            className={cn(
              "flex-1 rounded-[1px] transition-colors duration-75",
              played ? "bg-primary" : "bg-border",
            )}
            /* A floor, so silence is still a visible line rather than a gap in
               the object — the bar should read as one continuous thing you can
               click, quiet passages included. */
            style={{ height: `${Math.max(12, value * 100)}%` }}
          />
        );
      })}
    </span>
  );
}

/** No shape to show, so a position and nothing implied about the content. */
function Bar({ fraction }: { fraction: number }) {
  return (
    <span aria-hidden className="block h-1.5 w-full rounded-full bg-border">
      <span
        className="block h-full rounded-full bg-primary transition-[width] duration-75"
        style={{ width: `${fraction * 100}%` }}
      />
    </span>
  );
}
