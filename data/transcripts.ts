/**
 * table: transcript_lines, plus the script each room is working through.
 *
 * A room's script is one ordered list, and it drives two things at once: the
 * lines already spoken (the transcript you see on arrival) and the lines still
 * to come (the mock speaking you see while you are in the room). Keeping them
 * in one list is what stops the speaking ring lighting up on somebody whose
 * words never appear, which is the tell that a demo is faking two things
 * separately.
 *
 * How long a line takes is part of the script, not a constant. On the three
 * stations with a recording behind them it is measured: the turn's real start
 * and end in the file. Everywhere else it is estimated from the words, which
 * is still closer to the truth than giving "Just kidding." and a two-sentence
 * argument the same four seconds each.
 */
import { STATION_AUDIO } from "./audio";
import type { TranscriptLine } from "./schema";

/** How many lines of a script are already in the past when you arrive. */
const SEEDED = 4;

type Script = [personId: string, text: string][];

/**
 * Speech, in words per second.
 *
 * Measured off the three transcribed files rather than guessed: they come out
 * at 2.6, 2.9 and 3.0, which is also where the usual figure for unhurried
 * speech sits.
 */
const WORDS_PER_SECOND = 2.8;

/** The shortest a line can be held, so a two-word aside is still readable. */
const MIN_LINE_MS = 900;

/**
 * How long line `index` is spoken for, and the silence after it.
 *
 * Transcribed stations answer from the file. Everything else is estimated
 * from the word count, with a fixed beat between turns: people do not begin
 * speaking the instant the last person stops, and a room where they do reads
 * as a machine reading a list.
 */
export function lineTiming(
  coChannelId: string,
  index: number,
): { holdMs: number; gapMs: number; audioAtMs?: number } {
  const audio = STATION_AUDIO[coChannelId];
  if (audio) {
    const line = audio.lines[index % audio.lines.length];
    const next = audio.lines[(index + 1) % audio.lines.length];
    /* Wrapping back to the top of the file gives a negative gap, so the loop
       gets the same beat as an authored room rather than a jump. */
    const gap = next.at - line.until;
    return {
      holdMs: Math.max(MIN_LINE_MS, (line.until - line.at) * 1000),
      gapMs: gap > 0 ? gap * 1000 : 700,
      audioAtMs: line.at * 1000,
    };
  }

  const script = SCRIPTS[coChannelId];
  const text = script?.[index % script.length]?.[1] ?? "";
  const words = text.trim().split(/\s+/).length;
  return {
    holdMs: Math.max(MIN_LINE_MS, (words / WORDS_PER_SECOND) * 1000),
    gapMs: 700,
  };
}

/**
 * The stations with a recording behind them do not get a script written here.
 * Their turns are the transcribed ones, so the words you read, the person the
 * ring is around, and the bars beside them all describe the same recording.
 */
const TRANSCRIBED: Record<string, Script> = Object.fromEntries(
  Object.entries(STATION_AUDIO).map(([id, audio]) => [
    id,
    audio.lines.map((line) => [line.personId, line.text] as [string, string]),
  ]),
);

