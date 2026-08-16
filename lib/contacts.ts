"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * People you have met on air.
 *
 * ## Why this is not on the server
 *
 * Contacts used to be a flag on the seeded people, which made "people you
 * know, on air" a rail of strangers the app had decided you knew. Removing
 * the flag left the question of where real ones should live, and the answer
 * is: this browser.
 *
 * The alternative was a cookie, which is where identity, username and avatar
 * already are. It would have let the server count contacts in a room without
 * being asked, which is genuinely nicer — but a cookie is attached to every
 * request for the life of the session, and a list that grows with use is the
 * worst possible thing to put in one. Forty contacts is three kilobytes on
 * every page load, every API call and every audio token, forever.
 *
 * So the list is local and the server is asked only the question it can
 * answer: of these keys, which are in a room right now. That request carries
 * the keys once, when the rail actually needs them.
 *
 * A contact is a public key and the name they had when you added them. Not a
 * lookup: there is no directory of wallet identities to look them up in, and
 * inventing one would mean the name in your list could change under you
 * because somebody else edited theirs.
 */

const KEY = "fr_contacts_v1";

/** Room enough to be useful, small enough to stay a list rather than a CRM. */
export const MAX_CONTACTS = 200;

export interface Contact {
  /** compressed secp256k1 public key — the identity itself */
  key: string;
  /** what they were called when you added them */
  name: string;
  /** their avatar at the time, if they had one */
  photo?: string;
  /** ISO */
  addedAt: string;
  /** where you met them, so the list can say why they are in it */
  metAt?: string;
}

/* ------------------------------------------------------------------ store */

let cache: Contact[] | null = null;
const listeners = new Set<() => void>();

function read(): Contact[] {
  if (cache) return cache;
  if (typeof window === "undefined") return (cache = []);
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    cache = Array.isArray(parsed)
      ? parsed.filter(
          (c): c is Contact =>
            typeof c === "object" &&
            c !== null &&
            typeof (c as Contact).key === "string" &&
            typeof (c as Contact).name === "string",
        )
      : [];
  } catch {
    /* Corrupt or unreadable — private mode, a quota error, somebody's
       extension. An empty list is a working app; throwing here is not. */
    cache = [];
  }
  return cache;
}

function write(next: Contact[]) {
  cache = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* Out of quota or storage denied. The list still works for this session,
       which is better than refusing to add anybody. */
  }
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  /* Another tab is the same person: adding somebody there should show here. */
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

const EMPTY: Contact[] = [];

/**
 * Your contacts, and the two things you can do to the list.
 *
 * Server-rendered as empty rather than as a skeleton: the rail that uses it
 * renders nothing when there is nobody on air, so an empty first paint is
 * already the common case and costs no layout shift.
 */
export function useContacts() {
  const contacts = useSyncExternalStore(
    subscribe,
    read,
    () => EMPTY,
  );

  const add = useCallback((contact: Omit<Contact, "addedAt">) => {
    const current = read();
    if (current.some((c) => c.key === contact.key)) return false;
    if (current.length >= MAX_CONTACTS) return false;
    write([{ ...contact, addedAt: new Date().toISOString() }, ...current]);
    return true;
  }, []);

  const remove = useCallback((key: string) => {
    write(read().filter((c) => c.key !== key));
  }, []);

  const has = useCallback(
    (key: string) => contacts.some((c) => c.key === key),
    [contacts],
  );

  return { contacts, add, remove, has };
}
