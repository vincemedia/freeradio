"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle, SealCheck } from "@phosphor-icons/react";
import { Avatar } from "@/components/identity";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/primitives";
import type { Person } from "@/data/schema";
import { parseFormatted } from "@/lib/handle";
import { useRadio } from "@/lib/store";

/**
 * A BRC-169 handle, and claiming one.
 *
 * Two states of the same subject, and the difference between them is who said
 * the name. A username is typed and belongs to nobody; a handle is issued by an
 * ecosystem and bound to this wallet's key by a certificate that ecosystem
 * signed. So when there is a handle there is no field, because there is nothing
 * left to decide — and the panel says who vouched for it rather than inviting an
 * edit that would be refused.
 */

/** Somebody who has a handle. Read-only, on purpose. */
export function HandleCard({ person, handle }: { person: Person; handle: string }) {
  const releaseHandle = useRadio((s) => s.releaseHandle);
  const [busy, setBusy] = useState(false);
  const parsed = parseFormatted(handle);

  const release = async () => {
    setBusy(true);
    try {
      await releaseHandle();
      toast.success("Handle released", {
        description:
          "Rooms show your username again. Connecting your wallet re-adopts the handle.",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <Avatar person={person} size={40} />

        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 truncate text-sm font-medium">
            {/* The whole address, always. BRC-169 handles are unique inside an
                ecosystem and nowhere else, so `@alice` on its own names nobody
                in particular — the domain is the half that makes it an
                identity. */}
            <span className="truncate">{handle}</span>
            <SealCheck
              size={15}
              weight="fill"
              className="shrink-0 text-primary"
              aria-label="Verified handle"
            />
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {parsed
              ? `Issued by ${parsed.domain}, and checked against your wallet's key.`
              : "Checked against your wallet's key."}
          </p>
        </div>

        <Button
          size="sm"
          variant="secondary"
          className="shrink-0"
          disabled={busy}
          onClick={() => void release()}
        >
          Release
        </Button>
      </div>

      <p className="mt-3 border-t border-border pt-3 text-[11px] leading-relaxed text-muted-foreground">
        This is what everyone in a room sees. It is not editable here because it
        is not ours to edit — your ecosystem issued it, and it is re-checked
        every time you connect.
      </p>
    </div>
  );
}

/**
 * Somebody who does not have one, but might.
 *
 * Shown folded away, because most people have no handle and a second name field
 * next to the first is a question nobody asked. It is also not a registration:
 * this claims a handle that already exists elsewhere, and the ecosystem's
 * registry is what decides whether it is yours.
 */
export function HandleClaim() {
  const claimHandle = useRadio((s) => s.claimHandle);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const claim = async () => {
    setBusy(true);
    setError(null);
    const result = await claimHandle(value);
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "That handle could not be checked.");
      return;
    }
    setOpen(false);
    setValue("");
    toast.success("Handle verified", {
      description: "It replaces your username everywhere you appear.",
    });
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2 rounded-lg border border-dashed border-border p-3 text-left text-xs text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
      >
        <SealCheck size={15} className="shrink-0" />
        <span>
          Have a handle on HandCash or another ecosystem? Use it here instead of a
          username.
        </span>
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <label
        htmlFor="fr-handle"
        className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground"
      >
        Your handle
      </label>
      <div className="mt-2 flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <Input
            autoFocus
            id="fr-handle"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && value.trim()) void claim();
              if (e.key === "Escape") setOpen(false);
            }}
            placeholder="@alice@handcash.io"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            className="h-9"
          />
          <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
            {error ??
              "Nothing is taken on trust: the ecosystem is asked whose handle this is, and it has to be your wallet's."}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Button size="sm" variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            variant="primary"
            disabled={busy || value.trim() === ""}
            onClick={() => void claim()}
          >
            <CheckCircle size={15} />
            {busy ? "Checking" : "Verify"}
          </Button>
        </div>
      </div>
    </div>
  );
}
