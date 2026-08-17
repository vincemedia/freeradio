"use client";

import { toast } from "sonner";
import { BellRinging, BellSlash, DeviceMobile } from "@phosphor-icons/react";
import { Switch } from "@/components/ui/primitives";
import { useNotifications } from "@/lib/use-notifications";
import { useRadio } from "@/lib/store";

/**
 * The switch for OS notifications, and the sentence it owes you.
 *
 * Everything about this is opt-in and stays off, because it is the one feature
 * in the product that uploads something. Contacts live in your browser and the
 * server is otherwise told nothing about who you know — but a notification has
 * to arrive when your browser is closed, so something has to know these people
 * matter to you while you are not here. That is stated on the switch, not in a
 * policy, because the moment somebody is deciding is the only moment the
 * sentence is any use.
 *
 * The four states are shown as four states rather than as a switch that
 * sometimes lies. A browser that has already refused will not prompt again, so
 * offering a switch there is offering something that cannot happen; iOS gives a
 * web app push only from the home screen, so in a tab the honest answer is how
 * to install it.
 */
export function NotificationToggle() {
  const session = useRadio((s) => s.session);
  const publicKey = session?.me?.publicKey ?? null;
  const { state, busy, enable, disable, watching } = useNotifications(publicKey);

  if (state === "unsupported") {
    return (
      <p className="flex items-start gap-2.5 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
        <DeviceMobile size={17} className="mt-0.5 shrink-0" />
        <span>
          Add Free Radio to your home screen and open it from there. Notifications
          need an installed app rather than a browser tab — on iPhone and iPad
          that is Safari&apos;s Share menu, then Add to Home Screen.
        </span>
      </p>
    );
  }

  if (state === "denied") {
    return (
      <p className="flex items-start gap-2.5 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
        <BellSlash size={17} className="mt-0.5 shrink-0" />
        <span>
          Notifications are blocked for this site, and the browser will not ask
          again — turning them back on has to be done in its own settings for
          this site, and then this switch will work.
        </span>
      </p>
    );
  }

  const on = state === "on";

  return (
    <div className="space-y-2 rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-medium">
            {on ? <BellRinging size={15} /> : <BellSlash size={15} />}
            When somebody you know goes on air
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {on
              ? `Watching ${watching} ${watching === 1 ? "contact" : "contacts"}. Adding somebody to your contacts includes them automatically.`
              : "A notification when a contact starts a station or joins one, even when Free Radio is closed."}
          </p>
        </div>

        <Switch
          checked={on}
          label=""
          onCheckedChange={(next) => {
            if (busy) return;
            if (!next) {
              void disable().then(() => toast("Notifications off"));
              return;
            }
            void enable().then((result) => {
              if (result.ok) {
                toast.success("Notifications on", {
                  description: "You will hear when a contact goes on air.",
                });
              } else {
                toast.error("Notifications did not switch on", {
                  description: result.error,
                });
              }
            });
          }}
        />
      </div>

      {/* The cost, at the moment of the decision. This is the only thing in
          the product that sends anything about your contacts anywhere, and
          somebody agreeing to it should know that from the switch rather than
          from a document. */}
      <p className="border-t border-border pt-2 text-[11px] leading-relaxed text-muted-foreground">
        Switching this on sends your contact list to the server, because
        something has to know who you are waiting for while your browser is
        closed. It is deleted when you switch this off. Everywhere else in Free
        Radio, contacts never leave this device.
      </p>

      {!publicKey && (
        <p className="text-[11px] text-muted-foreground">
          Connect a wallet first: a notification is addressed to a person, and
          without a key there is nobody to address it to.
        </p>
      )}
    </div>
  );
}
