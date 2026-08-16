import type { Metadata } from "next";

/**
 * Deliberately not shareable.
 *
 * This page is a list of who you know and where they are right now. A share
 * card for it would be a card about somebody's social graph, and there is no
 * version of that worth generating, so it gets a title, no image, and a
 * request not to be indexed.
 */
export const metadata: Metadata = {
  title: "Contacts",
  robots: { index: false, follow: false },
};

export default function ContactsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
