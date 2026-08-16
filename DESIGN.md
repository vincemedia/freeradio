---
version: alpha
name: "Free Radio"
description: "A ham-radio set for live voice rooms: you tune a band, find a frequency, and talk. The instrument recedes, the conversation is the product."

# ================================================================
# THEME LAYER — the only block that changes per client
# ================================================================
theme:
  fonts:
    display: "Inter Tight"   # neo-grotesque in the Akzidenz/Helvetica line, set tight and low-contrast
    body: "Inter"            # workhorse; tabular numerals carry the frequency readout, so no third family is needed
  palette:
    primary: "oklch(0.84 0.166 89)"    # signal yellow — the active control, and only the active control
    secondary: "oklch(0.55 0.008 85)"  # mid grey — the instrument's own body
    tertiary: "oklch(0.55 0.212 29)"   # signal red — on air and recording, never a button
    neutral: "oklch(0.955 0.003 85)"   # warm light grey — the front panel
  signature-motion: "the tuning needle settles onto a frequency, overshooting a hair before it locks"

# ================================================================
# SYSTEM LAYER — invariant across clients; derives from theme
# ================================================================
colors:
  # ---- Light theme (default) ----
  light:
    primary: "{theme.palette.primary}"
    secondary: "{theme.palette.secondary}"
    tertiary: "{theme.palette.tertiary}"
    neutral: "{theme.palette.neutral}"
    surface: "oklch(1 0 0)"
    on-surface: "oklch(0.22 0.004 85)"
    on-surface-muted: "oklch(0.52 0.006 85)"
    on-primary: "oklch(0.22 0.004 85)"      # black legend on a yellow key, as Braun sets it
    border: "oklch(0.885 0.004 85)"
    ring: "{colors.light.primary}"
    error: "oklch(0.51 0.196 29)"
    on-error: "oklch(0.98 0.01 29)"
    success: "oklch(0.56 0.108 149)"
    warning: "oklch(0.66 0.132 68)"
    primary-hover: "oklch(0.78 0.166 89)"   # ⟵ DERIVED — primary, lightness −0.06
  # ---- Dark theme (remap, not inversion) ----
  dark:
    background: "oklch(0.19 0.003 85)"      # ⟵ DERIVED — neutral hue at low lightness, never pure black
    surface: "oklch(0.24 0.003 85)"
    on-surface: "oklch(0.93 0.003 85)"
    on-surface-muted: "oklch(0.66 0.005 85)"
    primary: "oklch(0.84 0.166 89)"         # yellow already passes AA on the dark panel; unchanged
    on-primary: "oklch(0.19 0.003 85)"
    border: "oklch(0.33 0.004 85)"
    tertiary: "oklch(0.62 0.205 29)"        # ⟵ DERIVED — red lightened one step to hold on dark

typography:
  display-xl:
    fontFamily: "{theme.fonts.display}"
    fontSize: "clamp(36px, 13px + 3.6vw, 56px)"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: -0.025em
    textWrap: balance
  headline-lg:
    fontFamily: "{theme.fonts.display}"
    fontSize: "clamp(28px, 19px + 1.4vw, 36px)"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: -0.02em
    textWrap: balance
  headline-md:
    fontFamily: "{theme.fonts.display}"
    fontSize: "clamp(20px, 15.5px + 0.7vw, 24px)"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: -0.01em
    textWrap: balance
  headline-sm:
    fontFamily: "{theme.fonts.body}"
    fontSize: 18px
    fontWeight: 600
    lineHeight: 1.35
    textWrap: balance
  body-lg:
    fontFamily: "{theme.fonts.body}"
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.65
    textWrap: balance
  body-md:
    fontFamily: "{theme.fonts.body}"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.6
    textWrap: balance
  body-sm:
    fontFamily: "{theme.fonts.body}"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.55
  label-md:
    fontFamily: "{theme.fonts.body}"
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.2
  label-sm:
    fontFamily: "{theme.fonts.body}"
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: 0.04em
  # Frequency readouts, tick labels, and durations. Not a third family:
  # the body face with tabular figures, so digits never jitter as they change.
  readout:
    fontFamily: "{theme.fonts.body}"
    fontVariantNumeric: "tabular-nums"
    fontFeatureSettings: "'tnum' 1, 'cv05' 1"
    fontWeight: 600
    letterSpacing: -0.01em

spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
  3xl: 64px
  gutter: 24px
  section: 96px
  container: 1200px
  card-padding: "{spacing.lg}"

# Braun radii: small, consistent, and the same on every part of the family.
rounded:
  sm: 2px
  md: 4px            # the workhorse radius: inputs, buttons, keys
  lg: 6px            # cards, dialogs, popovers, sheets
  xl: 10px           # the instrument shell, hero panels
  clay: 14px         # primary and destructive buttons only, see Elevation
  full: 9999px       # pills, avatars, indicator lamps

breakpoints:
  sm: 640px
  md: 768px
  lg: 1024px
  xl: 1280px         # the width at which the right sidepane may sit open beside content
  touch-target: 44px

motion:
  duration-fast: 150ms
  duration-base: 250ms
  duration-slow: 400ms
  ease-out: "cubic-bezier(0.16, 1, 0.3, 1)"
  ease-in-out: "cubic-bezier(0.65, 0, 0.35, 1)"
  ease-detent: "cubic-bezier(0.34, 1.32, 0.64, 1)"  # the needle's overshoot; signature motion only
  animatable: ["transform", "opacity"]

components:
  button-primary:
    backgroundColor: "{colors.light.primary}"
    textColor: "{colors.light.on-primary}"
    typography: "{typography.label-md}"
    padding: 12px
    height: 44px
    # The one control made of a material: clay, with its own larger radius.
    # Pressing squashes it rather than sliding it.
    rounded: "{rounded.clay}"
    shadow: "{shadows.clay-primary}"
    shadowPressed: "{shadows.clay-primary-pressed}"
  button-primary-hover:
    backgroundColor: "{colors.light.primary-hover}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.light.on-surface}"
    borderColor: "{colors.light.border}"
    rounded: "{rounded.md}"
    height: 44px
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.light.on-surface-muted}"
    rounded: "{rounded.md}"
  card:
    backgroundColor: "{colors.light.surface}"
    textColor: "{colors.light.on-surface}"
    rounded: "{rounded.lg}"
    padding: "{spacing.card-padding}"
    borderColor: "{colors.light.border}"
  input:
    backgroundColor: "{colors.light.surface}"
    textColor: "{colors.light.on-surface}"
    borderColor: "{colors.light.border}"
    rounded: "{rounded.md}"
    height: 44px
    padding: 12px
  badge:
    backgroundColor: "{colors.light.tertiary}"
    textColor: "oklch(0.98 0.01 29)"
    typography: "{typography.label-sm}"
    rounded: "{rounded.sm}"
    padding: 6px
  tabs-trigger-active:
    backgroundColor: "{colors.light.surface}"
    textColor: "{colors.light.on-surface}"
    rounded: "{rounded.sm}"
  dialog:
    backgroundColor: "{colors.light.surface}"
    rounded: "{rounded.lg}"
    padding: "{spacing.xl}"
  sheet-bottom:
    backgroundColor: "{colors.light.surface}"
    rounded: "{rounded.lg} {rounded.lg} 0 0"
    heightMobileDefault: 100svh
    heightMobileTall: 92svh
    maxWidthDesktop: 560px
  tooltip:
    backgroundColor: "{colors.light.on-surface}"
    textColor: "{colors.light.surface}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.sm}"
    triggerDesktop: hover
    triggerMobile: click
  switch:
    trackOnColor: "{colors.light.primary}"
    trackOffColor: "{colors.light.border}"
  skeleton:
    backgroundColor: "{colors.light.border}"
    rounded: "{rounded.sm}"
    animation: "pulse 1.8s {motion.ease-in-out} infinite"
    appearDelay: 200ms
  avatar-fallback:
    library: "boring-avatars"
    variant: "marble"
    colors: ["#5b1d99", "#0074b4", "#00b34c", "#ffd41f", "#fc6e3d"]

  # ---- Instrument parts. The skeuomorphic vocabulary, defined once. ----
  # These are the only places the product is allowed to look like an object.
  # Each earns it by carrying information a flat control could not.
  panel:
    # The front panel every instrument control is mounted on.
    backgroundColor: "{colors.light.neutral}"
    borderColor: "{colors.light.border}"
    rounded: "{rounded.xl}"
    innerHighlight: "inset 0 1px 0 oklch(1 0 0 / 0.9)"
    innerShadow: "inset 0 -1px 0 oklch(0.22 0.004 85 / 0.06)"
  dial-scale:
    # The tuning band. Ticks are the ornament, and each one is a frequency.
    tickColor: "{colors.light.on-surface-muted}"
    tickMajorColor: "{colors.light.on-surface}"
    tickHeightMinor: 6px
    tickHeightMajor: 12px
    labelTypography: "{typography.label-sm}"
  needle:
    # The tuned position. One per band, and it is the only red on the scale.
    color: "{colors.light.tertiary}"
    width: 2px
  lamp:
    # Indicator lamps: on air, recording, muted. Literal, small, unmissable.
    size: 8px
    rounded: "{rounded.full}"
    onAirColor: "{colors.light.tertiary}"
    recordingColor: "{colors.light.tertiary}"
    liveColor: "{colors.light.success}"
    offColor: "{colors.light.border}"
    glow: "0 0 0 3px oklch(0.55 0.212 29 / 0.18)"
  grille:
    # Speaker perforation. A regular dot grid aligned to the 4px spacing base.
    dotColor: "{colors.light.on-surface}"
    dotOpacity: 0.10
    dotSize: 1.5px
    pitch: 6px
  speaking-ring:
    # The ring around an avatar that says who is talking. Width, not colour,
    # carries the level, so it still reads for a colour-blind listener.
    color: "{colors.light.primary}"
    widthIdle: 0px
    widthSpeaking: 3px
    gap: 2px
