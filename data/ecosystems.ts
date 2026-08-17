/**
 * table: ecosystems — the wallet authorities a handle can belong to.
 *
 * BRC-169 addresses every identity as `@handle@ecosystem`, where the ecosystem
 * is an internet domain and is the sole authority for handles within it. There
 * is no central registry: `@kuro@treechat` and `@kuro@twetch` are different
 * people, and each host answers only for its own namespace.
 *
 * Each ecosystem is its own band. The selector at the top of the app is a band
 * switch in the literal sense: changing it re-populates the whole scale,
 * because a frequency is only unique within one ecosystem. `98.7` on Nexus and
 * `98.7` on Twetch are different rooms, the same way the same dial position is
 * a different station in a different city.
 */
import type { Ecosystem } from "./schema";

/**
 * The dial, in MHz.
 *
 * Every band shares these limits so the scale is a fixed instrument and only
 * its contents change. Kept to the real FM broadcast range because the whole
 * point of the metaphor is that people already know how to read it.
 */
export const BAND = { min: 87.5, max: 108.0 } as const;

/**
 * Longwave, further down the dial.
 *
 * Its own stretch rather than a share of the FM band, because a frequency is
 * only an address if it belongs to one band — and Longwave is the band anybody
 * can be on regardless of which wallet they use, so it cannot sit on top of
 * somebody's ecosystem. Twenty wide and stepped in tenths like every other
 * band, so the scale, the sweep and the create dialog behave identically on it.
 *
 * Real longwave is measured in kilohertz rather than megahertz, and a faithful
 * 148.5–283.5 kHz band would have meant a second unit running through every
 * readout in the product. The dial here is one instrument with one unit; what
 * makes this band longwave is that it is the shared one, low on the dial, that
 * carries everywhere.
 */
export const LONGWAVE_BAND = { min: 160.0, max: 180.0 } as const;

/** The dial moves in tenths, so a band holds 206 addressable frequencies. */
export const FREQUENCY_STEP = 0.1;

/**
 * How many stations a band carries at once.
 *
 * Well under what the dial could hold, and deliberately. A band you can read
 * in one pass is the point of drawing a scale instead of a list — past a
 * couple of dozen markers the gaps stop being legible and the instrument
 * becomes a crowded ruler. Scarcity is also what makes a frequency worth
 * holding, which the rest of the product is built on.
 */
export const MAX_STATIONS_PER_BAND = 25;

export const ecosystems: Ecosystem[] = [
  /**
   * Longwave, first in the list.
   *
   * Every other band belongs to an ecosystem, and which one you are on is a
   * consequence of which wallet you use. This one is not: it is the shared
   * band, and the station on it is always there. That is what longwave was for
   * — the signal that reached past the local transmitters — so it sits at the
   * top rather than being filed under whichever ecosystem happened to build it.
   *
   * Its domain is this service, because on this band there is no other
   * authority to name. Handles on Longwave are whatever their own ecosystem
   * says they are; the band does not issue any of its own.
   */
  {
    id: "longwave",
    name: "Longwave (Global)",
    description:
      "The shared band. One station, always on, open to anybody on any wallet — the frequency that carries when the local ones do not.",
    alias: "longwave",
    domain: "freeradio.bsvb.net",
    icon: "/ecosystems/longwave.svg",
    iconPlate: "#0b1b2b",
    band: LONGWAVE_BAND,
  },
  {
    id: "nexus",
    name: "Nexus",
    description:
      "The hub the rest of the suite is built around, and the busiest band here.",
    alias: "nexus",
    domain: "nexus.free",
    icon: "/icons/Nexus-logo-solid-BG2.png",
    band: BAND,
  },
  {
    id: "twetch",
    name: "Twetch",
    description:
      "A social network that put posts on-chain before anyone else, now aimed at peer-to-peer data ownership.",
    alias: "twetch",
    domain: "twetch.com",
    icon: "/ecosystems/twetch.svg",
    /* Where the signed-in identity lives, which is what `local` means. It is
       deliberately not the default band: you are on Twetch and looking at
       Nexus, which is the normal case this product exists to make legible. */
    local: true,
    numericHandles: true,
    iconPlate: "#0f1021",
    band: BAND,
  },
  {
    id: "yours",
    name: "Yours",
    description:
      "An open-source wallet that lives in the browser, holding ordinals and tokens alongside ordinary payments.",
    alias: "yours",
    domain: "yours.org",
    icon: "/ecosystems/yours.png",
    band: BAND,
  },
  {
    id: "handcash",
    name: "HandCash",
    description:
      "A consumer wallet built around handles and micropayments, widely used at small-merchant tills.",
    alias: "handcash",
    domain: "handcash.io",
    icon: "/ecosystems/handcash.webp",
    band: BAND,
  },
  {
    id: "treechat",
    name: "Treechat",
    description:
      "Boards where posts earn value from readers rather than advertisers. Accounts are numbered in the order they joined.",
    alias: "treechat",
    domain: "treechat.app",
    icon: "/ecosystems/treechat.webp",
    numericHandles: true,
    band: BAND,
  },
  {
    id: "commonsource",
    name: "Common Source",
    description:
      "A Dutch food-systems network connecting cities, regions, farmers and innovators through mass participation.",
    alias: "commonsource",
    domain: "commonsource.nl",
    icon: "/ecosystems/commonsource.svg",
    band: BAND,
  },
  {
    id: "mycelia",
    name: "Mycelia",
    description:
      "The Bionutrient Institute's network, linking soil health to measured nutrient density in food.",
    alias: "mycelia",
    domain: "mycelia.network",
    icon: "/ecosystems/mycelia.png",
    band: BAND,
  },
];

export function getEcosystem(id: string): Ecosystem | undefined {
  return ecosystems.find((e) => e.id === id);
}

/**
 * The dial limits for a band.
 *
 * The schema has said from the beginning that each ecosystem owns its own band,
 * and until Longwave every one of them was the same 87.5–108.0 — so everything
 * that needed limits reached for the `BAND` constant instead, and every one of
 * those places would have refused a station at 169 or offered a frequency on the
 * wrong band. This is the one question they should all have been asking.
 *
 * Falls back to the FM band for an unknown id, which is what the callers did
 * before and keeps a bad ecosystem a validation failure rather than a crash.
 */
export function bandFor(id: string): { min: number; max: number } {
  return getEcosystem(id)?.band ?? BAND;
}

/** The band you are on unless you switch it, because you are inside Nexus. */
export const DEFAULT_ECOSYSTEM = "nexus" as const;

/**
 * The bands ticked when onboarding first draws the list.
 *
 * Nexus because it is the hub you are signed into, and Twetch because it is
 * where the stations with real recordings behind them are: a first run that
 * ends on a band with nothing to hear is a worse introduction than one extra
 * checkbox already ticked.
 *
 * Longwave because it is the one band with something on it at every hour. The
 * others depend on whoever happens to be about; a band nobody follows is a band
 * nobody sees, and an always-on station that nobody can find is not on.
 *
 * Only new arrivals get these. Anybody who has already chosen keeps their own
 * list, because a stored preference that silently grows is not a preference.
 */
export const DEFAULT_FOLLOWED = ["longwave", "nexus", "twetch"] as const;
