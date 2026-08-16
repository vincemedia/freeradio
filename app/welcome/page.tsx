"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
import { EcosystemMark } from "@/components/identity";
import { Panel } from "@/components/instrument/parts";
import { TuningScale, type Station } from "@/components/instrument/tuning-scale";
import { Button } from "@/components/ui/button";
import { ecosystems } from "@/data/ecosystems";
import type { EcosystemId } from "@/data/schema";
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

/* A band with nothing real on it, purely so the scale has something to show
   before any data has loaded. Marked plainly as an example. */
const DEMO_STATIONS: Station[] = [
  { id: "d1", frequency: 89.5, title: "", occupantCount: 3, contactCount: 1, primaryGate: "open", recording: false },
  { id: "d2", frequency: 94.1, title: "", occupantCount: 5, contactCount: 0, primaryGate: "open", recording: false },
  { id: "d3", frequency: 98.7, title: "", occupantCount: 6, contactCount: 2, primaryGate: "open", recording: true },
  { id: "d4", frequency: 101.3, title: "", occupantCount: 4, contactCount: 0, primaryGate: "token", recording: false },
  { id: "d5", frequency: 104.9, title: "", occupantCount: 3, contactCount: 1, primaryGate: "vouch", recording: false },
];

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
  const [frequency, setFrequency] = useState(98.7);

  const index = STEPS.indexOf(step);
  const progress = Math.max(0.08, (index + 1) / STEPS.length);

  const next = () => setStep(STEPS[Math.min(index + 1, STEPS.length - 1)]);
  const back = () => setStep(STEPS[Math.max(index - 1, 0)]);
  const finish = () => {
    setOnboarded(true);
    router.replace("/");
  };

  /* A slow sweep on the first screen, so the needle is visibly a needle
     before anybody is asked to drag one. Stops as soon as you move on. */
  useEffect(() => {
    if (step !== "what") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) return;
    let i = 0;
    const t = setInterval(() => {
      i = (i + 1) % DEMO_STATIONS.length;
      setFrequency(DEMO_STATIONS[i].frequency);
    }, 2600);
    return () => clearInterval(t);
  }, [step]);

  return (
    <div className="relative min-h-dvh bg-background">
      <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-6 sm:px-6 sm:pt-10 lg:my-8 lg:min-h-[calc(100dvh-4rem)] lg:rounded-xl lg:border lg:border-border lg:bg-card lg:px-8 lg:shadow-[var(--shadow-overlay)]">
        {/* ---- shared chrome ---- */}
        <div className="flex items-center justify-between">
          {step === "what" ? (
            <span className="font-display text-[13px] font-semibold uppercase leading-none tracking-[0.14em]">
              Free<span className="text-muted-foreground">Radio</span>
            </span>
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
                <Panel className="p-4">
                  <TuningScale
                    min={87.5}
                    max={108}
                    step={0.1}
                    value={frequency}
                    stations={DEMO_STATIONS}
                    onChange={setFrequency}
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
                <span className="flex size-20 animate-in items-center justify-center rounded-full bg-primary text-primary-foreground zoom-in-75 duration-300">
                  <Broadcast size={38} />
                </span>
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
