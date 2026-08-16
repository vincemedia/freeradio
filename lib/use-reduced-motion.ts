"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

/**
 * The reader's motion preference, as a value rather than an effect.
 *
 * Subscribed, so it also responds if they change it while the page is open,
 * which is the case a one-off read at mount silently gets wrong. Returns false
 * on the server, where there is no preference to read and no motion to reduce.
 */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(QUERY);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