export const SCRIPTS: Record<string, Script> = {
  ...TRANSCRIBED,

  "cc-overlay-topics": [
    ["darren-kellenschwiler", "Right, we are on. The question was what an overlay actually stores."],
    ["siggi-oskarsson", "It stores the outputs it was told to care about. That is the whole trick."],
    ["rhea-mensah", "And nothing else. People assume it mirrors the chain. It does not."],
    ["darren-kellenschwiler", "Say more, because that is the bit everyone gets wrong on their first one."],
    ["rhea-mensah", "Your topic manager decides admit or not admit, per output. That is the entire interface."],
    ["priya-raman", "Mine rejects about ninety percent of what it sees and the index is four gigabytes."],
    ["siggi-oskarsson", "Four is nothing. That is a laptop."],
    ["tc-thoth", "Is there a reason to run one if you are not indexing tokens?"],
    ["darren-kellenschwiler", "Discovery. You want to find things without asking a company where they are."],
    ["priya-raman", "Also latency. Local lookup beats a round trip to somebody else's API every time."],
    ["rhea-mensah", "Write the topic manager first. The rest is plumbing you can copy."],
    ["siggi-oskarsson", "I would put that on a poster."],
  ],
  "cc-teranode-numbers": [
    ["oli-oskarsson", "Numbers are up. Peak was just over a million a second on Wednesday."],
    ["mohammad-jaber", "Sustained, or peak with a following wind?"],
    ["oli-oskarsson", "Sustained for eleven minutes. Then we fell over, which is the interesting part."],
    ["kenji-watanabe", "That was the dip Tuesday?"],
    ["oli-oskarsson", "Tuesday was us. Bad config on one of the propagation nodes, entirely self-inflicted."],
    ["mohammad-jaber", "I would rather it was us than the software."],
    ["dylan-murray", "Do we publish the config so people stop hitting the same thing?"],
    ["oli-oskarsson", "Publishing it this afternoon, with the postmortem."],
    ["kenji-watanabe", "Numbers nobody asked for, as usual. Keep doing it."],
  ],
  "cc-sdk-office-hours": [
    ["austin-rappaport", "Office hours. Paste a stack trace, any language, I will look at it live."],
    ["tomasz-wojcik", "Mine throws on the second output every time. Fee estimation."],
    ["austin-rappaport", "Classic. You are computing the fee before you have added the change output."],
    ["tomasz-wojcik", "So the size is wrong when it estimates."],
    ["austin-rappaport", "Right. Add change, then estimate, then adjust change. Two passes, not one."],
    ["tomasz-wojcik", "That is not in the docs anywhere I looked."],
    ["austin-rappaport", "It is not, and it comes up every single week. I will write the example."],
    ["tomasz-wojcik", "Rebuilt it, that fixed it. Thanks."],
  ],
  "cc-governance-out-loud": [
    ["connor-murray", "The premise is that stewardship does not need a committee to exist."],
    ["mei-lin-chow", "It needs somebody who will still be here in five years."],
    ["connor-murray", "Which is not the same as somebody with a title."],
    ["els-verheijen", "In policy work the title is what gets you in the room, though."],
    ["mei-lin-chow", "It gets you in the room. It does not make you right once you are in it."],
    ["connor-murray", "That is the distinction I keep failing to land in writing."],
    ["els-verheijen", "Write it as two examples rather than as a principle. People argue with principles."],
  ],
  "cc-nex-holders": [
    ["asgeir-oskarsson", "Purpose of the credit, one more time, since it keeps coming up."],
    ["tw-otto", "It prices bandwidth. That is it, no governance rights attached."],
    ["asgeir-oskarsson", "Correct. It buys hub services. It does not buy a vote."],
    ["tw-otto", "Which is why I hold it and do not trade it much."],
    ["asgeir-oskarsson", "The gate on this room is five hundred, which is roughly a year of ordinary use."],
    ["tw-otto", "Low enough that it is not a club, high enough that it is not free."],
  ],
  "cc-locked-in": [
    ["henrik-sorensen", "Everyone here has a year of blocks behind their opinion. That is the only rule."],
    ["hc-brandon", "It changes the conversation more than I expected it to."],
    ["henrik-sorensen", "Nobody is pitching. There is nothing to pitch when you cannot move for a year."],
    ["hc-brandon", "You can still be wrong, you just cannot leave quickly."],
    ["henrik-sorensen", "Being wrong slowly is underrated. You have to actually sit with it."],
    ["hc-brandon", "That is the most Danish sentence I have heard this week."],
  ],
  "cc-fee-markets": [
    ["tc-kuro", "Fees after midnight are a different market and I do not think people price it."],
    ["tw-zainab", "Different how? Same mempool."],
    ["tc-kuro", "Same mempool, different competition. You are bidding against batch jobs, not humans."],
    ["tw-zainab", "So the floor is lower but the variance is worse."],
    ["tc-kuro", "Variance is much worse. I have seen it move ten times inside an hour."],
    ["tc-kwame", "Does that matter at these amounts, honestly?"],
    ["tc-kuro", "Not for one transaction. For fifty thousand it is somebody's salary."],
    ["tw-zainab", "That is the part that never makes it into the blog posts."],
  ],
  "cc-pixels-provenance": [
    ["tc-pxl272", "The question was whether burning actually removes the thing."],
    ["tc-smartwatch", "It cannot. The bytes are on chain, they are there forever."],
    ["tc-pxl272", "So the image survives, the claim does not."],
    ["tc-smartwatch", "You burned the title, not the painting."],
    ["tc-aoife", "That is a much better way to put it than anything in the docs."],
    ["tc-smartwatch", "Steal it, I did not invent it."],
    ["tc-pxl272", "Does an indexer show a burned one differently, or does it just vanish?"],
    ["tc-aoife", "Depends whose indexer, which is its own problem."],
  ],
  "cc-federation": [
    ["tc-treechad", "Two hosts, same name. Walk through what resolves."],
    ["tc-ren", "Nothing resolves. They are different people, that is the design."],
    ["tc-treechad", "Correct, and everyone finds it upsetting the first time."],
    ["tc-slikmov", "It is only upsetting if you expected a registry."],
    ["tc-slikmov", "Email did this for forty years and nobody complained."],
    ["tc-ren", "Email also had spam for forty years."],
    ["tc-treechad", "Different problem. The naming part worked fine."],
    ["tc-ren", "Show the domain when the alias is unverified and most of it goes away."],
  ],
  "cc-homestead-hours": [
    ["tc-cranker", "Frost took the last of the beans, so that is the season."],
    ["tc-marta", "Did you save seed off them?"],
    ["tc-cranker", "Two jars. Third year running from the same line now."],
    ["tc-marta", "Send me a spoonful and I will run them here, different soil entirely."],
    ["tc-ivan", "I can put them in the post with the antenna parts."],
    ["tw-ironshirtz", "This is the least on-topic room on the whole band and it is my favourite."],
    ["tc-cranker", "There is no topic. That is the topic."],
  ],
  "cc-1sat-indexers": [
    ["tw-shruggr", "Reorg last night orphaned about four hundred inscriptions. Nobody noticed."],
    ["tw-rafa", "Nobody noticed because nobody was looking, or because it self-healed?"],
    ["tw-shruggr", "Self-healed, but only on indexers that handle reorgs properly. Some do not."],
    ["tw-rafa", "Which ones do not?"],
    ["tw-shruggr", "I am not naming them on air. Test yours, is my advice."],
    ["tw-hilde", "How would somebody test that without causing a reorg?"],
    ["tw-shruggr", "Replay a known one against your index and diff the output. Takes an afternoon."],
  ],
  "cc-rare-hats": [
    ["tw-krambo", "The disputed cap. Let us settle it."],
    ["tw-monkey", "There is nothing to settle, the provenance is on chain."],
    ["tw-krambo", "The provenance is on chain and it shows two mints, which is the dispute."],
    ["tw-elonmoist", "One of those was mine and it was a test."],
    ["tw-monkey", "A test you never burned."],
    ["tw-elonmoist", "I forgot. That is not a conspiracy, it is a Tuesday."],
    ["tw-krambo", "So burn it now and the floor goes back up for everybody."],
    ["tw-elonmoist", "Fine. Doing it after this."],
  ],
  "cc-founders-unedited": [
    ["tw-randy", "What we got wrong. I will start, since it is my room."],
    ["tw-randy", "We priced posting before anybody knew what posting was worth."],
    ["tw-craigmason", "You had to pick a number."],
    ["tw-randy", "We picked it twice and both times we picked it from feel, not from data."],
    ["tw-mikey", "Would data have existed to pick it from?"],
    ["tw-randy", "No. Which is the honest answer and also not much of a defence."],
    ["tw-craigmason", "Everyone shipping now benefits from you being wrong in public."],
  ],
  "cc-utxo-forensics": [
    ["tw-utxo", "Explorer is open. We are following a chain of spends from Monday."],
    ["tw-futurefroggy", "How far back does it stay legible?"],
    ["tw-utxo", "Six hops. After that it fans out and you are guessing."],
    ["tw-futurefroggy", "So tracing is really a six hop tool."],
    ["tw-utxo", "For one person with an afternoon, yes. That is worth saying out loud."],
    ["tc-j1pelaez", "People talk about tracing like it is total."],
    ["tw-utxo", "People also talk about it like it is impossible. Both are wrong."],
  ],
  "cc-certificates": [
    ["lena-fischer", "The argument is that a password is the wrong shape for the problem."],
    ["nora-haddad", "It is a shared secret you have to tell somebody in order to use."],
    ["lena-fischer", "Which is the whole failure, structurally. You hand it over every time."],
    ["nora-haddad", "A certificate you prove without handing over anything."],
    ["lena-fischer", "And you can disclose one field of it rather than the lot."],
    ["nora-haddad", "Over eighteen, without the birthday. That example lands with everybody."],
    ["lena-fischer", "It is the only one that ever lands, so I use it constantly."],
  ],
  "cc-fees-under-a-cent": [
    ["ola-bergstrom", "Batching. What it changes is not the cost, it is what you are willing to build."],
    ["tomas-lindqvist", "Right, at a tenth of a cent you stop designing around the fee."],
    ["ola-bergstrom", "You stop having a payments screen at all, in some products."],
    ["diego-ramos", "Tills care about this more than anybody. Fifty transactions an hour, all tiny."],
    ["tomas-lindqvist", "And they will not tolerate a spinner while it settles."],
    ["diego-ramos", "They will not tolerate anything. The queue is the constraint, not the chain."],
    ["ola-bergstrom", "Which is the correct way round and we keep forgetting it."],
  ],
  "cc-till-talk": [
    ["hc-rosa", "Lunchtime queue is the whole problem. Ninety seconds a customer, no more."],
    ["clara-bianchi", "What is it now?"],
    ["hc-rosa", "About seventy, unless the card machine sulks."],
    ["clara-bianchi", "And with the wallet?"],
    ["hc-rosa", "Faster, but only because they have it open already. That is the real trick."],
    ["marek-novak", "The stamp card is what keeps them opening it."],
    ["hc-rosa", "Ten coffees, one free. It is not sophisticated and it works."],
    ["marek-novak", "Sophisticated loses to a thing people already understand."],
  ],
  "cc-delegation": [
    ["yusuf-demir", "A game should be able to spend for you without holding your keys."],
    ["hana-suzuki", "Studios ask for the keys first, every time."],
    ["yusuf-demir", "They ask because it is the only pattern they know."],
    ["paula-ferreira", "A cap and an expiry gives them the same thing with none of the liability."],
    ["hana-suzuki", "Once you frame it as liability they stop arguing."],
    ["paula-ferreira", "Nobody wants to be holding somebody's keys when something goes wrong."],
    ["yusuf-demir", "That is the sentence that closes the deal, honestly."],
  ],
  "cc-short-chains": [
    ["mark-frederiks", "The incentive question. What keeps a grower in a hub after year one?"],
    ["sanne-verhoeven", "Certainty. Not price, certainty."],
    ["mark-frederiks", "Say that again for the people building spreadsheets."],
    ["sanne-verhoeven", "They will take less money for a number they can plan against."],
    ["lieke-jansen", "Every farm I visit says the same thing in different words."],
    ["wouter-de-groot", "Funders want to hear growth, though."],
    ["sanne-verhoeven", "Retention is growth. It is just growth that does not photograph well."],
    ["mark-frederiks", "Putting that in the annual report."],
  ],
  "cc-city-procurement": [
    ["joris-bakker", "What a council can actually buy, and from whom. Shorter list than you think."],
    ["ruben-smit", "The threshold is the thing. Under it you have discretion, over it you have a tender."],
    ["joris-bakker", "And a tender takes eight months, by which point the season is gone."],
    ["anouk-peeters", "So everything real happens under the threshold."],
    ["ruben-smit", "Which is fine until somebody calls it favouritism."],
    ["joris-bakker", "Traceability answers that. You can show exactly why each one was chosen."],
    ["bram-visser", "If the crates are logged properly, which is my problem, not yours."],
  ],
  "cc-brix-field-day": [
    ["dan-kittredge", "Refractometers out. Read what you have got, not what you hoped for."],
    ["isa-van-den-berg", "Fourteen on the chard, which is the best I have had off that bed."],
    ["dan-kittredge", "Same bed as the compost trial?"],
    ["isa-van-den-berg", "Same bed, third season."],
    ["dan-kittredge", "Then that is a trend, not a reading. Write it down properly."],
    ["tobias-lang", "Trend needs a control, Dan. Do we have one on that site?"],
    ["dan-kittredge", "We do, and it is sitting at nine. Which is why I am cheerful."],
    ["tobias-lang", "Then say fourteen against nine, never just fourteen."],
  ],
  "cc-nutri-holders": [
    ["sophie-meijer", "What the credit is issued against, and who checks the lab."],
    ["marcel-van-silfhout", "Issued against a reading, and the lab is audited twice a year."],
    ["sophie-meijer", "By whom, though, that is the question people actually ask."],
    ["carmen-ortiz", "By a lab that does not issue credits. That separation is the whole point."],
    ["marcel-van-silfhout", "Otherwise you are marking your own homework and everyone knows it."],
    ["carmen-ortiz", "Calibration records are public. Anybody can check the instruments drifted or not."],
    ["sophie-meijer", "That is the sentence for the shelf label, not the white paper."],
  ],
};

