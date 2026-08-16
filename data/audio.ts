/**
 * The three stations with real audio behind them.
 *
 * Both halves of each entry are measured rather than invented.
 *
 * `envelope` is the amplitude: the mp3 decoded to mono at 8kHz, the RMS of
 * every 100ms window taken, and the result normalised against the loudest
 * window in that file. It drives the level meter, so the bars move with the
 * speech the recording actually contains, pauses and all, rather than with a
 * random walk that only looks busy.
 *
 * `lines` are transcribed, by Whisper large-v3-turbo, with its timings kept.
 * Three edits were made by hand and no others: segments it split mid-sentence
 * are rejoined under the union of their timings, the repetition loops it
 * emits at the end of a file are dropped, and proper nouns it misheard are
 * corrected — "Kurt Worker" to "Kurt Wuckert". The words are the speakers'.
 *
 * Everything around them is fixture. These people are not really in a room
 * together on a frequency; the recordings are real and the rooms are not.
 */

/** Milliseconds per envelope window. */
export const ENVELOPE_WINDOW_MS = 100;

/**
 * One spoken turn, timed to the recording.
 * `at` and `until` are seconds from the start of the file.
 */
export interface AudioLine {
  at: number;
  until: number;
  personId: string;
  text: string;
}

export interface StationAudio {
  /** where the file sits, relative to the public directory */
  src: string;
  /** RMS per window, 0 to 100, normalised to the loudest window in the file */
  envelope: number[];
  /** the turns, in the order the recording speaks them */
  lines: AudioLine[];
}

/**
 * The station first run drops you into.
 *
 * One with a file behind it, so the first room anybody sees has real speech
 * moving the meter rather than a synthesised wobble.
 */
export const FIRST_RUN_STATION = "cc-censorship-millions";

/** The band that station is on, so the dial agrees with what is playing. */
export const FIRST_RUN_BAND = "twetch" as const;

