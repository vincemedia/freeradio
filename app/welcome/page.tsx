"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Broadcast,
  Check,
  Coins,
  LockKey,
  Microphone,
  Prohibit,
  Record,
  ShieldCheck,
  UsersThree,
} from "@phosphor-icons/react";
import useFetch from "@/lib/use-fetch";
import { LogoMark, Wordmark } from "@/components/brand";
import { EcosystemMark, Facepile } from "@/components/identity";
import { Panel } from "@/components/instrument/parts";
import { TuningScale, type Station } from "@/components/instrument/tuning-scale";
import { Button } from "@/components/ui/button";
import { ecosystems, getEcosystem } from "@/data/ecosystems";
import type { CoChannelView, EcosystemId } from "@/data/schema";
import { useRadio } from "@/lib/store";
import { cn } from "@/lib/utils";

/**
 * First run.
 *
 * Four steps, the same step-machine shape the suite uses elsewhere: a shared
 * header with back and skip, a progress bar, and one decision per screen. The
 * only real decision is the band, and it is pre-answered with the one you are
 * already inside.
 *
 * The tuning scale appears on the very first screen doing the thing it does in
 * the product, rather than as an illustration of it. If the central control
 * needs explaining before you can touch it, it is the wrong control.
 */

const STEPS = ["what", "band", "rules", "ready"] as const;
type Step = (typeof STEPS)[number];

/* Marks for the scale before the real rooms arrive, so the dial is never an
   empty ruler. They carry no titles because they are not rooms. */
const PLACEHOLDER_STATIONS: Station[] = [
  { id: "d1", frequency: 89.5, title: "", occupantCount: 3, contactCount: 1, primaryGate: "open", recording: false },
  { id: "d2", frequency: 94.1, title: "", occupantCount: 5, contactCount: 0, primaryGate: "open", recording: false },
  { id: "d3", frequency: 98.7, title: "", occupantCount: 6, contactCount: 2, primaryGate: "open", recording: true },
  { id: "d4", frequency: 101.3, title: "", occupantCount: 4, contactCount: 0, primaryGate: "token", recording: false },
  { id: "d5", frequency: 104.9, title: "", occupantCount: 3, contactCount: 1, primaryGate: "vouch", recording: false },
];

/** How many rooms the sweep visits before it repeats. */
const SWEEP_SIZE = 5;

/**
 * Rooms for the demonstration dial, drawn from what is actually on air.
 *
 * One per band where possible, so the first thing anybody sees is that a
 * frequency belongs to an ecosystem rather than to the app, which is the
 * point step two then asks them to act on. Frequencies must be distinct or
 * two rooms would land on the same mark and only one would ever be tunable.
 */
function pickSweep(rooms: CoChannelView[]): CoChannelView[] {
  const chosen: CoChannelView[] = [];
  const usedBands = new Set<string>();
  const usedFrequencies = new Set<string>();

  const take = (room: CoChannelView) => {
    const f = room.frequency.toFixed(1);
    if (usedFrequencies.has(f)) return;
    usedFrequencies.add(f);
    usedBands.add(room.ecosystem);
    chosen.push(room);
  };

  /* Busiest first within each band, so the rooms on show are ones with
     somebody in them. */
  const byOccupancy = [...rooms].sort((a, b) => b.occupantCount - a.occupantCount);
  for (const room of byOccupancy) {
    if (chosen.length >= SWEEP_SIZE) break;
    if (!usedBands.has(room.ecosystem)) take(room);
  }
  /* Top up from anywhere if there were not enough bands on air. */
  for (const room of byOccupancy) {
    if (chosen.length >= SWEEP_SIZE) break;
    take(room);
  }

  return chosen.sort((a, b) => a.frequency - b.frequency);
}

const RULES = [
  {
    icon: UsersThree,
    title: "Nobody listens quietly",
    body: "Everyone in a Co-Channel shows their handle and avatar. There is no anonymous audience.",
  },
  {
    icon: Microphone,
    title: "You arrive muted",
    body: "Mute state is visible on every occupant, always, so you can see who is about to speak.",
  },
  {
    icon: Broadcast,
    title: "One room at a time",
    body: "Joining a Co-Channel leaves the one you were in. When the last person leaves, the room closes and its frequency is freed.",
  },
  {
    icon: Record,
    title: "Recording is announced",
    body: "A recording lamp pulses in the header the whole time. Recordings outlive the room; nothing else does.",
  },
] as const;

const GATES = [
  { icon: Coins, label: "Token", body: "Holds a token, sometimes above an amount" },
  { icon: LockKey, label: "Locked", body: "Has value locked up for a set time" },
  { icon: ShieldCheck, label: "Vouched", body: "A named handle vouched for you" },
  { icon: Prohibit, label: "Screened", body: "Anyone a named handle renounced is kept out" },
] as const;

