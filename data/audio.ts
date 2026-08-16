/**
 * The one station with real audio behind it.
 *
 * `ENVELOPE` is measured, not invented: the mp3 was decoded to mono at 8kHz
 * and the RMS of each 100ms window taken, then normalised against the loudest
 * window. 560 windows, 56.0 seconds. It is what drives the level meter, so
 * the bars move with speech the file actually contains, including its pauses,
 * rather than with a random walk that only looks busy.
 *
 * The transcript is NOT a transcription. There is no speech-to-text in this
 * project, so the lines are authored. What is real is their timing: the audio
 * was segmented on silences of 400ms or more, which gives fifteen utterances,
 * and each line is written to the length of the segment it sits on. The words
 * are a plausible reconstruction of the subject from the title and the
 * artist; treat them as fixture copy, and replace them with a real transcript
 * the moment one exists.
 */

/** Milliseconds per envelope window. */
export const ENVELOPE_WINDOW_MS = 100;

/** RMS per window, 0 to 100, normalised to the loudest window in the file. */
export const ENVELOPE: number[] = [
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
];

/**
 * The station first run drops you into.
 *
 * The one with a file behind it, so the first thing anybody sees is a room
 * with real speech moving the meter rather than a synthesised wobble.
 */
export const FIRST_RUN_STATION = "cc-ordinals-wallets";

/** Where the audio sits, relative to the public directory. */
export const AUDIO_SRC = "/audio/Mastering Ordinals Wallets on 3D Ord.mp3";

/**
 * One spoken turn, timed to a real silence-delimited segment of the audio.
 * `at` and `until` are seconds from the start of the file.
 */
export interface AudioLine {
  at: number;
  until: number;
  personId: string;
  text: string;
}

/**
 * The turns, in the order the audio speaks them.
 *
 * Four voices chosen for the subject: a developer advocate hosting, two people
 * who build ordinals tooling, and somebody who sells work on chain and has
 * been bitten by exactly the mistake under discussion.
 */
export const AUDIO_LINES: AudioLine[] = [
  { at: 0.2, until: 0.7, personId: "grace-adeyemi", text: "Right. Wallets." },
  {
    at: 1.1,
    until: 6.0,
    personId: "grace-adeyemi",
    text: "The question people keep asking is why an ordinary wallet loses an inscription.",
  },
  {
    at: 6.6,
    until: 10.8,
    personId: "amara-okonkwo",
    text: "Because it spends the sat. To an ordinary wallet that is just change.",
  },
  {
    at: 11.3,
    until: 14.2,
    personId: "amara-okonkwo",
    text: "The inscription rides on one satoshi.",
  },
  {
    at: 15.3,
    until: 22.1,
    personId: "fatima-zahra",
    text: "So an ordinals wallet keeps that sat in an output of its own, and never lets the coin selector near it.",
  },
  { at: 22.5, until: 23.5, personId: "tw-dana", text: "That is the whole thing?" },
  { at: 23.9, until: 24.9, personId: "amara-okonkwo", text: "That is the whole thing." },
  {
    at: 26.0,
    until: 28.1,
    personId: "grace-adeyemi",
    text: "Which is why the balance looks wrong.",
  },
  {
    at: 28.5,
    until: 29.9,
    personId: "fatima-zahra",
    text: "One satoshi, held back.",
  },
  {
    at: 30.3,
    until: 33.6,
    personId: "tw-dana",
    text: "I sold a print last month and the buyer never got it.",
  },
  {
    at: 34.0,
    until: 36.6,
    personId: "amara-okonkwo",
    text: "Sent from the wrong wallet, almost certainly.",
  },
  {
    at: 37.2,
    until: 41.5,
    personId: "fatima-zahra",
    text: "Check the outpoint before you send. Any indexer will tell you which sat carries it.",
  },
  { at: 41.9, until: 42.4, personId: "tw-dana", text: "Noted." },
  {
    at: 43.3,
    until: 44.9,
    personId: "grace-adeyemi",
    text: "Everyone write that one down.",
  },
  {
    at: 45.3,
    until: 55.5,
    personId: "amara-okonkwo",
    text: "Two rules, then. Keep inscriptions in a wallet that knows what they are, and never let an ordinary coin selector spend from that address. Everything after that is detail.",
  },
];
