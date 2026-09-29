"use client";

import { useMemo } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { CalculationResult } from "@/lib/types/results";
import { formatSgd } from "@/lib/format";
import { sortEcmBreakdownForDisplay } from "@/lib/calc/ecm";

/**
 * Returns the sorted candidate ECM list and the default selected set (top-3 recommended IDs)
 * for a given result — used by the parent to initialise the lifted selection state.
 */
export function getActionPlanDefaults(result: CalculationResult) {
  const candidates = result.ecmResult?.breakdown ?? [];
  const top3Ids = new Set(result.topEcmRecommendations.map((r) => r.ecmId));
  const sorted = sortEcmBreakdownForDisplay(candidates, result.topEcmRecommendations);
  return { candidates, sorted, top3Ids };
}

/**
 * "Do nothing" = the cumulative value of measures already implemented, on their own — the baseline
 * you keep either way. "Act now" = that same baseline plus the engine's year-by-year projection
 * (including tariff escalation and carbon tax) scaled by the share of further measures currently
 * ticked. This ensures the chart, headlines, and banner all show the same figures.
 *
 * Selection state is lifted to the parent so every number on the page stays in sync.
 */
export function ActionPlanChart({
  result,
  selected,
  onToggle,
  tickedFraction,
}: {
  result: CalculationResult;
  /** Currently ticked ECM IDs — owned by the parent. */
  selected: Set<string>;
  /** Toggle callback — parent flips the set and re-renders both the chart and banner. */
  onToggle: (ecmId: string) => void;
  /** Share of the full ECM set that's currently ticked (0–1). Drives the "Act now" line scaling. */
  tickedFraction: number;
}) {
  const candidates = useMemo(() => result.ecmResult?.breakdown ?? [], [result.ecmResult]);
  const top3Ids = useMemo(() => new Set(result.topEcmRecommendations.map((r) => r.ecmId)), [result.topEcmRecommendations]);
  const rankByEcmId = useMemo(() => new Map(result.topEcmRecommendations.map((r) => [r.ecmId, r.rank])), [result.topEcmRecommendations]);
  const sortedCandidates = useMemo(
    () => sortEcmBreakdownForDisplay(candidates, result.topEcmRecommendations),
    [candidates, result.topEcmRecommendations]
  );

  // Already-implemented baseline (flat, not escalated — this line stays constant regardless of ticks).
  const baselineAnnualSgd = (result.alreadyImplementedEcm?.dollarSavedPerMonthMid ?? 0) * 12;

  // The engine combines measures multiplicatively (two 30% savings on the same end-use don't add to
  // 60%, they combine to 51%). It also includes carbon tax savings and tariff escalation. So the sum
  // of each ECM's individual dollarSavedPerYearMid won't match the engine total. This adjustment
  // factor scales each per-ECM label so they add up to the engine's actual year-1 value — keeping
  // the checkbox labels and the headline figures perfectly in sync.
  const flatSum = useMemo(() => candidates.reduce((s, c) => s + c.dollarSavedPerYearMid, 0), [candidates]);
  const engineYear1Total = result.yearRows.length > 0 ? result.yearRows[0].totalSavingSgd : 0;
  const labelAdjustment = flatSum > 0 ? engineYear1Total / flatSum : 1;

  // "Act now" uses the engine's year-by-year cumulative savings (incl. tariff escalation + carbon tax),
  // scaled by tickedFraction so it reflects only the ticked measures.
  const chartData = result.yearRows.map((row) => ({
    year: `Y${row.year}`,
    "Do nothing (already-implemented baseline)": Math.round(baselineAnnualSgd * row.year),
    "Act now (baseline + your ticked measures)": Math.round(
      baselineAnnualSgd * row.year + row.cumulativeSavingSgd * tickedFraction
    ),
  }));

  // Y-axis ceiling fixed to "all measures ticked" (tickedFraction = 1) so the line's height
  // only moves because you changed the ticks, never because the axis shrank with it.
  const fullCumulative = result.yearRows.length > 0
    ? result.yearRows[result.yearRows.length - 1].cumulativeSavingSgd
    : 0;
  const maxPossibleCumulative = baselineAnnualSgd * result.yearRows.length + fullCumulative;

  // Nothing to chart — sector has no ECM data.
  if (maxPossibleCumulative <= 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm shadow-brand-700/5">
        <h3 className="text-sm font-bold text-ink">Cost of doing nothing vs. acting, over 10 years</h3>
        <p className="mt-2 text-xs text-ink-soft">
          Nothing to project yet — your sector doesn&apos;t have Energy Conservation Measure catalog data in this tool, so there&apos;s
          nothing already-implemented or further-opportunity to chart. Try a different sector, or the In-depth tab&apos;s Assumptions
          section for what data this tool does have for yours.
        </p>
      </div>
    );
  }

  const yDomainMax = Math.max(1, Math.ceil((maxPossibleCumulative * 1.05) / 1000) * 1000);

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm shadow-brand-700/5">
      <h3 className="text-sm font-bold text-ink">Cost of doing nothing vs. acting, over 10 years</h3>
      <p className="mt-1 text-xs text-ink-soft">
        &quot;Do nothing&quot; is the cumulative value of what you&apos;ve already implemented, on its own. &quot;Act now&quot; adds
        whatever further measures you tick below — including projected tariff escalation and carbon tax savings, matching
        the headline figures above.
      </p>

      <div className="mt-2 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="year" fontSize={12} />
            {/* Both ends of the domain are fixed, not Recharts' default auto-zoomed range. */}
            <YAxis fontSize={12} domain={[0, yDomainMax]} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
            <Tooltip formatter={(v) => formatSgd(Number(v))} />
            <Legend />
            <Line
              type="monotone"
              dataKey="Do nothing (already-implemented baseline)"
              stroke="#dc2626"
              strokeWidth={5}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="Act now (baseline + your ticked measures)"
              stroke="#2563eb"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {candidates.length > 0 && (
        <details className="mt-3 rounded-lg border border-border bg-white p-2.5" open>
          <summary className="cursor-pointer text-xs font-bold text-ink">
            Which further measures are you considering? ({selected.size} of {candidates.length} ticked)
          </summary>
          <div className="mt-2 flex flex-col gap-1.5">
            {sortedCandidates.map((c) => (
              <label key={c.ecmId} className="flex items-center gap-2 rounded-md px-1.5 py-1 text-xs hover:bg-brand-50">
                <input
                  type="checkbox"
                  checked={selected.has(c.ecmId)}
                  onChange={() => onToggle(c.ecmId)}
                  className="h-3.5 w-3.5 shrink-0 accent-brand-500"
                />
                <span className="flex-1 truncate text-ink-soft" title={c.label}>
                  {c.label}
                </span>
                {top3Ids.has(c.ecmId) && (
                  <span className="shrink-0 rounded-full bg-brand-500 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
                    #{rankByEcmId.get(c.ecmId)} recommended
                  </span>
                )}
                <span className="w-16 shrink-0 text-right font-medium text-ink">{formatSgd(c.dollarSavedPerYearMid * labelAdjustment)}/yr</span>
              </label>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
