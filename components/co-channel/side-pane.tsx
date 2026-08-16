"use client";

import { useMemo } from "react";
import { toast } from "sonner";
import {
  Coins,
  Copy,
  LockKey,
  Prohibit,
  ShieldCheck,
} from "@phosphor-icons/react";
import { Avatar, BandLine, EcosystemMark, Identity } from "@/components/identity";
import { Button } from "@/components/ui/button";
import { Help } from "@/components/ui/overlays";
import { Badge } from "@/components/ui/primitives";
import { getEcosystem } from "@/data/ecosystems";
import { useLive } from "@/components/live-room-provider";
import { getToken } from "@/data/tokens";
import type { CoChannelView } from "@/data/schema";
import { GATE_HELP, GATE_LABEL } from "@/lib/gates";
import { formatFrequency } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Co-Channel settings, and the link that brings somebody in.
 *
 * The same pane the suite uses for group-chat settings, carrying the same
 * things in the same order: what this room is, who may get in, and who is
 * already here. It docks beside the content at xl and becomes a sheet below
 * that, which is why it is a plain panel and owns no positioning of its own.
 */
export function SidePane({ room }: { room: CoChannelView }) {
  const live = useLive();
  /* A live room's occupancy is the meeting's, not the fixture's. */
  const isLive = room.kind === "live";

  const permalink = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/co-channel/${room.id}`;
  }, [room.id]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(permalink);
      toast.success("Link copied", {
        description: (
          <span className="flex flex-wrap items-center gap-x-1.5">
            <BandLine frequency={room.frequency} ecosystem={room.ecosystem} />
            <span aria-hidden>·</span>
            <span className="truncate">{room.title}</span>
          </span>
        ),
      });
    } catch {
      toast.error("Could not copy the link");
    }
  };

  const gates = room.gates;
  const band = getEcosystem(room.ecosystem);

  return (
    <div className="space-y-6">
      {/* ---- what this room is ---- */}
      <section className="space-y-3">
        <h3 className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
          Co-Channel
        </h3>
        <dl className="space-y-2 text-sm">
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-muted-foreground">Frequency</dt>
            <dd className="readout">{formatFrequency(room.frequency)} MHz</dd>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-muted-foreground">Band</dt>
            <dd className="flex items-center gap-1.5">
              <EcosystemMark ecosystem={room.ecosystem} size={14} />
              {band?.name}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-muted-foreground">In the room</dt>
            <dd className="readout">{isLive ? live.participants.length : room.occupantCount}</dd>
          </div>
        </dl>

        <Button size="sm" className="w-full" onClick={copyLink}>
          <Copy size={15} />
          Copy Co-Channel link
        </Button>
      </section>

      {/* ---- who may get in ---- */}
      <section className="space-y-3">
        <h3 className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
          Who may join
          <Help>{GATE_HELP[room.primaryGate]}</Help>
        </h3>

        {room.primaryGate === "open" ? (
          <p className="text-sm text-muted-foreground">
            Anyone on {band?.name} with a wallet can join, and everyone who
            joins is visible in the list above. Listening from outside needs
            nothing.
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {gates?.token.on && (
              <GateRow
                icon={<Coins size={14} />}
                label={GATE_LABEL.token}
                detail={gates.token.ids
                  .map((id) => {
                    const t = getToken(id);
                    const min = gates.token.minimums?.[id];
                    return min
                      ? `${min.toLocaleString("en-GB")} ${t?.symbol ?? id}`
                      : (t?.symbol ?? id);
                  })
                  .join(" or ")}
              />
            )}
            {gates?.timelock.on && (
              <GateRow
                icon={<LockKey size={14} />}
                label={GATE_LABEL.timelock}
                detail={`${gates.timelock.amount} ${
                  getToken(gates.timelock.assetId ?? "bsv")?.symbol ?? "BSV"
                }, ${(gates.timelock.minBlocks ?? 0).toLocaleString("en-GB")} blocks still to run`}
              />
            )}
            {gates?.vouch.on && (
              <GateRow
                icon={<ShieldCheck size={14} />}
                label={GATE_LABEL.vouch}
                detail={`Vouched by ${gates.vouch.entityIds.length} named handle${gates.vouch.entityIds.length === 1 ? "" : "s"}`}
              />
            )}
            {gates?.renounce.on && (
              <GateRow
                icon={<Prohibit size={14} />}
                label={GATE_LABEL.renounce}
                detail="Anyone a named handle renounced is kept out"
              />
            )}
          </ul>
        )}
      </section>

      {/* ---- who is here ---- */}
      <section className="space-y-3">
        <h3 className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
          In the room
        </h3>
        <ul className="space-y-1">
          {/* A live room's occupancy is the meeting's. A recorded one's is who
              was there, which is history and does not change. */}
          {isLive &&
            live.participants.map((p) => (
              <li key={p.id} className="flex items-center gap-2.5 py-1">
                <span className="min-w-0 flex-1 text-sm font-medium">
                  {p.isSelf ? "You" : p.name}
                </span>
                <span
                  className={cn(
                    "shrink-0 text-[11px]",
                    p.muted ? "text-muted-foreground" : "text-foreground",
                  )}
                >
                  {p.muted ? "Muted" : "Live"}
                </span>
              </li>
            ))}
          {isLive && live.participants.length === 0 && (
            <li className="py-1 text-sm text-muted-foreground">
              Nobody is here yet.
            </li>
          )}

          {!isLive && room.occupants.map((o) => (
            <li key={o.id} className="flex items-center gap-2.5 py-1">
              <Avatar person={o.person} size={30} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-medium">
                    {o.person.name}
                  </span>
                  {o.role === "host" && (
                    <Badge variant="muted" className="shrink-0">
                      Host
                    </Badge>
                  )}
                </span>
                <Identity person={o.person} className="text-[11px]" />
              </span>
              <span
                className={cn(
                  "shrink-0 text-[11px]",
                  o.muted ? "text-muted-foreground" : "text-foreground",
                )}
              >
                {o.muted ? "Muted" : "Live"}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* No invite panel. There was one, and its button raised "Invite
          sent" over a system that had nobody to send anything to — no
          messaging, no notifications, and now no roster of strangers to
          pretend to send to either. Copying the link, above, is the whole of
          what this app can actually do to bring somebody in, so it is what
          it offers. */}
    </div>
  );
}

function GateRow({
  icon,
  label,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  detail: string;
}) {
  return (
    <li className="flex items-start gap-2">
      <span className="mt-0.5 shrink-0 text-muted-foreground">{icon}</span>
      <span className="min-w-0">
        <span className="block font-medium">{label}</span>
        <span className="block text-[13px] leading-snug text-muted-foreground">
          {detail}
        </span>
      </span>
    </li>
  );
}
