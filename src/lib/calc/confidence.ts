import type { SmeInputs } from "@/lib/types/inputs";
import type { ConfidenceLevel } from "@/lib/types/results";

interface ConfidenceResult {
  level: ConfidenceLevel;
  rangeWidthPct: number;
  reasons: string[];
}

/**
 * Data-quality score per PRD section 10: actual meter data = High, estimated
 * from floor area/headcount = Medium, spend-based proxy = Low. The reason
 * strings below quote RANGE_WIDTH_PCT directly so the displayed caveat can
 * never drift out of sync with the range actually applied to the numbers.
 * We take the weakest signal among the inputs actually supplied, since the
 * overall illustration is only as reliable as its shakiest input.
 */
export const RANGE_WIDTH_PCT: Record<ConfidenceLevel, number> = { High: 0.1, Medium: 0.2, Low: 0.35 };

export function scoreConfidence(inputs: SmeInputs): ConfidenceResult {
  const reasons: string[] = [];
  let level: ConfidenceLevel = "High";

  if (!inputs.energy.monthlyElectricityKwh && inputs.energy.monthlyElectricitySpendSgd) {
    level = "Medium";
    reasons.push("Electricity kWh was back-calculated from your S$ spend, not a metered reading");
  }
  if (!inputs.universal.floorAreaM2) {
    if (level === "High") level = "Medium";
    reasons.push("No floor area provided — energy intensity benchmarking uses a sector default");
  }
  if (inputs.scope3.annualLogisticsSpendSgd || inputs.scope3.annualPurchasedGoodsSpendSgd) {
    level = "Low";
    reasons.push(`Scope 3 uses spend-based EEIO factors (±${Math.round(RANGE_WIDTH_PCT.Low * 100)}%), not activity data`);
  }
  if (reasons.length === 0) {
    reasons.push("All key inputs are metered data or direct entries");
  }

  return { level, rangeWidthPct: RANGE_WIDTH_PCT[level], reasons };
}