---

## Overview

Free Radio is a live voice app for the BSV ecosystems, built for people who already have a handle and a wallet and want to talk to each other without scheduling anything. The interface should feel **precise, quiet, and mechanical**, closer to a well-made receiver on a desk than to a social feed. Density is moderate but honest: the frequency, the occupants, and who is speaking are always on screen, because those are the only facts that matter while you are listening.

The brand speaks in **radio verbs and plain nouns**. Nothing is a "space", nothing is a "room", nothing is "content". You tune a band, you join a Co-Channel, you go on air.

**Vocabulary for this project** (agents: use these exact terms in all UI copy):

- **Station** — a Co-Channel seen from outside: a mark on the dial, a row in the band, something you tune to. Opening one is starting a temporary radio station, and that is the word for it right up until you are inside.
- **Co-Channel** — the same object seen from inside: where people are talking together. Never "channel", "space", "room", or "call". Plural "Co-Channels".

  These are not two things. They are one thing named for your relationship to it, and that is the only test needed when choosing between them: **a station is what you find, a Co-Channel is what you are in.** So you scan a band for stations, a station holds a frequency, and the gaps between stations are what make scanning worth doing. But you join a Co-Channel, you are an occupant of a Co-Channel, and everybody in a Co-Channel is visible. In radio engineering "co-channel" means two transmitters sharing one frequency, which is normally a fault; here it is the entire point.

