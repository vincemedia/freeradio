import type { Metadata, Viewport } from "next";
import { Inter, Inter_Tight } from "next/font/google";
import { Agentation } from "agentation";
import { Providers } from "@/components/providers";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

/* Two families only. Inter Tight carries the panel legends and page titles;
   Inter does everything else, with tabular figures for every readout. */
const body = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});

const display = Inter_Tight({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  /* Resolved from the deployment rather than hardcoded: every absolute URL in
     this object is built from it, and a card pointing at localhost is a card
     that renders perfectly and shares as nothing. */
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Free Radio",
    template: "%s · Free Radio",
  },
  description:
    "Live voice rooms on a frequency. Scan a band, find a Co-Channel, and talk.",
  applicationName: "Free Radio",
  openGraph: {
    title: "Free Radio",
    description:
      "Live voice rooms on a frequency. Scan a band, find a Co-Channel, and talk.",
    url: SITE_URL,
    siteName: "Free Radio",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Radio",
    description:
      "Live voice rooms on a frequency. Scan a band, find a Co-Channel, and talk.",
  },
  appleWebApp: {
    capable: true,
    title: "Free Radio",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f2f0" },
    { media: "(prefers-color-scheme: dark)", color: "#1e1d1c" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${body.variable} ${display.variable}`}>
        <Providers>{children}</Providers>
        {/* Development only, so the running app is inspectable and steerable
            by agents without shipping the toolbar to anybody else. */}
        {process.env.NODE_ENV === "development" && <Agentation />}
      </body>
    </html>
  );
}
