"use client";

import type { Person } from "@/data/schema";
import { isIdentityKey, personFromKey } from "@/lib/identity-key";

/**
 * Somebody in a live room, as a person the avatar can draw.
 *
 * Live rooms report participants, not people: an identity key for anybody with
 * a wallet and an opaque seat for a listener. Both need a face, and it has to
 * be *the same* face they have everywhere else, so this is the one conversion
 * and every list uses it — a card's facepile, the band's, the occupant grid.
 *
 * A listener has no key to derive from, so their seat is the seed. It is
 * stable for that browser and belongs to nobody else, which is all a generated
 * avatar needs to be worth drawing.
 */
export function facePerson(participant: {
  id: string;
  name: string;
  picture?: string;
}): Person {
  const key = isIdentityKey(participant.id) ? participant.id : null;
  const person = personFromKey(
    key ?? `02${"0".repeat(64)}`,
    participant.name,
    participant.picture ?? null,
  );
  return key ? person : { ...person, id: participant.id, publicKey: undefined };
}