/* --------------------------------------------------------------- accessors */

/**
 * The lines already spoken when you arrive.
 *
 * Timed backwards from the room's start so the transcript reads as history
 * rather than as everything having happened in the same second.
 */
export function seedTranscript(
  coChannelId: string,
  startedAt: string,
): TranscriptLine[] {
  const script = SCRIPTS[coChannelId] ?? [];
  const start = new Date(startedAt).getTime();
  /* Walked forward with each line's own timing rather than spaced evenly, so
     the history has the rhythm the room actually had. */
  let offset = 0;
  return script.slice(0, SEEDED).map(([personId, text], i) => {
    const at = new Date(start + offset).toISOString();
    const { holdMs, gapMs } = lineTiming(coChannelId, i);
    offset += holdMs + gapMs;
    return { id: `tr-${coChannelId}-${i}`, coChannelId, personId, text, at };
  });
}

/** Where in a room's script the live lines pick up. */
export const SEEDED_LINES = SEEDED;

/**
 * The lines still to come, in order.
 *
 * Loops rather than ending, because a room that falls permanently silent
 * after nine lines reads as broken rather than as quiet.
 */
export function remainingScript(coChannelId: string): Script {
  const script = SCRIPTS[coChannelId] ?? [];
  return script.slice(SEEDED);
}