- **Frequency** — the unique address of a station within one ecosystem, written `98.7`. Released when the last occupant leaves.
- **Band** — the frequency spectrum of one ecosystem. You scan a band, you do not "search the network".
- **Ecosystem** — the wallet authority a handle belongs to, per BRC-169: `@crumbs@nexus`. Nexus is selected by default.
- **Occupant** — anyone currently speaking-capable in a Co-Channel. Every occupant is named, so nobody holds the floor anonymously and there is no "audience" on the stage.
- **Listener** — somebody with a receiver pointed at a station. Not an occupant, not in the room, and not in the list. This build has no signed-in identity, so a reader is always a listener and never an occupant.
- **Host** — the occupant who opened the Co-Channel. **Speaker** — an occupant who is unmuted. There is no separate listener role.
- **Nest** — the pinned links panel above the occupant grid.
- **Transcript** — the running record of who said what, below the occupant grid.
- **On air** — the Co-Channel is live. **Recording** — the Co-Channel is being written down. These are two different lamps and never share one.
- **Action verbs** — *tune*, *scan*, *join*, *leave*, *invite*, *mute*, *record*. Never "enter", "discover", "broadcast to", "hop on".

## Colors

All colors are defined and consumed as `oklch()`. The one exception is the boring-avatars fallback palette, whose API expects hex.

The palette is the Braun front panel: four greys doing almost all the work, one yellow, one red. Colour carries information and is never decoration, which in this product means something specific:

- **Neutral** is the panel. Most of every screen is this warm light grey.
- **Surface** is white, used for cards mounted on the panel so they visibly lift.
- **Primary (signal yellow)** marks **the active control and nothing else**: the primary button on a screen, the tuned frequency on the scale, the ring around whoever is speaking. If two things on a screen are yellow, one of them is wrong.
- **Tertiary (signal red)** marks **on air and recording**. It is a lamp colour, never a fill, never a button. The needle on the tuning scale is the only red line.
- **Secondary** is the instrument's own body: strokes, tick marks, inactive keys.
- **Semantic colors** (`error`, `success`, `warning`) appear only in feedback. `error` is a red one step darker than `tertiary` so a destructive dialog never reads as an on-air lamp.

Because yellow and red are both saturated and both carry state, they are never adjacent on the same control. A recording Co-Channel shows a red lamp in the header and a yellow speaking ring in the grid; the two never sit inside one component.

All text/background pairs must pass WCAG AA (4.5:1 body, 3:1 for 18px+) in **both** themes. Yellow is a *background* colour only, always with `on-primary` near-black on it; yellow text on white fails and is banned.

## Typography

Two families. **Inter Tight** carries the panel legends and page titles at `headline-md` and above; **Inter** does everything else, weights 400 and 600 only.

- Headlines set tight, never past two lines. Edit copy before shrinking type.
- **Readouts** (frequency, occupant counts, durations, tick labels) use the `readout` level: the body face with `tabular-nums`. Digits must not change width as they tick, or the needle appears to wobble. This is why the system needs no monospace family.
- Fluid only at `display-xl`, `headline-lg`, `headline-md`. Everything else is fixed at all viewports.
- 16px floor on mobile inputs (iOS Safari zooms below it). `body-sm` is metadata only.
- Labels sit **adjacent to what they label**, per Rams. No floating captions, no legend keys off to one side: a tick label sits under its tick, a lamp's word sits beside the lamp.
- `text-wrap: balance` on headlines and body; skip for dense metadata rows and transcript lines.
- Truncation: user-generated content only. Co-Channel titles `truncate` on one line in cards, `line-clamp-2` in the join dialog. Never truncate a frequency, a handle, a count, or a duration.

## Layout

Fluid single column on mobile; desktop content sits in a `{spacing.container}` max-width region with `{spacing.gutter}` gutters, with a **variable-width content area** between the top bar and the right sidepane.

The app shell has three parts, and deliberately **no left column**:

1. **Top bar** — persistent. Carries the wordmark, the ecosystem selector, the primary navigation (Live, Scan, Recordings, Contacts), and search. On mobile it collapses to a wordmark, the ecosystem selector, and a menu trigger that opens a full-screen drill-down.
2. **Content area** — variable width. Fills whatever the sidepane leaves.
3. **Right sidepane** — the Co-Channel settings and invite surface, modelled on the Nexus group-chat settings pane. It sits beside content at `xl` and above, and becomes a bottom sheet below that.

