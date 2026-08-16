import type { Metadata } from "next";
import { getEcosystem } from "@/data/ecosystems";
import { getCoChannel } from "@/lib/server/store";

/**
 * Per-room metadata.
 *
 * The image is only half of a shared link. Without this every Co-Channel was
 * titled "Free Radio", so five links to five different rooms were
 * indistinguishable in a chat window.
 *
 * It lives in the layout because the page itself is a client component and
 * cannot export metadata, and a layout can do it without splitting the page
 * in two.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const room = getCoChannel(id);

  if (!room) {
    return {
      title: "This Co-Channel has closed",
      description:
        "The last person left, so the room stopped existing and its frequency went back into the pool.",
    };
  }

  const band = getEcosystem(room.ecosystem);
  const title = `${room.frequency.toFixed(1)} MHz · ${room.title}`;
  const description =
    room.topic ??
    `${room.occupantCount} in the room on the ${band?.name ?? room.ecosystem} band.`;

  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default function CoChannelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
