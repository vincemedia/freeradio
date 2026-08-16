import Link from "next/link";
import { LogoMark } from "@/components/brand";

/**
 * The two documents, outside the app shell.
 *
 * They used to live inside it, which meant they inherited its redirect to
 * first run — so the links on the agreement checkbox, the one place anybody
 * is ever actually asked to read them, bounced to the welcome flow instead.
 * Being unable to read the terms until you have agreed to them is not a
 * subtle failure.
 *
 * So this shell has no session, no band, and nothing to hydrate. A masthead
 * back to the app for anyone who arrived from inside it, and the two
 * documents pointing at each other for anyone who arrived from a new tab.
 */
export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-[1200px] items-center gap-2.5 px-4 py-3.5 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <LogoMark size={26} />
            <span className="font-display text-sm font-semibold tracking-tight">
              Free Radio
            </span>
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>

      <footer className="mx-auto w-full max-w-[1200px] px-4 py-8 text-center text-[11px] text-muted-foreground sm:px-6">
        <Link href="/terms" className="underline-offset-2 hover:underline">
          Terms
        </Link>
        <span aria-hidden className="px-2">
          ·
        </span>
        <Link href="/privacy" className="underline-offset-2 hover:underline">
          Privacy
        </Link>
      </footer>
    </div>
  );
}
