"use client";

import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import {
  ArrowCounterClockwise,
  Check,
  Monitor,
  Moon,
  Sun,
} from "@phosphor-icons/react";
import { EcosystemMark } from "@/components/identity";
import { NotificationToggle } from "@/components/shell/notification-toggle";
import { SfxToggle } from "@/components/shell/sfx-toggle";
import { AvatarPicker } from "@/components/shell/avatar-picker";
import { HandleCard, HandleClaim } from "@/components/shell/handle-editor";
import { PageHeader } from "@/components/shell/page-header";
import { UsernameEditor } from "@/components/shell/username-editor";
import { Button } from "@/components/ui/button";
import { Help } from "@/components/ui/overlays";
import { Skeleton } from "@/components/ui/primitives";
import { ecosystems } from "@/data/ecosystems";
import type { EcosystemId, Person } from "@/data/schema";
import { useRadio } from "@/lib/store";
import { cn } from "@/lib/utils";

const THEMES = [
  { id: "system", label: "System", icon: Monitor, hint: "Follow the device" },
  { id: "light", label: "Light", icon: Sun, hint: "Always the light panel" },
  { id: "dark", label: "Dark", icon: Moon, hint: "Always the dark panel" },
] as const;

/**
 * Settings, in two subjects.
 *
 * The page had grown two: who you are and who hears about you, and how the app
 * looks and behaves. One column of six unrelated sections makes somebody read
 * all of it to find the one they came for.
 *
 * The tabs are the same text tabs the front page uses. A second idea about what
 * a tab looks like would be a second thing to learn for no reason.
 *
 * The theme choice lives here and nowhere else, per DESIGN.md: a toggle in the
 * main UI invites people to change it by accident, and the default should be
 * whatever their device already says.
 */
const TABS = [
  { id: "notifications", label: "Notifications" },
  { id: "preferences", label: "Preferences" },
] as const;

type Tab = (typeof TABS)[number]["id"];

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("notifications");

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        title="Settings"
        subtitle="Who you are, who hears about you, and how Free Radio behaves."
      />

      <div
        role="tablist"
        aria-label="Settings sections"
        className="flex items-baseline gap-5"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "font-display text-lg font-semibold tracking-tight transition-colors",
              "border-b-2 pb-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              tab === t.id
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "notifications" ? <Notifications /> : <Preferences />}
    </div>
  );
}

/** You, what you are called, and what your device tells you. */
function Notifications() {
  const session = useRadio((s) => s.session);
  const me: Person | null | undefined = session?.me;

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
          You
        </h2>

        {!session ? (
          <Skeleton className="h-[4.75rem] w-full rounded-lg" />
        ) : me ? (
          <div className="space-y-2">
            {/* The name first: it is what other people see most often, and the
                thing most likely to be missing — anybody who arrived through an
                invitation to a station never chose one.

                A verified BRC-169 handle replaces the field outright rather than
                sitting above it. Two display names for one person is a question
                every list in the app would have to answer, and the attested one
                wins each time it is asked — so there is nothing to choose. */}
            {session.handle ? (
              <HandleCard person={me} handle={session.handle} />
            ) : (
              <>
                <UsernameEditor person={me} />
                <HandleClaim />
              </>
            )}
            <AvatarPicker person={me} />
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            Nothing is connected. Connect a wallet from the top bar to join a
            station, speak in one, or start your own.
          </p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
          On air alerts
          <Help>Your device tells you when a contact goes on air</Help>
        </h2>
        <NotificationToggle />
      </section>
    </div>
  );
}

/** How the app behaves, rather than who is using it. */
function Preferences() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const ecosystem = useRadio((s) => s.ecosystem);
  const followed = useRadio((s) => s.followed);
  const toggleFollowed = useRadio((s) => s.toggleFollowed);

  /* next-themes only knows the resolved theme on the client, so the controls
     stay inert until hydration rather than briefly showing the wrong one. Read
     as an external store: no effect, and nothing to cascade. */
  const ready = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  return (
    <div className="space-y-8">
      {/* ---- appearance ---- */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
          Appearance
          <Help>The only place the theme can be changed</Help>
        </h2>
        <div className="grid gap-2 sm:grid-cols-3">
          {THEMES.map(({ id, label, icon: Icon, hint }) => {
            const active = ready && (theme ?? "system") === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setTheme(id)}
                aria-pressed={active}
                className={cn(
                  "flex items-start gap-2.5 rounded-md border p-3 text-left transition-colors",
                  active
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card hover:bg-muted/50",
                )}
              >
                <Icon size={17} className="mt-0.5 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{label}</span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">
                    {hint}
                  </span>
                </span>
                {active && <Check size={15} className="mt-0.5 shrink-0" />}
              </button>
            );
          })}
        </div>
      </section>

      {/* ---- sound ---- */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
          Sound
          <Help>Arrivals, departures, and the click a menu makes</Help>
        </h2>
        <SfxToggle />
        <p className="text-xs text-muted-foreground">
          Voices and recordings are unaffected. This is only the noises the
          interface itself makes.
        </p>
      </section>

      {/* ---- bands ---- */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
          Bands you follow
          <Help>
            Followed bands come first in the switch; you still listen to one at a
            time
          </Help>
        </h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {ecosystems.map((e) => {
            const picked = followed.includes(e.id);
            const locked = picked && followed.length === 1;
            return (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => toggleFollowed(e.id as EcosystemId)}
                  aria-pressed={picked}
                  disabled={locked}
                  title={
                    locked
                      ? "Follow another band before dropping this one"
                      : undefined
                  }
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md border p-3 text-left transition-colors",
                    picked
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card hover:bg-muted/50",
                    locked && "cursor-default",
                  )}
                >
                  <EcosystemMark ecosystem={e.id} size={20} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-medium">
                        {e.name}
                      </span>
                      {e.id === ecosystem && (
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          listening
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                      {e.domain}
                    </span>
                  </span>
                  <span
                    aria-hidden
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded-sm border transition-colors",
                      picked
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border",
                    )}
                  >
                    {picked && <Check size={13} weight="bold" />}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <p className="text-xs text-muted-foreground">
          The band you are listening to is switched from the top bar.
        </p>
      </section>

      {/* ---- the introduction, again ---- */}
      <section className="space-y-3">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
          The introduction
        </h2>
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-card p-4">
          <p className="min-w-0 flex-1 basis-64 text-xs leading-relaxed text-muted-foreground">
            How a band works, how a station works, and what the doors on one
            mean. Watching it again changes nothing: your name, your bands, your
            contacts and the terms you agreed to are all left as they are, and it
            does not ask you to pick a name a second time.
          </p>
          <Button
            variant="secondary"
            size="sm"
            className="shrink-0"
            onClick={() => router.push("/welcome?again=1")}
          >
            <ArrowCounterClockwise size={15} />
            Watch again
          </Button>
        </div>
      </section>
    </div>
  );
}
