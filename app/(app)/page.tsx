"use client";

import Link from "next/link";
import { useState } from "react";
import { Broadcast, MagnifyingGlass } from "@phosphor-icons/react";
import useFetch from "@/lib/use-fetch";
import { CoChannelCard, CoChannelCardSkeleton } from "@/components/co-channel/card";
import { ContactsOnAir } from "@/components/co-channel/contacts-on-air";
import { RecentCoChannels } from "@/components/co-channel/recent";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState, Input } from "@/components/ui/primitives";
import { getEcosystem } from "@/data/ecosystems";
import type { CoChannelView } from "@/data/schema";
import { useRadio } from "@/lib/store";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "browse", label: "Browse the band" },
  { id: "recent", label: "You were in" },
] as const;

type Tab = (typeof TABS)[number]["id"];

/**
 * What is on air, on the band you are on.
 *
 * Contacts first, because "somebody I know is talking right now" is the only
 * thing on this screen that is time-sensitive. Everything else is browsing.
 */
export default function OnAirPage() {
  const ecosystem = useRadio((s) => s.ecosystem);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<Tab>("browse");
  const hasRecent = useRadio((s) => s.recent.length) > 0;
  /* Derived rather than corrected in an effect: with no history the recent
     tab is not offered, so a stored choice of it has to collapse back to
     browse at read time, not on a second render. */
  const active: Tab = tab === "recent" && !hasRecent ? "browse" : tab;

  const { data, loading } = useFetch<CoChannelView[]>(`/api/co-channels?ecosystem=${ecosystem}${q ? `&q=${encodeURIComponent(q)}` : ""}`);

  const band = getEcosystem(ecosystem);

  return (
    <div className="space-y-8">
      {/* No action here: "Start a station" already sits in the top bar, and
          one primary per screen is the rule. A second yellow button would make
          neither of them read as the one thing to do. */}
      <PageHeader
        title="On air"
        subtitle={`Stations on ${band?.name ?? "this band"} right now. Tune in to any of them and hear who is talking.`}
      />

      <ContactsOnAir />

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Two views of the same shelf, so they are tabs rather than one
              stacked above the other. "You were in" was a strip of chips
              above the grid competing with it for the same attention, and it
              is the smaller of the two answers to "where do I go now".

              It only appears once there is a history to show: a tab that is
              always empty is a tab nobody presses twice. */}
          <div role="tablist" aria-label="What to show" className="flex items-baseline gap-4">
            {TABS.filter((t) => t.id === "browse" || hasRecent).map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={active === t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "font-display text-lg font-semibold tracking-tight transition-colors",
                  "border-b-2 pb-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active === t.id
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Search belongs to the band, not to a list of six chips. */}
          <div className={cn("relative w-full sm:w-72", active !== "browse" && "hidden")}>
            <MagnifyingGlass
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search stations, handles, 98.7"
              aria-label="Search stations on this band"
              className="h-10 pl-9"
            />
          </div>
        </div>

        {active === "recent" ? (
          <RecentCoChannels />
        ) : loading && !data ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <CoChannelCardSkeleton key={i} />
            ))}
          </div>
        ) : (data?.length ?? 0) === 0 ? (
          <EmptyState
            title={q ? "Nothing matches that" : "This band is quiet"}
            icon={<Broadcast size={28} />}
            action={
              q ? (
                <Button size="sm" onClick={() => setQ("")}>
                  Clear the search
                </Button>
              ) : undefined
            }
          >
            {q
              ? "No station on this band has that name, handle or frequency. Try another band from the switch in the top bar."
              : `Nothing is on air on ${band?.name ?? "this band"} right now. Switch bands from the top bar, or come back later.`}
          </EmptyState>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data!.map((c) => (
              <CoChannelCard key={c.id} coChannel={c} />
            ))}
          </div>
        )}
      </section>

      <p className="text-center text-xs text-muted-foreground">
        Looking for something specific?{" "}
        <Link href="/scan" className="underline underline-offset-2 hover:text-foreground">
          Scan the whole band
        </Link>{" "}
        to see the gaps as well as the rooms.
      </p>
    </div>
  );
}