Spacing is a strict 4px scale, which is also the grille pitch and the tick spacing, so the ornament lines up with the layout. Related controls group by whitespace, not by boxes or rules. When choosing between a border and space, choose space.

## Elevation & Depth

Depth is **tonal layering plus one inset highlight**, never shadow drama. The panel gets a 1px inner highlight at the top and a 1px inner shadow at the bottom, which is how a matte moulded surface catches light. That is the entire skeuomorphic budget for a resting surface.

- **Raised** (cards on hover, dropdowns): `0 1px 2px oklch(0.22 0.004 85 / 0.06), 0 2px 8px oklch(0.22 0.004 85 / 0.05)`
- **Overlay** (dialogs, sheets, popovers, command menu): `0 8px 30px oklch(0.22 0.004 85 / 0.12)`
- **Clay** (`--shadow-clay-*`, primary and destructive buttons only): a tinted drop shadow, an inner shadow along the bottom edge, and an inner highlight along the top.

Clay is the one deliberate exception to the restraint above, and it is the only place in the product where something is made of a material rather than drawn as a rectangle. The three shadows do three different jobs, which is what separates clay from a coloured box with a blur behind it: the drop shadow lifts the piece off the panel and is tinted with the piece's own colour rather than with black, the bottom inset gives it thickness, and the top inset is where the light lands. Pressing swaps in the pressed set, pulling the drop shadow in and deepening the bottom inset, so the piece squashes rather than slides.

It carries its own radius, `{rounded.clay}` (14px), because clay with a 4px corner is not clay. This is the single exception to the small-radius rule, and it holds only for these two variants: a second element wearing clay turns a control into a style, and the flatness of everything else is what leaves this reading as the thing to press.

Nothing else casts a shadow. No gloss, no bevels, no gradients standing in for plastic, no drop shadows under text. In dark mode the drop shadow lightens and the top highlight weakens, because a bright rim on a dark panel reads as glass rather than clay.

## Shapes

Small and consistent, as the product family demands. `{rounded.md}` (4px) for anything interactive, `{rounded.lg}` (6px) for containers, `{rounded.xl}` (10px) for the instrument shell. Only lamps, pills, and avatars go `{rounded.full}`. Never mix radii inside one control group. Curves are functional: an avatar is round because a face is, a lamp is round because a lamp is.

## Components

Built on **shadcn/ui**, styled exclusively through the CSS-variable theme. Icons are **Phosphor**, never lucide.

- **Buttons:** `button-primary` for the one main action per screen. Height 44px. Labels never wrap; use the short copy variant or go icon-only.
- **Instrument controls** (`panel`, `dial-scale`, `needle`, `lamp`, `grille`, `speaking-ring`) are the project's own primitives, defined in the frontmatter and implemented once in `components/instrument/`. They are the only components allowed to look like hardware, and each is literal: a dial looks turnable, a lamp looks lit, a switch looks throwable.
- **Co-Channel card:** the browse unit. Title, frequency readout, gate badge if gated, and a facepile of occupants. Whole card clickable.
- **Speaking indication:** the ring around an occupant's avatar thickens to 3px yellow while they speak. Width carries the signal, colour only reinforces it.
- **Mute state** is shown on every occupant at all times, not on hover. An unmuted occupant shows a mic; a muted one shows a struck mic in `on-surface-muted`.
- **Identity** is always rendered `@handle@ecosystem` with the wallet mark preceding the ecosystem part, exactly as elsewhere in the suite.
- **Cards, inputs, badges, tabs, sheets, tooltips, toasts, switches, avatars, skeletons, empty states** follow the standard system rules: visible labels, AA contrast, skeletons that mirror layout, empty states that invite.
- **Command bar (⌘K)** searches Co-Channels, handles, frequencies, and recordings.
- **Inline help** is a `tooltip` on a `Question` icon adjacent to the control it explains, one clause, no period. Gates, frequency release, and recording consent each get one.

## Do's and Don'ts

