import type { CalculationResult } from "@/lib/types/results";

/**
 * The only facts the narrative/insights AI calls are allowed to see or cite.
 * Built from the already-computed, deterministic CalculationResult — the AI
 * never sees raw inputs and never computes anything itself, it only phrases
 * these numbers into prose. Keeping this a flat, explicit whitelist (rather
 * than passing the whole CalculationResult) makes it easy to audit that no
 * new figure can sneak into a prompt.
 */
export interface ResultContext {
  companyName: string;
  mode: "SME" | "MNC";
  sector: string;
  totalScope12TCo2e: number;
  baselineScope3TCo2e: number;
  productNames: string[];
  year1SavingLow: number;
  year1SavingHigh: number;
  tenYearSavingLow: number;
  tenYearSavingHigh: number;
  paybackYears: number | null;
  isCarbonTaxLiable: boolean;
  energySavingRatePct: number;
  confidenceLevel: string;
  sectorPositionLabel: string;
  topWarnings: string[];
}

export function buildResultContext(companyName: string, mode: "SME" | "MNC", sector: string, result: CalculationResult): ResultContext {
  return {
    companyName,
    mode,
    sector,
    totalScope12TCo2e: result.totalScope12TCo2e,
    baselineScope3TCo2e: result.baselineScope3TCo2e,
    productNames: result.products.map((p) => p.name),
    year1SavingLow: result.confidence.year1Range.low,
    year1SavingHigh: result.confidence.year1Range.high,
    tenYearSavingLow: result.confidence.tenYearRange.low,
    tenYearSavingHigh: result.confidence.tenYearRange.high,
    paybackYears: result.paybackYears,
    isCarbonTaxLiable: result.compliance.some((c) => c.id === "carbon-tax-liable"),
    energySavingRatePct: result.energySavingRatePct,
    confidenceLevel: result.confidence.level,
    sectorPositionLabel: result.sectorPositionLabel,
    topWarnings: result.warnings.slice(0, 3),
  };
}
