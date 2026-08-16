"use client";

import { useCallback, useEffect, useState } from "react";
import { Pause, Play, SpeakerSlash } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import * as player from "@/lib/player";

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
}) {
  const [playing, setPlaying] = useState(false);
  /* Stable across renders so the player can recognise this holder when
     somebody else claims the element. `setPlaying` is itself stable, so the
     empty dependency list is the whole story. */
  const onLost = useCallback(() => setPlaying(false), []);

  /* The element is shared, so it can also end or be paused by something other
     than this button. Following its events keeps the icon honest. */
  useEffect(() => {
    if (!playing) return;
    const stop = () => setPlaying(false);
    const offEnd = player.listen("ended", stop);
    const offPause = player.listen("pause", stop);
    return () => {
      offEnd();
      offPause();
    };
  }, [playing]);

  useEffect(() => () => player.release(onLost), [onLost]);

  /* Arriving somewhere meant to be playing. Browsers refuse audio without a
     gesture, so this is an attempt rather than a promise: if it is refused
     the button is simply there, unpressed, which is the honest fallback. */
  useEffect(() => {
    if (!autoPlay || !src) return;
    let cancelled = false;
    void player.claim(src, 0, onLost).then((started) => {
      if (!cancelled) setPlaying(started);
    });
    return () => {
      cancelled = true;
    };
  }, [autoPlay, src, onLost]);

  const toggle = useCallback(async () => {
    if (!src) return;
    if (playing) {
      player.release(onLost);
      setPlaying(false);
      return;
    }
    /* A click is a gesture, so this is the one place audio is allowed to
       start without asking twice. */
    setPlaying(await player.claim(src, 0, onLost));
  }, [src, playing, onLost]);

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
