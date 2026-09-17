import type { CalculationResult } from "@/lib/types/results";
import { formatSgd, formatSgdRange, formatTonnes } from "@/lib/format";
import { Card, KpiStat } from "./ui/Primitives";

const CONFIDENCE_DOTS: Record<string, string> = {
  High: "●●●●●",
  Medium: "●●●○○",
  Low: "●●○○○",
};

/** Headline numbers shown at the top of every wizard step — mirrors the reference calculator's KPI strip. */
export function LiveKpiStrip({ companyName, result }: { companyName: string; result: CalculationResult }) {
  return (
    <Card>
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">{companyName || "Your company"} — live estimate</p>
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <KpiStat label="Carbon cost / year" value={formatSgd(result.currentAnnualCarbonCostSgd)} />
        <KpiStat
          label="Annual saving (Yr 1)"
          value={formatSgdRange(result.confidence.year1Range.low, result.confidence.year1Range.high)}
          tone="brand"
        />
        <KpiStat
          label="Payback"
          value={result.paybackYears ? `${result.paybackYears.toFixed(1)}y` : "10y+"}
        />
        <KpiStat
          label="10-yr cumulative"
          value={formatSgdRange(result.confidence.tenYearRange.low, result.confidence.tenYearRange.high)}
          tone="brand"
        />
        <KpiStat label="CO2e avoided / yr" value={formatTonnes(result.yearRows[0].carbonAvoidedTCo2e)} />
        <KpiStat label="Confidence" value={`${CONFIDENCE_DOTS[result.confidence.level]} ${result.confidence.level}`} />
      </div>
    </Card>
  );
}
