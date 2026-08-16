import { PageHeader } from "@/components/shell/page-header";
import type { Clause } from "@/data/legal";

/**
 * A legal document, set to be read.
 *
 * Measure held to roughly seventy characters and the headings left plain: the
 * usual treatment for these — small grey type, full width, one wall of it —
 * is a way of technically publishing something. If it is worth agreeing to it
 * is worth being able to read.
 */
export function LegalPage({
  title,
  subtitle,
  version,
  clauses,
}: {
  title: string;
  subtitle: string;
  version: string;
  clauses: Clause[];
}) {
  return (
    <div className="max-w-[38rem] space-y-8">
      <PageHeader title={title} subtitle={subtitle} />

      <div className="space-y-7">
        {clauses.map((clause) => (
          <section key={clause.heading} className="space-y-2">
            <h2 className="font-display text-base font-semibold tracking-tight">
              {clause.heading}
            </h2>
            {clause.body.map((paragraph) => (
              <p key={paragraph} className="text-[15px] leading-relaxed text-muted-foreground">
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </div>

      <p className="border-t border-border pt-4 text-xs text-muted-foreground">
        Version {version}. Written to describe what the software does; it has
        not been reviewed by a lawyer.
      </p>
    </div>
  );
}
