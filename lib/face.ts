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
  /** the peer id in a live room, or the participant id in a roster */
  id: string;
  /**
   * The identity, where it is carried separately.
   *
   * A live participant has two ids: a peer id, which is per connection and
   * means nothing across two of them, and a custom id, which is the public
   * key. Seeding an avatar on the peer id gives somebody a different face
   * every time they reconnect and a different face from the one they have in
   * the top bar — which is exactly what the occupant list was doing, because
   * this read `id` and a participant's `id` is the peer.
   */
  customId?: string;
  name: string;
  picture?: string;
}): Person {
  /* The identity if there is one, otherwise whatever is stable about them. */
  const identifier = participant.customId ?? participant.id;
  const key = isIdentityKey(identifier) ? identifier : null;
  const person = personFromKey(
    key ?? `02${"0".repeat(64)}`,
    participant.name,
    participant.picture ?? null,
  );
  /* A listener has no key, so their seat is the seed — stable for that
     browser, and nobody else's. */
  return key ? person : { ...person, id: identifier, publicKey: undefined };
}
