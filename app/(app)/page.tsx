"use client";

import Link from "next/link";
import { useState } from "react";
import { Broadcast, MagnifyingGlass, Plus } from "@phosphor-icons/react";
import useFetch from "@/lib/use-fetch";
import { CoChannelCard, CoChannelCardSkeleton } from "@/components/co-channel/card";
import { NewCoChannelDialog } from "@/components/co-channel/new-co-channel";
import { ContactsOnAir } from "@/components/co-channel/contacts-on-air";
import { RecentCoChannels } from "@/components/co-channel/recent";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState, Input } from "@/components/ui/primitives";
import { getEcosystem } from "@/data/ecosystems";
import type { CoChannelView } from "@/data/schema";
import { useRadio } from "@/lib/store";

/**
 * What is on air, on the band you are on.
 *
 * Contacts first, because "somebody I know is talking right now" is the only
 * thing on this screen that is time-sensitive. Everything else is browsing.
 */
export default function OnAirPage() {
  const ecosystem = useRadio((s) => s.ecosystem);
  const [q, setQ] = useState("");

  const { data, loading } = useFetch<CoChannelView[]>(`/api/co-channels?ecosystem=${ecosystem}${q ? `&q=${encodeURIComponent(q)}` : ""}`);

  const band = getEcosystem(ecosystem);

  return (
    <div className="space-y-8">
      {/* No action here: "Start a station" already sits in the top bar, and
          one primary per screen is the rule. A second yellow button would make
          neither of them read as the one thing to do. */}
      <PageHeader
        title="On air"
        subtitle={`Stations on ${band?.name ?? "this band"} right now. Anyone in a Co-Channel can hear you, so there is no listening quietly.`}
      />

      <ContactsOnAir />

      <RecentCoChannels />

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold tracking-tight">
            Browse the band
          </h2>
          <div className="relative w-full sm:w-72">
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

        {loading && !data ? (
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
              ) : (
                <NewCoChannelDialog>
                  <Button variant="primary" size="sm">
                    <Plus size={15} />
                    Start the first one
                  </Button>
                </NewCoChannelDialog>
              )
            }
          >
            {q
              ? "No station on this band has that name, handle or frequency. Try another band from the switch in the top bar."
              : `Nothing is on air on ${band?.name ?? "this band"} right now. Start a station and it goes live on a free frequency straight away.`}
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
