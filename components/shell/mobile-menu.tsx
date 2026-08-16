"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { CaretLeft, CaretRight, Check } from "@phosphor-icons/react";
import useFetch from "@/lib/use-fetch";
import { EcosystemMark } from "@/components/identity";
import { NAV } from "@/components/shell/top-bar";
import type { Ecosystem } from "@/data/schema";
import { useRadio } from "@/lib/store";
import { cn } from "@/lib/utils";

type Band = Ecosystem & { coChannelCount: number; occupantCount: number };

/**
 * Mobile navigation.
 *
 * The trigger is three lines drawn in CSS, no icon font and no SVG asset,
 * animating into an X. The menu is a full-screen overlay on the panel with
 * the options centred both ways.
 *
 * Nested navigation drills down rather than expanding: choosing Band slides
 * the panel left and shows one level with a back affordance. No accordions,
 * no fly-outs, one level per panel.
 */
export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<"root" | "bands">("root");
  const pathname = usePathname();

  const ecosystem = useRadio((s) => s.ecosystem);
  const setEcosystem = useRadio((s) => s.setEcosystem);
  const { data: bands } = useFetch<Band[]>(open ? "/api/ecosystems" : null);

  /* Navigating closes the menu, and the next open starts at the top. */
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) setPanel("root");
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const current = bands?.find((b) => b.id === ecosystem);

  return (
    <>
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="relative flex size-9 items-center justify-center rounded-md md:hidden"
      >
        <span className="sr-only">Menu</span>
        <span aria-hidden className="relative block h-3.5 w-5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={cn(
                "absolute left-0 block h-[1.5px] w-full rounded-full bg-foreground transition-[transform,opacity] duration-200 ease-[var(--ease-out-quint)] motion-reduce:transition-none",
                i === 0 && (open ? "top-1.5 rotate-45" : "top-0"),
                i === 1 && (open ? "top-1.5 opacity-0" : "top-1.5"),
                i === 2 && (open ? "top-1.5 -rotate-45" : "top-3"),
              )}
            />
          ))}
        </span>
      </button>

      {open && (
        <div className="fixed inset-0 top-14 z-30 bg-background md:hidden">
          <div className="relative h-full overflow-hidden">
            {/* Root panel */}
            <nav
              className={cn(
                "absolute inset-0 flex flex-col items-center justify-center gap-1 px-6 transition-transform duration-250 ease-[var(--ease-out-quint)] motion-reduce:transition-none",
                panel === "root" ? "translate-x-0" : "-translate-x-full",
              )}
            >
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="py-3 font-display text-2xl font-semibold tracking-tight text-foreground"
                >
                  {item.label}
                </Link>
              ))}

              <button
                type="button"
                onClick={() => setPanel("bands")}
                className="mt-6 inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2.5 text-sm font-medium"
              >
                <EcosystemMark ecosystem={ecosystem} size={16} />
                {current?.name ?? "Band"}
                <CaretRight size={14} className="text-muted-foreground" />
              </button>
            </nav>

            {/* Drill-down: one level, back affordance at the top. */}
            <div
              className={cn(
                "absolute inset-0 flex flex-col transition-transform duration-250 ease-[var(--ease-out-quint)] motion-reduce:transition-none",
                panel === "bands" ? "translate-x-0" : "translate-x-full",
              )}
            >
              <button
                type="button"
                onClick={() => setPanel("root")}
                className="flex shrink-0 items-center gap-1.5 border-b border-border px-4 py-3.5 text-sm font-medium text-muted-foreground"
              >
                <CaretLeft size={14} />
                Menu
              </button>
              <div className="min-h-0 flex-1 overflow-y-auto p-2">
                {bands?.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => {
                      setEcosystem(b.id);
                      setOpen(false);
                    }}
                    className="flex w-full items-start gap-3 rounded-md px-3 py-3 text-left active:bg-muted"
                  >
                    <EcosystemMark ecosystem={b.id} size={20} className="mt-0.5" />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{b.name}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {b.coChannelCount === 0
                          ? "Nothing on air"
                          : `${b.coChannelCount} on air, ${b.occupantCount} talking`}
                      </span>
                    </span>
                    {b.id === ecosystem && <Check size={16} className="mt-1" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
