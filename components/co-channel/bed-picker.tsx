"use client";

import { Check, MusicNotes, MusicNotesSimple } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/overlays";
import { BEDS, getBed } from "@/data/beds";
import type { BedControl } from "@/lib/use-bed";
import { cn } from "@/lib/utils";

/**
 * What the host puts under the silence.
 *
 * A popover rather than a cycling button, because there are three states and
 * a button that cycles through three states cannot tell you what it will do
 * next. The current one is ticked, so opening it answers "what is playing"
 * as well as offering to change it — which is most of why anybody opens it.
 *
 * Only the host sees this. Everybody in a room hears the same station, the
 * way they would on a real one; a personal mixer for other people's silence
 * would be a different product, and a louder one.
 *
 * The trigger animates while the bed is audible, so the host can see at a
 * glance that music is playing without having to trust their speakers. The
 * moment somebody speaks it stops, which is also the moment the animation
 * stops, so the two agree.
 */
export function BedPicker({ control }: { control: BedControl }) {
  const current = getBed(control.bed);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="secondary"
          size="sm"
          aria-label={`Background music: ${current.label}`}
          className="max-sm:w-9 max-sm:px-0"
        >
          {control.playing ? (
            <MusicNotes size={15} weight="fill" className="animate-pulse" />
          ) : (
            <MusicNotesSimple size={15} />
          )}
          <span className="max-sm:hidden">{current.label}</span>
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[17rem] p-1.5">
        <p className="px-2 pb-1.5 pt-1 text-[11px] text-muted-foreground">
          Plays while nobody is talking, and stops when somebody does.
        </p>
        <ul>
          {BEDS.map((bed) => {
            const active = bed.id === control.bed;
            return (
              <li key={bed.id}>
                <button
                  type="button"
                  onClick={() => control.setBed(bed.id)}
                  aria-pressed={active}
                  className={cn(
                    "flex w-full items-start gap-2 rounded-md px-2 py-2 text-left transition-colors",
                    active ? "bg-muted" : "hover:bg-muted/60",
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-medium">
                      {bed.label}
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
                      {bed.hint}
                    </span>
                  </span>
                  {active && (
                    <Check size={14} weight="bold" className="mt-0.5 shrink-0" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
