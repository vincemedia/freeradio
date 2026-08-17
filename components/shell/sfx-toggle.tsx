"use client";

import { useSyncExternalStore } from "react";
import { Check, SpeakerHigh, SpeakerSlash } from "@phosphor-icons/react";
import { play, setSfxEnabled, sfxEnabled } from "@/lib/sfx";
import { cn } from "@/lib/utils";

/**
 * Whether the interface makes noises.
 *
 * A radio makes noises, and the two that matter here — somebody arrived,
 * somebody left — are facts you would otherwise have to be watching a grid to
 * learn. But sound you cannot stop is hostile, and somebody listening to a
 * broadcast on headphones has to be able to stop the furniture talking over
 * it. So it is one switch, on by default, remembered in this browser.
 *
 * Turning it on plays the sound it just enabled. A preference about sound
 * should be audible the moment you set it, or you have to go and find out.
 */

const OPTIONS = [
  { on: true, label: "On", icon: SpeakerHigh, hint: "Arrivals, departures, menus" },
  { on: false, label: "Off", icon: SpeakerSlash, hint: "Voices only" },
] as const;

export function SfxToggle() {
  /* Read as an external store: the value lives in localStorage, so there is
     nothing for React to own and no effect to cascade. */
  const on = useSyncExternalStore(
    () => () => {},
    () => sfxEnabled(),
    () => true,
  );

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {OPTIONS.map((option) => {
        const active = on === option.on;
        const Icon = option.icon;
        return (
          <button
            key={option.label}
            type="button"
            aria-pressed={active}
            onClick={() => {
              setSfxEnabled(option.on);
              if (option.on) play("open-menu");
            }}
            className={cn(
              "flex items-start gap-2.5 rounded-md border p-3 text-left transition-colors",
              active
                ? "border-primary bg-primary/10"
                : "border-border bg-card hover:bg-muted/50",
            )}
          >
            <Icon size={17} className="mt-0.5 shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">{option.label}</span>
              <span className="mt-0.5 block text-[11px] text-muted-foreground">
                {option.hint}
              </span>
            </span>
            {active && <Check size={15} className="mt-0.5 shrink-0" />}
          </button>
        );
      })}
    </div>
  );
}
