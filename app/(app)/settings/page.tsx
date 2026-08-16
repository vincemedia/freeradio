"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Check, Monitor, Moon, Sun } from "@phosphor-icons/react";
import { Avatar, EcosystemMark, Identity } from "@/components/identity";
import { PageHeader } from "@/components/shell/page-header";
import { Help } from "@/components/ui/overlays";
import { Skeleton } from "@/components/ui/primitives";
import { ecosystems } from "@/data/ecosystems";
import type { EcosystemId } from "@/data/schema";
import { useRadio } from "@/lib/store";
import { cn } from "@/lib/utils";

const THEMES = [
  { id: "system", label: "System", icon: Monitor, hint: "Follow the device" },
  { id: "light", label: "Light", icon: Sun, hint: "Always the light panel" },
  { id: "dark", label: "Dark", icon: Moon, hint: "Always the dark panel" },
] as const;

/**
 * Settings.
 *
 * The theme choice lives here and nowhere else, per DESIGN.md: a toggle in the
 * main UI invites people to change it by accident, and the default should be
 * whatever their device already says. This page exists because that rule was
 * written before there was anywhere to honour it.
 */
export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const ecosystem = useRadio((s) => s.ecosystem);
  const followed = useRadio((s) => s.followed);
  const toggleFollowed = useRadio((s) => s.toggleFollowed);
  const session = useRadio((s) => s.session);

  /* next-themes only knows the resolved theme on the client, so the controls
     stay inert until hydration rather than briefly showing the wrong one.
     Read as an external store: no effect, and nothing to cascade. */
  const ready = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  return (
    <div className="max-w-2xl space-y-8">
      <PageHeader
        title="Settings"
        subtitle="How Free Radio looks, and which band it opens on."
      />

      {/* ---- identity ---- */}
      <section className="space-y-3">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
          You
        </h2>
        {!session ? (
          <Skeleton className="h-[4.75rem] w-full rounded-lg" />
        ) : session.me ? (
          <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
            <Avatar person={session.me} size={44} />
            <div className="min-w-0">
              <p className="text-sm font-medium">{session.me.name}</p>
              <Identity person={session.me} className="text-[11px]" />
            </div>
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            Nothing is connected. Connect a wallet from the top bar to join a
            Co-Channel, speak in one, or start your own.
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Your handle comes from your wallet, so it is changed there rather than
          here.
        </p>
      </section>

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

      {/* ---- default band ---- */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
          Bands you follow
          <Help>Followed bands come first in the switch; you still listen to one at a time</Help>
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
                    locked ? "Follow another band before dropping this one" : undefined
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
    </div>
  );
}
