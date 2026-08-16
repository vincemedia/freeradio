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

/** The dial moves in tenths, so a band holds 206 addressable frequencies. */
export const FREQUENCY_STEP = 0.1;

export const ecosystems: Ecosystem[] = [
  {
    id: "nexus",
    name: "Nexus",
    description:
      "The hub you are signed into. Its handles need no suffix, since they are local to you.",
    alias: "nexus",
    domain: "nexus.app",
    icon: "/icons/nexus.png",
    local: true,
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
    id: "twetch",
    name: "Twetch",
    description:
      "A social network that put posts on-chain before anyone else, now aimed at peer-to-peer data ownership.",
    alias: "twetch",
    domain: "twetch.com",
    icon: "/ecosystems/twetch.svg",
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

/** The band you are on unless you switch it, because you are inside Nexus. */
export const DEFAULT_ECOSYSTEM = "nexus" as const;
