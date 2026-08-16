"use client";

import { useSyncExternalStore } from "react";
import { apiFetch } from "@/lib/api";

/**
 * The live BSV price, shared by every component that shows money.
 *
 * One poll for the whole app rather than one per component: the rate is the
 * same everywhere on the page, and six hooks would be six requests for one
 * number. Subscribers are notified from a module-level store, which is also
 * why a component mounting late gets the rate immediately instead of blanking
 * until its own fetch lands.
 *
 * Null while it is unknown, and null again if the upstream goes away. Callers
 * show the dollar figure alone in that case rather than a stale conversion:
 * a satoshi amount computed from yesterday's rate is a wrong number wearing
 * the clothes of a precise one.
 */
export interface Rate {
  usdPerBsv: number;
  at: string;
  source: string;
}

/** Ten minutes. The rate moves, but not enough to redraw a price list over. */
const POLL_MS = 10 * 60 * 1000;

let rate: Rate | null = null;
let started = false;
const listeners = new Set<() => void>();

async function load() {
  try {
    rate = await apiFetch<Rate>("/api/price");
  } catch {
    /* Unreachable, or quoting nonsense. Either way the app falls back to
       dollars rather than showing satoshis it cannot stand behind. */
    rate = null;
  }
  for (const l of listeners) l();
}

function start() {
  if (started) return;
  started = true;
  void load();
  setInterval(() => void load(), POLL_MS);
  /* A tab left open overnight comes back to a rate from last night. */
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void load();
  });
}

/**
 * Subscribed rather than fetched into state, so a component mounting late
 * reads the rate that is already known instead of rendering empty and then
 * correcting itself. `rate` is only ever replaced, never mutated, so the
 * snapshot is stable between polls.
 */
export function usePrice(): Rate | null {
  return useSyncExternalStore(
    (onChange) => {
      start();
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
    () => rate,
    () => null,
  );
}

/** Satoshis in one bitcoin. */
export const SATS_PER_BSV = 100_000_000;

export function usdToSats(usd: number, usdPerBsv: number): number {
  return Math.round((usd / usdPerBsv) * SATS_PER_BSV);
}

/**
 * The point where satoshis stop being the readable unit.
 *
 * A hundredth of a bitcoin. Below it the amount is a countable number of
 * satoshis; above it the digits run away — a three dollar recording came out
 * as "19,710,907 sats", which is precise and unreadable, where "0.1971 BSV"
 * is the same amount at a glance.
 */
const BSV_ABOVE = SATS_PER_BSV / 100;

export function formatSats(sats: number): string {
  if (sats >= BSV_ABOVE) {
    const bsv = sats / SATS_PER_BSV;
    return `${bsv.toFixed(bsv >= 10 ? 2 : 4)} BSV`;
  }
  return `${sats.toLocaleString("en-GB")} sats`;
}

export function formatUsd(usd: number): string {
  return `$${Number.isInteger(usd) ? usd : usd.toFixed(2)}`;
}
