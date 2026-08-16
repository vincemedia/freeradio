"use client";

import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Broadcast, Record, UsersThree } from "@phosphor-icons/react";
import useFetch from "@/lib/use-fetch";
import { Avatar, EcosystemMark } from "@/components/identity";
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

  const { data: coChannels } = useFetch<CoChannelView[]>(
    open ? "/api/co-channels" : null,
    [open],
  );
  const { data: people } = useFetch<Person[]>(open ? "/api/people" : null, [open]);
  const { data: recordings } = useFetch<Recording[]>(
    open ? "/api/recordings" : null,
    [open],
  );

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

  return (
    <Command.Dialog
      open={open}
      onOpenChange={onOpenChange}
      label="Search Free Radio"
      className="fixed left-1/2 top-[12vh] z-50 w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 overflow-hidden rounded-lg border border-border bg-popover shadow-[var(--shadow-overlay)]"
      overlayClassName="fixed inset-0 z-50 bg-foreground/25"
      contentClassName=""
    >
      <Command.Input
        placeholder="Search Co-Channels, handles, frequencies"
        className="h-12 w-full border-b border-border bg-transparent px-4 text-base outline-none placeholder:text-muted-foreground sm:text-sm"
      />
      <Command.List className="max-h-[min(24rem,60vh)] overflow-y-auto overscroll-contain p-1.5">
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

        {(people ?? []).length > 0 && (
          <Command.Group
            heading="Handles"
            className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.06em] [&_[cmdk-group-heading]]:text-muted-foreground"
          >
            {(people ?? []).slice(0, 40).map((p) => (
              <Command.Item
                key={p.id}
                value={`${p.name} @${p.handle} ${p.username ?? ""} ${p.ecosystem}`}
                onSelect={() => go(`/contacts?handle=${p.id}`)}
                className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 text-sm data-[selected=true]:bg-muted"
              >
                <Avatar person={p} size={20} />
                <span className="min-w-0 flex-1 truncate">{p.name}</span>
                <span className="flex shrink-0 items-center gap-0.5 text-xs text-muted-foreground">
                  @{p.username ?? p.handle}
                  <EcosystemMark ecosystem={p.ecosystem} size={12} />
                </span>
              </Command.Item>
            ))}
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
                onSelect={() => go(`/recordings#${r.id}`)}
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
