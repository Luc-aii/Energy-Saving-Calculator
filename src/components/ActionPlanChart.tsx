"use client";

import { useMemo, useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { CalculationResult } from "@/lib/types/results";
import { formatSgd } from "@/lib/format";
import { sortEcmBreakdownForDisplay } from "@/lib/calc/ecm";

const PROJECTION_YEARS = 10;

/**
 * "Do nothing" = the cumulative value of measures already implemented, on their own — the baseline
 * you keep either way. "Act now" = that same baseline plus whatever further measures are ticked in
 * the checklist below, defaulting to the Top 3 recommended. This is a self-contained sandbox for
 * exploring options: it sums each ticked measure's own dollarSavedPerYearMid (no tariff escalation,
 * no re-running the full multiplicative end-use combination), so it's a simplified estimate, not a
 * second source of truth — every other number on this page (headline %, Top 3 card, breakdown
 * chart, annual benefit table) stays anchored to the full recommended set and is never affected by
 * what's ticked here.
 */
export function ActionPlanChart({ result }: { result: CalculationResult }) {
  const candidates = useMemo(() => result.ecmResult?.breakdown ?? [], [result.ecmResult]);
  const top3Ids = useMemo(() => new Set(result.topEcmRecommendations.map((r) => r.ecmId)), [result.topEcmRecommendations]);
  const rankByEcmId = useMemo(() => new Map(result.topEcmRecommendations.map((r) => [r.ecmId, r.rank])), [result.topEcmRecommendations]);
  // Sorted the same way the In-depth tab's breakdown table pins the Top 3 first: reusing this
  // shared helper (rather than re-sorting candidates by their own paybackYearsMid here) keeps the
  // checklist's order in agreement with which items are actually badged "recommended" — a
  // standalone re-sort could otherwise put an unbadged measure ahead of a badged one when two
  // measures are near-tied, since it's a different code path from the official ranking.
  const sortedCandidates = useMemo(
    () => sortEcmBreakdownForDisplay(candidates, result.topEcmRecommendations),
    [candidates, result.topEcmRecommendations]
  );
  // Identifies "which sector/candidate set is this" so a change (e.g. a different sector) resets
  // the ticks to that set's own Top 3, rather than carrying over stale hand-picked ids.
  const candidateKey = useMemo(() => candidates.map((c) => c.ecmId).sort().join("|"), [candidates]);

  const [selected, setSelected] = useState<Set<string>>(() => new Set(top3Ids));
  const [trackedKey, setTrackedKey] = useState(candidateKey);
  if (candidateKey !== trackedKey) {
    // Derived-state reset during render (React-sanctioned pattern): the candidate set changed, so
    // re-seed the ticks to its Top 3 before this render is shown, instead of an effect firing a
    // frame later. Deliberately NOT `override ?? top3Ids` with a null sentinel — an explicitly
    // emptied Set is truthy, so that pattern silently stuck at "0 ticked" once the user cleared
    // every box, which is exactly the bug this replaces.
    setTrackedKey(candidateKey);
    setSelected(new Set(top3Ids));
  }

  const toggle = (ecmId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(ecmId)) next.delete(ecmId);
      else next.add(ecmId);
      return next;
    });
  };

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
  // ticked — otherwise unticking a measure shrinks "auto"'s own ceiling along with the line, so the
  // line can end up looking just as tall (or taller) after you removed something, which is exactly
  // backwards. A stable ceiling means the line's height only ever moves because the ticked total did.
  const maxPossibleAnnualSgd = baselineAnnualSgd + candidates.reduce((sum, c) => sum + c.dollarSavedPerYearMid, 0);

  // Both lines are genuinely $0 for all 10 years — there's nothing to implement or already
  // implemented to plot. This only happens when the sector has no catalog ECM data at all (e.g.
  // "Other"), since a fully-implemented sector still credits a nonzero baseline. A numeric axis
  // has no meaningful range to show here — a `Math.max(1, ...)` floor to keep the axis technically
  // valid just produced ticks that all rounded to "0k", which read as broken rather than empty.
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
        whatever further measures you tick below — a simplified estimate for exploring options. The numbers elsewhere on this page use
        the full recommended set and aren&apos;t affected by what you tick here.
      </p>

      <div className="mt-2 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="year" fontSize={12} />
            {/* Both ends of the domain are fixed, not Recharts' default auto-zoomed range. A floor of 0
                keeps the line's steepness meaningful relative to the actual dollar amount instead of
                whatever narrow band the current data spans. A ceiling fixed to the full candidate set
                (see yDomainMax above) keeps that meaning stable as you tick/untick measures — an
                "auto" ceiling would otherwise shrink along with the line when you untick something,
                so the line could look just as tall right after you made it smaller. */}
            <YAxis fontSize={12} domain={[0, yDomainMax]} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
            <Tooltip formatter={(v) => formatSgd(Number(v))} />
            <Legend />
            {/* Red is drawn thicker and first (bottom layer) so that when it exactly equals blue —
                nothing further ticked — its edges still peek out from under the thinner blue line on
                top, instead of being fully hidden. Once the lines diverge (something's ticked), they
                separate into two ordinary, fully visible lines. */}
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
                  onChange={() => toggle(c.ecmId)}
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
