"use client";

import { useMemo, useState, useCallback } from "react";
import type { CalculationResult } from "@/lib/types/results";
import { formatSgd, formatSgdRange, formatTonnes } from "@/lib/format";
import { whoImplementsEcm, whenToDoEcm, productForEcm } from "@/lib/ecmGuidance";
import { ActionPlanChart, getActionPlanDefaults } from "./ActionPlanChart";
import grantsData from "@data/grants.json";

const CONFIDENCE_DOTS: Record<string, string> = {
  High: "●●●●●",
  Medium: "●●●○○",
  Low: "●●○○○",
};

/**
 * Ordered to match the pitch flow a decision-maker actually wants, fastest first: (1) one
 * headline card with the saving range, payback and confidence rating — "is this worth my time",
 * (2) the Top 3 ECMs to actually buy plus the Schneider product that delivers each — "what do I
 * buy", (3) the cost-of-inaction chart — the urgency argument. The full per-measure % breakdown,
 * benchmark position, carbon picture, methodology and assumptions live in the In-depth tab below —
 * a first-time user doesn't need a 10-measure grouped breakdown before they've even seen the Top 3.
 *
 * The ECM tick-selection state lives here (not inside ActionPlanChart) so that headline figures,
 * the banner, and the chart all stay in sync with whichever measures the user is considering.
 */
