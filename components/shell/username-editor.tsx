"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, PencilSimple } from "@phosphor-icons/react";
import { Avatar } from "@/components/identity";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/primitives";
import type { Person } from "@/data/schema";
import { useRadio } from "@/lib/store";

/**
 * What you are called, and changing it.
 *
 * It was chosen once during first run and then never again, which made it the
 * only thing about somebody that the product treated as permanent — and it is
 * the least permanent thing there is. Anyone who arrived through an invitation
 * skipped that step entirely, so their name is their key until there is
 * somewhere to change it. This is that somewhere.
 *
 * A name and not an address. It is not owned, not reserved and not unique, and
 * the terms say so; the key underneath is the identity, and that is the part
 * nobody can edit. Which is why this can be a plain field rather than a
 * registration.
 *
 * Read-only until pressed. A settings page full of open inputs invites
 * accidents, and this one is shown to everybody in every room you enter.
 */
export function UsernameEditor({ person }: { person: Person }) {
  const setUsername = useRadio((s) => s.setUsername);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(person.keyIdentity ? "" : person.name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* Somebody who has never chosen one is shown as their key, shortened. That is
     theirs and it is honest, but it is not a name, so the prompt differs. */
  const unnamed = person.name === person.handle && person.keyIdentity && /…/.test(person.name);

  const save = async () => {
    setBusy(true);
    setError(null);
    const result = await setUsername(value);
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "That name will not do.");
      return;
    }
    setEditing(false);
    toast.success("Name updated", {
      description: "Everyone in a room with you sees it from now on.",
    });
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <Avatar person={person} size={40} />

        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="space-y-1.5">
              <Input
                autoFocus
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void save();
                  if (e.key === "Escape") setEditing(false);
                }}
                placeholder="what people call you on air"
                autoComplete="off"
                spellCheck={false}
                aria-label="Your name"
                className="h-9"
              />
              <p className="text-[11px] text-muted-foreground">
                {error ??
                  "Lowercase, no spaces. Not owned or reserved — it is a label on your key, and the key is the identity."}
              </p>
            </div>
          ) : (
            <>
              <p className="truncate text-sm font-medium">{person.name}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {unnamed
                  ? "You have no name yet, so rooms show your key shortened."
                  : "Shown to everyone in every room you join."}
              </p>
            </>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {editing ? (
            <>
              <Button size="sm" variant="secondary" onClick={() => setEditing(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant="primary"
                disabled={busy || value.trim() === ""}
                onClick={() => void save()}
              >
                <Check size={15} />
                Save
              </Button>
            </>
          ) : (
            <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
              <PencilSimple size={15} />
              {unnamed ? "Choose one" : "Change"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
