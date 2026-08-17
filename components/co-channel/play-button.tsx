"use client";

import { Pause, Play, SpeakerSlash } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { useTrack } from "@/lib/use-track";

/**
 * Play a recording, where there is one to play.
 *
 * Three of the recordings in this prototype are real files and the rest are
 * rows with a duration and nothing behind them. This control says which is
 * which rather than pretending: with no source it is inert and labelled, and
 * the app's own rule about the price being the button applies here too — a
 * play control that does nothing when pressed is the dishonest version.
 *
 * It follows the shared player rather than owning an element, so pressing
 * play on a second recording stops the first without either of them having to
 * know about the other.
 */
export function PlayButton({
  src,
  title,
  labelled = false,
  lockedReason,
  autoPlay = false,
  className,
  /* When the row around this owns the playback, the button reflects it rather
     than keeping a second opinion. */
  playing: playingProp,
  onToggle: toggleProp,
}: {
  src?: string;
  title: string;
  /** show the word beside the glyph, for the one control on a detail page */
  labelled?: boolean;
  /** why it is unavailable, when the reason is the price rather than the file */
  lockedReason?: string;
  /** start on mount; used when arriving somewhere meant to be playing */
  autoPlay?: boolean;
  className?: string;
  playing?: boolean;
  onToggle?: () => void;
}) {
  /* The playing state and the toggle both live in `lib/use-track` now: a row
     in the recordings list plays when you click it anywhere, so the button is
     no longer the only control over one recording. */
  const own = useTrack(src, autoPlay);
  const playing = playingProp ?? own.playing;
  const toggle = toggleProp ?? own.toggle;

  if (!src) {
    /* Two different reasons to be inert, and they must not look the same: one
       is a locked door you can pay to open, the other is a file that does not
       exist in this prototype. */
    const reason = lockedReason ?? "This recording has no audio in the prototype";
    return (
      <Button
        variant="secondary"
        size={labelled ? "sm" : "icon"}
        disabled
        title={reason}
        aria-label={`${title}: ${reason}`}
        className={className}
      >
        {lockedReason ? (
          <Play size={labelled ? 15 : undefined} weight="fill" />
        ) : (
          <SpeakerSlash size={labelled ? 15 : undefined} />
        )}
        {labelled && (lockedReason ? "Play" : "No audio")}
      </Button>
    );
  }

  return (
    <Button
      variant={playing ? "primary" : labelled ? "primary" : "secondary"}
      size={labelled ? "sm" : "icon"}
      aria-label={playing ? `Pause ${title}` : `Play ${title}`}
      aria-pressed={playing}
      onClick={() => void toggle()}
      className={className}
    >
      {playing ? (
        <>
          <Pause size={labelled ? 15 : undefined} weight="fill" />
          {labelled && "Pause"}
        </>
      ) : (
        <>
          <Play size={labelled ? 15 : undefined} weight="fill" />
          {labelled && "Play"}
        </>
      )}
    </Button>
  );
}
