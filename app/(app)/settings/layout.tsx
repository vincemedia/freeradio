import type { Metadata } from "next";

/** Personal, and nobody shares a settings screen. No card, not indexed. */
export const metadata: Metadata = {
  title: "Settings",
  robots: { index: false, follow: false },
};

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
