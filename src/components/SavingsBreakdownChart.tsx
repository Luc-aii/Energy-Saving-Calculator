import type { EcmBreakdownItem } from "@/lib/types/results";

/** One color per building area (not per measure) — a measure's own name+% label sits directly on
    its row, so there's no legend to cross-reference and no risk of two similarly-colored segments
    being confused for each other. */
const GROUP_PALETTE = ["#10b981", "#f59e0b", "#3b82f6", "#8b5cf6", "#ef4444", "#14b8a6", "#ec4899", "#64748b"];

/**
 * "Which measure contributes which % and which part of the building it affects" — grouped by
 * end-use (the "building part"), each measure gets its own fully-labeled bar (name and value both
 * always visible, not hidden behind a hover tooltip or a color-matched legend). Earlier version
 * used a single stacked multi-color bar per group with a 10-entry legend below — confusing, since
 * matching a thin color segment back to its legend swatch took real effort.
 */
export function SavingsBreakdownChart({ breakdown }: { breakdown: EcmBreakdownItem[] }) {
  if (breakdown.length === 0) {
    return <p className="text-xs text-ink-soft">No Energy Conservation Measures are modeled for this sector yet.</p>;
  }

  const groups = new Map<string, { label: string; items: EcmBreakdownItem[]; total: number }>();
  for (const item of breakdown) {
    const g = groups.get(item.endUseId) ?? { label: item.endUseLabel, items: [], total: 0 };
    g.items.push(item);
    g.total += Math.max(item.contributionToRatePctMid, 0);
    groups.set(item.endUseId, g);
  }
  const sortedGroups = Array.from(groups.values()).sort((a, b) => b.total - a.total);
  const maxItemPct = Math.max(...breakdown.map((i) => Math.max(i.contributionToRatePctMid, 0)), 0.0001);

  return (
    <div className="flex flex-col gap-4">
      {sortedGroups.map((g, gi) => {
        const color = GROUP_PALETTE[gi % GROUP_PALETTE.length];
        return (
          <div key={g.label}>
            <div className="flex items-baseline justify-between border-b border-border pb-1">
              <p className="text-xs font-bold text-ink">{g.label}</p>
              <p className="text-xs font-semibold text-ink-soft">{(g.total * 100).toFixed(1)}pp total</p>
            </div>
            <div className="mt-2 flex flex-col gap-2">
              {g.items
                .slice()
                .sort((a, b) => b.contributionToRatePctMid - a.contributionToRatePctMid)
                .map((item) => (
                  <div key={item.ecmId} className="flex flex-col gap-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-ink-soft">{item.label}</span>
                      <span className="shrink-0 text-xs font-medium text-ink">
                        {(item.contributionToRatePctMid * 100).toFixed(1)}pp
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-ink/5">
                      <div
                        className="h-2 rounded-full"
                        style={{ width: `${(Math.max(item.contributionToRatePctMid, 0) / maxItemPct) * 100}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </div>
        );
      })}
      <p className="text-[10px] text-ink-soft">
        &quot;pp&quot; = percentage points of your total electricity saved. Bar length is relative to your single
        highest-contributing measure. Grouped by the part of the building each measure affects.
      </p>
    </div>
  );
}
