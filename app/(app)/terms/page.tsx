import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { TERMS, TERMS_VERSION } from "@/data/legal";

export const metadata: Metadata = { title: "Terms of use" };

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of use"
      subtitle="What this is, what is yours, and what nobody is promising."
      version={TERMS_VERSION}
      clauses={TERMS}
    />
  );
}
