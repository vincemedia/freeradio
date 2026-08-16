"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * A horizontally scrolling row with a scrollbar of our own.
 *
 * The native bar is hidden because it is the operating system's design, not
 * this product's: it arrives in a different grey, a different radius and a
 * different weight from everything around it, and on macOS it appears and
 * disappears on its own schedule.
 *
 * What replaces it is a scrollbar rather than a progress hint: it can be
 * dragged, because a bar that looks draggable and is not is worse than none.
 * It hides itself when there is nothing to scroll.
 */
export function ScrollRail({
  children,
  className,
  label,
}: {
  children: React.ReactNode;
  className?: string;
  /** describes what is being scrolled, for the scrollbar's accessible name */
  label: string;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  /* The scrollbar has to name what it controls, so the scroller needs an id. */
  const scrollerId = useId();
  const [metrics, setMetrics] = useState({ ratio: 1, offset: 0 });

  const measure = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const ratio = el.clientWidth / el.scrollWidth;
    const scrollable = el.scrollWidth - el.clientWidth;
    setMetrics({
      ratio: Math.min(1, ratio),
      offset: scrollable > 0 ? el.scrollLeft / scrollable : 0,
    });
  }, []);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    /* ResizeObserver fires once on observe, which gives the first measurement
       without writing state from the effect body. */
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    for (const child of Array.from(el.children)) ro.observe(child);
    el.addEventListener("scroll", measure, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", measure);
    };
  }, [measure]);

  /* Dragging the thumb: the track maps one to one onto the scrollable
     distance, so the content moves with the thumb rather than at some other
     rate. */
  const drag = useRef<{ startX: number; startLeft: number } | null>(null);

  const onThumbPointerDown = (e: React.PointerEvent) => {
    const el = scroller.current;
    if (!el) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { startX: e.clientX, startLeft: el.scrollLeft };
  };

  const onThumbPointerMove = (e: React.PointerEvent) => {
    const el = scroller.current;
    const start = drag.current;
    if (!el || !start) return;
    const track = e.currentTarget.parentElement;
    if (!track) return;
    const scrollable = el.scrollWidth - el.clientWidth;
    const travel = track.clientWidth * (1 - metrics.ratio);
    if (travel <= 0) return;
    el.scrollLeft =
      start.startLeft + ((e.clientX - start.startX) / travel) * scrollable;
  };

  const endDrag = (e: React.PointerEvent) => {
    drag.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const overflowing = metrics.ratio < 0.999;

  return (
    <div className={cn("min-w-0", className)}>
      <div
        id={scrollerId}
        ref={scroller}
        tabIndex={0}
        className="no-native-scrollbar overflow-x-auto overscroll-x-contain focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {children}
      </div>

      {overflowing && (
        <div
          className="relative mt-2 h-[3px] w-full rounded-full bg-border"
          role="scrollbar"
          aria-label={label}
          aria-orientation="horizontal"
          aria-controls={scrollerId}
          aria-valuenow={Math.round(metrics.offset * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            onPointerDown={onThumbPointerDown}
            onPointerMove={onThumbPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            className="absolute inset-y-0 cursor-grab rounded-full bg-muted-foreground/45 transition-colors hover:bg-muted-foreground/70 active:cursor-grabbing active:bg-muted-foreground/70"
            style={{
              width: `${metrics.ratio * 100}%`,
              /* translate rather than left, so dragging stays on the
                 compositor like everything else that moves in this product */
              transform: `translateX(${
                (metrics.offset * (1 - metrics.ratio) * 100) /
                Math.max(metrics.ratio, 0.0001)
              }%)`,
            }}
          />
        </div>
      )}
    </div>
  );
}
