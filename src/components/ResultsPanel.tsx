"use client";

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
import { formatSgd, formatSgdRange, formatTonnes } from "@/lib/format";
import { buildResultContext } from "@/lib/ai/resultContext";
import { CalibrationCurveChart } from "./CalibrationCurve";
import { KpiDashboard } from "./KpiDashboard";
import { CtaPanel } from "./CtaPanel";
import { AiSummaryCard } from "./AiSummaryCard";

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
    Grant: Math.round(r.grantSgd),
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
      {/* Cover summary */}
      <div className="rounded-2xl border border-brand-100 bg-brand-50 p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
          Decarbonisation Investment Illustration
        </p>
        <h2 className="mt-1 text-lg font-bold text-ink">{companyName}</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Stat label="Your current carbon cost / year" value={formatSgd(result.currentAnnualCarbonCostSgd)} />
          <Stat label="Estimated annual saving (Year 1)" value={formatSgdRange(result.confidence.year1Range.low, result.confidence.year1Range.high)} />
          <Stat
            label="Estimated payback period"
            value={result.paybackYears ? `${result.paybackYears.toFixed(1)} years` : "Beyond 10-year horizon"}
          />
          <Stat label="10-year cumulative saving" value={formatSgdRange(result.confidence.tenYearRange.low, result.confidence.tenYearRange.high)} />
          <Stat label="CO₂e avoided / year (Year 1)" value={formatTonnes(result.yearRows[0].carbonAvoidedTCo2e)} />
          <Stat label="Confidence level" value={`${CONFIDENCE_DOTS[result.confidence.level]}  ${result.confidence.level}`} />
        </div>
      </div>

      <AiSummaryCard context={aiContext} fallbackNarrative={result.narrative} />

      {/* Baseline emissions */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm shadow-brand-700/5">
        <h3 className="text-sm font-bold text-ink">Your current footprint</h3>
        <div className="mt-2 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <MiniStat label="Scope 1" value={formatTonnes(result.baselineScope1TCo2e)} />
          <MiniStat label="Scope 2" value={formatTonnes(result.baselineScope2TCo2e)} />
          <MiniStat label="Total Scope 1+2" value={formatTonnes(result.totalScope12TCo2e)} />
          <MiniStat label="Scope 3 (context only)" value={formatTonnes(result.baselineScope3TCo2e)} />
        </div>
        <p className="mt-3 text-xs text-ink-soft">{result.sectorPositionLabel} — assumed energy saving rate {(result.energySavingRatePct * 100).toFixed(0)}%</p>
        <div className="mt-3">
          <CalibrationCurveChart curve={result.calibration} />
        </div>
      </div>

      {/* KPI dashboard */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm shadow-brand-700/5">
        <h3 className="text-sm font-bold text-ink">Energy intensity KPI dashboard</h3>
        <p className="mb-3 text-xs text-ink-soft">Hover a card for what it means and how to improve it. Only energy/carbon intensity have a sourced sector benchmark bar.</p>
        <KpiDashboard kpis={result.kpis} />
      </div>

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
              <Bar dataKey="Grant" stackId="a" fill="#d97706" isAnimationActive={false} />
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
              <th className="py-1 pr-2">Grant</th>
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
                <td className="py-1 pr-2">{r.grantSgd > 0 ? formatSgd(r.grantSgd) : "—"}</td>
                <td className="py-1 pr-2 font-medium">{formatSgd(r.totalSavingSgd)}</td>
                <td className="py-1 pr-2">{formatSgd(r.cumulativeSavingSgd)}</td>
                <td className="py-1 pr-2">{Math.round(r.carbonAvoidedTCo2e)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-ink-soft">
          Net investment after EEG grant: {formatSgd(result.netInvestmentSgd)}
        </p>
        {!isLiable && (
          <p className="mt-1 text-xs text-ink-soft">
            &quot;Carbon tax saving&quot; is S$0 throughout: your facility isn&apos;t a direct NEA/IRAS taxpayer, so that cost is already folded into the energy saving above rather than counted twice.
          </p>
        )}
      </div>

      {/* Conservative / Base / Optimistic comparison */}
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

      {/* Products */}
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
        <ul className="mt-2 list-disc pl-5 text-xs text-ink-soft">
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
      </div>

      <CtaPanel companyName={companyName} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-brand-600">{label}</p>
      <p className="text-lg font-bold text-ink">{value}</p>
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
