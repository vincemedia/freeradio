"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { MagnifyingGlass, Plus } from "@phosphor-icons/react";
import { BandSwitch } from "@/components/shell/band-switch";
import { MobileMenu } from "@/components/shell/mobile-menu";
import { CommandBar } from "@/components/shell/command-bar";
import { NewCoChannelDialog } from "@/components/co-channel/new-co-channel";
import { Button } from "@/components/ui/button";
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
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1200px] items-center gap-2 px-4 sm:px-6">
          {/* The wordmark is small and sits on a neutral field. */}
          <Link
            href="/"
            className="mr-1 shrink-0 rounded-sm font-display text-[13px] font-semibold uppercase leading-none tracking-[0.14em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Free
            <span className="text-muted-foreground">Radio</span>
          </Link>

          <BandSwitch className="shrink-0" />

          <nav className="ml-2 hidden items-center gap-0.5 md:flex">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
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
            ))}
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

            {/* Chrome, not the page's action. Kept secondary so the one yellow
                control on any screen is whatever that screen is actually for:
                Join in a room, Open this Co-Channel on the scanner. */}
            <NewCoChannelDialog>
              <Button size="sm" variant="secondary" className="hidden sm:inline-flex">
                <Plus size={15} />
                <span className="hidden lg:inline">Open a Co-Channel</span>
                <span className="lg:hidden">Open</span>
              </Button>
            </NewCoChannelDialog>

            <MobileMenu />
          </div>
        </div>
      </header>

      <CommandBar open={search} onOpenChange={setSearch} />
    </>
  );
}
