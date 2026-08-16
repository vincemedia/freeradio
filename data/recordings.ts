/**
 * table: recordings — the one thing that outlives a Co-Channel.
 *
 * A recording carries its own copy of the title and frequency because the room
 * it came from no longer exists to be joined, and its frequency has already
 * been reissued to somebody else. Reading these off the live table would show
 * whoever holds `98.7` today as the host of a conversation from last week.
 *
 * Occupant ids are a plain list here rather than a join table: nothing about a
 * finished recording changes, so there is no relationship left to model.
 */
import { STATION_AUDIO } from "./audio";
import type { Recording } from "./schema";

const NOW = Date.now();
const hoursAgo = (h: number) => new Date(NOW - h * 3_600_000).toISOString();

/**
 * The three that are real.
 *
 * Same files as the live stations, kept from an earlier session on the same
 * frequency, which is what a recording is. Duration is the file's own length
 * rather than a number typed in, so the row cannot claim a length the audio
 * does not have.
 */
const REAL: Recording[] = [
  {
    id: "rec-censorship-part-one",
    title: "Censorship killed millions, the opening",
    frequency: 93.5,
    ecosystem: "twetch",
    hostId: "tw-neil",
    recordedAt: hoursAgo(6),
    duration: STATION_AUDIO["cc-censorship-millions"].envelope.length / 10,
    occupantIds: ["tw-neil", "nick-hudson", "tw-marisol", "tw-brid"],
    plays: 1_284,
    audioSrc: STATION_AUDIO["cc-censorship-millions"].src,
  },
  {
    id: "rec-kurt-ama-12",
    title: "Ask me anything, episode twelve",
    frequency: 106.7,
    ecosystem: "twetch",
    hostId: "tw-kurt",
    recordedAt: hoursAgo(30),
    duration: STATION_AUDIO["cc-kurt-ama"].envelope.length / 10,
    occupantIds: ["tw-kurt", "tw-devon", "tw-shruggr"],
    plays: 863,
    audioSrc: STATION_AUDIO["cc-kurt-ama"].src,
  },
  {
    id: "rec-ordinals-wallet-setup",
    title: "Setting up the wallet, start to finish",
    frequency: 100.0,
    ecosystem: "nexus",
    hostId: "grace-adeyemi",
    recordedAt: hoursAgo(11),
    duration: STATION_AUDIO["cc-ordinals-wallets"].envelope.length / 10,
    occupantIds: ["grace-adeyemi", "amara-okonkwo", "fatima-zahra"],
    plays: 297,
    audioSrc: STATION_AUDIO["cc-ordinals-wallets"].src,
  },
];

export const recordings: Recording[] = [
  ...REAL,
  {
    id: "rec-spv-teach-in",
    title: "SPV, from first principles",
    frequency: 98.7,
    ecosystem: "nexus",
    hostId: "rhea-mensah",
    recordedAt: hoursAgo(19),
    duration: 3_420,
    occupantIds: [
      "rhea-mensah",
      "darren-kellenschwiler",
      "siggi-oskarsson",
      "priya-raman",
      "grace-adeyemi",
    ],
    plays: 412,
  },
  {
    id: "rec-teranode-q3",
    title: "Teranode numbers, last Thursday",
    frequency: 101.3,
    ecosystem: "nexus",
    hostId: "oli-oskarsson",
    recordedAt: hoursAgo(168),
    duration: 1_980,
    occupantIds: [
      "oli-oskarsson",
      "mohammad-jaber",
      "kenji-watanabe",
      "dylan-murray",
    ],
    plays: 288,
  },
  {
    id: "rec-handle-scarcity",
    title: "Why a handle costs money",
    frequency: 92.3,
    ecosystem: "nexus",
    hostId: "asgeir-oskarsson",
    recordedAt: hoursAgo(52),
    duration: 2_640,
    occupantIds: ["asgeir-oskarsson", "connor-murray", "mei-lin-chow", "tw-randy"],
    plays: 907,
  },
  {
    id: "rec-ordinals-postmortem",
    title: "The reorg that ate four hundred inscriptions",
    frequency: 99.3,
    ecosystem: "twetch",
    hostId: "tw-shruggr",
    recordedAt: hoursAgo(30),
    duration: 4_140,
    occupantIds: ["tw-shruggr", "amara-okonkwo", "tw-futurefroggy", "tc-thoth"],
    plays: 1_244,
  },
  {
    id: "rec-twetch-origins",
    title: "Founders talk, the first one",
    frequency: 87.9,
    ecosystem: "twetch",
    hostId: "tw-randy",
    recordedAt: hoursAgo(340),
    duration: 5_280,
    occupantIds: ["tw-randy", "tw-mikey", "tw-craigmason", "tw-utxo"],
    plays: 2_051,
  },
  {
    id: "rec-federation-debate",
    title: "Two hosts, one name",
    frequency: 103.7,
    ecosystem: "treechat",
    hostId: "tc-treechad",
    recordedAt: hoursAgo(74),
    duration: 3_060,
    occupantIds: ["tc-treechad", "tc-thoth", "tc-ren", "lena-fischer"],
    plays: 533,
  },
  {
    id: "rec-fee-markets-night",
    title: "Fee markets after dark, part one",
    frequency: 96.5,
    ecosystem: "treechat",
    hostId: "tc-kuro",
    recordedAt: hoursAgo(96),
    duration: 2_220,
    occupantIds: ["tc-kuro", "tw-zainab", "tc-kwame"],
    plays: 361,
  },
  {
    id: "rec-till-lunch-rush",
    title: "Ninety seconds a customer",
    frequency: 90.7,
    ecosystem: "handcash",
    hostId: "hc-rosa",
    recordedAt: hoursAgo(44),
    duration: 1_500,
    occupantIds: ["hc-rosa", "clara-bianchi", "hc-samir", "paula-ferreira"],
    plays: 176,
  },
  {
    id: "rec-brix-season-close",
    title: "Closing the season, all sites",
    frequency: 89.9,
    ecosystem: "mycelia",
    hostId: "dan-kittredge",
    recordedAt: hoursAgo(122),
    duration: 4_680,
    occupantIds: [
      "dan-kittredge",
      "tobias-lang",
      "carmen-ortiz",
      "isa-van-den-berg",
      "marcel-van-silfhout",
    ],
    plays: 694,
  },
  {
    id: "rec-hub-year-one",
    title: "The Utrecht hub, one year on",
    frequency: 95.1,
    ecosystem: "commonsource",
    hostId: "sanne-verhoeven",
    recordedAt: hoursAgo(210),
    duration: 3_900,
    occupantIds: [
      "sanne-verhoeven",
      "mark-frederiks",
      "wouter-de-groot",
      "joris-bakker",
    ],
    plays: 245,
  },
  {
    id: "rec-certificates-vs-logins",
    title: "Over eighteen, without the birthday",
    frequency: 93.5,
    ecosystem: "yours",
    hostId: "lena-fischer",
    recordedAt: hoursAgo(63),
    duration: 2_760,
    occupantIds: ["lena-fischer", "nora-haddad", "hc-nadia", "henrik-sorensen"],
    plays: 588,
  },
];
