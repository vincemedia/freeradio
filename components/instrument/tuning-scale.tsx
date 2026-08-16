"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import type { GateKind } from "@/data/schema";
import { formatFrequency } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Horizontal padding of the rails inside the track, in pixels. */
const RAIL_INSET = 12;

/**
 * A readout that counts to its value instead of jumping to it.
 *
 * Exponential approach rather than a fixed duration, so it behaves correctly
 * in both cases it has to serve: a scan is a jump and the digits roll through
 * the frequencies in between, while a drag moves in tenths and the readout
 * stays under your finger rather than lagging a fixed 400ms behind it.
 *
 * Stops when it arrives. Nothing in this product animates at rest, and a rAF
 * loop that never settles is exactly that.
 */
function useCountTo(target: number, step: number): number {
  const [display, setDisplay] = useState(target);
  const frame = useRef<number>(undefined);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (reduced) return;

    const tick = () => {
      setDisplay((current) => {
        const gap = target - current;
        /* Close enough to be the same number once rounded: land exactly and
           let the loop end. */
        if (Math.abs(gap) < step / 2) return target;
        frame.current = requestAnimationFrame(tick);
        return current + gap * 0.18;
      });
    };
    frame.current = requestAnimationFrame(tick);

    return () => {
      if (frame.current !== undefined) cancelAnimationFrame(frame.current);
    };
  }, [target, step, reduced]);

  /* Reduced motion returns the real value rather than writing it into state,
     which would be a synchronous setState in an effect for no gain. */
  return reduced ? target : display;
}

export interface Station {
  id: string;
  /** live stations are joinable; recorded ones are played */
  kind?: "live" | "recorded";
  frequency: number;
  title: string;
  occupantCount: number;
  contactCount: number;
  primaryGate: GateKind;
  recording: boolean;
}

/** A frequency somebody is paying to keep, whether or not it is on air. */
export interface Hold {
  id: string;
  frequency: number;
  label: string;
}

/**
 * The tuning scale.
 *
 * A real dial, not a slider with decoration. Ticks are the only ornament and
 * every one of them is a frequency: minor at each 0.5, major at each whole
 * MHz, labelled every 2 so the numerals stay legible on a phone.
 *
 * The gaps are as important as the stations. A list of rooms is a list; the
 * reason to draw a band is that you can see the empty stretches, which is what
 * makes scanning mean anything.
 *
 * Positioning is done with `translateX` on a full-width rail rather than with
 * `left`, so tuning animates on the compositor and never triggers layout.
 * A percentage translate is relative to the element's own width, which is why
 * the rail spans the whole track.
 */
