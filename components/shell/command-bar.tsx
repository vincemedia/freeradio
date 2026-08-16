"use client";

import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Broadcast, Record, UsersThree } from "@phosphor-icons/react";
import useFetch from "@/lib/use-fetch";
import { Avatar, EcosystemMark, Identity } from "@/components/identity";
import type { CoChannelView, Person, Recording } from "@/data/schema";
import { formatFrequency } from "@/lib/format";
import { useRadio } from "@/lib/store";

/**
 * Global search, on ⌘K.
 *
 * Indexes what the app is about rather than its pages: Co-Channels by name,
 * topic and frequency, handles, and recordings. Typing a number finds a
 * frequency, which is the fastest way in if somebody read one out to you.
 */
export function CommandBar({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const router = useRouter();
  const ecosystem = useRadio((s) => s.ecosystem);
  const [query, setQuery] = useState("");

  const { data: coChannels } = useFetch<CoChannelView[]>(open ? "/api/co-channels" : null);
  const { data: people } = useFetch<Person[]>(open ? "/api/people" : null);
  const { data: recordings } = useFetch<Recording[]>(open ? "/api/recordings" : null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  const go = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  /* On air on the band you are looking at comes first; other bands follow,
     because a room you can hear now beats a room you would have to switch to. */
  const here = (coChannels ?? []).filter((c) => c.ecosystem === ecosystem);
  const elsewhere = (coChannels ?? []).filter((c) => c.ecosystem !== ecosystem);

  /* Where each person is, from the rooms already loaded. Picking a handle
     should take you to them if you can hear them, so the result needs to know
     that before you choose it, not after. */
  const roomOf = new Map<string, CoChannelView>();
  for (const c of coChannels ?? []) {
    for (const o of c.occupants) roomOf.set(o.personId, c);
  }

  return (
    <Command.Dialog
      open={open}
      onOpenChange={onOpenChange}
      label="Search Free Radio"
      /* Full bleed on a phone: a search that covers the screen is the whole
         task, and a floating card with corners and a margin around it is a
         dialog pretending the page behind it still matters. From sm up it
         becomes the card again. */
      className="fixed inset-0 z-50 flex flex-col overflow-hidden border-border bg-popover sm:inset-auto sm:left-1/2 sm:top-[12vh] sm:block sm:h-auto sm:w-[calc(100vw-2rem)] sm:max-w-lg sm:-translate-x-1/2 sm:rounded-lg sm:border sm:shadow-[var(--shadow-overlay)]"
      overlayClassName="fixed inset-0 z-50 bg-foreground/25"
      contentClassName=""
    >
      <Command.Input
        value={query}
        onValueChange={setQuery}
        placeholder="Search stations, handles, frequencies"
        className="h-14 w-full shrink-0 border-b border-border bg-transparent px-4 text-base outline-none placeholder:text-muted-foreground sm:h-12 sm:text-sm"
      />
      {/* On a phone the list is the rest of the screen; from sm up it is a
          capped panel again. */}
      <Command.List className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5 sm:max-h-[min(24rem,60vh)] sm:flex-none">
        <Command.Empty className="px-3 py-8 text-center text-sm text-muted-foreground">
          Nothing on any band matches that.
        </Command.Empty>

        {here.length > 0 && (
          <Command.Group
            heading="On this band"
            className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.06em] [&_[cmdk-group-heading]]:text-muted-foreground"
          >
            {here.map((c) => (
              <Command.Item
                key={c.id}
                value={`${c.title} ${c.topic ?? ""} ${formatFrequency(c.frequency)} ${c.host.handle}`}
                onSelect={() => go(`/co-channel/${c.id}`)}
                className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 text-sm data-[selected=true]:bg-muted"
              >
                <Broadcast size={16} className="shrink-0 text-muted-foreground" />
                <span className="readout w-12 shrink-0 text-xs">
                  {formatFrequency(c.frequency)}
                </span>
                <span className="min-w-0 flex-1 truncate">{c.title}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {c.occupantCount}
                </span>
              </Command.Item>
            ))}
          </Command.Group>
        )}

        {elsewhere.length > 0 && (
          <Command.Group
            heading="Other bands"
            className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.06em] [&_[cmdk-group-heading]]:text-muted-foreground"
          >
            {elsewhere.map((c) => (
              <Command.Item
                key={c.id}
                value={`${c.title} ${c.topic ?? ""} ${formatFrequency(c.frequency)} ${c.host.handle}`}
                onSelect={() => go(`/co-channel/${c.id}`)}
                className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 text-sm data-[selected=true]:bg-muted"
              >
                <EcosystemMark ecosystem={c.ecosystem} size={16} />
                <span className="readout w-12 shrink-0 text-xs">
                  {formatFrequency(c.frequency)}
                </span>
                <span className="min-w-0 flex-1 truncate">{c.title}</span>
              </Command.Item>
            ))}
          </Command.Group>
        )}

        {/* Handles appear once you have typed something. cmdk filters what is
            rendered, so a capped list would silently make most of the 87
            people unsearchable, and rendering all of them by default would
            bury the rooms under a directory nobody asked for. */}
        {query.trim().length >= 2 && (people ?? []).length > 0 && (
          <Command.Group
            heading="Handles"
            className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.06em] [&_[cmdk-group-heading]]:text-muted-foreground"
          >
            {(people ?? []).map((p) => {
              const room = roomOf.get(p.id);
              return (
                <Command.Item
                  key={p.id}
                  value={`${p.name} @${p.handle} ${p.username ?? ""} ${p.ecosystem}`}
                  /* Straight to the room when they are on air, since that is
                     the only thing this app can do about a person. Otherwise
                     to Contacts, filtered to them, rather than to a list they
                     then have to search again. */
                  onSelect={() =>
                    go(
                      room
                        ? `/co-channel/${room.id}`
                        : `/contacts?q=${encodeURIComponent(p.username ?? p.handle)}`,
                    )
                  }
                  className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 text-sm data-[selected=true]:bg-muted"
                >
                  <Avatar person={p} size={20} />
                  <span className="min-w-0 flex-1 truncate">{p.name}</span>
                  {room ? (
                    <span className="flex shrink-0 items-center gap-1 text-xs">
                      <Broadcast size={12} className="text-muted-foreground" />
                      <span className="readout">
                        {formatFrequency(room.frequency)}
                      </span>
                    </span>
                  ) : (
                    <Identity person={p} className="shrink-0 text-xs" />
                  )}
                </Command.Item>
              );
            })}
          </Command.Group>
        )}

        {(recordings ?? []).length > 0 && (
          <Command.Group
            heading="Recordings"
            className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.06em] [&_[cmdk-group-heading]]:text-muted-foreground"
          >
            {(recordings ?? []).map((r) => (
              <Command.Item
                key={r.id}
                value={`${r.title} recording`}
                onSelect={() => go(`/recordings/${r.id}`)}
                className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 text-sm data-[selected=true]:bg-muted"
              >
                <Record size={16} className="shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate">{r.title}</span>
              </Command.Item>
            ))}
          </Command.Group>
        )}
      </Command.List>

      <div className="flex items-center gap-3 border-t border-border px-3 py-2 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <UsersThree size={12} /> Type a frequency to tune straight to it
        </span>
      </div>
    </Command.Dialog>
  );
}
