"use client";

import { useEffect, useState } from "react";
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
  const setEcosystem = useRadio((s) => s.setEcosystem);
  const session = useRadio((s) => s.session);

  /* next-themes only knows the resolved value on the client, so the controls
     render inert until mount rather than briefly showing the wrong one. */
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

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
        {session ? (
          <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
            <Avatar person={session.me} size={44} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{session.me.name}</p>
              <Identity person={session.me} className="text-[11px]" />
            </div>
          </div>
        ) : (
          <Skeleton className="h-[4.75rem] w-full rounded-lg" />
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
          Band
          <Help>The band Free Radio opens on, and the one the top bar starts from</Help>
        </h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {ecosystems.map((e) => {
            const active = ecosystem === e.id;
            return (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => setEcosystem(e.id as EcosystemId)}
                  aria-pressed={active}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md border p-3 text-left transition-colors",
                    active
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card hover:bg-muted/50",
                  )}
                >
                  <EcosystemMark ecosystem={e.id} size={20} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-medium">
                        {e.name}
                      </span>
                      {e.local && (
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          you are here
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                      {e.domain}
                    </span>
                  </span>
                  {active && <Check size={15} className="shrink-0" />}
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