export const STATION_AUDIO: Record<string, StationAudio> = {
  /* 56.0s, 560 windows, 14 turns. */
  "cc-ordinals-wallets": {
    src: "/audio/Mastering Ordinals Wallets on 3D Ord.mp3",
    envelope: [
      0, 0, 22, 82, 77, 81, 33, 0, 0, 0, 0, 58, 78, 60, 37, 38, 51, 51, 63, 62,
      34, 44, 13, 63, 40, 47, 40, 58, 43, 12, 17, 6, 14, 42, 30, 28, 28, 29, 40, 46,
      57, 30, 1, 29, 51, 29, 10, 32, 57, 45, 37, 41, 45, 46, 37, 5, 36, 3, 26, 19,
      7, 0, 0, 1, 3, 2, 26, 83, 84, 77, 37, 28, 14, 44, 2, 59, 29, 44, 28, 49,
      49, 41, 18, 39, 48, 43, 7, 31, 29, 1, 1, 70, 62, 19, 49, 7, 61, 65, 47, 18,
      53, 33, 41, 15, 42, 2, 33, 21, 1, 1, 2, 2, 0, 35, 14, 51, 48, 30, 23, 24,
      86, 68, 53, 2, 2, 0, 87, 77, 62, 59, 25, 12, 27, 27, 19, 40, 33, 33, 36, 13,
      7, 13, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 34, 46, 36, 15, 20, 55, 18,
      2, 29, 15, 25, 43, 32, 52, 33, 2, 34, 8, 40, 27, 37, 61, 29, 28, 16, 26, 65,
      55, 39, 27, 16, 42, 23, 29, 23, 3, 29, 15, 4, 4, 2, 25, 60, 18, 16, 52, 32,
      15, 37, 42, 15, 44, 14, 45, 26, 17, 22, 13, 0, 15, 49, 11, 44, 44, 10, 16, 12,
      12, 3, 2, 0, 6, 61, 28, 44, 28, 56, 19, 27, 35, 68, 32, 4, 2, 0, 0, 54,
      37, 35, 20, 10, 57, 34, 16, 53, 43, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      46, 69, 31, 0, 27, 34, 40, 50, 17, 39, 25, 58, 85, 42, 6, 10, 16, 35, 82, 37,
      13, 6, 0, 0, 0, 63, 40, 56, 68, 2, 46, 36, 13, 29, 11, 5, 59, 72, 24, 2,
      2, 2, 1, 74, 79, 39, 24, 40, 75, 71, 50, 85, 41, 13, 66, 22, 39, 45, 16, 59,
      44, 17, 48, 69, 56, 48, 32, 17, 3, 57, 50, 59, 38, 63, 42, 35, 3, 0, 0, 0,
      13, 77, 75, 24, 69, 6, 0, 0, 20, 57, 3, 41, 17, 32, 45, 3, 45, 44, 23, 10,
      35, 27, 19, 32, 75, 28, 3, 0, 0, 0, 0, 1, 55, 48, 47, 72, 75, 13, 21, 84,
      80, 74, 18, 58, 33, 57, 74, 73, 60, 44, 91, 60, 43, 31, 37, 18, 26, 9, 1, 1,
      0, 25, 100, 10, 65, 77, 2, 1, 0, 11, 55, 43, 66, 74, 9, 0, 1, 0, 0, 29,
      54, 66, 17, 44, 7, 1, 0, 0, 0, 0, 0, 0, 0, 43, 70, 66, 76, 51, 11, 21,
      61, 55, 6, 67, 49, 25, 66, 67, 17, 2, 1, 2, 1, 46, 40, 41, 39, 2, 65, 10,
      3, 1, 15, 62, 32, 31, 15, 52, 48, 15, 37, 11, 36, 64, 42, 2, 62, 47, 76, 48,
      38, 8, 1, 2, 43, 38, 18, 18, 11, 55, 44, 7, 58, 50, 18, 5, 2, 0, 32, 55,
      7, 33, 0, 0, 0, 37, 33, 44, 16, 54, 42, 34, 50, 57, 55, 14, 41, 31, 46, 36,
      23, 45, 21, 52, 42, 2, 1, 1, 10, 49, 67, 67, 61, 26, 26, 1, 51, 68, 36, 13,
      45, 23, 22, 63, 61, 41, 51, 25, 44, 33, 31, 7, 7, 45, 28, 3, 0, 0, 0, 0,
    ],
    lines: [
      {
        at: 0.0,
        until: 6.0,
        personId: "grace-adeyemi",
        text: "Alright, today we're going to build your very own secure digital vault on the 3D Ordi platform.",
      },
      {
        at: 6.4,
        until: 14.1,
        personId: "grace-adeyemi",
        text: "I'm going to walk you through everything you need to know to take full control of your digital stuff, from setting up your wallet all the way to protecting your privacy.",
      },
      {
        at: 15.1,
        until: 19.0,
        personId: "grace-adeyemi",
        text: "So, let's kick things off with a really, really important question.",
      },
      {
        at: 19.4,
        until: 23.6,
        personId: "grace-adeyemi",
        text: "When it comes to your digital creations, your currency, who should hold the keys?",
      },
      { at: 23.9, until: 25.0, personId: "grace-adeyemi", text: "Who gets to call the shots?" },
      { at: 25.7, until: 28.0, personId: "grace-adeyemi", text: "Well, the answer is you." },
      { at: 28.3, until: 29.8, personId: "grace-adeyemi", text: "It has to be you, right?" },
      {
        at: 30.2,
        until: 33.5,
        personId: "grace-adeyemi",
        text: "And that's the whole idea behind something called a non-custodial wallet.",
      },
      {
        at: 34.0,
        until: 36.6,
        personId: "grace-adeyemi",
        text: "And guess what? That's exactly what we're setting up today.",
      },
      {
        at: 37.1,
        until: 39.8,
        personId: "grace-adeyemi",
        text: "See, it means you and only you have the keys.",
      },
      {
        at: 40.1,
        until: 42.5,
        personId: "grace-adeyemi",
        text: "Your stuff, your rules. Simple as that.",
      },
      { at: 43.3, until: 44.9, personId: "grace-adeyemi", text: "Alright, let's get into it." },
      {
        at: 45.3,
        until: 49.4,
        personId: "grace-adeyemi",
        text: "First things first, we're going to create your brand spanking new, super secure wallet.",
      },
      {
        at: 49.8,
        until: 55.5,
        personId: "grace-adeyemi",
        text: "Seriously, think of this like your own personal digital vault. And you're about to forge the one and only key.",
      },
    ],
  },
  /* 121.2s, 1212 windows, 16 turns. */
  "cc-censorship-millions": {
    src: "/audio/Censorship Killed Millions - A Twitter space 8th January 2023 - Co-hosts- Neil Oliver & Nick Hudson - short.mp3",
    envelope: [
      14, 16, 27, 24, 29, 24, 22, 43, 42, 36, 24, 13, 17, 21, 17, 55, 65, 19, 23, 15,
      20, 15, 15, 17, 13, 14, 19, 26, 13, 25, 49, 20, 11, 8, 9, 31, 13, 16, 30, 16,
      14, 7, 5, 6, 11, 38, 37, 43, 27, 24, 27, 28, 32, 32, 43, 13, 26, 21, 31, 23,
      46, 22, 18, 23, 43, 39, 54, 48, 35, 16, 10, 5, 9, 17, 18, 17, 16, 15, 24, 18,
      17, 14, 39, 32, 29, 18, 33, 24, 17, 8, 8, 10, 20, 8, 20, 26, 11, 18, 31, 6,
      7, 12, 26, 38, 15, 21, 8, 17, 41, 36, 31, 6, 4, 4, 3, 8, 6, 28, 36, 7,
      26, 9, 19, 19, 11, 10, 19, 6, 7, 16, 27, 19, 5, 20, 17, 29, 31, 6, 5, 18,
      17, 4, 11, 11, 38, 33, 4, 3, 3, 4, 5, 4, 3, 5, 29, 24, 16, 11, 2, 1,
      1, 1, 12, 33, 25, 11, 23, 66, 16, 29, 5, 6, 13, 23, 19, 5, 14, 4, 37, 38,
      13, 11, 4, 13, 12, 2, 9, 20, 21, 4, 0, 10, 26, 16, 16, 26, 13, 12, 8, 29,
      51, 35, 13, 0, 0, 0, 0, 0, 1, 6, 21, 8, 2, 16, 31, 20, 13, 12, 6, 28,
      11, 4, 8, 17, 8, 5, 26, 22, 15, 2, 2, 3, 1, 0, 0, 3, 21, 40, 3, 3,
      20, 16, 12, 6, 1, 1, 1, 0, 17, 34, 23, 10, 18, 25, 26, 40, 69, 26, 16, 13,
      20, 3, 22, 3, 2, 0, 0, 18, 13, 8, 7, 8, 31, 2, 7, 30, 31, 31, 1, 0,
      20, 21, 12, 3, 0, 2, 5, 21, 24, 18, 31, 26, 2, 16, 13, 22, 23, 32, 28, 26,
      46, 40, 2, 1, 1, 1, 1, 9, 20, 13, 12, 2, 17, 40, 13, 25, 45, 24, 26, 14,
      1, 6, 9, 38, 9, 16, 12, 7, 15, 15, 13, 4, 2, 2, 1, 1, 1, 0, 10, 16,
      12, 5, 13, 3, 4, 5, 46, 20, 41, 18, 5, 16, 4, 4, 5, 19, 14, 4, 20, 3,
      12, 1, 2, 2, 1, 2, 19, 24, 14, 10, 5, 0, 0, 0, 5, 3, 22, 12, 8, 4,
      26, 15, 68, 42, 7, 4, 12, 6, 3, 5, 11, 10, 20, 51, 15, 35, 44, 39, 22, 6,
      0, 4, 11, 21, 8, 32, 23, 9, 16, 12, 16, 12, 8, 15, 10, 16, 16, 10, 18, 15,
      24, 20, 8, 0, 0, 0, 0, 0, 0, 4, 4, 32, 26, 33, 22, 36, 17, 10, 1, 14,
      19, 7, 7, 5, 8, 10, 14, 5, 6, 17, 9, 7, 16, 4, 4, 26, 11, 4, 2, 2,
      2, 12, 30, 2, 50, 13, 20, 9, 37, 26, 12, 36, 22, 16, 21, 0, 0, 7, 3, 41,
      27, 17, 27, 16, 8, 22, 10, 22, 30, 18, 21, 14, 16, 35, 6, 12, 18, 18, 62, 7,
      10, 47, 27, 1, 1, 1, 1, 12, 15, 7, 1, 1, 3, 9, 9, 6, 15, 5, 3, 19,
      14, 20, 18, 17, 6, 0, 0, 14, 13, 15, 11, 10, 23, 4, 18, 19, 23, 5, 5, 0,
      1, 1, 1, 1, 7, 18, 9, 3, 16, 17, 6, 15, 5, 24, 20, 11, 22, 15, 5, 10,
      15, 19, 9, 14, 3, 25, 20, 12, 6, 6, 20, 20, 20, 18, 3, 15, 19, 9, 7, 36,
      18, 19, 26, 8, 14, 20, 24, 24, 45, 50, 19, 15, 3, 0, 26, 20, 11, 13, 100, 55,
      12, 2, 18, 17, 19, 51, 30, 34, 11, 19, 8, 1, 1, 1, 1, 14, 21, 8, 15, 23,
      2, 21, 4, 16, 11, 9, 21, 5, 12, 14, 9, 6, 13, 5, 25, 18, 25, 22, 11, 36,
      35, 24, 2, 1, 0, 0, 0, 5, 5, 12, 16, 17, 31, 17, 8, 3, 7, 36, 38, 14,
      3, 3, 2, 1, 10, 11, 10, 8, 1, 0, 0, 5, 0, 1, 0, 8, 36, 49, 32, 18,
      46, 40, 1, 1, 52, 43, 37, 39, 69, 49, 1, 15, 3, 12, 26, 12, 21, 19, 29, 7,
      0, 14, 24, 2, 12, 31, 19, 3, 19, 19, 48, 37, 21, 17, 4, 0, 3, 25, 29, 42,
      23, 1, 8, 7, 3, 7, 13, 3, 15, 3, 17, 20, 8, 38, 34, 29, 47, 29, 8, 0,
      0, 0, 0, 0, 0, 1, 1, 0, 34, 44, 13, 55, 28, 27, 18, 3, 21, 14, 2, 23,
      23, 1, 0, 19, 24, 28, 49, 30, 3, 0, 0, 0, 0, 0, 35, 62, 30, 39, 14, 33,
      41, 55, 42, 19, 2, 35, 39, 35, 37, 36, 36, 36, 23, 0, 0, 0, 0, 0, 0, 30,
      40, 37, 32, 51, 22, 1, 16, 40, 33, 28, 4, 16, 11, 22, 26, 12, 3, 52, 24, 10,
      11, 6, 21, 16, 24, 36, 5, 11, 20, 16, 10, 1, 44, 20, 19, 23, 19, 14, 5, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 48, 26, 44, 34, 29, 29, 28, 30, 10, 19, 8,
      14, 8, 6, 38, 5, 21, 18, 9, 42, 11, 17, 12, 2, 66, 49, 5, 3, 20, 47, 25,
      7, 16, 14, 5, 2, 0, 0, 0, 0, 0, 0, 0, 0, 4, 17, 8, 8, 15, 25, 2,
      0, 3, 16, 57, 61, 51, 5, 26, 27, 16, 12, 20, 40, 41, 12, 2, 1, 0, 0, 1,
      7, 10, 12, 16, 19, 18, 3, 0, 0, 0, 4, 24, 4, 3, 19, 25, 23, 23, 28, 15,
      1, 16, 2, 53, 60, 48, 28, 4, 2, 0, 0, 0, 0, 4, 13, 32, 22, 28, 9, 2,
      19, 20, 16, 13, 11, 7, 63, 60, 47, 53, 19, 12, 17, 25, 6, 6, 1, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 1, 42, 28, 13, 22, 23, 21, 3, 1, 24, 50, 48, 26, 6,
      0, 1, 11, 8, 2, 1, 39, 39, 6, 2, 2, 1, 0, 0, 1, 16, 5, 14, 6, 10,
      29, 31, 4, 5, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 26, 25, 39, 35,
      21, 20, 20, 12, 25, 31, 16, 41, 45, 50, 45, 10, 13, 15, 8, 17, 6, 55, 10, 17,
      1, 35, 41, 34, 30, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 13, 32, 31, 23,
      16, 28, 8, 16, 10, 60, 17, 42, 9, 2, 0, 0, 2, 19, 40, 26, 12, 17, 34, 15,
      6, 20, 9, 46, 45, 36, 15, 2, 0, 0, 0, 0, 0, 0, 11, 31, 32, 25, 20, 6,
      1, 0, 3, 25, 45, 34, 52, 61, 48, 16, 15, 17, 3, 36, 57, 18, 4, 2, 0, 1,
      9, 28, 40, 54, 25, 40, 32, 49, 47, 19, 13, 2, 8, 26, 4, 3, 23, 29, 32, 30,
      28, 8, 41, 16, 14, 12, 2, 3, 6, 22, 26, 38, 29, 2, 1, 0, 0, 0, 13, 44,
      18, 6, 40, 62, 8, 15, 27, 35, 31, 3, 2, 39, 27, 21, 20, 23, 11, 16, 33, 21,
      10, 15, 7, 16, 18, 4, 18, 14, 2, 1, 0, 0,
    ],
    lines: [
      {
        at: 0.0,
        until: 7.0,
        personId: "tw-neil",
        text: "We've assembled four groups, each with six or seven speakers who will speak each for a couple of minutes.",
      },
      {
        at: 7.6,
        until: 14.6,
        personId: "tw-neil",
        text: "You'll give an outline of the nature of the way in which they were censored, or their experience over the last two, three years.",
      },
      {
        at: 15.8,
        until: 20.2,
        personId: "tw-neil",
        text: "The four groups are Group 1, which is political and global.",
      },
      { at: 21.0, until: 23.1, personId: "tw-neil", text: "Group 2 is vaccine science." },
      {
        at: 23.1,
        until: 33.0,
        personId: "tw-neil",
        text: "Group 3 is about early treatment, and Group 4, representatives from the media and news gathering organisations.",
      },
      {
        at: 33.9,
        until: 36.1,
        personId: "tw-neil",
        text: "It's uncensored, it's free speech.",
      },
      {
        at: 37.5,
        until: 50.3,
        personId: "tw-neil",
        text: "But of course, the thing to remember, therefore, is that each individual speaker, anyone taking the microphone, so to speak, takes responsibility personally for any consequences of what's actually said.",
      },
      {
        at: 50.3,
        until: 53.9,
        personId: "tw-neil",
        text: "Pretty much like you do in normal, uncensored life.",
      },
      {
        at: 54.5,
        until: 61.0,
        personId: "tw-neil",
        text: "So the responsibility for anything said will not be with the facilitators of the event, or the hosts, or the moderators.",
      },
      {
        at: 61.5,
        until: 66.2,
        personId: "tw-neil",
        text: "We're all taking responsibility for the things that we say, which seems fair enough.",
      },
      {
        at: 67.6,
        until: 73.8,
        personId: "tw-neil",
        text: "So I think, Nick, I think maybe you had some opening remarks just to get the ball rolling.",
      },
      {
        at: 74.8,
        until: 76.6,
        personId: "nick-hudson",
        text: "Yeah, sure, Neil. Thanks for that intro.",
      },
      {
        at: 76.6,
        until: 83.8,
        personId: "nick-hudson",
        text: "I mean, I think it's important to remember that the evil twin of censorship is propaganda.",
      },
      {
        at: 84.7,
        until: 91.7,
        personId: "nick-hudson",
        text: "Propaganda is the projection of essentially false notions with various aims in mind.",
      },
      {
        at: 91.7,
        until: 110.5,
        personId: "nick-hudson",
        text: "It instils a kind of environment in which some kind of story that is false, but which suits people economically or ideologically, is projected in an effort to make it prevail.",
      },
      {
        at: 110.5,
        until: 120.6,
        personId: "nick-hudson",
        text: "And because the narrative is false, you need to get rid of these pesky dissidents who would falsify it by raising objections.",
      },
    ],
  },
  /* 90.2s, 902 windows, 18 turns. */
  "cc-kurt-ama": {
    src: "/audio/Ask Me Anything- Live with Kurt Wuckert Jr. - Ep 12 - S5 short.mp3",
    envelope: [
      0, 0, 0, 0, 0, 0, 33, 58, 32, 18, 57, 95, 10, 87, 68, 45, 48, 49, 48, 37,
      21, 22, 61, 64, 51, 42, 24, 6, 6, 10, 5, 13, 39, 35, 26, 16, 11, 7, 16, 5,
      24, 5, 1, 23, 26, 16, 12, 31, 18, 11, 24, 16, 15, 26, 5, 12, 33, 33, 17, 24,
      18, 15, 34, 30, 34, 29, 26, 20, 7, 34, 29, 17, 1, 1, 1, 1, 0, 0, 1, 8,
      13, 26, 18, 18, 4, 7, 6, 3, 1, 1, 1, 1, 1, 41, 60, 61, 36, 13, 4, 3,
      1, 1, 1, 18, 62, 31, 74, 60, 10, 38, 35, 31, 29, 8, 1, 1, 0, 0, 1, 1,
      1, 1, 1, 1, 18, 27, 16, 16, 5, 26, 32, 18, 17, 12, 4, 4, 2, 2, 2, 2,
      1, 12, 11, 64, 4, 87, 27, 75, 62, 24, 73, 8, 6, 2, 31, 16, 22, 45, 20, 25,
      19, 1, 19, 8, 4, 2, 2, 2, 2, 2, 1, 19, 14, 10, 18, 2, 2, 2, 1, 1,
      13, 15, 20, 15, 9, 20, 10, 36, 64, 59, 41, 43, 20, 10, 4, 1, 34, 64, 17, 47,
      56, 70, 46, 7, 61, 71, 36, 93, 36, 21, 16, 22, 21, 22, 30, 15, 14, 22, 22, 3,
      4, 22, 63, 11, 13, 45, 68, 52, 16, 35, 55, 21, 47, 46, 30, 3, 1, 2, 2, 24,
      29, 28, 24, 19, 15, 25, 33, 13, 4, 6, 4, 2, 2, 1, 2, 2, 2, 4, 30, 8,
      25, 27, 5, 65, 56, 11, 7, 56, 60, 42, 6, 66, 44, 59, 51, 5, 72, 22, 57, 71,
      12, 71, 28, 9, 28, 33, 23, 41, 46, 22, 42, 32, 27, 4, 27, 29, 12, 7, 29, 32,
      16, 20, 30, 2, 2, 1, 1, 14, 50, 56, 26, 61, 24, 30, 15, 1, 21, 25, 1, 22,
      41, 8, 42, 47, 54, 45, 42, 19, 28, 11, 50, 56, 46, 56, 37, 34, 47, 9, 36, 29,
      35, 4, 36, 29, 2, 4, 4, 1, 3, 5, 1, 2, 52, 86, 75, 70, 63, 3, 4, 2,
      3, 36, 56, 25, 61, 31, 54, 3, 74, 88, 85, 26, 23, 62, 50, 20, 60, 80, 31, 16,
      73, 15, 69, 58, 36, 27, 22, 43, 48, 53, 30, 27, 1, 0, 4, 3, 2, 1, 1, 2,
      1, 63, 16, 6, 5, 5, 6, 1, 10, 23, 36, 69, 18, 49, 96, 67, 14, 6, 73, 62,
      27, 13, 46, 21, 36, 42, 24, 13, 14, 4, 29, 31, 24, 20, 23, 21, 22, 14, 20, 25,
      29, 21, 28, 31, 44, 34, 14, 29, 19, 20, 9, 33, 5, 7, 21, 31, 17, 44, 8, 9,
      9, 42, 41, 38, 4, 4, 3, 2, 1, 2, 2, 1, 4, 4, 12, 42, 39, 57, 17, 26,
      32, 34, 31, 36, 20, 24, 65, 84, 53, 31, 41, 36, 48, 39, 26, 15, 7, 37, 69, 12,
      46, 18, 8, 66, 100, 48, 54, 52, 47, 80, 76, 15, 41, 36, 19, 63, 53, 29, 11, 13,
      12, 6, 3, 2, 1, 2, 2, 3, 5, 2, 13, 12, 18, 14, 20, 16, 2, 9, 12, 36,
      44, 41, 42, 15, 8, 22, 20, 12, 20, 16, 20, 15, 10, 6, 6, 2, 7, 4, 8, 13,
      12, 7, 6, 2, 2, 1, 2, 3, 26, 17, 17, 8, 22, 19, 19, 13, 3, 1, 52, 83,
      77, 28, 26, 25, 25, 25, 22, 15, 12, 36, 74, 45, 41, 55, 14, 53, 16, 3, 30, 36,
      10, 8, 53, 66, 67, 21, 82, 71, 7, 76, 33, 8, 9, 14, 2, 67, 45, 8, 72, 76,
      66, 56, 27, 56, 51, 54, 15, 25, 19, 13, 8, 5, 27, 71, 30, 25, 27, 35, 51, 55,
      65, 65, 28, 47, 50, 31, 47, 28, 28, 42, 26, 45, 14, 71, 7, 2, 9, 27, 52, 43,
      48, 42, 47, 52, 47, 29, 19, 19, 40, 8, 38, 50, 30, 13, 10, 37, 54, 30, 28, 27,
      38, 23, 40, 5, 26, 29, 14, 17, 4, 21, 2, 3, 2, 2, 17, 19, 35, 34, 21, 48,
      57, 7, 3, 2, 4, 3, 45, 41, 36, 20, 22, 24, 27, 9, 20, 16, 8, 14, 8, 33,
      22, 29, 73, 52, 18, 88, 80, 63, 37, 31, 66, 42, 43, 38, 4, 33, 58, 44, 38, 33,
      14, 34, 38, 7, 16, 19, 41, 46, 20, 23, 21, 27, 13, 8, 16, 26, 17, 21, 24, 15,
      15, 19, 4, 3, 2, 1, 54, 12, 65, 7, 57, 62, 65, 53, 53, 42, 7, 60, 89, 61,
      20, 49, 29, 57, 43, 25, 43, 37, 28, 13, 20, 40, 27, 3, 2, 1, 7, 25, 18, 44,
      27, 55, 51, 75, 9, 2, 3, 39, 42, 27, 16, 52, 56, 53, 51, 54, 52, 12, 3, 1,
      3, 2, 2, 3, 2, 3, 2, 1, 1, 2, 3, 1, 2, 5, 18, 26, 26, 9, 14, 52,
      50, 58, 39, 3, 58, 54, 29, 66, 58, 21, 67, 44, 68, 33, 54, 45, 9, 29, 72, 65,
      8, 69, 54, 75, 47, 61, 70, 34, 74, 67, 40, 24, 31, 6, 39, 52, 55, 14, 36, 46,
      38, 32, 32, 39, 13, 29, 22, 2, 3, 6, 5, 3, 2, 2, 1, 2, 2, 2, 2, 2,
      2, 1,
    ],
    lines: [
      {
        at: 0.0,
        until: 8.7,
        personId: "tw-kurt",
        text: "You know, every time we do these shows live with just me, when it's an Ask Me Anything show, I always wonder, should I wear the headphones?",
      },
      {
        at: 9.3,
        until: 13.9,
        personId: "tw-kurt",
        text: "Because ultimately, I want you to see my ears, everybody.",
      },
      { at: 15.1, until: 16.5, personId: "tw-kurt", text: "No, not really." },
      {
        at: 17.2,
        until: 19.5,
        personId: "tw-kurt",
        text: "Do I have an ear thing? I don't have an ear thing.",
      },
      { at: 19.8, until: 21.4, personId: "tw-kurt", text: "So, hey, I'm Kurt Wuckert Jr." },
      {
        at: 21.5,
        until: 27.6,
        personId: "tw-kurt",
        text: "If you could like, subscribe, hit the alert bell across everything, that's super helpful.",
      },
      {
        at: 27.6,
        until: 34.4,
        personId: "tw-kurt",
        text: "Most specifically on the CoinGeek related stuff, or my personal stuff, you can subscribe to me on OnlyKurt.",
      },
      { at: 34.7, until: 35.4, personId: "tw-kurt", text: "Just kidding." },
      {
        at: 36.1,
        until: 41.6,
        personId: "tw-kurt",
        text: "No, hit across YouTube, Instagram, X, LinkedIn.",
      },
      {
        at: 41.7,
        until: 57.5,
        personId: "tw-kurt",
        text: "I don't know if LinkedIn lets you subscribe to anything, but if you could go ahead and do the clickety-click and let the cyber overlords know that you wish to consume our content consistently and forever, it would definitely make everyone very, very happy.",
      },
      { at: 58.6, until: 59.7, personId: "tw-kurt", text: "One thing, real quick." },
      {
        at: 60.0,
        until: 63.1,
        personId: "tw-kurt",
        text: "I'm getting some severe weather alerts.",
      },
      {
        at: 63.1,
        until: 71.5,
        personId: "tw-kurt",
        text: "So if all of a sudden everything goes hazy, I probably haven't been assassinated, and in all likelihood, it is just simply some thunder and lightning.",
      },
      {
        at: 71.8,
        until: 75.9,
        personId: "tw-kurt",
        text: "But it looks nice outside based on my quick view of the outdoors.",
      },
      {
        at: 75.9,
        until: 80.5,
        personId: "tw-kurt",
        text: "But they keep pinging me, so if all of a sudden I disappear, that's what's up.",
      },
      { at: 80.7, until: 83.7, personId: "tw-kurt", text: "So blame... God?" },
      {
        at: 84.4,
        until: 87.3,
        personId: "tw-kurt",
        text: "So, I don't know. Okay, so this is an Ask Me Anything show.",
      },
      { at: 87.4, until: 88.9, personId: "tw-kurt", text: "So what I need you to do is..." },
    ],
  },
};
