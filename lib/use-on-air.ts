"use client";

import { useEffect, useState } from "react";
import { useContacts, type Contact } from "@/lib/contacts";

/**
 * Which of your contacts you can hear right now.
 *
 * Polled rather than pushed. A socket for this would mean holding one open on
 * every screen in the product to answer a question that is only interesting
 * about once a minute, and the rail it feeds is a glance rather than a
 * monitor: being thirty seconds behind on somebody joining a room costs
 * nothing, and being wrong about it costs a wasted click.
 *
 * Nothing is requested when you know nobody, which is the state most readers
 * are in, so the common case is no network at all. And nothing is requested
 * while the tab is in the background: a page left open in another window has
 * no rail for anybody to be glancing at, and polling it forever is the kind
 * of waste that is invisible precisely because nobody is looking. It catches
 * up the moment the tab comes back.
 */

export interface OnAirRoom {
  id: string;
  title: string;
  frequency: number;
  ecosystem: string;
}

const EVERY_MS = 45_000;

export interface OnAir {
  contact: Contact;
  room: OnAirRoom;
}

/**
 * How many contacts are in each room, keyed by station id.
 *
 * The same fact as `useOnAir`, shaped for the places that only need a count:
 * the card badge and the marks on the tuning scale. Both used to read a field
 * the server filled in from seeded contacts, which is exactly the number that
 * could never be right once contacts became real and private.
 */
export function useContactsByRoom(): Record<string, number> {
  const rows = useOnAir();
  const counts: Record<string, number> = {};
  for (const { room } of rows) counts[room.id] = (counts[room.id] ?? 0) + 1;
  return counts;
}

export function useOnAir(): OnAir[] {
  const { contacts } = useContacts();
  const [rooms, setRooms] = useState<Record<string, OnAirRoom>>({});

  /* Joined into one string so the effect re-runs when the set changes rather
     than on every render that rebuilds the array. */
  const keys = contacts.map((c) => c.key).sort().join(",");

  useEffect(() => {
    /* Nothing to ask about, and nothing to clear either: the result is
       derived from the contact list, so an empty list already produces an
       empty answer whatever is left in here. */
    if (!keys) return;

    let cancelled = false;

    const check = async () => {
      try {
        const response = await fetch("/api/contacts/on-air", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ keys: keys.split(",") }),
        });
        if (!response.ok) return;
        const rows = (await response.json()) as {
          key: string;
          coChannel: OnAirRoom;
        }[];
        if (cancelled) return;
        setRooms(Object.fromEntries(rows.map((r) => [r.key, r.coChannel])));
      } catch {
        /* Offline, or the band is unreachable. The last answer stands until
           the next poll rather than emptying the rail on one failed fetch. */
      }
    };

    let timer: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (timer !== null) return;
      void check();
      timer = setInterval(check, EVERY_MS);
    };
    const stop = () => {
      if (timer === null) return;
      clearInterval(timer);
      timer = null;
    };

    const onVisibility = () => (document.hidden ? stop() : start());

    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [keys]);

  return contacts
    .filter((c) => rooms[c.key])
    .map((c) => ({ contact: c, room: rooms[c.key] }));
}
