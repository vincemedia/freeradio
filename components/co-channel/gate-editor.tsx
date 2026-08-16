"use client";

import { useState } from "react";
import { Coins, LockKey, MagnifyingGlass, Prohibit, ShieldCheck } from "@phosphor-icons/react";
import useFetch from "@/lib/use-fetch";
import { Avatar, Identity } from "@/components/identity";
import { Help } from "@/components/ui/overlays";
import { Input } from "@/components/ui/primitives";
import { tokens } from "@/data/tokens";
import type { Gates, Person } from "@/data/schema";
import { GATE_HELP } from "@/lib/gates";
import { cn } from "@/lib/utils";

export const OPEN_GATES: Gates = {
  token: { on: false, ids: [] },
  timelock: { on: false },
  vouch: { on: false, entityIds: [] },
  renounce: { on: false, entityIds: [] },
};

/** Blocks per day at ten minutes a block, for turning a lock into a duration. */
const BLOCKS_PER_DAY = 144;
const LOCK_TERMS = [
  { label: "1 month", days: 30 },
  { label: "3 months", days: 90 },
  { label: "6 months", days: 182 },
  { label: "1 year", days: 365 },
] as const;

type ContactRow = { person: Person };

/**
 * The door, when you are the one building it.
 *
 * Four independent switches rather than a single mode, because gates are
 * additive: a room can ask for a token and a vouch at once, and a mode picker
 * would quietly say otherwise. Each switch reveals only its own settings, so
 * an open room, which is most rooms, stays four lines tall.
 *
 * Locks are set in months and converted to blocks. Blocks are the honest unit
 * and what the gate is evaluated in, but nobody plans in blocks.
 */
