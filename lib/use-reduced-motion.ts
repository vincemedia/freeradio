"use client";

import { useMediaQuery } from "@/lib/use-media-query";

/**
 * The reader's motion preference, as a value rather than an effect.
 *
 * Subscribed, so it also responds if they change it while the page is open.
 * Returns false on the server, where there is no preference to read and no
 * motion to reduce.
 */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}
