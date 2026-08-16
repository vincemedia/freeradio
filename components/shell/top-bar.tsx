"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Gear, MagnifyingGlass, Plus } from "@phosphor-icons/react";
import { Wordmark } from "@/components/brand";
import { BandSwitch } from "@/components/shell/band-switch";
import { MobileMenu } from "@/components/shell/mobile-menu";
import { CommandBar } from "@/components/shell/command-bar";
import { NewCoChannelDialog } from "@/components/co-channel/new-co-channel";
import { Button } from "@/components/ui/button";
import { HintTooltip } from "@/components/ui/overlays";
import { useRadio } from "@/lib/store";
import { cn } from "@/lib/utils";

/**
 * Navigation, in a top bar rather than a left column.
 *
 * There is no left rail in this product: the contextual UI is here, so the
 * content area keeps the full width for the thing you came to do. Labels ship
 * in two lengths and the short one is a real word, never a clipped fragment.
 */
export const NAV = [
  { href: "/", label: "On air", labelShort: "Air" },
  { href: "/scan", label: "Scan the band", labelShort: "Scan" },
  { href: "/recordings", label: "Recordings", labelShort: "Tapes" },
  { href: "/contacts", label: "Contacts", labelShort: "People" },
] as const;

export function TopBar() {
  const pathname = usePathname();
  const [search, setSearch] = useState(false);
  const [create, setCreate] = useState(false);
  const seenOnAirHint = useRadio((s) => s.seenOnAirHint);
  const dismissOnAirHint = useRadio((s) => s.dismissOnAirHint);
  const inAStation = useRadio((s) => s.session?.coChannelId) != null;
  /* Only worth showing while they are somewhere else, which after first run
     means inside the station they were dropped into. */
  const showOnAirHint = !seenOnAirHint && inAStation && pathname !== "/";
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1200px] items-center gap-2 px-4 sm:px-6">
          {/* The wordmark is small and sits on a neutral field. The mark comes
              along on wider screens; below sm the band switch needs the room
              more than the logo does. */}
          <Link
            href="/"
            aria-label="Free Radio, on air"
            className="mr-1 shrink-0 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Wordmark showMark={false} className="sm:hidden" />
            <Wordmark markSize={26} className="hidden sm:inline-flex" />
          </Link>

          <BandSwitch className="shrink-0" />

          <nav className="ml-2 hidden items-center gap-0.5 md:flex">
            {NAV.map((item) => {
              const link = (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={item.href === "/" ? dismissOnAirHint : undefined}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={cn(
                    "rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
                    isActive(item.href)
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <span className="hidden lg:inline">{item.label}</span>
                  <span className="lg:hidden">{item.labelShort}</span>
                </Link>
              );

              /* First run leaves you inside a station, which is a good first
                 impression and a poor map. The hint points at the way back to
                 the band, once, and goes for good the moment it is used. */
              return item.href === "/" && showOnAirHint ? (
                <HintTooltip key={item.href} label="Discover more stations">
                  {link}
                </HintTooltip>
              ) : (
                link
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Search"
              onClick={() => setSearch(true)}
              className="hidden sm:inline-flex"
            >
              <MagnifyingGlass />
            </Button>

            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Settings"
              asChild
              className="hidden sm:inline-flex"
            >
              <Link href="/settings">
                <Gear />
              </Link>
            </Button>

            {/* Chrome, not the page's action. Kept secondary so the one yellow
                control on any screen is whatever that screen is actually for:
                Join in a room, Open this Co-Channel on the scanner.

                Icon-only below sm, where the label will not fit. Starting a
                station is the point of the product, so it stays on the top
                bar at every width rather than moving into the menu. */}
            <Button
              size="icon-sm"
              variant="secondary"
              aria-label="Start a station"
              onClick={() => setCreate(true)}
              className="sm:hidden"
            >
              <Plus size={15} />
            </Button>

            <Button
              size="sm"
              variant="secondary"
              onClick={() => setCreate(true)}
              className="hidden sm:inline-flex"
            >
              <Plus size={15} />
              <span className="hidden lg:inline">Start a station</span>
              <span className="lg:hidden">Open</span>
            </Button>

            <MobileMenu
              onSearch={() => setSearch(true)}
              onCreate={() => setCreate(true)}
            />
          </div>
        </div>
      </header>

      {/* Both overlays live here rather than inside the menu, which unmounts
          when it closes and would take them with it. */}
      <CommandBar open={search} onOpenChange={setSearch} />
      <NewCoChannelDialog open={create} onOpenChange={setCreate} />
    </>
  );
}