- Do use yellow for exactly one active control per screen, and red only for on air and recording.
- Do render every identity as `@handle@ecosystem` with its wallet mark.
- Do show mute state for every occupant, always.
- Do keep every text/background pair at WCAG AA in both themes.
- Don't build a left navigation column; the contextual UI is the top bar.
- Don't put yellow and red inside the same control.
- Don't use gloss, bevels, drop shadows on text, or gradients imitating material. The skeuomorphism is the inset highlight, the tick scale, the grille, and the lamps, and nothing else.
- Don't use pure white as a page background or pure black as text.
- Don't use em dashes anywhere in UI copy.
- Don't add a third font family; the readout is the body face with tabular figures.
- Don't invent a second noun for a Co-Channel.
- Don't put a light/dark toggle in the main UI; it lives in Settings only.

## Voice & Copy

- **Primary persona:** Kuro, 34, holds a handle on Nexus and one on Twetch, in and out of voice rooms all day while doing something else. Impatient with ceremony, reads a frequency faster than a title.
- **Secondary persona:** Anna, 47, joined for one specific conversation somebody linked her to. Needs to know who is in the room and whether she is being recorded, before she will unmute.
- **Tone words:** precise, unhurried, mechanical, plain.
- **Words we use / words we ban:** use *Co-Channel*, ban *space* and *room*; use *tune* and *scan*, ban *discover*; use *occupant*, ban *audience* and *listener*; use *on air*, ban *live now*.

Rules that hold:

- **Never use em dashes in copy.**
- **Responsive strings, not truncated strings.** Ship `label` and `labelShort` side by side: "Scan the band" → "Scan", "Copy Co-Channel link" → "Copy link", "Start recording" → "Record".
- Active voice, sentence case, plain verbs. A control says what happens.
- An action keeps its name through the flow: the button "Record" produces the toast "Recording".
- Errors explain the fix. "This frequency is taken on Nexus. Try 98.9."
- Numbers use tabular figures; frequencies always show one decimal place, even at `.0`.

## Navigation & Responsive Behavior

**Breakpoints:** mobile-first. `md` (768px) divides mobile and desktop navigation. `xl` (1280px) is where the right sidepane may sit open beside content. Touch targets 44px minimum.

**Desktop (≥ md):** top bar with the wordmark, ecosystem selector, inline nav, and ⌘K search. Content area is variable width. The sidepane docks at `xl`.

**Mobile (< md):**

- **Hamburger:** three lines drawn in CSS, animating into an X over 200ms ease-out, honoring `prefers-reduced-motion`.
- **Open state:** full-screen overlay on the neutral panel, options centered both ways in `headline-md`.
- **Drill-down menus:** nested navigation slides the panel left with a back affordance ("← Ecosystems"). One level per panel. No accordions, no fly-outs.
- **Right sidepane** becomes a bottom sheet at `100svh`, or the `92svh` tall variant when the occupant grid should stay visible behind it.
- **Minimised Co-Channel** docks as a bar at the bottom right on desktop, and as a full-width bar above the safe-area inset on mobile.

## Theming & Dark Mode

Tokens are theme-scoped; consumers read CSS variables, never raw values.

- Applied via `.dark` on `<html>`, defaulting to `prefers-color-scheme`. The Settings choice persists and wins.
- Dark mode is a remap: background is the neutral hue at low lightness, never pure black. The panel becomes dark grey and the inset highlight inverts to a 1px light top stroke at lower opacity.
- Yellow survives unchanged and still takes near-black text. Red lightens one step.
- Elevation in dark mode is lightness, not blur.

## shadcn Mapping

| DESIGN.md token | shadcn CSS variable |
|---|---|
| `colors.*.neutral` / `colors.dark.background` | `--background` |
| `colors.*.on-surface` | `--foreground` |
| `colors.*.surface` | `--card`, `--popover` |
| `colors.*.primary` | `--primary` |
| `colors.*.on-primary` | `--primary-foreground` |
| `colors.*.secondary` | `--secondary` |
| `colors.*.tertiary` | `--accent` |
| `colors.*.on-surface-muted` | `--muted-foreground` |
| `colors.*.border` | `--border`, `--input` |
| `colors.*.ring` | `--ring` |
| `colors.*.error` | `--destructive` |
| `rounded.md` | `--radius` |

