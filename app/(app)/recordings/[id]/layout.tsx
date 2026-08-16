import type { Metadata } from "next";
import { getEcosystem } from "@/data/ecosystems";
import { formatDuration } from "@/lib/format";
import { getPerson, getRecording } from "@/lib/server/store";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const recording = getRecording(id);

  if (!recording) {
    return { title: "No such recording", robots: { index: false } };
  }

  const host = getPerson(recording.hostId);
  const band = getEcosystem(recording.ecosystem);
  const title = `${recording.title} · recording`;
  const description = `${formatDuration(recording.duration)} from ${
    recording.frequency.toFixed(1)
  } MHz on ${band?.name ?? recording.ecosystem}${
    host ? `, hosted by @${host.handle}@${host.ecosystem}` : ""
  }.`;

  return {
    title,
    description,
    openGraph: { title, description, type: "article" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default function RecordingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
