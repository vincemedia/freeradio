"use client";

import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import { ENVELOPE, ENVELOPE_WINDOW_MS } from "@/data/audio";

/**
 * The speaking level, 0 to 1.
 *
 * Two sources, one shape. On the station with a real file behind it the level
 * is read from the measured envelope, so the bars carry the actual dynamics of
 * that recording, pauses included. Everywhere else there is no audio to
 * measure, so it is synthesised: a couple of detuned sines, which gives the
 * uneven rise and fall of speech without the twitchiness of random noise.
 *
 * Either way it stops dead when nobody is speaking. Nothing in this product
 * animates at rest, and a meter jittering in an empty room is the clearest
 * possible way to say the whole thing is fake.
 */
const FRAME_MS = 90;

export function useSpeakingLevel(
  active: boolean,
  opts: { fromAudio?: boolean; startedAt?: number } = {},
): number {
  const [level, setLevel] = useState(0);
  const started = useRef<number>(0);
  const reduced = usePrefersReducedMotion();

  const { fromAudio = false, startedAt } = opts;

  useEffect(() => {
    /* Silence and the reduced-motion reading are both derived below rather
       than written here: a setState in an effect body is a second render for
       a value that was already known. */
    if (!active || reduced) return;

    started.current = startedAt ?? performance.now();

    const timer = setInterval(() => {
      const elapsed = performance.now() - started.current;

      if (fromAudio) {
        const i = Math.floor(elapsed / ENVELOPE_WINDOW_MS);
        const value = ENVELOPE[i % ENVELOPE.length] ?? 0;
        setLevel(value / 100);
        return;
      }

      /* Two periods that do not divide into each other, so the pattern does
         not visibly repeat over the length of a turn. */
      const t = elapsed / 1000;
      const wave =
        0.55 +
        0.3 * Math.sin(t * 7.1) +
        0.15 * Math.sin(t * 11.7 + 1.3);
      setLevel(Math.max(0.08, Math.min(1, wave)));
    }, FRAME_MS);

    return () => clearInterval(timer);
  }, [active, reduced, fromAudio, startedAt]);

  if (!active) return 0;
  /* One steady reading rather than none: the meter still says somebody is
     talking, it just does not move while saying it. */
  if (reduced) return 0.6;
  return level;
}
