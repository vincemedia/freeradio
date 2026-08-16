"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { MagnifyingGlass, Trash, UsersThree } from "@phosphor-icons/react";
import Avatar from "boring-avatars";
import { EcosystemMark } from "@/components/identity";
import { Lamp } from "@/components/instrument/parts";
import { RecentPeople } from "@/components/co-channel/recent-people";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState, Input, Skeleton } from "@/components/ui/primitives";
import { useContacts, MAX_CONTACTS } from "@/lib/contacts";
import { formatFrequency } from "@/lib/format";
import { truncateKey } from "@/lib/identity-key";
import { useOnAir } from "@/lib/use-on-air";

/**
 * Contacts, sorted by whether you can hear them.
 *
 * The list is people you added from inside a room, held in this browser. There
 * is no directory to browse and nothing to import: you add somebody because
 * you heard them, which is the only introduction this product can honestly
 * make.
 *
 * Not filtered by band, deliberately. The people you meet are spread across
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

const COLORS = ["#eab300", "#cc2e1d", "#4353ff", "#16a34a", "#7c3aed"];

function Contacts() {
  /* Arriving from search pre-fills the filter, so picking a handle lands on
     that person rather than on the whole list again. */
  const initial = useSearchParams().get("q") ?? "";
  const [q, setQ] = useState(initial);

  const { contacts, remove } = useContacts();
  const onAirRows = useOnAir();
  const roomOf = new Map(onAirRows.map((r) => [r.contact.key, r.room]));

  const filtered = contacts.filter((c) =>
    q
      ? c.name.toLowerCase().includes(q.toLowerCase()) ||
        c.key.toLowerCase().includes(q.toLowerCase())
      : true,
  );

  const onAir = filtered.filter((c) => roomOf.has(c.key));
  const off = filtered.filter((c) => !roomOf.has(c.key));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contacts"
        subtitle="People you have met on air, and whether you can hear them right now."
      />

      {contacts.length === 0 ? (
        <div className="space-y-6">
          <EmptyState title="Nobody yet" icon={<UsersThree size={28} />}>
            Join a station and add the people you hear. They will show up here,
            and on the front page whenever they are on air.
          </EmptyState>
          {/* Or start from the people who have actually been here. */}
          <RecentPeople />
        </div>
      ) : (
        <>
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

          {filtered.length === 0 ? (
            <EmptyState
              title="No contact by that name"
              icon={<UsersThree size={28} />}
            >
              You know {contacts.length} of a possible {MAX_CONTACTS}.
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
                    {onAir.map((c) => {
                      const room = roomOf.get(c.key)!;
                      return (
                        <li key={c.key}>
                          <Link
                            href={`/co-channel/${room.id}`}
                            className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <Avatar
                              size={40}
                              name={c.key}
                              variant="marble"
                              colors={COLORS}
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium">
                                {c.name}
                              </span>
                              <span className="readout text-[11px] text-muted-foreground">
                                {truncateKey(c.key)}
                              </span>
                            </span>
                            <span className="min-w-0 shrink-0 text-right">
                              <span className="flex items-center justify-end gap-1.5 text-[11px] text-muted-foreground">
                                <EcosystemMark
                                  ecosystem={room.ecosystem as never}
                                  size={11}
                                />
                                <span className="readout">
                                  {formatFrequency(room.frequency)}
                                </span>
                              </span>
                              <span className="mt-0.5 block max-w-[9rem] truncate text-[11px] text-muted-foreground sm:max-w-[16rem]">
                                {room.title}
                              </span>
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}

              {off.length > 0 && (
                <section className="space-y-2">
                  <h2 className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                    Not on air
                  </h2>
                  <ul className="space-y-2">
                    {off.map((c) => (
                      <li
                        key={c.key}
                        className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
                      >
                        <Avatar
                          size={36}
                          name={c.key}
                          variant="marble"
                          colors={COLORS}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm">
                            {c.name}
                          </span>
                          <span className="readout text-[11px] text-muted-foreground">
                            {truncateKey(c.key)}
                          </span>
                        </span>
                        <Lamp state="off" label="Not on air" />
                        {/* Removing is here and nowhere else. It is not an
                            action you want next to the one that adds them. */}
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Remove ${c.name} from contacts`}
                          onClick={() => remove(c.key)}
                        >
                          <Trash />
                        </Button>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
