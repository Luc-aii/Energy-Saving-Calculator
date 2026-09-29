"use client";

import { useMemo } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { CalculationResult } from "@/lib/types/results";
import { formatSgd } from "@/lib/format";
import { sortEcmBreakdownForDisplay } from "@/lib/calc/ecm";

const PROJECTION_YEARS = 10;

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
 * you keep either way. "Act now" = that same baseline plus whatever further measures are ticked in
 * the checklist below, defaulting to the Top 3 recommended. This is a self-contained sandbox for
 * exploring options: it sums each ticked measure's own dollarSavedPerYearMid (no tariff escalation,
 * no re-running the full multiplicative end-use combination), so it's a simplified estimate.
 *
 * Selection state is lifted to the parent so the "month-to-month" banner can reflect the same set
 * of ticked measures — what you tick here directly updates "after acting" below.
 */
export function ActionPlanChart({
  result,
  selected,
  onToggle,
}: {
  result: CalculationResult;
  /** Currently ticked ECM IDs — owned by the parent. */
  selected: Set<string>;
  /** Toggle callback — parent flips the set and re-renders both the chart and banner. */
  onToggle: (ecmId: string) => void;
}) {
  const candidates = useMemo(() => result.ecmResult?.breakdown ?? [], [result.ecmResult]);
  const top3Ids = useMemo(() => new Set(result.topEcmRecommendations.map((r) => r.ecmId)), [result.topEcmRecommendations]);
  const rankByEcmId = useMemo(() => new Map(result.topEcmRecommendations.map((r) => [r.ecmId, r.rank])), [result.topEcmRecommendations]);
  const sortedCandidates = useMemo(
    () => sortEcmBreakdownForDisplay(candidates, result.topEcmRecommendations),
    [candidates, result.topEcmRecommendations]
  );

  const baselineAnnualSgd = (result.alreadyImplementedEcm?.dollarSavedPerMonthMid ?? 0) * 12;
  const additionalAnnualSgd = candidates
    .filter((c) => selected.has(c.ecmId))
    .reduce((sum, c) => sum + c.dollarSavedPerYearMid, 0);

  const chartData = Array.from({ length: PROJECTION_YEARS }, (_, i) => {
    const year = i + 1;
    return {
      year: `Y${year}`,
      "Do nothing (already-implemented baseline)": Math.round(baselineAnnualSgd * year),
      "Act now (baseline + your ticked measures)": Math.round((baselineAnnualSgd + additionalAnnualSgd) * year),
    };
  });

  // Fixed against the FULL candidate set (every measure, ticked or not), not just what's currently
  // ticked — otherwise unticking a measure shrinks "auto"'s own ceiling along with the line.
  const maxPossibleAnnualSgd = baselineAnnualSgd + candidates.reduce((sum, c) => sum + c.dollarSavedPerYearMid, 0);

  // Both lines are genuinely $0 — nothing to chart.
  if (maxPossibleAnnualSgd <= 0) {
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

  const yDomainMax = Math.max(1, Math.ceil((maxPossibleAnnualSgd * PROJECTION_YEARS * 1.05) / 1000) * 1000);

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm shadow-brand-700/5">
      <h3 className="text-sm font-bold text-ink">Cost of doing nothing vs. acting, over 10 years</h3>
      <p className="mt-1 text-xs text-ink-soft">
        &quot;Do nothing&quot; is the cumulative value of what you&apos;ve already implemented, on its own. &quot;Act now&quot; adds
        whatever further measures you tick below — a simplified estimate for exploring options. The &quot;month-to-month&quot; banner
        below updates to match your ticked selection.
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
                <span className="w-16 shrink-0 text-right font-medium text-ink">{formatSgd(c.dollarSavedPerYearMid)}/yr</span>
              </label>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

