"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowsClockwise } from "@phosphor-icons/react";
import useFetch from "@/lib/use-fetch";
import { BandLine } from "@/components/identity";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTrigger,
  Help,
} from "@/components/ui/overlays";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/primitives";
import { GateEditor, OPEN_GATES } from "@/components/co-channel/gate-editor";
import type { CoChannelView, EcosystemId, Gates } from "@/data/schema";
import { validateGates } from "@/lib/gates";
import { getEcosystem } from "@/data/ecosystems";
import { apiPost } from "@/lib/api";
import { ApiError } from "@/lib/api";
import { formatFrequency } from "@/lib/format";
import { useRadio } from "@/lib/store";

type BandInfo = {
  min: number;
  max: number;
  nextFree: number | null;
  stations: { frequency: number }[];
};

/**
 * Opening a Co-Channel.
 *
 * Two decisions, and the app makes both of them for you first: the band you
 * are already on, and the lowest free frequency on it. Naming is the only
 * thing that genuinely needs a person, so it is the only field that starts
 * empty.
 */
export function NewCoChannelDialog({
  children,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: {
  /** the trigger; omit when the dialog is controlled from somewhere else */
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
}) {
  const router = useRouter();
  const ecosystem = useRadio((s) => s.ecosystem);
  const refreshSession = useRadio((s) => s.refreshSession);

  /* Controllable, because the mobile menu needs to open this and then close
     itself. A dialog rendered inside the menu would unmount with it. */
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const setOpen = isControlled
    ? (setControlledOpen ?? (() => {}))
    : setUncontrolledOpen;
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [chosen, setChosen] = useState<number | null>(null);
  const [gates, setGates] = useState<Gates>(OPEN_GATES);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: band } = useFetch<BandInfo>(open ? `/api/band?ecosystem=${ecosystem}` : null);

  /* The frequency is derived from the band until somebody types one, rather
     than copied into state by an effect once the band answers. `chosen` is
     the override; null means "the lowest free tenth". */
  const frequency = chosen ?? band?.nextFree ?? null;

  /* Closing resets the form. That is a consequence of an event, so it happens
     in the event rather than in an effect watching for it. */
  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setTitle("");
      setTopic("");
      setChosen(null);
      setGates(OPEN_GATES);
      setError(null);
    }
  };

  const taken = new Set((band?.stations ?? []).map((s) => s.frequency.toFixed(1)));

  const shuffle = () => {
    if (!band) return;
    const free: number[] = [];
    for (let t = Math.round(band.min * 10); t <= Math.round(band.max * 10); t++) {
      const f = t / 10;
      if (!taken.has(f.toFixed(1))) free.push(f);
    }
    if (free.length === 0) return;
    setChosen(free[Math.floor(Math.random() * free.length)]);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const created = await apiPost<CoChannelView>("/api/co-channels", {
        title,
        topic,
        ecosystem: ecosystem as EcosystemId,
        frequency: frequency ?? undefined,
        gates,
      });
      await refreshSession();
      onOpenChange(false);
      toast.success("You are on air", {
        description: (
          <BandLine frequency={created.frequency} ecosystem={ecosystem} />
        ),
      });
      router.push(`/co-channel/${created.id}`);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not start the station.",
      );
    } finally {
      setBusy(false);
    }
  };

  const frequencyTaken =
    frequency !== null && taken.has(frequency.toFixed(1));
  /* Same check the server runs, so the button is disabled rather than the
     request refused. One implementation, two call sites. */
  const gateProblem = validateGates(gates);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent
        title="Start a station"
        description={`It goes live on ${getEcosystem(ecosystem)?.name} the moment you start it, and closes when the last person leaves.`}
      >
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cc-title">Name</Label>
            <Input
              id="cc-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What are you talking about?"
              autoFocus
              maxLength={70}
            />
            <p className="text-xs text-muted-foreground">
              Names are unique on this band.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cc-topic">Topic</Label>
            <Input
              id="cc-topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="One line, so people know what they are joining."
              maxLength={110}
            />
          </div>

          <div className="space-y-1.5">
            <span className="flex items-center gap-1">
              <Label htmlFor="cc-freq">Frequency</Label>
              <Help>
                No two stations on a band share a frequency, and it is freed when the
                last person leaves
              </Help>
            </span>
            <div className="flex items-center gap-2">
              <Input
                id="cc-freq"
                type="number"
                inputMode="decimal"
                step={0.1}
                min={band?.min}
                max={band?.max}
                value={frequency ?? ""}
                onChange={(e) => setChosen(Number(e.target.value))}
                className="readout w-32"
              />
              <span className="text-sm text-muted-foreground">MHz</span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={shuffle}
                aria-label="Pick another free frequency"
                className="ml-auto"
              >
                <ArrowsClockwise size={15} />
              </Button>
            </div>
            {frequencyTaken && (
              <p className="text-xs text-destructive">
                {formatFrequency(frequency!)} is taken on this band. Try another.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <span className="flex items-center gap-1">
              <Label>Who may join</Label>
              <Help>Every gate you switch on has to pass, and you are exempt from your own</Help>
            </span>
            <GateEditor gates={gates} onChange={setGates} />
            {gateProblem && (
              <p className="text-xs text-destructive">{gateProblem}</p>
            )}
          </div>

          {error && (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <DialogClose asChild>
              <Button type="button" variant="ghost" size="sm">
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={busy || title.trim().length < 3 || frequencyTaken || gateProblem !== null}
            >
              {busy ? "Opening" : "Go on air"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
