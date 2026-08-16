/**
 * tables: co_channels, occupants, nest_links.
 *
 * A Co-Channel exists only while somebody is in it. These rows are the ones
 * that happen to be live right now; when the last occupant leaves, the row is
 * deleted and the frequency returns to the pool. That is why there is no
 * table of frequency allocations: there is nothing to keep once a room ends.
 *
 * Occupants are drawn from several ecosystems on purpose. A Nexus Co-Channel
 * with a Twetch and a Yours occupant in it is the normal case, and it is the
 * whole reason every identity is rendered `@handle@ecosystem` with its wallet
 * mark: without the suffix you cannot tell which `@kuro` is in the room.
 *
 * Nobody appears twice. You can only be in one Co-Channel at a time, so the
 * occupant table is effectively keyed by person, and a fixture that breaks
 * that would let the same face appear in two rooms at once.
 */
import type { CoChannel, Gates, NestLink, Occupant } from "./schema";

/* Start times are stored as offsets and resolved at module load, so a demo
   left running overnight still shows plausible running times rather than a
   room that has been on air since last Tuesday. */
const NOW = Date.now();
const minutesAgo = (m: number) => new Date(NOW - m * 60_000).toISOString();

/** An open room: every gate off. Written out so `gates` is never half-defined. */
const OPEN: Gates = {
  token: { on: false, ids: [] },
  timelock: { on: false },
  vouch: { on: false, entityIds: [] },
  renounce: { on: false, entityIds: [] },
};

const gate = (over: Partial<Gates>): Gates => ({ ...OPEN, ...over });

/**
 * The authored spec. One entry per live room.
 *
 * `muted` names the occupants who are muted; everybody else is unmuted. Mute
 * state is authored rather than defaulted because it is shown for every
 * occupant at all times, and a room where everyone is unmuted is not a room
 * anybody has been in.
 */
interface Spec {
  id: string;
  frequency: number;
  ecosystem: CoChannel["ecosystem"];
  title: string;
  topic: string;
  hostId: string;
  /** host first; the rest in join order */
  occupantIds: string[];
  muted: string[];
  startedMinutesAgo: number;
  recording?: boolean;
  gates?: Gates;
  nest?: { url: string; title: string; site: string; postedById: string }[];
}