export function TuningScale({
  min,
  max,
  step,
  value,
  stations,
  holds = [],
  onChange,
  className,
}: {
  min: number;
  max: number;
  step: number;
  value: number;
  stations: Station[];
  /** reserved but silent frequencies, drawn as outlines rather than marks */
  holds?: Hold[];
  onChange: (frequency: number) => void;
  className?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const pct = ((value - min) / (max - min)) * 100;
  /* Only the digits count. The needle, the marks and the announced value all
     use the real frequency, so assistive tech never hears an in-between
     number and the needle never disagrees with the scale. */
  const counting = useCountTo(value, step);

  const snap = useCallback(
    (raw: number) => {
      const clamped = Math.min(max, Math.max(min, raw));
      /* Detents. The dial moves in tenths, so a value between them is not a
         frequency anybody can be tuned to. */
      return Number((Math.round(clamped / step) * step).toFixed(1));
    },
    [min, max, step],
  );

  const fromClientX = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el) return value;
      const rect = el.getBoundingClientRect();
      /* The rails are inset by RAIL_INSET, so the usable span is narrower
         than the track. Without this the needle lags the pointer, worst at
         the ends of the band. */
      const usable = rect.width - RAIL_INSET * 2;
      const ratio = (clientX - rect.left - RAIL_INSET) / usable;
      return snap(min + ratio * (max - min));
    },
    [min, max, snap, value],
  );

  const handlePointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragging.current = true;
    onChange(fromClientX(e.clientX));
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    onChange(fromClientX(e.clientX));
  };

  const endDrag = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    dragging.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const big = e.shiftKey ? 1 : step;
    let next: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") next = value + big;
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") next = value - big;
    if (e.key === "Home") next = min;
    if (e.key === "End") next = max;
    if (next === null) return;
    e.preventDefault();
    const v = snap(next);
    onChange(v);
  };

  /* Ticks are computed in tenths of a MHz to avoid the float drift you get
     from accumulating 0.5 across forty steps. */
  const ticks = useMemo(() => {
    const out: { f: number; major: boolean; label: string | null }[] = [];
    for (let t = Math.round(min * 10); t <= Math.round(max * 10); t += 5) {
      const f = t / 10;
      const major = t % 10 === 0;
      out.push({
        f,
        major,
        label: major && (t / 10) % 2 === 0 ? String(t / 10) : null,
      });
    }
    return out;
  }, [min, max]);

  const tuned = stations.find(
    (s) => Math.abs(s.frequency - value) < step / 2,
  );
  const heldHere = holds.find(
    (h) => Math.abs(h.frequency - value) < step / 2,
  );

  return (
    <div className={cn("select-none", className)}>
      {/* Readout. Adjacent to the scale it describes, never floating. */}
      <div className="mb-2 flex items-end justify-between gap-3">
        <div className="flex items-baseline gap-1.5">
          <span className="readout font-display text-3xl leading-none tracking-tight tabular-nums">
            {formatFrequency(counting)}
          </span>
          <span className="text-xs font-medium text-muted-foreground">MHz</span>
        </div>
        <span className="truncate text-right text-xs text-muted-foreground">
          {tuned
            ? tuned.title
            : heldHere
              ? `Held for ${heldHere.label}`
              : "No station on this frequency"}
        </span>
      </div>

      {/* The rails inside are full-width and translated by up to 100%, which
          would push them past the track and make the page scroll sideways.
          They are inset by 12px instead, and the track clips anything that
          still reaches the edge, so the page body never scrolls horizontally. */}
      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-label="Tuning scale"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={`${formatFrequency(value)} megahertz${tuned ? `, ${tuned.title}` : ", no station"}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={handleKeyDown}
        className="relative h-20 cursor-ew-resize touch-none overflow-hidden rounded-md border border-panel-border bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {/* Ticks. The only ornament, and each one is a frequency. */}
        <div aria-hidden className="absolute inset-y-0 left-3 right-3">
          {ticks.map((t) => {
            const p = ((t.f - min) / (max - min)) * 100;
            return (
              <div
                key={t.f}
                className="absolute inset-y-0 w-full"
                style={{ transform: `translateX(${p}%)` }}
              >
                <div
                  className="absolute left-0 top-0 w-px -translate-x-1/2"
                  style={{
                    height: t.major ? 12 : 6,
                    backgroundColor: t.major
                      ? "var(--tick-major)"
                      : "var(--tick)",
                    opacity: t.major ? 0.9 : 0.5,
                  }}
                />
                {t.label && (
                  <span
                    className="readout absolute left-0 top-3.5 -translate-x-1/2 text-[10px] leading-none text-muted-foreground"
                    style={{ fontWeight: 500 }}
                  >
                    {t.label}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Reserved gaps: held but silent. Drawn as a hollow stub so it reads
            as "spoken for" rather than as a quiet station. A dial that showed
            these as free would send people to a frequency they cannot take. */}
        <div aria-hidden className="absolute bottom-0 left-3 right-3 h-11">
          {holds
            .filter((h) => !stations.some((s) => Math.abs(s.frequency - h.frequency) < step / 2))
            .map((h) => {
              const p = ((h.frequency - min) / (max - min)) * 100;
              return (
                <div
                  key={h.id}
                  className="absolute inset-y-0 w-full"
                  style={{ transform: `translateX(${p}%)` }}
                >
                  <div
                    className="absolute bottom-2 left-0 h-2.5 w-[3px] -translate-x-1/2 rounded-[1px] border border-dashed"
                    style={{ borderColor: "var(--tick)", opacity: 0.8 }}
                  />
                </div>
              );
            })}
        </div>

        {/* Stations. Height carries occupancy, so a busy room is a taller mark. */}
        <div aria-hidden className="absolute bottom-0 left-3 right-3 h-11">
          {stations.map((s) => {
            const p = ((s.frequency - min) / (max - min)) * 100;
            const height = Math.min(28, 10 + s.occupantCount * 3.5);
            const isTuned = tuned?.id === s.id;
            return (
              <div
                key={s.id}
                className="absolute inset-y-0 w-full"
                style={{ transform: `translateX(${p}%)` }}
              >
                {/* The tuned mark widens so the yellow still reads either side
                    of the 2px needle sitting on top of it. */}
                <div
                  className="absolute bottom-2 left-0 -translate-x-1/2 rounded-[1px] transition-[background-color,height,width] duration-150"
                  style={{
                    height,
                    width: isTuned ? 8 : 3,
                    backgroundColor: isTuned
                      ? "var(--primary)"
                      : s.contactCount > 0
                        ? "var(--tick-major)"
                        : "var(--tick)",
                    opacity: isTuned ? 1 : s.contactCount > 0 ? 0.85 : 0.45,
                  }}
                />
                {s.recording && (
                  <div
                    className="absolute bottom-0 left-0 size-1.5 -translate-x-1/2 rounded-full"
                    style={{ backgroundColor: "var(--lamp-recording)" }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* The needle. The only red line on the scale. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-3 right-3 transition-transform duration-400 ease-detent motion-reduce:transition-none"
          style={{ transform: `translateX(${pct}%)` }}
        >
          <div
            className="absolute inset-y-0 left-0 w-0.5 -translate-x-1/2"
            style={{ backgroundColor: "var(--needle)" }}
          />
          {/* Sits just inside the track, since the track clips its overflow. */}
          <div
            className="absolute top-0 left-0 size-2 -translate-x-1/2 rotate-45"
            style={{ backgroundColor: "var(--needle)" }}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * The next station up or down the band, for the scan buttons.
 *
 * Returns null at the ends rather than wrapping: a scanner that silently
 * loops makes you think you have seen the whole band twice.
 */
export function nextStation(
  stations: Station[],
  from: number,
  direction: 1 | -1,
): Station | null {
  const sorted = [...stations].sort((a, b) => a.frequency - b.frequency);
  const pool =
    direction === 1
      ? sorted.filter((s) => s.frequency > from + 0.05)
      : sorted.reverse().filter((s) => s.frequency < from - 0.05);
  return pool[0] ?? null;
}

