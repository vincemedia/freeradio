"use client";

import { useCallback, useEffect, useState } from "react";
import * as player from "@/lib/player";

/**
 * Playing one recording, from more than one control.
 *
 * The logic used to live inside the play button, which was fine while the
 * button was the only way to start something. It is not any more: a row in the
 * recordings list plays when you click it anywhere that is not already a
 * control, and a scrubber needs to know whether the thing it is drawing is the
 * thing being played. Three consumers of one fact, so the fact moved here.
 *
 * The element itself is shared app-wide (see `lib/player`) — a radio has one
 * speaker — so this is about who currently holds it and whether that is us.
 */
export function useTrack(src: string | undefined, autoPlay = false) {
  const [playing, setPlaying] = useState(false);

  /* Stable across renders so the player can recognise this holder when
     somebody else claims the element. */
  const onLost = useCallback(() => setPlaying(false), []);

  /* The element is shared, so it can also end or be paused by something other
     than this control. Following its events keeps the icon honest. */
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
     gesture, so this is an attempt rather than a promise: if it is refused the
     control is simply there, unpressed, which is the honest fallback. */
  useEffect(() => {
    if (!autoPlay || !src) return;
    let cancelled = false;

    /* It may already be playing: the gesture that got us here started it,
       because navigating would otherwise have spent the permission. Adopt that
       stream rather than restarting it from the top. */
    void (async () => {
      if (player.isPlaying()) {
        player.adopt(onLost);
        if (!cancelled) setPlaying(true);
        return;
      }
      const started = await player.claim(src, 0, onLost);
      if (!cancelled) setPlaying(started);
    })();
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
    /* A click is a gesture, so this is the one place audio is allowed to start
       without asking twice. */
    setPlaying(await player.claim(src, 0, onLost));
  }, [src, playing, onLost]);

  return { playing, toggle };
}