Instrument tokens (`panel`, `dial-scale`, `needle`, `lamp`, `grille`, `speaking-ring`) additionally expose `--panel-*`, `--tick-*`, `--needle`, `--lamp-*`, `--grille-*`, and `--ring-speaking`. Fonts load via `next/font` as `--font-display` and `--font-body`.

## Motion

Motion is functional and cheap. It should be missed if removed, never noticed while present.

**Timing:** 150ms for hover, focus, switches, lamps, and the hamburger morph; 250ms for sheets, dialogs, drill-downs, and toasts; 400ms with `ease-detent` **only** for the signature interaction, the tuning needle settling onto a frequency with a slight overshoot before it locks. Nothing else in the product overshoots.

**Performance rules:**

- Animate **only `transform` and `opacity`**. The needle moves with `translateX`, never `left`. The speaking ring scales a pseudo-element, never animates `border-width` or `box-shadow`.
- Sheets slide with `translateY`, sized in `svh`.
- `will-change` only for an animation's duration.
- Nothing animates continuously at rest, with two deliberate exceptions, both of which are status and both of which stop when the status does: the recording lamp pulses at 1Hz, and the speaking ring tracks live level. The skeleton pulse is the only other infinite animation.
- Press feedback within 100ms: `transform: scale(0.98)` on `:active`.

**Reduced motion:** disables transitions, snaps the needle straight to the frequency with no overshoot, replaces the recording pulse with a solid lamp, replaces sheet slides with fades, and freezes skeletons. Every state stays fully legible with zero animation.

## Data & Scaffolding

- **Mock data lives in typed `.ts` files** under `data/`, mirroring future tables (`data/people.ts`, `data/co-channels.ts`, `data/recordings.ts`, `data/transcripts.ts`), with stable `id`s and foreign-key references. Shared types in `data/schema.ts`.
- **The UI never imports fixtures directly.** Every read goes through a route handler under `app/api/` and the `apiFetch` client in `lib/api.ts`, per `starting-a-bsv-app-online-prototype`. Server owns state, including which Co-Channels currently exist and which frequencies are free.
- **Avatars:** `boring-avatars`, marble variant, fixed palette, seeded by stable id.
- **Agentation:** installed so the running app is inspectable by agents.
- **Icons:** Phosphor (`@phosphor-icons/react`), one weight (`regular`) set via `IconContext`. Verify every export exists; the sets do not map 1:1 to lucide.
- **`temp/`** is git-ignored scratch and never imported by app code.

## Metadata & Sharing

Full head metadata via the Next.js Metadata API: title template `%s · Free Radio`, description, canonical, favicons at 16/32, 180 `apple-touch-icon`, `manifest.ts` (icons 192/512, theme colors from the palette), `theme-color` per scheme, Open Graph with a 1200x630 image on the panel palette, and `summary_large_image` Twitter cards. A Co-Channel permalink renders its own OG image with the frequency and title.

## Agent Prompt Guide

- **Palette in one line:** yellow `{theme.palette.primary}` = the one active control; red `{theme.palette.tertiary}` = on air and recording only; grey `{theme.palette.secondary}` = the instrument body; warm grey `{theme.palette.neutral}` = the panel.
- **Type in one line:** Inter Tight at headline-md and up, Inter everywhere else, weights 400/600, tabular figures for every number.
- **The one-sentence test:** if a control does not tell you what it does by its shape and its adjacent label, it is not finished.

## Audit Loop

1. **File → Site:** paste this file and a screenshot; list every disagreement as token → observed value.
2. **Site → File:** a new pattern gets a token and a sentence here in the same PR.
3. **New screen test:** build a fresh screen from this file alone; every guess is the next token to define.
4. **Braun test:** remove every element that carries no information. If the screen still works, the removal was correct.
5. **Both-modes pass:** every audit runs twice, light and dark.
