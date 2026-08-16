/**
 * Gate evaluation.
 *
 * Pure and shared: the server decides admission, and the browse card uses the
 * same function to decide whether to say "Join" or "Locked". Two
 * implementations of this would eventually disagree, and the one the user sees
 * would be the wrong one.
 *
 * Every gate that is `on` must pass. A gate that is `on` with an empty list
 * admits nobody, which is the safe reading of a half-finished configuration.
 */
import type { Gates, GateKind } from "@/data/schema";
import type { Holdings } from "@/data/session";
import { getToken } from "@/data/tokens";

export interface GateResult {
  passes: boolean;
  /** why the door is shut, in the user's vocabulary; empty when it is open */
  reasons: string[];
}

const fmt = (n: number) =>
  n.toLocaleString("en-GB", { maximumFractionDigits: 8 });

export function evaluateGates(
  gates: Gates | undefined,
  holdings: Holdings,
  /** resolves a person id to `@handle`, for naming who must vouch */
  nameOf: (id: string) => string,
): GateResult {
  if (!gates) return { passes: true, reasons: [] };
  const reasons: string[] = [];

  if (gates.token.on) {
    if (gates.token.ids.length === 0) {
      reasons.push("This room's token gate has no token set yet.");
    } else {
      const held = gates.token.ids.some((id) => {
        const need = gates.token.minimums?.[id] ?? 0;
        const have = holdings.balances[id] ?? 0;
        return need > 0 ? have >= need : have > 0;
      });
      if (!held) {
        const [first] = gates.token.ids;
        const symbol = getToken(first)?.symbol ?? first.toUpperCase();
        const need = gates.token.minimums?.[first];
        const have = holdings.balances[first] ?? 0;
        reasons.push(
          need
            ? `Holds ${fmt(need)} ${symbol}. You hold ${fmt(have)}.`
            : `Holds ${symbol}. You hold none.`,
        );
      }
    }
  }

  if (gates.timelock.on) {
    const assetId = gates.timelock.assetId ?? "bsv";
    const symbol = getToken(assetId)?.symbol ?? assetId.toUpperCase();
    const lock = holdings.locks[assetId];
    const needAmount = gates.timelock.amount ?? 0;
    const needBlocks = gates.timelock.minBlocks ?? 0;
    const ok =
      lock !== undefined &&
      lock.amount >= needAmount &&
      lock.blocksRemaining >= needBlocks;
    if (!ok) {
      reasons.push(
        `Locks ${fmt(needAmount)} ${symbol} with ${fmt(needBlocks)} blocks still to run. ${
          lock
            ? `Your lock has ${fmt(lock.blocksRemaining)} left.`
            : "You have nothing locked."
        }`,
      );
    }
  }

  if (gates.vouch.on) {
    const ok = gates.vouch.entityIds.some((id) =>
      holdings.vouchedBy.includes(id),
    );
    if (!ok) {
      const names = gates.vouch.entityIds.map(nameOf);
      reasons.push(
        names.length === 1
          ? `A vouch from ${names[0]}. You do not have one.`
          : `A vouch from ${names.slice(0, -1).join(", ")} or ${names.at(-1)}. You do not have one.`,
      );
    }
  }

  if (gates.renounce.on) {
    const blocked = gates.renounce.entityIds.filter((id) =>
      holdings.renouncedBy.includes(id),
    );
    if (blocked.length > 0) {
      reasons.push(`${blocked.map(nameOf).join(", ")} renounced this handle.`);
    }
  }

  return { passes: reasons.length === 0, reasons };
}

/**
 * Whether a gate configuration is usable.
 *
 * A gate that is on with nothing configured admits nobody, which is the safe
 * reading when evaluating but a terrible thing to let somebody save. The host
 * is exempt from their own door, so they would not even notice: the room would
 * simply never let anyone else in.
 */
export function validateGates(gates: Gates | undefined): string | null {
  if (!gates) return null;

  if (gates.token.on) {
    if (gates.token.ids.length === 0) return "Pick a token, or turn the token gate off.";
    const bad = gates.token.ids.find((id) => (gates.token.minimums?.[id] ?? 0) < 0);
    if (bad) return "A minimum cannot be negative.";
  }
  if (gates.timelock.on) {
    if (!gates.timelock.amount || gates.timelock.amount <= 0) {
      return "Set how much must be locked, or turn the lock gate off.";
    }
    if (!gates.timelock.minBlocks || gates.timelock.minBlocks <= 0) {
      return "Set how long it must stay locked.";
    }
  }
  if (gates.vouch.on && gates.vouch.entityIds.length === 0) {
    return "Name at least one handle whose vouch opens the door.";
  }
  if (gates.renounce.on && gates.renounce.entityIds.length === 0) {
    return "Name at least one handle whose renouncement keeps people out.";
  }
  return null;
}

/** Whether any gate is switched on, so an all-off object can be dropped. */
export function anyGateOn(gates: Gates | undefined): boolean {
  if (!gates) return false;
  return (
    gates.token.on || gates.timelock.on || gates.vouch.on || gates.renounce.on
  );
}

/**
 * The one gate to show as a badge.
 *
 * A room can have several on at once, but a card has room for one word. Order
 * is by how much it constrains: a lock is the hardest thing to satisfy, an
 * open room the easiest.
 */
export function primaryGate(gates: Gates | undefined): GateKind {
  if (!gates) return "open";
  if (gates.timelock.on) return "timelock";
  if (gates.token.on) return "token";
  if (gates.vouch.on) return "vouch";
  if (gates.renounce.on) return "renounce";
  return "open";
}

export const GATE_LABEL: Record<GateKind, string> = {
  open: "Open",
  token: "Token",
  timelock: "Locked",
  vouch: "Vouched",
  renounce: "Screened",
};

/** One clause, no period, for the tooltip beside the badge. */
export const GATE_HELP: Record<GateKind, string> = {
  open: "Anyone on this band can join",
  token: "You must hold a token to join",
  timelock: "You must have value locked up to join",
  vouch: "A named handle must have vouched for you",
  renounce: "Anyone a named handle renounced is kept out",
};
