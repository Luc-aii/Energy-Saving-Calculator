import type { MncInputs } from "@/lib/types/mncInputs";
import type { ConfidenceLevel } from "@/lib/types/results";
import { RANGE_WIDTH_PCT } from "./confidence";

interface ConfidenceResult {
  level: ConfidenceLevel;
  rangeWidthPct: number;
  reasons: string[];
}

/**
 * MNC data-quality scoring per PRD section 10, adapted for multi-site inputs.
 * MNCs are assumed to have metered per-site data (High) unless signals say
 * otherwise; Scope 3 spend-based inputs always widen the range (Low), same
 * rule as SME mode. Shares RANGE_WIDTH_PCT with confidence.ts so the two
 * modes can never drift apart on what each level actually means.
 */
export function scoreMncConfidence(inputs: MncInputs): ConfidenceResult {
  const reasons: string[] = [];
  let level: ConfidenceLevel = "High";

  const sitesMissingTariff = inputs.sites.some((s) => !s.tariffSgdPerKwh);
  if (sitesMissingTariff) {
    level = "Medium";
    reasons.push("One or more sites use the reference tariff instead of an actual contract rate");
  }

  if (inputs.scope3.purchasedGoodsSpendByCategorySgd.length > 0 || inputs.scope3.upstreamFreightSpendSgd || inputs.scope3.downstreamFreightSpendSgd) {
    level = "Low";
    reasons.push(`Scope 3 Cat 1/4/9 uses spend-based EEIO factors (±${Math.round(RANGE_WIDTH_PCT.Low * 100)}%), not supplier- or shipment-level activity data`);
  }

  if (reasons.length === 0) {
    reasons.push("All key inputs are per-site metered data or direct entries");
  }

  return { level, rangeWidthPct: RANGE_WIDTH_PCT[level], reasons };
}
