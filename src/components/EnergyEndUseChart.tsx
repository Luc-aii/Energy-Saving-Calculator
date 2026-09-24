import type { EnergyEndUseItem } from "@/lib/types/results";

/** Neutral, distinct palette matching the app's existing emerald/amber/red accent language (see CalibrationCurve.tsx). */
const PALETTE = ["#10b981", "#f59e0b", "#3b82f6", "#8b5cf6", "#ef4444", "#64748b", "#14b8a6", "#ec4899"];

export function EnergyEndUseChart({ items }: { items: EnergyEndUseItem[] }) {
  if (items.length === 0) {
    return <p className="text-xs text-ink-soft">No sourced energy end-use split is available for this sector yet — &quot;Other&quot; caveats apply.</p>;
  }

  const maxPct = Math.max(...items.map((i) => i.pct));

  return (
    <div className="flex flex-col gap-2">
      {items.map((item, i) => {
        const isTop = item.pct === maxPct && maxPct > 0;
        return (
          <div key={item.id} className="flex items-center gap-2.5">
            <span className={`w-36 shrink-0 truncate text-xs ${isTop ? "font-semibold text-ink" : "text-ink-soft"}`} title={item.label}>
              {item.label}
            </span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink/5">
              <div
                className={`h-2 rounded-full transition-all ${isTop ? "ring-2 ring-inset ring-brand-300" : ""}`}
                style={{ width: `${Math.min(Math.max(item.pct, 0), 100)}%`, backgroundColor: PALETTE[i % PALETTE.length] }}
              />
            </div>
            <span className={`w-10 shrink-0 text-right text-xs ${isTop ? "font-bold text-ink" : "font-medium text-ink"}`}>
              {item.pct.toFixed(0)}%
            </span>
            {isTop && (
              <span className="shrink-0 rounded-full bg-brand-500 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
                Top driver
              </span>
            )}
          </div>
        );
      })}
      {items.some((i) => i.userAdjusted) && <p className="mt-1 text-[10px] text-ink-soft">Using your customized split.</p>}
    </div>
  );
}
