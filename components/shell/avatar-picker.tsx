"use client";

import { useRef, useState } from "react";
import { Trash, UploadSimple } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Avatar } from "@/components/identity";
import { Button } from "@/components/ui/button";
import type { Person } from "@/data/schema";
import { useRadio } from "@/lib/store";

/**
 * Set or clear your picture.
 *
 * Everything that matters here happens on the server: the file is re-encoded
 * to a fixed size and format before it is stored, so nothing the browser
 * claims about type or dimensions is believed. This side does two things —
 * refuse the obviously wrong file before spending a round trip on it, and say
 * what happened.
 *
 * Without one you keep the generated tile and its animal, which is a real
 * identity rather than a placeholder: derived from your key, the same
 * everywhere, and never anybody else's.
 */

/** Matches the server. Checked here only to fail fast and kindly. */
const MAX_BYTES = 6 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp,image/gif,image/avif";

export function AvatarPicker({ person }: { person: Person }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const refreshSession = useRadio((s) => s.refreshSession);

  const upload = async (file: File) => {
    if (file.size > MAX_BYTES) {
      toast.error("That image is too large", {
        description: "Six megabytes is the limit.",
      });
      return;
    }

    setBusy(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/avatar", { method: "POST", body });
      const result = (await response.json()) as { url?: string; error?: string };
      if (!response.ok) {
        toast.error("That did not work", { description: result.error });
        return;
      }
      await refreshSession();
      toast.success("Avatar updated");
    } catch {
      toast.error("That did not work");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await fetch("/api/avatar", { method: "DELETE" });
      await refreshSession();
      toast("Back to your generated avatar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-4 rounded-lg border border-border bg-card p-4">
      <Avatar person={person} size={56} />

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{person.name}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Square, and shown small. Anything you upload is resized and
          re-encoded, which also strips its location and camera data.
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <input
          ref={input}
          type="file"
          accept={ACCEPT}
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
          }}
        />
        <Button
          variant="secondary"
          size="sm"
          disabled={busy}
          onClick={() => input.current?.click()}
        >
          <UploadSimple size={15} />
          {busy ? "Working" : person.photo ? "Replace" : "Upload"}
        </Button>
        {person.photo && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Remove your avatar"
            disabled={busy}
            onClick={() => void remove()}
          >
            <Trash />
          </Button>
        )}
      </div>
    </div>
  );
}
