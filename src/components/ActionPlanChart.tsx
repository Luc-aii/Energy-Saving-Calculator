"use client";

import { useMemo } from "react";
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
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
 * "Do nothing" = what you've already implemented, minus the cumulative extra cost of tariff
 * escalation on whatever you're still paying for — inaction isn't free, so this line slopes rather
 * than sitting flat (it goes negative for a company with nothing implemented yet). "Act now" = Do
 * nothing PLUS the engine's year-by-year projection for whatever further measures are currently
 * selected — so with nothing selected, the two lines are identical and overlap; each measure ticked
 * pulls Act now away from Do nothing by exactly that measure's own contribution. This ensures the
 * chart, headlines, and banner all show the same figures.
 *
 * Selection state is lifted to the parent so every number on the page stays in sync.
 */
export function ActionPlanChart({
  result,
  selected,
  onToggle,
  selectedFraction,
}: {
  result: CalculationResult;
  /** Currently selected (checked) ECM IDs — owned by the parent. */
  selected: Set<string>;
  /** Toggle callback — parent flips the set and re-renders both the chart and banner. */
  onToggle: (ecmId: string) => void;
  /** Share of the full ECM set currently selected (0–1). Drives the "Act now" line scaling. */
  selectedFraction: number;
}) {
  const candidates = useMemo(() => result.ecmResult?.breakdown ?? [], [result.ecmResult]);
  const top3Ids = useMemo(() => new Set(result.topEcmRecommendations.map((r) => r.ecmId)), [result.topEcmRecommendations]);
  const rankByEcmId = useMemo(() => new Map(result.topEcmRecommendations.map((r) => [r.ecmId, r.rank])), [result.topEcmRecommendations]);
  const sortedCandidates = useMemo(
    () => sortEcmBreakdownForDisplay(candidates, result.topEcmRecommendations),
    [candidates, result.topEcmRecommendations]
  );

  // Already-implemented baseline (flat, not escalated — this is a fixed benefit you keep either way).
  const baselineAnnualSgd = (result.alreadyImplementedEcm?.dollarSavedPerMonthMid ?? 0) * 12;

  // "Doing nothing" isn't actually free: your tariff keeps escalating every year regardless of
  // whether you act, so the SAME electricity bill costs more each year just from that. energySavingSgd
  // for a given year is kwhSaved x that year's escalated/blended rate — dividing out the savings rate
  // recovers the FULL kWh's cost at that same escalated rate, using the engine's own real escalation
  // math rather than a separate re-derivation that could drift from it. year1's full cost is the
  // reference point; every later year's full cost minus that reference is the extra you're bleeding
  // purely from inaction on a rising tariff, independent of any measure.
  const savingRate = result.energySavingRatePct;
  const fullCostForYear = (row: (typeof result.yearRows)[number]) =>
    savingRate > 0 ? row.energySavingSgd / savingRate : result.monthlyCurrentEnergyCostSgd * 12;
  const year1FullCost = result.yearRows.length > 0 ? fullCostForYear(result.yearRows[0]) : 0;

  // The engine combines measures multiplicatively (two 30% savings on the same end-use don't add to
  // 60%, they combine to 51%). It also includes carbon tax savings and tariff escalation. So the sum
  // of each ECM's individual dollarSavedPerYearMid won't match the engine total. This adjustment
  // factor scales each per-ECM label so they add up to the engine's actual year-1 value — keeping
  // the checkbox labels and the headline figures perfectly in sync.
  const flatSum = useMemo(() => candidates.reduce((s, c) => s + c.dollarSavedPerYearMid, 0), [candidates]);
  const engineYear1Total = result.yearRows.length > 0 ? result.yearRows[0].totalSavingSgd : 0;
  const labelAdjustment = flatSum > 0 ? engineYear1Total / flatSum : 1;

  // Cumulative extra tariff-escalation cost through each year — built functionally (no outer
  // reassignment) so it's a plain running-total array, not mutated state across the render.
  const cumulativeExtraCosts = result.yearRows.reduce<number[]>((acc, row) => {
    const prevTotal = acc.length > 0 ? acc[acc.length - 1] : 0;
    return [...acc, prevTotal + (fullCostForYear(row) - year1FullCost)];
  }, []);

  // "Do nothing" = what you've already implemented, netted against the growing tariff-escalation cost
  // on everything else — for a company with nothing implemented yet, that's just the rising cost
  // alone, sloping downward rather than sitting flat at zero. "Act now" is built as Do-nothing PLUS
  // whatever further measures are currently selected (scaled by selectedFraction), not as a separate
  // formula — so with 0 selected the two lines are mathematically identical and visually overlap,
  // exactly as they should (selecting nothing further changes nothing). Every measure ticked pulls
  // "Act now" up and away from "Do nothing" by that measure's own contribution.
  const chartData = result.yearRows.map((row, i) => {
    const doNothing = baselineAnnualSgd * row.year - cumulativeExtraCosts[i];
    return {
      year: `Y${row.year}`,
      "Do nothing": Math.round(doNothing),
      "Act now": Math.round(doNothing + row.cumulativeSavingSgd * selectedFraction),
    };
  });

  // Y-axis now needs a real floor, not a hardcoded 0 — "Do nothing" can go negative once tariff
  // escalation is netted in. Ceiling stays fixed to "everything selected" as before, so the line's
  // height only moves because you changed your selection or the axis shrank with it.
  const fullCumulative = result.yearRows.length > 0
    ? result.yearRows[result.yearRows.length - 1].cumulativeSavingSgd
    : 0;
  const maxPossibleCumulative = baselineAnnualSgd * result.yearRows.length + fullCumulative;
  const minDoNothing = chartData.length > 0 ? Math.min(0, ...chartData.map((d) => d["Do nothing"])) : 0;

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
  const yDomainMin = minDoNothing < 0 ? Math.floor((minDoNothing * 1.05) / 1000) * 1000 : 0;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm shadow-brand-700/5">
      <h3 className="text-sm font-bold text-ink">Cost of doing nothing vs. acting, over 10 years</h3>
      <p className="mt-1 text-xs text-ink-soft">
        <strong className="text-red-600">Do nothing</strong> = what you&apos;ve already implemented, kept — but your tariff still
        escalates every year regardless, so it isn&apos;t free and the line below isn&apos;t flat.{" "}
        <strong className="text-blue-600">Act now</strong> = Do nothing, plus whatever further measures you select below. With
        nothing selected the two lines sit exactly on top of each other; each measure you tick pulls Act now away from Do nothing.
      </p>

      <div className="mt-2 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="year" fontSize={12} />
            {/* Both ends of the domain are fixed, not Recharts' default auto-zoomed range. The floor is
                usually 0, but "Do nothing" can now go negative once tariff escalation is netted in, so
                it's computed from the actual data rather than hardcoded. */}
            <YAxis fontSize={12} domain={[yDomainMin, yDomainMax]} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
            {/* Pinned to a fixed vertical position (not following the cursor) — the default
                cursor-following placement collided with the legend directly below the chart
                whenever you hovered a point in the lower half, rendering both as unreadable
                overlapping text. */}
            <Tooltip formatter={(v) => formatSgd(Number(v))} position={{ y: 0 }} />
            <Legend />
            {yDomainMin < 0 && <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="2 2" />}
            <Line
              type="monotone"
              dataKey="Do nothing"
              stroke="#dc2626"
              strokeWidth={5}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="Act now"
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
            Which further measures are you considering? ({selected.size} of {candidates.length} selected)
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
