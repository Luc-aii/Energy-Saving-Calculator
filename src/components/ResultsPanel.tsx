"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CalculationResult, ScenarioSummary } from "@/lib/types/results";
import { formatSgd, formatTonnes } from "@/lib/format";
import { buildResultContext } from "@/lib/ai/resultContext";
import { CalibrationCurveChart } from "./CalibrationCurve";
import { EnergyEndUseChart } from "./EnergyEndUseChart";
import { SectorSpotlight } from "./SectorSpotlight";
import { getTopEndUse } from "@/lib/calc/ecm";
import { KpiDashboard } from "./KpiDashboard";
import { CtaPanel } from "./CtaPanel";
import { AiSummaryCard } from "./AiSummaryCard";
import { ResultsHero } from "./ResultsHero";

const CONFIDENCE_DOTS: Record<string, string> = {
  High: "●●●●●",
  Medium: "●●●○○",
  Low: "●●○○○",
};

export function ResultsPanel({
  companyName,
  sector,
  mode,
  result,
  scenarioComparison,
}: {
  companyName: string;
  sector: string;
  mode: "SME" | "MNC";
  result: CalculationResult;
  scenarioComparison: ScenarioSummary[];
}) {
  const isLiable = result.compliance.some((c) => c.id === "carbon-tax-liable");
  const aiContext = buildResultContext(companyName, mode, sector, result);
  const [activeTab, setActiveTab] = useState<"general" | "indepth">("general");
  // Forced true for the duration of a PDF capture (see CtaPanel's onBeforePdf/onAfterPdf) so the
  // exported document always contains both tabs, not just whichever one happened to be open on screen.
  const [printMode, setPrintMode] = useState(false);
  const showGeneral = printMode || activeTab === "general";
  const showIndepth = printMode || activeTab === "indepth";

  // Expand every ECM "how this works" disclosure for the duration of a PDF capture, so the exported
  // document contains the full mechanism/math, not just whichever rows the viewer happened to expand.
  useEffect(() => {
    if (!printMode) return;
    document.querySelectorAll<HTMLDetailsElement>(".ecm-detail").forEach((d) => (d.open = true));
  }, [printMode]);

  const chartData = result.yearRows.map((r) => ({
    year: `Y${r.year}`,
    "Act now (cumulative saving)": Math.round(r.cumulativeSavingSgd),
    "Do nothing (carbon tax paid)": Math.round(
      result.yearRows.slice(0, r.year).reduce((sum, row) => sum + row.doNothingCarbonTaxSgd, 0)
    ),
  }));

  const stackedData = result.yearRows.map((r) => ({
    year: `Y${r.year} (${r.calendarYear})`,
    "Energy saving": Math.round(r.energySavingSgd),
    "Carbon tax saving": Math.round(r.carbonTaxSavingSgd),
  }));

  const carbonPriceData = result.yearRows
    .filter((r, i) => i === 0 || r.carbonTaxRateUsed !== result.yearRows[i - 1].carbonTaxRateUsed || i === result.yearRows.length - 1)
    .map((r) => ({ year: `${r.calendarYear}`, "S$/tCO2e": r.carbonTaxRateUsed }));

  return (
    <div className="flex flex-col gap-4">
      {result.staleness.length > 0 && (
        <div className="no-print rounded-2xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
          <p className="font-semibold">⚠ Some data may be outdated</p>
          <ul className="mt-1 list-disc pl-4">
            {result.staleness.map((s) => (
              <li key={s.dataset}>
                {s.dataset} last updated {s.lastUpdated} ({s.monthsSinceUpdate} months ago) — review threshold is {s.thresholdMonths} months.
              </li>
            ))}
          </ul>
        </div>
      )}

      <div id="printable-report" className="flex flex-col gap-4">
      <div className="no-print flex gap-1 self-start rounded-full border border-border bg-card p-1 text-sm">
        <button
          onClick={() => setActiveTab("general")}
          className={`rounded-full px-3.5 py-1.5 font-medium transition ${activeTab === "general" ? "bg-brand-500 text-white" : "text-ink-soft hover:bg-brand-50"}`}
        >
          General
        </button>
        <button
          onClick={() => setActiveTab("indepth")}
          className={`rounded-full px-3.5 py-1.5 font-medium transition ${activeTab === "indepth" ? "bg-brand-500 text-white" : "text-ink-soft hover:bg-brand-50"}`}
        >
          In-depth
        </button>
      </div>

      {showGeneral && <ResultsHero companyName={companyName} result={result} />}

      {showIndepth && (
      <>
      {/*
        Ordered most → least important to a decision-maker reading past the hero: the action plan
        and its money math first, then the emissions/energy context that explains *why*, then
        supporting charts and methodology, then compliance/notes/assumptions last. Sections gate on
        having real data so an empty/irrelevant block never takes up space.
      */}

      {/* ECM breakdown — every further-opportunity measure, not just the Top 3 highlighted above. Each row expands
          into how that specific measure works and the exact math behind its kWh figure, not just the end number.
          Top-3 recommended measures are pulled to the front and badged so it's obvious which of these rows are
          the ones featured in the hero, rather than making the reader cross-reference the two lists themselves. */}
      {result.ecmResult && (() => {
        const top3Rank = new Map(result.topEcmRecommendations.map((t, i) => [t.ecmId, i + 1]));
        const sorted = result.ecmResult.breakdown.slice().sort((a, b) => (top3Rank.get(a.ecmId) ?? 99) - (top3Rank.get(b.ecmId) ?? 99));
        const implementedCount = result.alreadyImplementedEcm?.ids.length ?? 0;
        return (
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm shadow-brand-700/5">
            <h3 className="mb-1 text-sm font-bold text-ink">
              How we got to {(result.ecmResult.ratePctMid * 100).toFixed(0)}%
            </h3>
            <p className="mb-1 text-xs text-ink-soft">
              Bottom-up from your sector&apos;s Energy Conservation Measures — range {(result.ecmResult.ratePctLow * 100).toFixed(0)}–{(result.ecmResult.ratePctHigh * 100).toFixed(0)}%, replacing the sector calibration curve. Click a measure for the mechanism and the exact calculation behind its number.
            </p>
            <p className="mb-3 text-xs text-ink-soft">
              {implementedCount > 0
                ? `Excludes the ${implementedCount} measure(s) you told us you already have or are rolling out — those are credited separately in "You're already saving" above, not counted as further opportunity here.`
                : "You haven't told us you have any of these measures yet, so every catalog measure for your sector appears below as further opportunity."}
              {" "}The first {result.topEcmRecommendations.length} are the same Top {result.topEcmRecommendations.length} highlighted above; the rest are the remaining sector-relevant measures.
            </p>
            <div className="flex flex-col gap-2">
              {sorted.map((b) => {
                const rank = top3Rank.get(b.ecmId);
                return (
                  <details
                    key={b.ecmId}
                    className={`ecm-detail group rounded-lg border p-3 open:bg-brand-50/30 ${rank ? "border-brand-300 bg-brand-50/20" : "border-border"}`}
                  >
                    <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="flex items-center gap-2">
                        {rank && (
                          <span className="rounded-full bg-brand-500 px-2 py-0.5 text-[10px] font-bold text-white">#{rank} recommended</span>
                        )}
                        <span className="font-medium text-ink">{b.label}</span>
                      </span>
                      <span className="flex items-center gap-2 text-ink-soft">
                        <span className="rounded-full border border-border bg-white px-2 py-0.5 text-[10px] font-medium">{b.effortTier} effort</span>
                        <span className="rounded-full border border-border bg-white px-2 py-0.5 text-[10px] font-medium">
                          {b.certainty === "variable" ? "varies by site" : "well-documented"}
                        </span>
                        <span>{(b.contributionToRatePctMid * 100).toFixed(1)} pts</span>
                        <span className="font-semibold text-ink">{Math.round(b.kwhSavedMid).toLocaleString("en-SG")} kWh/yr</span>
                        <span className="text-ink-soft transition group-open:rotate-180">▾</span>
                      </span>
                    </summary>
                    <div className="mt-2 border-t border-border pt-2 text-xs text-ink-soft">
                      <p className="italic">{b.evidence}</p>
                      <p className="mt-2 font-mono text-[11px] leading-relaxed text-ink">
                        {b.endUseLabel} is {b.endUseSharePct.toFixed(0)}% of your electricity ≈ {Math.round(b.endUseKwh).toLocaleString("en-SG")} kWh/yr
                        <br />
                        × this measure&apos;s {(b.savingRangeLow * 100).toFixed(0)}–{(b.savingRangeHigh * 100).toFixed(0)}% saving on {b.endUseLabel.toLowerCase()} energy (mid {(((b.savingRangeLow + b.savingRangeHigh) / 2) * 100).toFixed(0)}%)
                        <br />
                        = <strong>{Math.round(b.kwhSavedMid).toLocaleString("en-SG")} kWh/yr saved</strong>, ≈{(b.contributionToRatePctMid * 100).toFixed(1)} points of your overall electricity
                      </p>
                    </div>
                  </details>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Year-by-year table */}
      <div className="overflow-x-auto rounded-2xl border border-border bg-card p-4 shadow-sm shadow-brand-700/5">
        <h3 className="mb-2 text-sm font-bold text-ink">Annual benefit illustration</h3>
        <table className="w-full min-w-[640px] text-left text-xs">
          <thead>
            <tr className="border-b border-border text-ink-soft">
              <th className="py-1 pr-2">Year</th>
              <th className="py-1 pr-2">Energy saving</th>
              <th className="py-1 pr-2">Carbon tax saving</th>
              <th className="py-1 pr-2">Rate used</th>
              <th className="py-1 pr-2">Total</th>
              <th className="py-1 pr-2">Cumulative</th>
              <th className="py-1 pr-2">CO₂e avoided</th>
            </tr>
          </thead>
          <tbody>
            {result.yearRows.map((r) => (
              <tr key={r.year} className="border-b border-border">
                <td className="py-1 pr-2 font-medium">{r.calendarYear}</td>
                <td className="py-1 pr-2">{formatSgd(r.energySavingSgd)}</td>
                <td className="py-1 pr-2">{formatSgd(r.carbonTaxSavingSgd)}</td>
                <td className="py-1 pr-2">S${r.carbonTaxRateUsed.toFixed(0)}/t</td>
                <td className="py-1 pr-2 font-medium">{formatSgd(r.totalSavingSgd)}</td>
                <td className="py-1 pr-2">{formatSgd(r.cumulativeSavingSgd)}</td>
                <td className="py-1 pr-2">{Math.round(r.carbonAvoidedTCo2e)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-ink-soft">
          Net investment: {formatSgd(result.netInvestmentSgd)} (excludes any EEG grant — see Notes below, eligibility is case-by-case)
        </p>
        {result.suggestedInvestment && (
          <p className="mt-1 text-xs text-ink-soft">
            Rough order-of-magnitude for your selected ECMs: {formatSgd(result.suggestedInvestment.lowSgd)}–{formatSgd(result.suggestedInvestment.highSgd)} — not a quote, just a sanity check on the typed figure above (see Notes below if these are far apart).
          </p>
        )}
        {!isLiable && (
          <p className="mt-1 text-xs text-ink-soft">
            &quot;Carbon tax saving&quot; is S$0 throughout: your facility isn&apos;t a direct NEA/IRAS taxpayer, so that cost is already folded into the energy saving above rather than counted twice.
          </p>
        )}
      </div>

      {/* Chart */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm shadow-brand-700/5">
        <h3 className="text-sm font-bold text-ink">Act now vs. do nothing</h3>
        {!isLiable && (
          <p className="mt-1 text-xs text-ink-soft">
            The red line is flat at S$0 because your facility isn&apos;t a direct carbon taxpayer — see &quot;Regulatory exposure check&quot; below.
          </p>
        )}
        <div className="mt-2 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="year" fontSize={12} />
              <YAxis fontSize={12} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
              <Tooltip formatter={(v) => formatSgd(Number(v))} />
              <Legend />
              <Line type="monotone" dataKey="Act now (cumulative saving)" stroke="#059669" strokeWidth={2} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="Do nothing (carbon tax paid)" stroke="#dc2626" strokeWidth={2} dot={false} strokeDasharray="4 4" isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Conservative / Base / Optimistic comparison */}
      {scenarioComparison.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card p-4 shadow-sm shadow-brand-700/5">
          <h3 className="mb-2 text-sm font-bold text-ink">Conservative / base / optimistic</h3>
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border text-ink-soft">
                <th className="py-1 pr-2"></th>
                {scenarioComparison.map((s) => (
                  <th key={s.scenario} className="py-1 pr-2 capitalize">
                    {s.scenario}
                    {s.scenario === "base" && " (selected)"}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border">
                <td className="py-1 pr-2 text-ink-soft">Energy saving rate</td>
                {scenarioComparison.map((s) => (
                  <td key={s.scenario} className="py-1 pr-2 font-medium">{(s.savingsRateUsed * 100).toFixed(0)}%</td>
                ))}
              </tr>
              <tr className="border-b border-border">
                <td className="py-1 pr-2 text-ink-soft">Year 1 total</td>
                {scenarioComparison.map((s) => (
                  <td key={s.scenario} className="py-1 pr-2 font-medium">{formatSgd(s.year1TotalSgd)}</td>
                ))}
              </tr>
              <tr className="border-b border-border">
                <td className="py-1 pr-2 text-ink-soft">10-year total</td>
                {scenarioComparison.map((s) => (
                  <td key={s.scenario} className="py-1 pr-2 font-medium">{formatSgd(s.tenYearCumulativeSgd)}</td>
                ))}
              </tr>
              <tr>
                <td className="py-1 pr-2 text-ink-soft">Payback</td>
                {scenarioComparison.map((s) => (
                  <td key={s.scenario} className="py-1 pr-2 font-medium">{s.paybackYears ? `${s.paybackYears.toFixed(1)} yrs` : "—"}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Products */}
      {result.products.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm shadow-brand-700/5">
          <h3 className="mb-2 text-sm font-bold text-ink">Recommended Schneider solution package</h3>
          <div className="flex flex-col gap-3">
            {result.products.map((p) => (
              <div key={p.id} className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-ink">{p.name}</span>
                  <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] uppercase tracking-wide text-brand-600">
                    {p.role}
                  </span>
                </div>
                <p className="mt-1 text-xs text-ink-soft">{p.covers}</p>
                {p.savingRange && (
                  <p className="mt-1 text-xs text-ink-soft">
                    Typical saving: {(p.savingRange.low * 100).toFixed(0)}–{(p.savingRange.high * 100).toFixed(0)}%
                  </p>
                )}
                <p className="mt-1 text-xs italic text-ink-soft">{p.evidence}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Baseline emissions */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm shadow-brand-700/5">
        <h3 className="text-sm font-bold text-ink">Your current footprint</h3>
        <div className="mt-2 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <MiniStat label="Scope 1" value={formatTonnes(result.baselineScope1TCo2e)} />
          <MiniStat label="Scope 2" value={formatTonnes(result.baselineScope2TCo2e)} />
          <MiniStat label="Total Scope 1+2" value={formatTonnes(result.totalScope12TCo2e)} />
          <MiniStat label="Scope 3 (context only)" value={formatTonnes(result.baselineScope3TCo2e)} />
        </div>
        {result.totalScope12TCo2e > 0 && (
          <p className="mt-3 rounded-lg bg-brand-50 p-2.5 text-xs text-brand-700">
            Of that, the measures below could avoid <strong>{formatTonnes(result.monthlyCo2eAvoidedTonnesMid * 12)}/year</strong> — about{" "}
            <strong>{Math.round((result.monthlyCo2eAvoidedTonnesMid * 12 * 100) / result.totalScope12TCo2e)}%</strong> of what you have today.
          </p>
        )}
        <p className="mt-3 text-xs text-ink-soft">{result.sectorPositionLabel} — assumed energy saving rate {(result.energySavingRatePct * 100).toFixed(0)}%</p>
        <div className="mt-3">
          <CalibrationCurveChart curve={result.calibration} />
        </div>
        {(result.emissionsBreakdown.scope1BySource.length > 0 || result.emissionsBreakdown.scope3ByCategory.length > 0) && (
          <div className="mt-4 grid grid-cols-1 gap-4 border-t border-border pt-3 sm:grid-cols-2">
            {result.emissionsBreakdown.scope1BySource.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-ink">Scope 1 — by source</p>
                <EmissionsBreakdownBars items={result.emissionsBreakdown.scope1BySource} total={result.baselineScope1TCo2e} />
              </div>
            )}
            {result.emissionsBreakdown.scope3ByCategory.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-ink">Scope 3 — by category</p>
                <EmissionsBreakdownBars items={result.emissionsBreakdown.scope3ByCategory} total={result.baselineScope3TCo2e} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Energy end-use breakdown */}
      {result.energyEndUseBreakdown.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm shadow-brand-700/5">
          <h3 className="text-sm font-bold text-ink">Where your energy goes</h3>
          <p className="mb-2 mt-0.5 text-xs text-ink-soft">Sector-typical split (indicative, international benchmark) — drives which Energy Conservation Measures are recommended.</p>
          <SectorSpotlight sector={sector} topEndUse={getTopEndUse(result.energyEndUseBreakdown)} />
          <EnergyEndUseChart items={result.energyEndUseBreakdown} />
        </div>
      )}

      {/* Target comparison */}
      {result.targetComparison && (
        <div className={`rounded-2xl border p-4 ${result.targetComparison.onTrack ? "border-brand-100 bg-brand-50" : "border-red-200 bg-red-50"}`}>
          <h3 className="text-sm font-bold text-ink">
            {result.targetComparison.onTrack ? "✅ On track for your target" : "⚠ Behind your target"}
          </h3>
          <p className="mt-1 text-xs text-ink-soft">
            Target: {result.targetComparison.targetPct}% reduction by {result.targetComparison.targetYear} → requires avoiding{" "}
            {formatTonnes(result.targetComparison.requiredAnnualAvoidedTCo2e)}/year. At this trajectory you avoid{" "}
            {formatTonnes(result.targetComparison.projectedAnnualAvoidedTCo2e)}/year by then.
          </p>
        </div>
      )}

      {/* Clean vs. dirty energy spend */}
      {(result.energyCostBreakdown.cleanKwh > 0 || result.energyCostBreakdown.scope2LocationBasedTCo2e !== result.energyCostBreakdown.scope2MarketBasedTCo2e) && (
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm shadow-brand-700/5">
          <h3 className="text-sm font-bold text-ink">Clean vs. dirty energy spend</h3>
          <p className="mb-2 mt-0.5 text-xs text-ink-soft">
            Market-based accounting: your REC/PPA/green-tariff-covered share is priced at a premium and treated as zero-emission; the physical grid mix (location-based) is shown alongside for context.
          </p>
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <MiniStat label="Dirty energy payment" value={formatSgd(result.energyCostBreakdown.dirtyPaymentSgd)} />
            <MiniStat label="Clean energy payment" value={formatSgd(result.energyCostBreakdown.cleanPaymentSgd)} />
            <MiniStat label="Green premium paid" value={formatSgd(result.energyCostBreakdown.greenPremiumPaidSgd)} />
            <MiniStat label="Renewable share" value={`${((result.energyCostBreakdown.cleanKwh / Math.max(result.energyCostBreakdown.cleanKwh + result.energyCostBreakdown.dirtyKwh, 1)) * 100).toFixed(0)}%`} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <MiniStat label="Scope 2 — market-based (used in $ savings)" value={formatTonnes(result.energyCostBreakdown.scope2MarketBasedTCo2e)} />
            <MiniStat label="Scope 2 — location-based (physical grid mix)" value={formatTonnes(result.energyCostBreakdown.scope2LocationBasedTCo2e)} />
          </div>
        </div>
      )}

      {/* KPI dashboard */}
      {result.kpis.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm shadow-brand-700/5">
          <h3 className="text-sm font-bold text-ink">Energy intensity KPI dashboard</h3>
          <p className="mb-3 text-xs text-ink-soft">Hover a card for what it means and how to improve it. Only energy/carbon intensity have a sourced sector benchmark bar.</p>
          <KpiDashboard kpis={result.kpis} />
        </div>
      )}

      {/* Chart: what's driving your savings */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm shadow-brand-700/5">
        <h3 className="text-sm font-bold text-ink">What&apos;s driving your savings</h3>
        <div className="mt-2 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stackedData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="year" fontSize={11} />
              <YAxis fontSize={12} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
              <Tooltip formatter={(v) => formatSgd(Number(v))} />
              <Legend />
              <Bar dataKey="Energy saving" stackId="a" fill="#059669" isAnimationActive={false} />
              <Bar dataKey="Carbon tax saving" stackId="a" fill="#0891b2" isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart: carbon price trajectory */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm shadow-brand-700/5">
        <h3 className="text-sm font-bold text-ink">Singapore&apos;s carbon price trajectory</h3>
        <p className="mt-1 text-xs text-ink-soft">
          {isLiable
            ? "This is the national rate your direct carbon tax bill is calculated against — it more than doubles by 2026 and keeps climbing toward 2030."
            : "This is national policy context, not your bill: your facility isn't a direct taxpayer, but this rate is part of what electricity generators pass through into the tariff you pay."}
        </p>
        <div className="mt-2 h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={carbonPriceData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="year" fontSize={12} />
              <YAxis fontSize={12} tickFormatter={(v) => `S$${v}`} />
              <Tooltip formatter={(v) => `S$${v}/tCO2e`} />
              <Bar dataKey="S$/tCO2e" fill="#dc2626" isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Stated assumptions */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm shadow-brand-700/5">
        <h3 className="mb-2 text-sm font-bold text-ink">Illustration basis & assumptions</h3>
        <table className="w-full text-left text-xs">
          <tbody>
            {result.assumptions.map((a) => (
              <tr key={a.label} className="border-b border-border last:border-0">
                <td className="py-1 pr-3 text-ink-soft">{a.label}</td>
                <td className="py-1 pr-3 font-medium text-ink">{a.value}</td>
                <td className="py-1 text-ink-soft">{a.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-[10px] text-ink-soft">Data version {result.dataVersion}</p>
      </div>

      {/* Confidence */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <h3 className="text-sm font-bold text-ink">
          Confidence rating: {CONFIDENCE_DOTS[result.confidence.level]} {result.confidence.level}
        </h3>
        <p className="mt-1 text-xs font-medium text-ink">
          In short: how solid your input data is (metered → spend-based → floor-area-estimated), not how big your savings are — it sets how wide the ± range is on every $ and tCO2e figure above.
        </p>
        <p className="mt-2 text-xs text-ink-soft">
          This grades how reliable the numbers above are, based on the <em>kind</em> of data you gave us — not how big or small your
          footprint is. A metered electricity bill is more trustworthy than a spend-based estimate, so every saving and every
          tonne figure on this page is shown as a range: ± {Math.round(result.confidence.rangeWidthPct * 100)}% around the
          central estimate at this rating. Concretely, the S$
          {result.confidence.year1Range.low.toLocaleString("en-SG", { maximumFractionDigits: 0 })}–S$
          {result.confidence.year1Range.high.toLocaleString("en-SG", { maximumFractionDigits: 0 })} Year-1 saving shown at the top
          of this page comes directly from that range. It automatically gets narrower (High → tighter range) as you replace
          estimates with real meter readings, invoices, or activity data — it isn&apos;t something you set directly.
        </p>
        <p className="mt-2 text-xs font-semibold text-ink">Why this rating specifically:</p>
        <ul className="mt-1 list-disc pl-5 text-xs text-ink-soft">
          {result.confidence.reasons.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-ink-soft">
          This illustration is indicative only. Actual savings depend on site conditions and energy prices.
        </p>
      </div>

      {/* Compliance */}
      {result.compliance.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm shadow-brand-700/5">
          <h3 className="mb-2 text-sm font-bold text-ink">Regulatory exposure check</h3>
          <div className="flex flex-col gap-2">
            {result.compliance.map((c) => (
              <div key={c.id} className="flex gap-2 text-xs">
                <span>{c.severity === "red" ? "🔴" : c.severity === "yellow" ? "🟡" : "🟢"}</span>
                <div>
                  <p className="font-medium text-ink">{c.title}</p>
                  <p className="text-ink-soft">{c.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warnings */}
      {result.warnings.length > 0 && (
        <div className="rounded-2xl border border-border bg-brand-50/50 p-4 text-xs text-ink-soft">
          <h3 className="mb-1 text-sm font-bold text-ink">Notes & assumptions</h3>
          <ul className="list-disc pl-5">
            {result.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Summary reads best as a closing wrap-up, especially in the exported PDF — kept last, not competing with the figures above for attention. */}
      <AiSummaryCard context={aiContext} fallbackNarrative={result.narrative} />
      </>
      )}
      </div>

      <CtaPanel companyName={companyName} onBeforePdf={() => setPrintMode(true)} onAfterPdf={() => setPrintMode(false)} />
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-brand-50 p-2">
      <p className="text-[10px] uppercase tracking-wide text-ink-soft">{label}</p>
      <p className="text-sm font-bold text-ink">{value}</p>
    </div>
  );
}

/** Per-source Scope 1 / per-category Scope 3 breakdown — totals alone didn't show a user *where* their emissions come from (usability finding M6). */
function EmissionsBreakdownBars({ items, total }: { items: { id: string; label: string; tCo2e: number }[]; total: number }) {
  return (
    <div className="mt-1.5 flex flex-col gap-1.5">
      {items.map((item) => {
        const pct = total > 0 ? (item.tCo2e / total) * 100 : 0;
        return (
          <div key={item.id} className="flex items-center gap-2 text-[11px]">
            <span className="w-28 shrink-0 truncate text-ink-soft" title={item.label}>
              {item.label}
            </span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink/5">
              <div className="h-1.5 rounded-full bg-brand-400" style={{ width: `${Math.min(Math.max(pct, 0), 100)}%` }} />
            </div>
            <span className="w-16 shrink-0 text-right font-medium text-ink">{formatTonnes(item.tCo2e)}</span>
          </div>
        );
      })}
    </div>
  );
}