export default function WelcomePage() {
  const router = useRouter();
  const setOnboarded = useRadio((s) => s.setOnboarded);
  const ecosystem = useRadio((s) => s.ecosystem);
  const setEcosystem = useRadio((s) => s.setEcosystem);

  const [step, setStep] = useState<Step>("what");

  /* The needle position is derived: the sweep advances an index, and dragging
     sets an override that also stops the sweep. Storing the frequency instead
     meant writing it from inside the effect, which is a cascading render for
     something that is really just "which room are we showing". */
  const [sweepIndex, setSweepIndex] = useState(0);
  const [manual, setManual] = useState<number | null>(null);

  /* Real rooms, so the dial demonstrates the product rather than illustrating
     it. Only fetched on the first step, which is the only one that shows it. */
  const { data: rooms } = useFetch<CoChannelView[]>(
    step === "what" ? "/api/co-channels" : null,
  );
  const sweep = useMemo(() => pickSweep(rooms ?? []), [rooms]);
  const stations = sweep.length > 0 ? sweep : PLACEHOLDER_STATIONS;

  const frequency =
    manual ?? stations[sweepIndex % stations.length]?.frequency ?? 98.7;

  /* What the needle is currently sitting on, which drives everything above
     the scale: the subject, the faces, and the band it belongs to. */
  const tuned = sweep.find((r) => Math.abs(r.frequency - frequency) < 0.05);
  const tunedBand = tuned ? getEcosystem(tuned.ecosystem) : undefined;

  const index = STEPS.indexOf(step);
  const progress = Math.max(0.08, (index + 1) / STEPS.length);

  const next = () => setStep(STEPS[Math.min(index + 1, STEPS.length - 1)]);
  const back = () => setStep(STEPS[Math.max(index - 1, 0)]);
  const finish = () => {
    setOnboarded(true);
    router.replace("/");
  };

  /* A slow sweep on the first screen, so the needle is visibly a needle
     before anybody is asked to drag one, and so the room shown above it
     changes while you read.

     Depends on the count, not the array, which is a new object every render
     and would restart the interval constantly. */
  const stationCount = stations.length;
  useEffect(() => {
    /* Only while the first step is showing, and only until somebody takes
       hold of the dial themselves. */
    if (step !== "what" || manual !== null) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const t = setInterval(
      () => setSweepIndex((i) => (i + 1) % stationCount),
      3200,
    );
    return () => clearInterval(t);
  }, [step, manual, stationCount]);

  return (
    <div className="relative min-h-dvh bg-background">
      <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-6 sm:px-6 sm:pt-10 lg:my-8 lg:min-h-[calc(100dvh-4rem)] lg:rounded-xl lg:border lg:border-border lg:bg-card lg:px-8 lg:shadow-[var(--shadow-overlay)]">
        {/* ---- shared chrome ---- */}
        <div className="flex items-center justify-between">
          {step === "what" ? (
            <Wordmark markSize={24} />
          ) : (
            <button
              type="button"
              onClick={back}
              aria-label="Back"
              className="flex size-9 items-center justify-center rounded-md border border-border bg-card transition-colors hover:bg-muted"
            >
              <ArrowLeft size={15} />
            </button>
          )}
          <button
            type="button"
            onClick={finish}
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Skip
          </button>
        </div>

        <div className="mt-4 h-0.5 overflow-hidden rounded-full bg-border">
          <div
            className="h-full origin-left rounded-full bg-primary transition-transform duration-500 ease-[var(--ease-out-quint)]"
            style={{ transform: `scaleX(${progress})` }}
          />
        </div>

        {/* ---- steps ---- */}
        <div
          key={step}
          className="flex flex-1 animate-in flex-col fade-in slide-in-from-bottom-1 duration-300"
        >
          {step === "what" && (
            <>
              <div className="flex flex-1 flex-col justify-center py-8">
                {/* What the needle is on, above the scale that found it.
                    Fixed height so the panel does not jump as the sweep moves
                    between rooms with different length titles. */}
                <div className="mb-3 flex h-[4.75rem] items-end">
                  {tuned ? (
                    <div
                      key={tuned.id}
                      className="w-full animate-in fade-in duration-300"
                    >
                      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <EcosystemMark ecosystem={tuned.ecosystem} size={13} />
                        {tunedBand?.name ?? tuned.ecosystem} band
                      </p>
                      <h2 className="mt-1 truncate font-display text-[17px] font-semibold leading-snug tracking-tight">
                        {tuned.title}
                      </h2>
                      <div className="mt-1.5 flex items-center gap-2">
                        <Facepile
                          people={tuned.occupants.map((o) => o.person)}
                          max={4}
                          size={24}
                        />
                        <span className="text-[11px] text-muted-foreground">
                          {tuned.occupantCount} in the room
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full space-y-1.5">
                      <div className="h-3 w-24 animate-pulse rounded-sm bg-border" />
                      <div className="h-4 w-48 animate-pulse rounded-sm bg-border" />
                      <div className="h-6 w-28 animate-pulse rounded-full bg-border" />
                    </div>
                  )}
                </div>

                <Panel className="p-4">
                  <TuningScale
                    min={87.5}
                    max={108}
                    step={0.1}
                    value={frequency}
                    stations={stations}
                    onChange={setManual}
                  />
                </Panel>
                <h1 className="mt-8 font-display text-[28px] font-semibold leading-tight tracking-tight text-balance">
                  Talking, on a frequency
                </h1>
                <p className="mt-2.5 text-[15px] leading-relaxed text-balance text-muted-foreground">
                  Free Radio is live voice rooms. Each one is a Co-Channel and
                  holds a frequency of its own, so you can scan a band and hear
                  what is happening rather than reading about it.
                </p>
              </div>
              <Button variant="primary" className="w-full" onClick={next}>
                Continue
              </Button>
            </>
          )}

          {step === "band" && (
            <>
              <div className="flex-1 py-8">
                <h1 className="font-display text-[26px] font-semibold leading-tight tracking-tight text-balance">
                  Pick your band
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-balance text-muted-foreground">
                  Every ecosystem has its own band. A frequency is unique within
                  one, so 98.7 on Nexus and 98.7 on Twetch are different rooms.
                  You can switch any time from the top bar.
                </p>

                <ul className="mt-6 space-y-2">
                  {ecosystems.map((e) => (
                    <li key={e.id}>
                      <button
                        type="button"
                        onClick={() => setEcosystem(e.id as EcosystemId)}
                        aria-pressed={ecosystem === e.id}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-md border p-3 text-left transition-colors",
                          ecosystem === e.id
                            ? "border-primary bg-primary/10"
                            : "border-border bg-card hover:bg-muted/50",
                        )}
                      >
                        <EcosystemMark ecosystem={e.id} size={22} />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5">
                            <span className="truncate text-sm font-medium">
                              {e.name}
                            </span>
                            {e.local && (
                              <span className="text-[11px] text-muted-foreground">
                                you are here
                              </span>
                            )}
                          </span>
                          <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                            {e.domain}
                          </span>
                        </span>
                        {ecosystem === e.id && <Check size={16} />}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              <Button variant="primary" className="w-full" onClick={next}>
                Continue
              </Button>
            </>
          )}

          {step === "rules" && (
            <>
              <div className="flex-1 py-8">
                <h1 className="font-display text-[26px] font-semibold leading-tight tracking-tight text-balance">
                  How a Co-Channel works
                </h1>
                <ul className="mt-6 space-y-5">
                  {RULES.map(({ icon: Icon, title, body }) => (
                    <li key={title} className="flex items-start gap-3">
                      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-card">
                        <Icon size={17} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold">
                          {title}
                        </span>
                        <span className="mt-0.5 block text-[13px] leading-relaxed text-muted-foreground">
                          {body}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="mt-7 rounded-md border border-border bg-card p-3.5">
                  <p className="text-sm font-medium">Some rooms have a door</p>
                  <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                    A locked Co-Channel says what it wants before you knock.
                  </p>
                  <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
                    {GATES.map(({ icon: Icon, label, body }) => (
                      <li key={label} className="flex items-start gap-2">
                        <Icon size={14} className="mt-0.5 shrink-0 text-muted-foreground" />
                        <span className="min-w-0 text-[12px] leading-snug">
                          <span className="font-medium">{label}</span>
                          <span className="block text-muted-foreground">
                            {body}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <Button variant="primary" className="w-full" onClick={next}>
                Continue
              </Button>
            </>
          )}

          {step === "ready" && (
            <>
              <div className="flex flex-1 flex-col items-center justify-center gap-5 py-8 text-center">
                {/* The set itself, at the one size where its dial, grille and
                    needle actually read. */}
                <LogoMark
                  size={132}
                  priority
                  className="animate-in zoom-in-90 duration-500"
                />
                <h1 className="font-display text-[28px] font-semibold leading-tight tracking-tight text-balance">
                  The band is open
                </h1>
                <p className="max-w-sm text-sm leading-relaxed text-balance text-muted-foreground">
                  Scan for something worth hearing, or open a Co-Channel and take
                  a frequency of your own. You arrive muted either way.
                </p>
              </div>
              <Button variant="primary" className="w-full" onClick={finish}>
                Start listening
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
