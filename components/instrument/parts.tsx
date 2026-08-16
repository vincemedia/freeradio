"use client";

import { cn } from "@/lib/utils";

/**
 * The instrument vocabulary.
 *
 * These are the only components in the product allowed to look like hardware,
 * and each earns it by carrying information a flat control could not. The
 * skeuomorphism is an inset highlight, a tick scale, a perforation grid and
 * lit lamps. There is no gloss, no bevel, and no gradient standing in for
 * plastic anywhere in this file.
 */

/** The front panel every control is mounted on. */
export function Panel({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("panel rounded-xl", className)} {...props} />;
}

/**
 * Speaker perforation.
 *
 * Purely a surface, so it is hidden from assistive technology. It exists to
 * say "this part of the object makes sound", which is true of the occupant
 * grid and of nothing else in the app.
 */
export function Grille({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden className={cn("grille", className)} {...props} />;
}

type LampState = "off" | "on-air" | "recording" | "live";

const LAMP_COLOR: Record<LampState, string> = {
  off: "var(--lamp-off)",
  "on-air": "var(--lamp-on-air)",
  recording: "var(--lamp-recording)",
  live: "var(--lamp-live)",
};

/**
 * An indicator lamp.
 *
 * Literal and small. The recording lamp pulses because a recording light that
 * looks identical to a power light is the one piece of dishonesty this product
 * cannot afford. Under `prefers-reduced-motion` it goes solid rather than
 * disappearing, so the state survives with zero animation.
 *
 * The label sits adjacent, never floating, and is what a screen reader gets.
 */
export function Lamp({
  state,
  label,
  className,
  showLabel = false,
}: {
  state: LampState;
  label: string;
  className?: string;
  showLabel?: boolean;
}) {
  const lit = state !== "off";
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span
        aria-hidden
        className={cn(
          "size-2 shrink-0 rounded-full",
          state === "recording" && "lamp-pulse",
        )}
        style={{
          backgroundColor: LAMP_COLOR[state],
          boxShadow: lit ? "var(--lamp-glow)" : undefined,
        }}
      />
      {showLabel ? (
        <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
          {label}
        </span>
      ) : (
        <span className="sr-only">{label}</span>
      )}
    </span>
  );
}

/**
 * The ring that says who is talking.
 *
 * Width carries the signal and colour only reinforces it, so it still reads
 * for somebody who cannot separate yellow from grey. Animated by scaling a
 * ring element rather than by transitioning `border-width`, which would
 * relayout on every frame.
 */
export function SpeakingRing({
  speaking,
  className,
  children,
}: {
  speaking: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span className={cn("relative inline-flex shrink-0", className)}>
      {children}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute -inset-[3px] rounded-full border-[3px] transition-[transform,opacity] duration-150 ease-[var(--ease-out-quint)]",
          speaking
            ? "scale-100 opacity-100"
            : "scale-90 opacity-0",
        )}
        style={{ borderColor: "var(--ring-speaking)" }}
      />
    </span>
  );
}
