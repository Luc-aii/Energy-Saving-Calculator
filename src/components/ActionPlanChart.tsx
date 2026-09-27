"use client";

import { useMemo, useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { CalculationResult } from "@/lib/types/results";
import { formatSgd } from "@/lib/format";

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
            {/* domain starts at 0, not Recharts' default auto-zoomed range — without this, the axis
                anchors to whatever narrow band the current data happens to span, so the line's
                visual steepness stops meaning anything relative to the actual dollar amount (a
                S$5k swing and a S$500k swing can end up looking equally dramatic). */}
            <YAxis fontSize={12} domain={[0, "auto"]} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
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
            {candidates
              .slice()
              .sort((a, b) => (a.paybackYearsMid ?? Infinity) - (b.paybackYearsMid ?? Infinity))
              .map((c) => (
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
                      Recommended
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