export function ResultsHero({
  companyName,
  result,
  mode,
}: {
  companyName: string;
  result: CalculationResult;
  /** EEG Base (the grant nudged in the Top 3 card below) is SME-only per grants.json eligibility — omitted for MNC. */
  mode?: "SME" | "MNC";
}) {
  const [activeIdx, setActiveIdx] = useState(0);
  const top3 = result.topEcmRecommendations;
  // Dense-ranked: a tie on payback means two measures can both carry rank 3, so this can hold more
  // than 3 items. topRankCount is the true "Top N" to show in copy — array length isn't, once tied.
  const topRankCount = top3.reduce((max, t) => Math.max(max, t.rank), 0);
  const active = top3[Math.min(activeIdx, Math.max(top3.length - 1, 0))];
  const activeProduct = active ? productForEcm(active.ecmId) : null;
  const eeg = grantsData.grants.find((g) => g.id === "eeg-base");
  const finalYearRow = result.yearRows[result.yearRows.length - 1];

  // ---- Lifted ECM selection state (shared with ActionPlanChart and the banner) ----
  const { candidates, top3Ids } = useMemo(() => getActionPlanDefaults(result), [result]);
  // Identifies "which sector/candidate set is this" so a change resets ticks to that set's own Top 3.
  const candidateKey = useMemo(() => candidates.map((c) => c.ecmId).sort().join("|"), [candidates]);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(top3Ids));
  const [trackedKey, setTrackedKey] = useState(candidateKey);
  if (candidateKey !== trackedKey) {
    // Derived-state reset during render (React-sanctioned pattern): the candidate set changed, so
    // re-seed the ticks to its Top 3 before this render is shown.
    setTrackedKey(candidateKey);
    setSelected(new Set(top3Ids));
  }

  /** Toggle a single ECM — used as the onToggle callback for ActionPlanChart. */
  const handleToggle = useCallback((ecmId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(ecmId)) next.delete(ecmId);
      else next.add(ecmId);
      return next;
    });
  }, []);

  // ---- Ticked-ECM-derived figures ----
  // The full-set annual saving is the sum of every candidate's dollarSavedPerYearMid; the ticked
  // subset's total gives us a fraction that scales the engine's headline figures proportionally.
  // This keeps confidence ranges, tariff escalation, and all other engine math intact — we just
  // narrow or widen the figures by the share of measures being considered.
  const fullSetAnnualSgd = useMemo(
    () => candidates.reduce((sum, c) => sum + c.dollarSavedPerYearMid, 0),
    [candidates]
  );
  const tickedAnnualSgd = useMemo(
    () => candidates.filter((c) => selected.has(c.ecmId)).reduce((sum, c) => sum + c.dollarSavedPerYearMid, 0),
    [candidates, selected]
  );
  // Fraction of the full ECM set that's currently ticked (1.0 = all ticked, 0.0 = nothing ticked).
  const tickedFraction = fullSetAnnualSgd > 0 ? tickedAnnualSgd / fullSetAnnualSgd : 1;

  // Scale the engine's headline figures by the ticked fraction.
  const scaledYear1Low = result.confidence.year1Range.low * tickedFraction;
  const scaledYear1High = result.confidence.year1Range.high * tickedFraction;
  const scaledMonthlyLow = result.monthlySavingSgdRange.low * tickedFraction;
  const scaledMonthlyHigh = result.monthlySavingSgdRange.high * tickedFraction;
  const scaled10YearLow = result.confidence.tenYearRange.low * tickedFraction;
  const scaled10YearHigh = result.confidence.tenYearRange.high * tickedFraction;
  const scaledMonthlySavingMid = result.monthlySavingSgdMid * tickedFraction;
  const scaledMonthlyCo2e = result.monthlyCo2eAvoidedTonnesMid * tickedFraction;

  return (
    <div className="flex flex-col gap-4">
      {/* 1. Headline card — the answer to "is this worth my time" comes first. */}
      <div className="rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50 to-white p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">{companyName}</p>
        <h2 className="mt-1 text-xl font-bold text-ink">Save money. Lower cost. Improve efficiency.</h2>
        <p className="mt-1 text-sm text-ink-soft">
          What&apos;s possible for your Scope 1 + 2 footprint, based on your own numbers — not a generic percentage.
          Figures below reflect your ticked measures and include projected tariff escalation and carbon tax savings. Tick or untick measures in the chart below to see how they affect these numbers.
        </p>

        {result.criticalWarnings.length > 0 && (
          <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
            <ul className="list-disc pl-4">
              {result.criticalWarnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">What you have today</p>
            <p className="mt-2 text-2xl font-bold text-ink">
              {formatTonnes(result.totalScope12TCo2e)}
              <span className="text-sm font-medium text-ink-soft">/year</span>
            </p>
            <p className="text-xs text-ink-soft">Scope 1+2 emissions</p>
            <p className="mt-3 text-lg font-bold text-ink">
              {formatSgd(result.monthlyCurrentEnergyCostSgd * 12)}
              <span className="text-sm font-medium text-ink-soft">/year</span>
            </p>
            <p className="text-xs text-ink-soft">energy + carbon tax cost, at today&apos;s rates</p>
          </div>
          <div className="rounded-xl border border-brand-200 bg-brand-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">What you could save</p>
            <p className="mt-2 text-2xl font-bold text-ink">
              {formatTonnes(scaledMonthlyCo2e * 12)}
              <span className="text-sm font-medium text-ink-soft">/year</span>
            </p>
            <p className="text-xs text-ink-soft">
              CO2e avoided
              {result.totalScope12TCo2e > 0 &&
                ` — about ${Math.round((scaledMonthlyCo2e * 12 * 100) / result.totalScope12TCo2e)}% of what you have today`}
            </p>
            <p className="mt-3 text-lg font-bold text-ink">
              {formatSgdRange(scaledYear1Low, scaledYear1High)}
            </p>
            <p className="text-xs text-ink-soft">energy cost saved in year 1, from your ticked measures</p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <HeroStat label="Payback period" value={result.paybackYears ? `${result.paybackYears.toFixed(1)} yrs` : "Beyond 10 yrs"} big />
          <HeroStat label="Monthly $ saved" value={formatSgdRange(scaledMonthlyLow, scaledMonthlyHigh)} />
          <HeroStat label="Monthly CO2e avoided" value={formatTonnes(scaledMonthlyCo2e)} />
          <HeroStat
            label="10-year projected savings"
            value={formatSgdRange(scaled10YearLow, scaled10YearHigh)}
          />
          <HeroStat label="Confidence" value={`${CONFIDENCE_DOTS[result.confidence.level]} ${result.confidence.level}`} />
          {result.computedPue !== null && <HeroStat label="Power Usage Effectiveness (PUE)" value={result.computedPue.toFixed(2)} />}
        </div>

        {finalYearRow && (scaled10YearHigh > 0 || scaled10YearLow > 0) && (
          <p className="mt-3 rounded-lg bg-red-50 p-2.5 text-xs font-medium text-red-700">
            Put another way: doing nothing costs you {formatSgdRange(scaled10YearLow, scaled10YearHigh)} by{" "}
            {finalYearRow.calendarYear} — the same 10-year figure above, just given up instead of kept.
          </p>
        )}
      </div>

      {/* 1.5. Combined already-captured + further-available */}
      {result.alreadyImplementedEcm &&
        (() => {
          const alreadyRatePct = result.alreadyImplementedEcm.ratePctMid;
          const alreadyMonthlySgd = result.alreadyImplementedEcm.dollarSavedPerMonthMid;
          const furtherRatePct = result.ecmResult?.ratePctMid ?? 0;
          const totalRatePct = alreadyRatePct + furtherRatePct;
          const progressPct = totalRatePct > 0 ? (alreadyRatePct / totalRatePct) * 100 : 100;
          const furtherMonthlyMid = (result.monthlySavingSgdRange.low + result.monthlySavingSgdRange.high) / 2;
          return (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <h3 className="text-sm font-bold text-ink">Your full sustainability program</h3>
              <p className="mt-1 text-xs text-ink-soft">
                The {result.alreadyImplementedEcm.ids.length} measure(s) you&apos;ve already implemented, plus everything still
                recommended further — combined into one progress-to-full-potential view.
              </p>
              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white">
                <div
                  className="h-2.5 rounded-full bg-emerald-500"
                  style={{ width: `${Math.min(Math.max(progressPct, 0), 100)}%` }}
                />
              </div>
              <p className="mt-1 text-[11px] text-ink-soft">
                You&apos;ve captured about {Math.round(progressPct)}% of your full potential program so far.
              </p>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <MiniHeroStat label="Already saving" value={`${formatSgd(alreadyMonthlySgd)}/mo (${(alreadyRatePct * 100).toFixed(0)}%)`} />
                <MiniHeroStat
                  label="Further available"
                  value={`${formatSgdRange(result.monthlySavingSgdRange.low, result.monthlySavingSgdRange.high)}/mo (${(furtherRatePct * 100).toFixed(0)}%)`}
                />
                <MiniHeroStat
                  label="Full program, once complete"
                  value={`~${formatSgd(alreadyMonthlySgd + furtherMonthlyMid)}/mo (${(totalRatePct * 100).toFixed(0)}%)`}
                />
              </div>
              <p className="mt-2 text-[10px] text-ink-soft">
                &quot;Already saving&quot; is a modelled estimate against your current usage, not a measured before/after delta — see
                the note in the In-depth tab. Rates are simple sums of two independently-modelled figures (already-implemented +
                further-opportunity), so may run slightly high where a future measure shares an end-use with one you&apos;ve already
                implemented.
              </p>
            </div>
          );
        })()}

      {/* 2. Top 3 recommended ECMs — the "what do I buy" step, and the bridge into Schneider's product catalogue. */}
      {top3.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm shadow-brand-700/5">
          <h3 className="text-sm font-bold text-ink">Top {topRankCount} ways to save further</h3>
          <p className="mb-3 mt-0.5 text-xs text-ink-soft">
            Ranked by payback (cost ÷ saving) — least effort, most gain first.
            {top3.length > topRankCount && " Two measures tied on payback share the same rank."}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {top3.map((m, i) => (
              <button
                key={m.ecmId}
                onClick={() => setActiveIdx(i)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all hover:-translate-y-0.5 ${
                  i === activeIdx ? "bg-brand-500 text-white shadow-md" : "bg-brand-50 text-brand-700 hover:bg-brand-100 hover:shadow-sm"
                }`}
              >
                #{m.rank} {m.label}
              </button>
            ))}
          </div>
          {active && (
            <div className="mt-3 rounded-lg border border-brand-200 bg-brand-50/40 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-bold text-ink">{active.label}</p>
                <div className="flex gap-1.5">
                  <span className="rounded-full border border-border bg-white px-2 py-0.5 text-[10px] font-medium text-ink-soft">
                    {active.effortTier} effort
                  </span>
                  <span className="rounded-full border border-border bg-white px-2 py-0.5 text-[10px] font-medium text-ink-soft">
                    {active.certainty === "variable" ? "varies by site, not guaranteed" : "well-documented"}
                  </span>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <MiniHeroStat label="Monthly $ saved" value={formatSgd(active.dollarSavedPerMonthMid)} />
                <MiniHeroStat label="Payback" value={active.paybackYearsMid !== null ? `${active.paybackYearsMid.toFixed(1)} yrs` : "—"} />
                <MiniHeroStat label="Estimated cost" value={`${formatSgd(active.costLowSgd)}–${formatSgd(active.costHighSgd)}`} />
                <MiniHeroStat label="Monthly kWh saved" value={`${Math.round(active.kwhSavedPerMonthMid).toLocaleString("en-SG")} kWh`} />
              </div>
              <p className="mt-2 text-xs italic text-ink-soft">{active.evidence}</p>
              <p className="mt-2 text-xs text-ink-soft">
                <span className="font-semibold text-ink">How to implement: </span>
                {active.howToImplement}
              </p>
              <p className="mt-1 text-xs text-ink-soft">
                <span className="font-semibold text-ink">Who&apos;s typically involved: </span>
                {whoImplementsEcm(active.effortTier)}
              </p>
              <p className="mt-1 text-xs text-ink-soft">
                <span className="font-semibold text-ink">When to do it: </span>
                {whenToDoEcm(active.costTier, active.certainty)}
              </p>
              <p className="mt-1 text-xs text-ink-soft">
                <span className="font-semibold text-ink">Delivered via: </span>
                {activeProduct
                  ? `${activeProduct.name} — ${activeProduct.covers}`
                  : "Equipment/hardware upgrade — not a bundled Schneider digital product; pairs well with EcoStruxure Building Operation for ongoing control."}
              </p>
              {mode === "SME" && eeg && (
                <p className="mt-2 rounded-md bg-brand-100/60 p-2 text-xs text-brand-800">
                  🏛 The Singapore government will co-fund up to {((eeg.coFundRate ?? 0.7) * 100).toFixed(0)}% of this (Energy Efficiency
                  Grant, up to S${(eeg.maxAmountSgd ?? 0).toLocaleString("en-SG")}) — but only through {eeg.validUntil}. Eligibility is
                  case-by-case; not included in the figures above.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* 3. Cost of doing nothing vs. acting, over 10 years — the urgency argument, adjustable against whatever further measures the user is actually considering. */}
      <ActionPlanChart result={result} selected={selected} onToggle={handleToggle} tickedFraction={tickedFraction} />

      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Month to month, if you don&apos;t act vs. if you do</p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <span className="font-bold text-ink">{formatSgd(result.monthlyCurrentEnergyCostSgd)}/month</span>
          <span className="text-ink-soft">recurring today →</span>
          <span className="font-bold text-brand-600">
            {formatSgd(Math.max(result.monthlyCurrentEnergyCostSgd - scaledMonthlySavingMid, 0))}/month
          </span>
          <span className="text-ink-soft">after acting on your ticked measures, and it keeps rising if you don&apos;t.</span>
        </div>
      </div>
    </div>
  );
}

/** A single KPI stat in the headline grid. */
function HeroStat({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="text-[10px] uppercase tracking-wide text-ink-soft">{label}</p>
      <p className={`mt-0.5 font-bold text-ink ${big ? "text-2xl" : "text-base"}`}>{value}</p>
    </div>
  );
}

/** A compact stat used inside ECM detail cards and the sustainability-program bar. */
function MiniHeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-ink-soft">{label}</p>
      <p className="text-sm font-bold text-ink">{value}</p>
    </div>
  );
}

