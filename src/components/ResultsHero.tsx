"use client";

import { useState } from "react";
import type { CalculationResult } from "@/lib/types/results";
import { formatSgd, formatSgdRange, formatTonnes } from "@/lib/format";
import { whoImplementsEcm, whenToDoEcm } from "@/lib/ecmGuidance";

const CONFIDENCE_DOTS: Record<string, string> = {
  High: "●●●●●",
  Medium: "●●●○○",
  Low: "●●○○○",
};

/**
 * The "top 5/6" the user asked for, shown first and fast: payback, the Top 3
 * further Energy Conservation Measures (ranked by payback — least effort,
 * most gain), long-run projected savings, monthly $ and CO2e saved, and —
 * only if they told us what's already in place — what that's already worth.
 * Everything else lives in ResultsPanel below this, as secondary detail.
 */
export function ResultsHero({ companyName, result }: { companyName: string; result: CalculationResult }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const top3 = result.topEcmRecommendations;
  const active = top3[Math.min(activeIdx, Math.max(top3.length - 1, 0))];

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50 to-white p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">{companyName}</p>
        <h2 className="mt-1 text-xl font-bold text-ink">Save money. Lower cost. Improve efficiency.</h2>
        <p className="mt-1 text-sm text-ink-soft">
          What&apos;s possible for your Scope 1 + 2 footprint, based on your own numbers — not a generic percentage.
        </p>
      </div>

      {result.criticalWarnings.length > 0 && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
          <ul className="list-disc pl-4">
            {result.criticalWarnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/*
        The core pitch, first and biggest: what you're carrying today, and what's realistically
        recoverable — in both dollars and tonnes, side by side. Emissions get a % of footprint so
        the sustainability case reads as "meaningfully less," not just an abstract tonnage.
      */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">What you have today</p>
          <p className="mt-2 text-2xl font-bold text-ink">{formatTonnes(result.totalScope12TCo2e)}<span className="text-sm font-medium text-ink-soft">/year</span></p>
          <p className="text-xs text-ink-soft">Scope 1+2 emissions</p>
          <p className="mt-3 text-lg font-bold text-ink">{formatSgd(result.monthlyCurrentEnergyCostSgd * 12)}<span className="text-sm font-medium text-ink-soft">/year</span></p>
          <p className="text-xs text-ink-soft">energy + carbon tax cost, at today&apos;s rates</p>
        </div>
        <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">What you could save</p>
          <p className="mt-2 text-2xl font-bold text-ink">
            {formatTonnes(result.monthlyCo2eAvoidedTonnesMid * 12)}<span className="text-sm font-medium text-ink-soft">/year</span>
          </p>
          <p className="text-xs text-ink-soft">
            CO2e avoided
            {result.totalScope12TCo2e > 0 &&
              ` — about ${Math.round((result.monthlyCo2eAvoidedTonnesMid * 12 * 100) / result.totalScope12TCo2e)}% of what you have today`}
          </p>
          <p className="mt-3 text-lg font-bold text-ink">{formatSgdRange(result.confidence.year1Range.low, result.confidence.year1Range.high)}</p>
          <p className="text-xs text-ink-soft">energy cost saved in year 1, from the measures below</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <HeroStat label="Payback period" value={result.paybackYears ? `${result.paybackYears.toFixed(1)} yrs` : "Beyond 10 yrs"} big />
        <HeroStat label="Monthly $ saved" value={formatSgdRange(result.monthlySavingSgdRange.low, result.monthlySavingSgdRange.high)} />
        <HeroStat label="Monthly CO2e avoided" value={formatTonnes(result.monthlyCo2eAvoidedTonnesMid)} />
        <HeroStat label="10-year projected savings" value={formatSgdRange(result.confidence.tenYearRange.low, result.confidence.tenYearRange.high)} />
        <HeroStat label="Confidence" value={`${CONFIDENCE_DOTS[result.confidence.level]} ${result.confidence.level}`} />
        {result.computedPue !== null && <HeroStat label="Power Usage Effectiveness (PUE)" value={result.computedPue.toFixed(2)} />}
      </div>

      {top3.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm shadow-brand-700/5">
          <h3 className="text-sm font-bold text-ink">Top {top3.length} ways to save further</h3>
          <p className="mb-3 mt-0.5 text-xs text-ink-soft">Ranked by payback (cost ÷ saving) — least effort, most gain first.</p>
          <div className="flex flex-wrap gap-1.5">
            {top3.map((m, i) => (
              <button
                key={m.ecmId}
                onClick={() => setActiveIdx(i)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  i === activeIdx ? "bg-brand-500 text-white" : "bg-brand-50 text-brand-700 hover:bg-brand-100"
                }`}
              >
                #{i + 1} {m.label}
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
            </div>
          )}
        </div>
      )}

      {result.alreadyImplementedEcm && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <h3 className="text-sm font-bold text-ink">You&apos;re already saving</h3>
          <p className="mt-1 text-xs text-ink-soft">
            Based on the {result.alreadyImplementedEcm.ids.length} measure(s) you told us are already in place or in progress, we estimate you&apos;re
            capturing about <strong className="text-ink">{formatSgd(result.alreadyImplementedEcm.dollarSavedPerMonthMid)}/month</strong> in value
            against your current usage. This is an estimate of ongoing value, not a measured historical saving — we don&apos;t know your
            pre-implementation baseline.
          </p>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Month to month, if you don&apos;t act vs. if you do</p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <span className="font-bold text-ink">{formatSgd(result.monthlyCurrentEnergyCostSgd)}/month</span>
          <span className="text-ink-soft">recurring today →</span>
          <span className="font-bold text-brand-600">
            {formatSgd(Math.max(result.monthlyCurrentEnergyCostSgd - result.monthlySavingSgdRange.low, 0))}/month
          </span>
          <span className="text-ink-soft">after acting, and it keeps rising if you don&apos;t.</span>
        </div>
      </div>
    </div>
  );
}

function HeroStat({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="text-[10px] uppercase tracking-wide text-ink-soft">{label}</p>
      <p className={`mt-0.5 font-bold text-ink ${big ? "text-2xl" : "text-base"}`}>{value}</p>
    </div>
  );
}

function MiniHeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-ink-soft">{label}</p>
      <p className="text-sm font-bold text-ink">{value}</p>
    </div>
  );
}
