"use client";

import { Check, UserPlus } from "@phosphor-icons/react";
import Avatar from "boring-avatars";
import { toast } from "sonner";
import useFetch from "@/lib/use-fetch";
import { Button } from "@/components/ui/button";
import { useContacts, MAX_CONTACTS } from "@/lib/contacts";
import { truncateKey } from "@/lib/identity-key";

/**
 * People who have been on air lately, offered where the list is empty.
 *
 * An empty state whose only content is an instruction is the worst screen in
 * any product: it tells somebody what to do instead of letting them do it.
 * And the instruction here was circular — go into a room and find somebody —
 * which is fine advice on a busy night and useless on a quiet one.
 *
 * So it offers the plain fact of who has actually been here recently, in the
 * order they last were. Not suggestions: nothing is inferred about who you
 * would get on with, because there is no social graph here to mine and
 * pretending otherwise would be inventing one.
 *
 * Renders nothing when nobody has been on lately, which leaves the written
 * empty state to say so on its own. An offer of nobody is worse than no
 * offer.
 */

const COLORS = ["#eab300", "#cc2e1d", "#4353ff", "#16a34a", "#7c3aed"];

export function RecentPeople() {
  const { data } = useFetch<{ key: string; name: string }[]>(
    "/api/people/recent",
  );
  const { add, has } = useContacts();

  const people = data ?? [];
  if (people.length === 0) return null;

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
          Recently on air
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          People who have been in a room lately. Adding somebody here is the
          same as adding them from a room.
        </p>
      </div>

      <ul className="space-y-2">
        {people.map((p) => {
          const added = has(p.key);
          return (
            <li
              key={p.key}
              className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
            >
              <Avatar size={36} name={p.key} variant="marble" colors={COLORS} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {p.name}
                </span>
                <span className="readout text-[11px] text-muted-foreground">
                  {truncateKey(p.key)}
                </span>
              </span>

              {added ? (
                <span className="flex items-center gap-1.5 pr-1 text-[11px] text-muted-foreground">
                  <Check size={13} weight="bold" />
                  Added
                </span>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    const ok = add({ key: p.key, name: p.name });
                    if (ok) {
                      toast.success(`${p.name} added to contacts`);
                    } else {
                      toast.error("Your contacts are full", {
                        description: `The list holds ${MAX_CONTACTS}.`,
                      });
                    }
                  }}
                >
                  <UserPlus size={14} />
                  Add
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
