"use client";

import Link from "next/link";
import { Plug, SignOut } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Avatar, Identity } from "@/components/identity";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/overlays";
import { Badge } from "@/components/ui/primitives";
import { useRadio } from "@/lib/store";

/**
 * Connect, and the identity behind it.
 *
 * The wallet owns identity here: no password, no sign-up, no account
 * switcher. Connecting is a handshake that yields one identity key, and
 * disconnecting forgets it. No key material is ever shown or stored in this
 * page, because a web page cannot hold a private key and building the screens
 * that pretend otherwise is both wasted work and unsafe.
 */
export function WalletButton() {
  const session = useRadio((s) => s.session);
  const connecting = useRadio((s) => s.connecting);
  const usedWallet = useRadio((s) => s.usedWallet);
  const adopted = useRadio((s) => s.session?.adopted);
  const connect = useRadio((s) => s.connect);
  const disconnect = useRadio((s) => s.disconnect);

  /* Null until the first session read lands. Rendering "Connect" during that
     window would flash the wrong control at somebody already connected. */
  if (!session) {
    return (
      <Button size="sm" variant="secondary" disabled aria-label="Checking for a wallet">
        …
      </Button>
    );
  }

  if (!session.connected || !session.me) {
    return (
      <Button
        size="sm"
        variant="primary"
        disabled={connecting}
        onClick={() => {
          void connect().then((result) => {
            if (!result.ok) {
              toast.error("Your wallet did not connect", {
                description: result.error,
              });
              return;
            }
            if (result.usedWallet) {
              toast.success("Wallet connected");
            } else {
              toast("Connected as the demo identity", {
                description: "No BRC-100 wallet answered in this browser.",
              });
            }
          });
        }}
      >
        <Plug size={15} />
        <span className="hidden sm:inline">
          {connecting ? "Connecting" : "Connect wallet"}
        </span>
      </Button>
    );
  }

  const me = session.me;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Your identity"
          className="flex shrink-0 items-center gap-2 rounded-md p-0.5 pr-2 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Avatar person={me} size={28} />
          <span className="hidden text-sm font-medium lg:inline">{me.name}</span>
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-[17rem]">
        <div className="flex items-center gap-2.5">
          <Avatar person={me} size={36} />
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">{me.name}</span>
            <Identity person={me} className="text-[11px]" />
          </span>
        </div>

        {/* Said out loud rather than implied. A product about signing things
            with your own key should never let somebody believe they are
            signing with one when they are not. */}
        <div className="mt-3 space-y-1.5">
          {usedWallet ? (
            <Badge variant="outline">BRC-100 wallet connected</Badge>
          ) : (
            <Badge variant="signal">Demo identity, no wallet attached</Badge>
          )}
          {adopted && (
            <p className="text-[11px] leading-snug text-muted-foreground">
              Your wallet is attached and will sign. What is on screen belongs
              to the demo account, because these fixtures were written before
              your key existed.
            </p>
          )}
        </div>

        <div className="mt-3 border-t border-border pt-3">
          <Link
            href="/settings"
            className="text-[13px] underline underline-offset-2 hover:text-foreground"
          >
            Settings
          </Link>
        </div>

        <Button
          size="sm"
          variant="secondary"
          className="mt-3 w-full"
          onClick={() => {
            void disconnect().then(() => toast("Disconnected"));
          }}
        >
          <SignOut size={15} />
          Disconnect
        </Button>
      </PopoverContent>
    </Popover>
  );
}
