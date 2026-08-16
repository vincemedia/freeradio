"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Broadcast, CaretLeft, CaretRight, LockKey, Shuffle } from "@phosphor-icons/react";
import { toast } from "sonner";
import useFetch from "@/lib/use-fetch";
import { CoChannelCard } from "@/components/co-channel/card";
import { NewCoChannelDialog } from "@/components/co-channel/new-co-channel";
import { Price } from "@/components/price";
import { PageHeader } from "@/components/shell/page-header";
import { Panel } from "@/components/instrument/parts";
import {
  nextStation,
  TuningScale,
  type Station,
} from "@/components/instrument/tuning-scale";
import { Button } from "@/components/ui/button";
import { Help } from "@/components/ui/overlays";
import { EmptyState } from "@/components/ui/primitives";
import { getEcosystem } from "@/data/ecosystems";
import type { CoChannelView } from "@/data/schema";
import { formatFrequency } from "@/lib/format";
import { useRadio } from "@/lib/store";

type Hold = {
  id: string;
  frequency: number;
  label: string;
  until: string;
  holder?: { name: string; handle: string };
};

type BandResponse = {
  min: number;
  max: number;
  step: number;
  stations: Station[];
  holds: Hold[];
  holdPriceUsd: number;
  nextFree: number | null;
};

/**
 * Scanning the band.
 *
 * The point of drawing a scale rather than listing rooms is that you can see
 * the empty stretches. A list tells you what exists; a band tells you how much
 * of it there is, which is the thing that makes finding somebody feel like
 * finding somebody.
 */
export default function ScanPage() {
  const router = useRouter();
  const ecosystem = useRadio((s) => s.ecosystem);
  const join = useRadio((s) => s.join);
  const joining = useRadio((s) => s.joining);
  const currentRoomId = useRadio((s) => s.session?.coChannelId);

  /* Where the needle sits is derived, not stored, until somebody moves it.
     Switching band would otherwise leave it in a gap on the new band, and
     correcting that from an effect means a second render every time the band
     answers. `tunedTo` is the override; null means "wherever the busiest
     room is". */
  const [tunedTo, setTunedTo] = useState<number | null>(null);
  const [lastBand, setLastBand] = useState(ecosystem);
  if (lastBand !== ecosystem) {
    /* Adjusting state during render when a prop changes, which React
       supports and which avoids the extra pass an effect would cost. */
    setLastBand(ecosystem);
    setTunedTo(null);
  }

  const { data: band } = useFetch<BandResponse>(`/api/band?ecosystem=${ecosystem}`);

  const stations = band?.stations ?? [];
  const busiest = stations.length
    ? [...stations].sort((a, b) => b.occupantCount - a.occupantCount)[0]
    : null;
  const frequency = tunedTo ?? busiest?.frequency ?? 98.7;
  const setFrequency = setTunedTo;
  const tuned = stations.find(
    (s) => Math.abs(s.frequency - frequency) < (band?.step ?? 0.1) / 2,
  );
  const heldHere = (band?.holds ?? []).find(
    (h) => Math.abs(h.frequency - frequency) < (band?.step ?? 0.1) / 2,
  );


  const { data: detail } = useFetch<CoChannelView>(tuned ? `/api/co-channels/${tuned.id}` : null);

  const scan = (direction: 1 | -1) => {
    const next = nextStation(stations, frequency, direction);
    if (next) setFrequency(next.frequency);
  };

  /* Anything on this band you are not already in. A random pick that can land
     you where you already are is not random enough to be worth pressing. */
  const pickable = stations.filter((s) => s.id !== currentRoomId);

  /**
   * Tune in somewhere at random.
   *
   * Moves the needle first so the dial is visibly the thing that chose, then
   * joins. If the door turns out to be shut it says which one it tried and
   * leaves the needle there rather than silently rolling again: two failures
   * in a row with no explanation reads as a broken button.
   */
  const surpriseMe = async () => {
    if (pickable.length === 0) return;
    const pick = pickable[Math.floor(Math.random() * pickable.length)];
    setFrequency(pick.frequency);

    const result = await join(pick.id);
    if (!result.ok) {
      toast.error(`${formatFrequency(pick.frequency)} would not let you in`, {
        description: result.reasons?.join(" ") ?? result.error,
      });
      return;
    }
    toast.success(`Tuned in to ${formatFrequency(pick.frequency)}`, {
      description: `${pick.title}. You joined muted.`,
    });
    router.push(`/co-channel/${pick.id}`);
  };

  const bandInfo = getEcosystem(ecosystem);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Scan the band"
        subtitle={`Every station on ${bandInfo?.name ?? "this band"}, at the frequency it holds. Drag the needle, or use the arrow keys.`}
      />

      <Panel className="p-4 sm:p-5">
        <TuningScale
          min={band?.min ?? 87.5}
          max={band?.max ?? 108}
          step={band?.step ?? 0.1}
          value={frequency}
          stations={stations}
          holds={band?.holds ?? []}
          onChange={setFrequency}
        />

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={() => scan(-1)}
            disabled={!nextStation(stations, frequency, -1)}
            aria-label="Scan down the band"
          >
            <CaretLeft size={14} />
            Scan down
          </Button>
          {/* Between the two directions, because it is the third thing you
              can do with a dial and it is the one worth doing when you do not
              know what you are looking for. Primary: on a page whose whole
              job is finding something, "find me something" is the action.

              It joins rather than tuning. Scanning past a station and landing
              in one are different acts, and a button called Surprise me that
              only moved the needle would be the timid version. */}
          <Button
            variant="primary"
            size="sm"
            onClick={() => void surpriseMe()}
            disabled={joining || pickable.length === 0}
            aria-label="Join a station at random on this band"
          >
            <Shuffle size={14} />
            {joining ? "Tuning in" : "Surprise me"}
          </Button>

          <Button
            size="sm"
            onClick={() => scan(1)}
            disabled={!nextStation(stations, frequency, 1)}
            aria-label="Scan up the band"
          >
            Scan up
            <CaretRight size={14} />
          </Button>

          <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="readout">{stations.length}</span> on air
            <Help>
              A frequency is released the moment the last person leaves the station
            </Help>
          </span>
        </div>
      </Panel>

      {tuned && detail ? (
        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold tracking-tight">
            Tuned to {formatFrequency(tuned.frequency)} MHz
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <CoChannelCard coChannel={detail} />
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => router.push(`/co-channel/${detail.id}`)}
          >
            Tune in
          </Button>
        </section>
      ) : heldHere ? (
        /* Silent but spoken for. Saying who holds it and until when is the
           honest version of a gap, and it is also the clearest advertisement
           the feature has. */
        <EmptyState
          title={`${formatFrequency(frequency)} is held`}
          icon={<LockKey size={28} />}
        >
          {heldHere.holder?.name ?? "Someone"} keeps this frequency for{" "}
          {heldHere.label}, until{" "}
          {new Date(heldHere.until).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
          })}
          . Holding a frequency costs{" "}
          <Price usd={band?.holdPriceUsd ?? 0} inline className="text-foreground" />{" "}
          a month on this band, and means an address that survives the room
          closing.
        </EmptyState>
      ) : (
        <EmptyState
          title={`${formatFrequency(frequency)} is empty`}
          icon={<Broadcast size={28} />}
          action={
            <NewCoChannelDialog>
              <Button variant="primary" size="sm">
                Start a station here
              </Button>
            </NewCoChannelDialog>
          }
        >
          Nothing is broadcasting here. Scan to the next station, or take this
          frequency for yourself.
        </EmptyState>
      )}
    </div>
  );
}
