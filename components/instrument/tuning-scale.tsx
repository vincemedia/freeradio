"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import type { GateKind } from "@/data/schema";
import { formatFrequency } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Horizontal padding of the rails inside the track, in pixels. */
const RAIL_INSET = 12;

export interface Station {
  id: string;
  frequency: number;
  title: string;
  occupantCount: number;
  contactCount: number;
  primaryGate: GateKind;
  recording: boolean;
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
  onChange,
  onCommit,
  className,
}: {
  min: number;
  max: number;
  step: number;
  value: number;
  stations: Station[];
  onChange: (frequency: number) => void;
  /** fired when the needle settles, so scanning does not spam the server */
  onCommit?: (frequency: number) => void;
  className?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const pct = ((value - min) / (max - min)) * 100;

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
    onCommit?.(fromClientX(e.clientX));
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
    onCommit?.(v);
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

  return (
    <div className={cn("select-none", className)}>
      {/* Readout. Adjacent to the scale it describes, never floating. */}
      <div className="mb-2 flex items-end justify-between gap-3">
        <div className="flex items-baseline gap-1.5">
          <span className="readout font-display text-3xl leading-none tracking-tight tabular-nums">
            {formatFrequency(value)}
          </span>
          <span className="text-xs font-medium text-muted-foreground">MHz</span>
        </div>
        <span className="truncate text-right text-xs text-muted-foreground">
          {tuned ? tuned.title : "No Co-Channel on this frequency"}
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
        aria-valuetext={`${formatFrequency(value)} megahertz${tuned ? `, ${tuned.title}` : ", no Co-Channel"}`}
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

/** Keeps the needle in sync when the band changes under it. */
export function useClampToBand(
  value: number,
  min: number,
  max: number,
  onChange: (v: number) => void,
) {
  useEffect(() => {
    if (value < min) onChange(min);
    else if (value > max) onChange(max);
  }, [value, min, max, onChange]);
}
