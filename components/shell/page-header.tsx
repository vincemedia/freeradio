/**
 * One page title, one sentence, one action.
 *
 * Fixed shape across the app so no screen has to invent its own anatomy, and
 * so the eye lands in the same place every time you navigate.
 */
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="font-display text-[clamp(28px,19px+1.4vw,36px)] font-semibold leading-[1.15] tracking-[-0.02em] text-balance">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-balance text-muted-foreground">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
