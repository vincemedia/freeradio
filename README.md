# Free Radio

Live voice rooms on a frequency. Scan a band, find a **Co-Channel**, and talk.

A clickable prototype for the BSV ecosystems, built as a Twitter-Spaces-shaped
product with a ham-radio model underneath it and a Braun front panel on top.
There is no audio: speaking is simulated from a script per room, which is what
drives both the transcript and the ring around whoever is talking.

```bash
bun install
bun dev          # http://localhost:3000
```

## The model

- A **Co-Channel** is a live voice room. Never a "space", a "room", or a "call".
- Each one holds a **frequency**, unique within one **band**. `98.7` on Nexus and
  `98.7` on Twetch are different rooms.
- A band is an **ecosystem**. The switch in the top bar is a band switch: it
  re-populates the whole scale. Nexus is selected by default, because that is
  the app you are inside.
- Identity is `@handle@ecosystem` per BRC-169, always with the wallet mark, and
  the suffix is never dropped. Two people in one room can hold the same handle
  on different hosts.
- **You can be in one Co-Channel at a time.** Joining a second leaves the first.
- **A room with nobody in it does not exist.** The last occupant to leave closes
  it and its frequency returns to the pool.
- **Nobody listens quietly.** Everyone in a room is visible, with their mute
  state showing at all times.
- **Recordings outlive the room.** Nothing else does, which is why a recording
  carries its own copy of the title and frequency.

## Architecture

The rule that shapes everything: **the UI never imports a fixture.**

```
data/          typed tables with stable ids and foreign keys
lib/server/    the one owner of mutable state
app/api/       route handlers, the only thing that reads the store
lib/api.ts     apiFetch, the only thing that calls the network
components/    receives resolved view types, does no lookups
```

Swapping fixtures for a real database means changing route bodies. Nothing in
the UI moves. The system rules (one room at a time, rooms close when empty,
frequencies and titles unique per band) live in the store rather than in a
component, because they are facts about the system and not about a screen.

Gate evaluation in `lib/gates.ts` is shared by the browse card and the door, so
a room can never offer a Join button it will then refuse.

## The instrument

The skeuomorphism has a fixed budget, defined in `DESIGN.md` and implemented in
`components/instrument/`: an inset highlight on the panel, a tick scale, a
speaker perforation, and lit lamps. No gloss, no bevels, no gradients standing
in for plastic.

Colour carries information and never decorates:

- **Signal yellow** is the one active control on a screen. The primary button,
  the tuned station, the ring around whoever is speaking.
- **Signal red** is recording. Not "live": every room in a list is live, so a
  red lamp on each would be decoration.
- Everything else is four greys.

Numbers use tabular figures everywhere, so a frequency does not jitter as the
needle moves. That is also why the system needs no monospace family.

## Gates

A Co-Channel can ask something of you before it opens. The shapes are the same
ones the Nexus group chats use, so a room's terms read identically in both.

| Gate | Asks |
|---|---|
| Token | You hold a token, sometimes above an amount |
| Locked | You have value locked, with blocks still to run |
| Vouched | A named handle has vouched for you |
| Screened | Anyone a named handle renounced is kept out |

Gates are additive: every gate that is on must pass. The host is exempt from
their own door, so a room cannot lock out the person holding it.

You configure these when you open a Co-Channel, as four independent switches
rather than a mode picker, since a room can ask for a token and a vouch at
once. Locks are set in months and stored as blocks: blocks are the unit the
gate is evaluated in, but nobody plans in blocks.

A gate that is on with nothing configured admits nobody, which is the safe
reading when evaluating and a terrible thing to save. `validateGates` refuses
it, and the same function disables the submit button, so the rule has one
implementation and two call sites.

The signed-in user's standing is in `data/session.ts` and is deliberately mixed,
so some doors open and some do not. A demo where every gate passes has no gates
in it.

## Commercial model

Three lines, all following from scarcity the product already creates. See
`data/pricing.ts`.

1. **Held frequencies.** A frequency is released when a room closes, so a
   permanent address is worth paying for. Priced per band, because being
   findable on a busy band is worth more.
2. **Paid recordings.** The only artefact with a shelf life. The host sets the
   price; the platform cut is stated rather than folded into the number.
3. **Token gates**, which are already a paid-room primitive whenever the host
   issues the token. Nothing was built for this.

Deliberately not charged for: joining an open room, being heard, or the number
of people in a room. A metered conversation is a worse conversation.

## Mock data

Carried over from the Nexus prototype so a handle means the same person in both
apps, then extended to 87 people so every band has rooms on it.

- 22 live Co-Channels across 7 ecosystems
- 14 open, 4 token-gated, 2 vouch-gated, 1 lock-gated, 1 renounce-gated
- 167 scripted transcript lines, every speaker an actual occupant
- 11 recordings, 4 of them paid

The fixture is validated for the constraints that matter: frequencies and titles
unique within a band, hosts present as occupants, nest posters in the room they
posted to, and nobody in two rooms at once.

## Layout

Top bar, variable-width content, and a right sidepane that belongs to a
Co-Channel rather than to the app. There is no left column.

- The sidepane docks beside the room at `xl` and becomes a bottom sheet below.
- Mobile navigation is a full-screen overlay with drill-down panels, never
  accordions or fly-outs. It is portalled to the body: the top bar sets a
  backdrop blur, and a backdrop-filter ancestor becomes the containing block
  for fixed-position children, which collapsed the overlay to zero height.
- Opening a Co-Channel is on the top bar at every width, icon-only below `sm`.
  Search and Settings sit in the menu on mobile, since there is no ⌘K there.
- A Co-Channel you are in minimises to a dock: bottom right on desktop, full
  width above the safe area on mobile.

## Conventions

- Tokens in `DESIGN.md` are normative. If prose and tokens disagree, tokens win.
- All colour is `oklch()`.
- Icons are Phosphor, one weight, set once. Verify an export exists before using
  it; the set does not map 1:1 to lucide.
- No em dashes in UI copy.
- Labels ship in two lengths where they would otherwise truncate.
- `temp/` is git-ignored scratch and is never imported by app code.

## Notes

`Agentation` is mounted in development only, so the running app is inspectable
by agents without shipping the toolbar.