export function GateEditor({
  gates,
  onChange,
}: {
  gates: Gates;
  onChange: (next: Gates) => void;
}) {
  const { data: contacts } = useFetch<ContactRow[]>("/api/contacts");
  const people = (contacts ?? []).map((c) => c.person);

  const set = (patch: Partial<Gates>) => onChange({ ...gates, ...patch });

  return (
    <div className="space-y-2">
      {/* ---- token ---- */}
      <GateRow
        icon={<Coins size={15} />}
        label="Holds a token"
        help={GATE_HELP.token}
        on={gates.token.on}
        onToggle={(on) =>
          set({ token: { ...gates.token, on, ids: on ? gates.token.ids : [] } })
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Token"
            value={gates.token.ids[0] ?? ""}
            onChange={(e) =>
              set({ token: { ...gates.token, ids: e.target.value ? [e.target.value] : [] } })
            }
            className="h-10 rounded-md border border-input bg-card px-2 text-sm"
          >
            <option value="">Pick a token</option>
            {tokens.map((t) => (
              <option key={t.id} value={t.id}>
                {t.symbol}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            at least
            <Input
              type="number"
              min={0}
              step="any"
              aria-label="Minimum holding"
              value={
                gates.token.ids[0]
                  ? (gates.token.minimums?.[gates.token.ids[0]] ?? "")
                  : ""
              }
              onChange={(e) => {
                const id = gates.token.ids[0];
                if (!id) return;
                set({
                  token: {
                    ...gates.token,
                    minimums: { ...gates.token.minimums, [id]: Number(e.target.value) },
                  },
                });
              }}
              disabled={!gates.token.ids[0]}
              className="readout h-10 w-28"
            />
          </label>
        </div>
      </GateRow>

      {/* ---- timelock ---- */}
      <GateRow
        icon={<LockKey size={15} />}
        label="Has value locked"
        help={GATE_HELP.timelock}
        on={gates.timelock.on}
        onToggle={(on) =>
          set({
            timelock: on
              ? { on, assetId: "bsv", amount: 1, minBlocks: 182 * BLOCKS_PER_DAY }
              : { on: false },
          })
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="number"
            min={0}
            step="any"
            aria-label="Amount locked"
            value={gates.timelock.amount ?? ""}
            onChange={(e) =>
              set({ timelock: { ...gates.timelock, amount: Number(e.target.value) } })
            }
            className="readout h-10 w-28"
          />
          <span className="text-sm text-muted-foreground">BSV, for</span>
          <select
            aria-label="Lock term"
            value={String(
              LOCK_TERMS.find(
                (t) => t.days * BLOCKS_PER_DAY === gates.timelock.minBlocks,
              )?.days ?? 182,
            )}
            onChange={(e) =>
              set({
                timelock: {
                  ...gates.timelock,
                  minBlocks: Number(e.target.value) * BLOCKS_PER_DAY,
                },
              })
            }
            className="h-10 rounded-md border border-input bg-card px-2 text-sm"
          >
            {LOCK_TERMS.map((t) => (
              <option key={t.days} value={t.days}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          {(gates.timelock.minBlocks ?? 0).toLocaleString("en-GB")} blocks still
          to run, checked when somebody knocks.
        </p>
      </GateRow>

      {/* ---- vouch ---- */}
      <GateRow
        icon={<ShieldCheck size={15} />}
        label="Vouched for"
        help={GATE_HELP.vouch}
        on={gates.vouch.on}
        onToggle={(on) => set({ vouch: { on, entityIds: on ? gates.vouch.entityIds : [] } })}
      >
        <HandlePicker
          people={people}
          selected={gates.vouch.entityIds}
          onChange={(entityIds) => set({ vouch: { ...gates.vouch, entityIds } })}
          hint="A vouch from any one of these opens the door."
        />
      </GateRow>

      {/* ---- renounce ---- */}
      <GateRow
        icon={<Prohibit size={15} />}
        label="Screened"
        help={GATE_HELP.renounce}
        on={gates.renounce.on}
        onToggle={(on) =>
          set({ renounce: { on, entityIds: on ? gates.renounce.entityIds : [] } })
        }
      >
        <HandlePicker
          people={people}
          selected={gates.renounce.entityIds}
          onChange={(entityIds) => set({ renounce: { ...gates.renounce, entityIds } })}
          hint="Anyone these handles renounced is kept out."
        />
      </GateRow>
    </div>
  );
}

function GateRow({
  icon,
  label,
  help,
  on,
  onToggle,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  help: string;
  on: boolean;
  onToggle: (on: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-md border transition-colors",
        on ? "border-border bg-card" : "border-transparent",
      )}
    >
      <label className="flex cursor-pointer items-center gap-2.5 px-2.5 py-2">
        <span className="shrink-0 text-muted-foreground">{icon}</span>
        <span className="flex-1 text-sm font-medium">{label}</span>
        <Help>{help}</Help>
        {/* A switch, per DESIGN.md: boolean state in a settings row is never a
            toggle button. */}
        <span className="relative inline-flex shrink-0">
          <input
            type="checkbox"
            checked={on}
            onChange={(e) => onToggle(e.target.checked)}
            className="peer sr-only"
          />
          <span
            aria-hidden
            className="block h-5 w-9 rounded-full bg-border transition-colors peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute left-0.5 top-0.5 size-4 rounded-full bg-card transition-transform peer-checked:translate-x-4"
          />
        </span>
      </label>
      {on && <div className="border-t border-border px-2.5 py-2.5">{children}</div>}
    </div>
  );
}

/** Choosing whose word the door listens to. */
function HandlePicker({
  people,
  selected,
  onChange,
  hint,
}: {
  people: Person[];
  selected: string[];
  onChange: (ids: string[]) => void;
  hint: string;
}) {
  const [q, setQ] = useState("");
  const matches = people.filter((p) =>
    q
      ? p.name.toLowerCase().includes(q.toLowerCase()) ||
        p.handle.toLowerCase().includes(q.toLowerCase())
      : true,
  );

  const toggle = (id: string) =>
    onChange(
      selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id],
    );

  return (
    <div className="space-y-2">
      <div className="relative">
        <MagnifyingGlass
          size={14}
          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search your contacts"
          aria-label="Search contacts"
          className="h-9 pl-8"
        />
      </div>

      <ul className="max-h-36 space-y-0.5 overflow-y-auto overscroll-contain">
        {matches.slice(0, 30).map((p) => {
          const picked = selected.includes(p.id);
          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => toggle(p.id)}
                aria-pressed={picked}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-left text-[13px] transition-colors",
                  picked ? "bg-primary/15" : "hover:bg-muted",
                )}
              >
                <Avatar person={p} size={22} />
                <span className="min-w-0 flex-1 truncate">{p.name}</span>
                <Identity person={p} className="shrink-0 text-[11px]" />
              </button>
            </li>
          );
        })}
      </ul>

      <p className="text-[11px] text-muted-foreground">
        {selected.length > 0 ? `${selected.length} chosen. ${hint}` : hint}
      </p>
    </div>
  );
}
