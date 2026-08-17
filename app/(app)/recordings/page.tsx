"use client";

import { useState } from "react";
import { Record } from "@phosphor-icons/react";
import { toast } from "sonner";
import useFetch from "@/lib/use-fetch";
import { usePriceLabel } from "@/components/price";
import {
  RecordingRow,
  type RecordingRowData,
} from "@/components/co-channel/recording-row";
import { PageHeader } from "@/components/shell/page-header";
import { EmptyState, Skeleton } from "@/components/ui/primitives";
import { getEcosystem } from "@/data/ecosystems";
import { formatIdentity } from "@/lib/format";
import { useRadio } from "@/lib/store";

type Row = RecordingRowData;

/**
 * Recordings.
 *
 * The only thing that outlives a Co-Channel, which is why each one carries its
 * own frequency and title: the room is gone and its frequency belongs to
 * somebody else by now.
 *
 * Three of these have a real file behind them and play. The rest are rows
 * with a duration and no audio, and their control says so rather than
 * miming: the same rule the price button follows two lines down.
 */
export default function RecordingsPage() {
  const ecosystem = useRadio((s) => s.ecosystem);
  /* Unlocks are per session, like the rest of the mock money in this app. */
  const [bought, setBought] = useState<Set<string>>(new Set());
  const priceLabel = usePriceLabel();

  const { data, loading } = useFetch<Row[]>(`/api/recordings?ecosystem=${ecosystem}`);

  const band = getEcosystem(ecosystem);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recordings"
        subtitle={`Co-Channels on ${band?.name ?? "this band"} that were recorded before they closed.`}
      />

      {loading && !data ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[4.5rem] w-full rounded-lg" />
          ))}
        </div>
      ) : (data?.length ?? 0) === 0 ? (
        <EmptyState title="Nothing recorded on this band" icon={<Record size={28} />}>
          A Co-Channel is only written down while its host has recording
          switched on. Switch bands from the top bar to see others.
        </EmptyState>
      ) : (
        <ul className="space-y-2">
          {data!.map((r) => {
            const locked = r.priceUsd > 0 && !bought.has(r.id);
            return (
              <RecordingRow
                key={r.id}
                recording={r}
                locked={locked}
                onUnlock={() => {
                  setBought((b) => new Set(b).add(r.id));
                  toast.success("Unlocked", {
                    description: `${priceLabel(r.priceUsd)} to ${r.host ? formatIdentity(r.host) : "the host"}, less a ${Math.round(r.platformFee * 100)}% platform fee.`,
                  });
                }}
              />
            );
          })}
        </ul>
      )}
    </div>
  );
}
