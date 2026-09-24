import type { ReactNode } from "react";

/**
 * Collapsed-by-default grouping for optional overrides / Scope 3 — keeps the
 * primary input flow to the fields that actually drive the hero results
 * (savings, emissions, tax, payback) while still exposing everything else a
 * power user might want, one click away. Native <details> — no state to
 * wire up, and it's keyboard/screen-reader accessible for free.
 */
export function Advanced({
  title = "Advanced / optional",
  subtitle,
  children,
  defaultOpen = false,
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details
      className="group rounded-xl border border-dashed border-border bg-brand-50/20 open:bg-transparent"
      open={defaultOpen}
    >
      <summary className="flex cursor-pointer select-none items-center justify-between gap-2 rounded-xl px-3.5 py-2.5 text-sm font-medium text-ink-soft marker:content-none hover:text-ink">
        <span className="flex items-center gap-2">
          <span className="inline-block transition-transform group-open:rotate-90">▸</span>
          {title}
        </span>
        {subtitle && <span className="text-xs font-normal text-ink-soft">{subtitle}</span>}
      </summary>
      <div className="grid grid-cols-1 gap-x-4 gap-y-5 border-t border-border/60 px-3.5 pb-4 pt-4 sm:grid-cols-2">{children}</div>
    </details>
  );
}
