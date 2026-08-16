/**
 * The vocabulary of a door.
 *
 * There is no admission decision left to make: with nobody signed in there
 * are no holdings to weigh a gate against, so a room's terms are described
 * rather than judged. `validateGates` stays, because a half-configured gate
 * is still a broken one — `on` with an empty list admits nobody, which is the
 * safe reading and never what anybody meant.
 */
import type { Gates, GateKind } from "@/data/schema";

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
