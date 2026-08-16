"use client";

import { useSyncExternalStore } from "react";

/**
 * A media query as a value.
 *
 * Subscribed, so it also answers correctly when the viewport changes while
 * the page is open, which is the case a one-off read at mount silently gets
 * wrong. Returns false on the server, where there is no viewport to measure:
 * anything gated on this renders its narrow form first and corrects on
 * hydration, which is the right way round for a phone.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Tailwind's `md`, where the top bar's own navigation appears. */
export const MD = "(min-width: 48rem)";