const SPECS: Spec[] = [
  /* ---------------------------------------------------------------- nexus */
  {
    id: "cc-overlay-topics",
    frequency: 98.7,
    ecosystem: "nexus",
    title: "Overlay topics, plainly",
    topic: "What an overlay actually indexes, without the diagram.",
    hostId: "darren-kellenschwiler",
    occupantIds: [
      "darren-kellenschwiler",
      "siggi-oskarsson",
      "priya-raman",
      "rhea-mensah",
      "tc-thoth",
    ],
    muted: ["tc-thoth", "priya-raman"],
    startedMinutesAgo: 47,
    recording: true,
    nest: [
      {
        url: "https://docs.bsvblockchain.org/overlays",
        title: "Overlay services, from the top",
        site: "BSV Skills Center",
        postedById: "darren-kellenschwiler",
      },
      {
        url: "https://github.com/bsv-blockchain/overlay-example",
        title: "A topic manager in 200 lines",
        site: "GitHub",
        postedById: "rhea-mensah",
      },
    ],
  },
  {
    id: "cc-teranode-numbers",
    frequency: 101.3,
    ecosystem: "nexus",
    title: "Teranode numbers, Thursday",
    topic: "This week's throughput, and why Tuesday's dip was our fault.",
    hostId: "oli-oskarsson",
    occupantIds: [
      "oli-oskarsson",
      "mohammad-jaber",
      "dylan-murray",
      "kenji-watanabe",
    ],
    muted: ["dylan-murray", "kenji-watanabe"],
    startedMinutesAgo: 18,
    recording: true,
    nest: [
      {
        url: "https://whatsonchain.com",
        title: "Block explorer, live",
        site: "WhatsOnChain",
        postedById: "oli-oskarsson",
      },
    ],
  },
  {
    id: "cc-sdk-office-hours",
    frequency: 94.1,
    ecosystem: "nexus",
    title: "SDK office hours",
    topic: "Bring a stack trace. Any language.",
    hostId: "austin-rappaport",
    occupantIds: ["austin-rappaport", "tomasz-wojcik", "grace-adeyemi"],
    muted: ["grace-adeyemi"],
    startedMinutesAgo: 92,
  },
  {
    id: "cc-governance-out-loud",
    frequency: 89.5,
    ecosystem: "nexus",
    title: "Governance, out loud",
    topic: "Stewardship without a committee.",
    hostId: "connor-murray",
    occupantIds: ["connor-murray", "mei-lin-chow", "els-verheijen"],
    muted: ["els-verheijen"],
    startedMinutesAgo: 33,
    gates: gate({
      vouch: {
        on: true,
        entityIds: ["darren-kellenschwiler", "siggi-oskarsson"],
      },
    }),
  },
  {
    id: "cc-nex-holders",
    frequency: 92.3,
    ecosystem: "nexus",
    title: "NEX holders",
    topic: "Hub services, bandwidth pricing, and what the credit is for.",
    hostId: "asgeir-oskarsson",
    occupantIds: ["asgeir-oskarsson", "tw-otto", "tw-gus"],
    muted: ["tw-gus"],
    startedMinutesAgo: 8,
    gates: gate({
      token: { on: true, ids: ["nex"], minimums: { nex: 500 } },
    }),
  },
  {
    id: "cc-locked-in",
    frequency: 107.1,
    ecosystem: "nexus",
    title: "Locked in for a year",
    topic: "For people who put a year of blocks behind their opinion.",
    hostId: "henrik-sorensen",
    occupantIds: ["henrik-sorensen", "hc-brandon", "tw-sk84m"],
    muted: ["tw-sk84m"],
    startedMinutesAgo: 64,
    gates: gate({
      timelock: { on: true, assetId: "bsv", amount: 1, minBlocks: 52_560 },
    }),
  },

  /* ------------------------------------------------------------- treechat */
  {
    id: "cc-fee-markets",
    frequency: 96.5,
    ecosystem: "treechat",
    title: "Fee markets after dark",
    topic: "What a block actually costs when nobody is watching.",
    hostId: "tc-kuro",
    occupantIds: ["tc-kuro", "tc-sofia", "tc-kwame", "tw-zainab"],
    muted: ["tc-sofia"],
    startedMinutesAgo: 26,
  },
  {
    id: "cc-pixels-provenance",
    frequency: 88.1,
    ecosystem: "treechat",
    title: "Pixels and provenance",
    topic: "Minting, burning, and who actually holds the thing.",
    hostId: "tc-pxl272",
    occupantIds: ["tc-pxl272", "tc-aoife", "tc-smartwatch", "amara-okonkwo"],
    muted: ["tc-smartwatch"],
    startedMinutesAgo: 71,
    gates: gate({
      token: { on: true, ids: ["bsv"], minimums: { bsv: 0.01 } },
    }),
    nest: [
      {
        url: "https://1satordinals.com",
        title: "The 1Sat spec, current draft",
        site: "1Sat Ordinals",
        postedById: "amara-okonkwo",
      },
    ],
  },
  {
    id: "cc-federation",
    frequency: 103.7,
    ecosystem: "treechat",
    title: "Federation and handle resolution",
    topic: "Two hosts, one name, no registry. How it resolves.",
    hostId: "tc-treechad",
    occupantIds: ["tc-treechad", "tc-ren", "tc-slikmov", "fatima-zahra"],
    muted: ["fatima-zahra"],
    startedMinutesAgo: 14,
    recording: true,
  },
  {
    id: "cc-homestead-hours",
    frequency: 91.9,
    ecosystem: "treechat",
    title: "Homestead hours",
    topic: "Off-grid, off-topic, on air.",
    hostId: "tc-cranker",
    occupantIds: ["tc-cranker", "tc-marta", "tc-ivan", "tw-ironshirtz"],
    muted: [],
    startedMinutesAgo: 143,
  },

  /* --------------------------------------------------------------- twetch */
  {
    id: "cc-1sat-indexers",
    frequency: 99.3,
    ecosystem: "twetch",
    title: "1Sat indexers, warts and all",
    topic: "Reorgs, double-indexed inscriptions, and other things nobody logs.",
    hostId: "tw-shruggr",
    occupantIds: ["tw-shruggr", "tw-hilde", "tw-rafa"],
    muted: ["tw-hilde"],
    startedMinutesAgo: 39,
    nest: [
      {
        url: "https://github.com/shruggr/1sat-indexer",
        title: "1sat-indexer, main branch",
        site: "GitHub",
        postedById: "tw-shruggr",
      },
    ],
  },
  {
    id: "cc-rare-hats",
    frequency: 102.5,
    ecosystem: "twetch",
    title: "Rare hats only",
    topic: "Provenance, floor prices, and one very disputed cap.",
    hostId: "tw-krambo",
    occupantIds: ["tw-krambo", "tw-monkey", "tw-elonmoist", "tw-a"],
    muted: ["tw-a"],
    startedMinutesAgo: 55,
    gates: gate({
      token: { on: true, ids: ["bsv"], minimums: { bsv: 0.25 } },
    }),
  },
  {
    id: "cc-founders-unedited",
    frequency: 87.9,
    ecosystem: "twetch",
    title: "Founders talk, unedited",
    topic: "What we got wrong the first time.",
    hostId: "tw-randy",
    occupantIds: ["tw-randy", "tw-mikey", "tw-craigmason"],
    muted: ["tw-mikey"],
    startedMinutesAgo: 22,
    recording: true,
    gates: gate({
      vouch: { on: true, entityIds: ["tw-randy"] },
    }),
  },
  {
    id: "cc-utxo-forensics",
    frequency: 104.9,
    ecosystem: "twetch",
    title: "UTXO forensics",
    topic: "Tracing a chain of spends, live, with the explorer open.",
    hostId: "tw-utxo",
    occupantIds: ["tw-utxo", "tw-futurefroggy", "tc-j1pelaez"],
    muted: ["tc-j1pelaez"],
    startedMinutesAgo: 103,
    gates: gate({
      renounce: { on: true, entityIds: ["tw-randy"] },
    }),
    nest: [
      {
        url: "https://whatsonchain.com",
        title: "The transaction in question",
        site: "WhatsOnChain",
        postedById: "tw-utxo",
      },
    ],
  },

  /* ---------------------------------------------------------------- yours */
  {
    id: "cc-certificates",
    frequency: 93.5,
    ecosystem: "yours",
    title: "Certificates over logins",
    topic: "Selective disclosure, and why a password is the wrong shape.",
    hostId: "lena-fischer",
    occupantIds: ["lena-fischer", "nora-haddad", "hc-nadia"],
    muted: ["hc-nadia"],
    startedMinutesAgo: 12,
  },
  {
    id: "cc-fees-under-a-cent",
    frequency: 97.7,
    ecosystem: "yours",
    title: "Fees under a cent",
    topic: "Batching, and what it changes about what you can build.",
    hostId: "ola-bergstrom",
    occupantIds: [
      "ola-bergstrom",
      "diego-ramos",
      "sam-whitfield",
      "tomas-lindqvist",
    ],
    muted: ["sam-whitfield"],
    startedMinutesAgo: 78,
  },

  /* ------------------------------------------------------------- handcash */
  {
    id: "cc-till-talk",
    frequency: 90.7,
    ecosystem: "handcash",
    title: "Till talk",
    topic: "Point of sale, loyalty stamps, and queues at lunchtime.",
    hostId: "hc-rosa",
    occupantIds: ["hc-rosa", "clara-bianchi", "marek-novak", "hc-samir"],
    muted: ["hc-samir"],
    startedMinutesAgo: 31,
  },
  {
    id: "cc-delegation",
    frequency: 106.3,
    ecosystem: "handcash",
    title: "Delegation and spend caps",
    topic: "Letting a game spend for you without handing it the keys.",
    hostId: "yusuf-demir",
    occupantIds: ["yusuf-demir", "hana-suzuki", "paula-ferreira", "hc-lin"],
    muted: ["hc-lin"],
    startedMinutesAgo: 6,
  },

  /* --------------------------------------------------------- commonsource */
  {
    id: "cc-short-chains",
    frequency: 95.1,
    ecosystem: "commonsource",
    title: "Short chains, long arguments",
    topic: "Regional hubs, and the incentive that keeps a grower in one.",
    hostId: "mark-frederiks",
    occupantIds: [
      "mark-frederiks",
      "sanne-verhoeven",
      "wouter-de-groot",
      "lieke-jansen",
    ],
    muted: ["wouter-de-groot"],
    startedMinutesAgo: 44,
    nest: [
      {
        url: "https://commonsource.nl",
        title: "The Utrecht hub, one year on",
        site: "Common Source",
        postedById: "sanne-verhoeven",
      },
    ],
  },
  {
    id: "cc-city-procurement",
    frequency: 101.9,
    ecosystem: "commonsource",
    title: "City procurement, in practice",
    topic: "What a council can actually buy, and from whom.",
    hostId: "joris-bakker",
    occupantIds: ["joris-bakker", "ruben-smit", "anouk-peeters", "bram-visser"],
    muted: ["bram-visser"],
    startedMinutesAgo: 17,
  },

  /* -------------------------------------------------------------- mycelia */
  {
    id: "cc-brix-field-day",
    frequency: 89.9,
    ecosystem: "mycelia",
    title: "Brix readings, field day",
    topic: "Refractometers in the rain. Bring your numbers.",
    hostId: "dan-kittredge",
    occupantIds: [
      "dan-kittredge",
      "isa-van-den-berg",
      "ines-moreau",
      "tobias-lang",
    ],
    muted: ["ines-moreau"],
    startedMinutesAgo: 88,
    recording: true,
  },
  {
    id: "cc-nutri-holders",
    frequency: 100.9,
    ecosystem: "mycelia",
    title: "NUTRI holders",
    topic: "What the credit is issued against, and who audits the lab.",
    hostId: "sophie-meijer",
    occupantIds: [
      "sophie-meijer",
      "marcel-van-silfhout",
      "carmen-ortiz",
      "priyanka-nair",
    ],
    muted: ["priyanka-nair"],
    startedMinutesAgo: 2,
    gates: gate({
      token: { on: true, ids: ["nutri"], minimums: { nutri: 250 } },
    }),
  },
];

