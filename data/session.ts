/**
 * The signed-in user's standing, as far as a gate is concerned.
 *
 * Holdings, locks and attestations all live in other apps in the suite. Free
 * Radio reads them to answer one question, "may this person in", and never
 * writes them. Kept deliberately mixed so some doors open and some do not:
 * a demo where every gate passes is a demo with no gates in it.
 */
import { ME_ID } from "./people";

export interface Holdings {
  /** token id → units held */
  balances: Record<string, number>;
  /** token id → the lock with the most blocks left to run */
  locks: Record<string, { amount: number; blocksRemaining: number }>;
  /** person ids who have vouched for this handle */
  vouchedBy: string[];
  /** person ids who have renounced this handle */
  renouncedBy: string[];
}

export const MY_HOLDINGS: Holdings = {
  balances: {
    bsv: 0.42,
    nex: 120,
    nutri: 0,
    usdsv: 85.5,
  },
  /* Nothing locked. The lock-gated room is the one door that stays shut, and
     it is the honest one: you cannot talk your way past a timelock. */
  locks: {},
  vouchedBy: ["darren-kellenschwiler", "rhea-mensah", "tc-kuro"],
  renouncedBy: [],
};

export { ME_ID };
