"use client";

import { Copy, ShareNetwork } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { Person, Recording } from "@/data/schema";
import { formatFrequency } from "@/lib/format";

/**
 * What you can do with a recording that is not playing it.
 *
 * Share where the browser offers it and copy otherwise, rather than both: on
 * a phone the share sheet is the thing people expect and it already contains
 * "copy link", so offering the two side by side is one redundant control on
 * the smaller screen. The fallback is not an error path, it is just the
 * desktop, where there is no sheet to open.
 */
export function RecordingActions({
  recording,
}: {
  recording: Recording & { host: Person | null };
}) {
  const url = () => `${window.location.origin}/recordings/${recording.id}`;

  const copy = async () => {
    await navigator.clipboard.writeText(url());
    toast.success("Link copied", {
      description: `${recording.title}, ${formatFrequency(recording.frequency)} MHz`,
    });
  };

  const share = async () => {
    /* Not every browser has it, and the ones that do reject when the reader
       dismisses the sheet, which is not a failure worth reporting. */
    if (!navigator.share) return copy();
    try {
      await navigator.share({
        title: recording.title,
        text: `${recording.title} — ${formatFrequency(recording.frequency)} MHz on Free Radio`,
        url: url(),
      });
    } catch {
      /* Dismissed. */
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Share ${recording.title}`}
        onClick={() => void share()}
        className="sm:hidden"
      >
        <ShareNetwork />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Copy a link to ${recording.title}`}
        onClick={() => void copy()}
        className="hidden sm:inline-flex"
      >
        <Copy />
      </Button>
    </>
  );
}