/* ------------------------------------------------------------------ tables */

/* A room with nobody in it does not exist. The placeholder above is filtered
   here rather than deleted, so the frequency it was holding is demonstrably
   back in the pool. */
const LIVE = SPECS.filter((s) => s.occupantIds.length > 0);

export const coChannels: CoChannel[] = LIVE.map((s) => ({
  id: s.id,
  title: s.title,
  frequency: s.frequency,
  ecosystem: s.ecosystem,
  hostId: s.hostId,
  startedAt: minutesAgo(s.startedMinutesAgo),
  recording: s.recording ?? false,
  topic: s.topic,
  ...(s.gates ? { gates: s.gates } : {}),
}));

export const occupants: Occupant[] = LIVE.flatMap((s) =>
  s.occupantIds.map((personId, i) => ({
    id: `occ-${s.id}-${personId}`,
    coChannelId: s.id,
    personId,
    role: personId === s.hostId ? ("host" as const) : ("speaker" as const),
    muted: s.muted.includes(personId),
    /* Joined in listed order, the host first and earliest. */
    joinedAt: minutesAgo(Math.max(0, s.startedMinutesAgo - i * 3)),
  })),
);

export const nestLinks: NestLink[] = LIVE.flatMap((s) =>
  (s.nest ?? []).map((n, i) => ({
    id: `nest-${s.id}-${i}`,
    coChannelId: s.id,
    postedById: n.postedById,
    url: n.url,
    title: n.title,
    site: n.site,
    postedAt: minutesAgo(Math.max(0, s.startedMinutesAgo - 4 - i * 6)),
  })),
);
