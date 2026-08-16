import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { PRIVACY, TERMS_VERSION } from "@/data/legal";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy"
      subtitle="There is very little of it to collect, which is the point."
      version={TERMS_VERSION}
      clauses={PRIVACY}
    />
  );
}
