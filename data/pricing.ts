/**
 * tables: held_frequencies, recording_access, and the price list.
 *
 * The commercial model follows from a rule the product already has rather
 * than being bolted onto it. A frequency is released the moment a room closes,
 * which makes a *permanent* address genuinely scarce: if you run something
 * weekly, you cannot be at 98.7 next Tuesday unless you hold it.
 *
 * Three lines of revenue, in the order they are worth anything:
 *
 *   1. Held frequencies. A subscription for an address that survives the room
 *      closing. Priced per band, because a band with more listeners is worth
 *      more to be findable on.
 *   2. Paid recordings. The one artefact that outlives a Co-Channel, so the
 *      only thing with a shelf life worth charging for. The host sets the
 *      price and takes the money; the platform takes a cut.
 *   3. Gates that already exist. A token-gated room is a paid room whenever
 *      the host issues the token. Nothing to build: it is the same evaluation
 *      as any other gate, which is why gates were modelled as data.
 *
 * What is deliberately NOT charged for: joining an open room, being heard, or
 * the number of people in a room. Charging for those would change what the
 * product is, and a metered conversation is a worse conversation.
 */
import type { EcosystemId } from "./schema";

/** Platform cut on anything a host sells. Stated plainly, never buried. */
export const PLATFORM_FEE = 0.05;

/**
 * What it costs to hold a frequency, per band, per 30 days, in USD.
 *
 * Bands are not priced equally: being findable on a busy band is worth more,
 * and a quiet band should be cheap enough that somebody bothers to start
 * something on it.
 */
export const HOLD_PRICE_USD: Record<EcosystemId, number> = {
  nexus: 12,
  twetch: 9,
  treechat: 9,
  yours: 6,
  handcash: 6,
  commonsource: 4,
  mycelia: 4,
};

/** A frequency somebody pays to keep between broadcasts. */
export interface HeldFrequency {
  id: string;
  ecosystem: EcosystemId;
  frequency: number;
  holderId: string;
  /** ISO; the hold lapses and the frequency returns to the pool */
  until: string;
  /** what the holder calls the slot, shown on the scale when nothing is on air */
  label: string;
}

const NOW = Date.now();
const daysFromNow = (d: number) =>
  new Date(NOW + d * 86_400_000).toISOString();

/**
 * Seeded holds.
 *
 * Two are live rooms whose hosts pay to keep the address between broadcasts;
 * one is a reserved slot with nothing on air, which is the case worth showing:
 * a gap on the dial that is not actually free.
 */
export const heldFrequencies: HeldFrequency[] = [
  {
    id: "hold-teranode",
    ecosystem: "nexus",
    frequency: 101.3,
    holderId: "oli-oskarsson",
    until: daysFromNow(22),
    label: "Teranode numbers, Thursdays",
  },
  {
    id: "hold-office-hours",
    ecosystem: "nexus",
    frequency: 94.1,
    holderId: "austin-rappaport",
    until: daysFromNow(9),
    label: "SDK office hours",
  },
  {
    id: "hold-field-day",
    ecosystem: "mycelia",
    frequency: 96.1,
    holderId: "dan-kittredge",
    until: daysFromNow(48),
    label: "Field day, first Saturday",
  },
  {
    id: "hold-founders",
    ecosystem: "twetch",
    frequency: 87.9,
    holderId: "tw-randy",
    until: daysFromNow(31),
    label: "Founders talk",
  },
];

/**
 * What a recording costs to play, keyed by recording id.
 *
 * Most are free. A price is the host's decision, and the ones with a price on
 * them are the ones somebody did work to produce.
 */
export const RECORDING_PRICE_USD: Record<string, number> = {
  "rec-spv-teach-in": 3,
  "rec-ordinals-postmortem": 5,
  "rec-twetch-origins": 2,
  "rec-brix-season-close": 4,
};
