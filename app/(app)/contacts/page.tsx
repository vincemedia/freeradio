"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { MagnifyingGlass, UsersThree } from "@phosphor-icons/react";
import useFetch from "@/lib/use-fetch";
import { Avatar, EcosystemMark, Identity } from "@/components/identity";
import { Lamp } from "@/components/instrument/parts";
import { PageHeader } from "@/components/shell/page-header";
import { EmptyState, Input, Skeleton } from "@/components/ui/primitives";
import type { EcosystemId, Person } from "@/data/schema";
import { formatFrequency } from "@/lib/format";

type Row = {
  person: Person;
  coChannel: {
    id: string;
    title: string;
    frequency: number;
    ecosystem: EcosystemId;
  } | null;
};

/**
 * Contacts, sorted by whether you can hear them.
 *
 * Contacts belong to another app in the suite, so this screen never adds or
 * removes one. It answers the single question Free Radio is able to answer
 * about a contact: are they talking right now, and where.
 *
 * Not filtered by band, deliberately. Your contacts are spread across
 * ecosystems, and hiding the ones on another band would make the list lie.
 */
export default function ContactsPage() {
  /* useSearchParams suspends on a statically rendered page, so the part that
     reads it sits behind its own boundary. */
  return (
    <Suspense fallback={<ContactsSkeleton />}>
      <Contacts />
    </Suspense>
  );
}

function ContactsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-40" />
      <Skeleton className="h-10 w-full sm:max-w-sm" />
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full rounded-lg" />
      ))}
    </div>
  );
}

function Contacts() {
  /* Arriving from search pre-fills the filter, so picking a handle lands on
     that person rather than on the whole list again. */
  const initial = useSearchParams().get("q") ?? "";
  const [q, setQ] = useState(initial);
  const { data, loading } = useFetch<Row[]>("/api/contacts");

  const filtered = (data ?? []).filter((r) =>
    q
      ? r.person.name.toLowerCase().includes(q.toLowerCase()) ||
        r.person.handle.toLowerCase().includes(q.toLowerCase()) ||
        (r.person.username ?? "").toLowerCase().includes(q.toLowerCase())
      : true,
  );

  const onAir = filtered.filter((r) => r.coChannel);
  const off = filtered.filter((r) => !r.coChannel);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contacts"
        subtitle="Everyone you know, across every band, and whether you can hear them right now."
      />

      <div className="relative sm:max-w-sm">
        <MagnifyingGlass
          size={15}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search contacts"
          aria-label="Search contacts"
          className="h-10 pl-9"
        />
      </div>

      {loading && !data ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState title="No contact by that name" icon={<UsersThree size={28} />}>
          Contacts come from your wallet, so this list is the same one you see
          everywhere else in the suite.
        </EmptyState>
      ) : (
        <div className="space-y-6">
          {onAir.length > 0 && (
            <section className="space-y-2">
              <h2 className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                <Lamp state="live" label="" />
                On air now
                <span className="readout normal-case tracking-normal">
                  {onAir.length}
                </span>
              </h2>
              <ul className="space-y-2">
                {onAir.map((r) => (
                  <li key={r.person.id}>
                    <Link
                      href={`/co-channel/${r.coChannel!.id}`}
                      className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Avatar person={r.person} size={40} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {r.person.name}
                        </span>
                        <Identity person={r.person} className="text-[11px]" />
                      </span>
                      <span className="min-w-0 shrink-0 text-right">
                        <span className="flex items-center justify-end gap-1.5 text-[11px] text-muted-foreground">
                          <EcosystemMark
                            ecosystem={r.coChannel!.ecosystem}
                            size={11}
                          />
                          <span className="readout">
                            {formatFrequency(r.coChannel!.frequency)}
                          </span>
                        </span>
                        <span className="mt-0.5 block max-w-[9rem] truncate text-[11px] text-muted-foreground sm:max-w-[16rem]">
                          {r.coChannel!.title}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {off.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                Not on air
              </h2>
              <ul className="space-y-2">
                {off.map((r) => (
                  <li
                    key={r.person.id}
                    className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
                  >
                    <Avatar person={r.person} size={36} className="opacity-70" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">
                        {r.person.name}
                      </span>
                      <Identity person={r.person} className="text-[11px]" />
                    </span>
                    <Lamp state="off" label="Not on air" />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
