"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { CaretLeft, Copy, LockKey } from "@phosphor-icons/react";
import useFetch from "@/lib/use-fetch";
import { Avatar, EcosystemMark, Identity } from "@/components/identity";
import { PlayButton } from "@/components/co-channel/play-button";
import { Panel } from "@/components/instrument/parts";
import { Button } from "@/components/ui/button";
import { Help } from "@/components/ui/overlays";
import { Badge, Skeleton } from "@/components/ui/primitives";
import { getEcosystem } from "@/data/ecosystems";
import type { Person, Recording } from "@/data/schema";
import {
  formatAgo,
  formatCount,
  formatDuration,
  formatFrequency,
  formatIdentity,
} from "@/lib/format";

type Row = Recording & {
  host: Person;
  occupantsResolved: Person[];
  priceUsd: number;
  platformFee: number;
};

/**
 * One recording.
 *
 * The room this came from no longer exists and its frequency belongs to
 * somebody else by now, which is why the page states both plainly rather than
 * offering to take you there. What it offers instead is the only thing left:
 * listening to it, and sending it to somebody.
 */
export default function RecordingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [bought, setBought] = useState(false);

  const { data, loading, error } = useFetch<Row>(`/api/recordings/${id}`);

  if (error) {
    return (
      <div className="py-16 text-center">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          No such recording
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-balance text-muted-foreground">
          It may never have existed, or the host may have taken it down.
        </p>
        <Button
          variant="primary"
          size="sm"
          className="mt-6"
          onClick={() => router.push("/recordings")}
        >
          All recordings
        </Button>
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="max-w-3xl space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-44 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }
  if (!data) return null;

  const band = getEcosystem(data.ecosystem);
  const locked = data.priceUsd > 0 && !bought;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/recordings/${data.id}`,
      );
      toast.success("Link copied", { description: data.title });
    } catch {
      toast.error("Could not copy the link");
    }
  };

  return (
    <div className="max-w-3xl space-y-5">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push("/recordings")}
        className="-ml-2"
      >
        <CaretLeft size={14} />
        Recordings
      </Button>

      <Panel className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline">Recorded</Badge>
              <span className="text-xs text-muted-foreground">
                {formatAgo(data.recordedAt)}
              </span>
            </div>

            <div className="mt-2 flex items-baseline gap-2">
              <span className="readout font-display text-3xl leading-none tracking-tight">
                {formatFrequency(data.frequency)}
              </span>
              <span className="text-xs text-muted-foreground">MHz</span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <EcosystemMark ecosystem={data.ecosystem} size={12} />@
                {band?.alias ?? data.ecosystem}
              </span>
              <Help>
                The frequency this was recorded on, which belongs to somebody
                else by now
              </Help>
            </div>

            <h1 className="mt-1.5 font-display text-xl font-semibold leading-snug tracking-tight text-balance">
              {data.title}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                Host
                <Identity person={data.host} className="text-xs" />
              </span>
              <span className="readout">{formatDuration(data.duration)}</span>
              <span>{formatCount(data.plays)} plays</span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            {locked ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setBought(true);
                  toast.success("Unlocked", {
                    description: `$${data.priceUsd} to ${formatIdentity(data.host)}, less a ${Math.round(data.platformFee * 100)}% platform fee.`,
                  });
                }}
              >
                <LockKey size={15} />
                {`Unlock for $${data.priceUsd}`}
              </Button>
            ) : (
              <PlayButton src={data.audioSrc} title={data.title} labelled />
            )}
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Copy recording link"
              onClick={copyLink}
            >
              <Copy />
            </Button>
          </div>
        </div>

        {/* The room is gone: say so, rather than offering a way back to it. */}
        <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
          The Co-Channel this came from closed when its last occupant left.
          Recordings are the only thing that outlives a room.
        </p>
      </Panel>

      <section className="space-y-2">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
          Who was in the room
        </h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {data.occupantsResolved.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-2.5 rounded-lg border border-border bg-card p-3"
            >
              <Avatar person={p} size={34} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {p.name}
                </span>
                <Identity person={p} className="text-[11px]" />
              </span>
              {p.id === data.hostId && (
                <Badge variant="muted" className="shrink-0">
                  Host
                </Badge>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
