export type ConfidenceLevel = "High" | "Medium" | "Low";

export interface YearRow {
  year: number;
  calendarYear: number;
  energySavingSgd: number;
  carbonTaxSavingSgd: number;
  carbonTaxRateUsed: number;
  grantSgd: number;
  totalSavingSgd: number;
  cumulativeSavingSgd: number;
  carbonAvoidedTCo2e: number;
  doNothingCarbonTaxSgd: number;
  differenceSgd: number;
}

export interface ComplianceFlag {
  id: string;
  severity: "red" | "yellow" | "green";
  title: string;
  detail: string;
}

export interface ProductRecommendation {
  id: string;
  name: string;
  covers: string;
  savingRange: { low: number; high: number } | null;
  evidence: string;
  role: "primary" | "add-on" | "scope3";
}

export interface CalibrationCurve {
  sector: string;
  unit: string;
  bestInClass: number;
  average: number;
  poor: number;
  yourValue: number | null;
}

export interface ScenarioSummary {
  scenario: "conservative" | "base" | "optimistic";
  savingsRateUsed: number;
  year1TotalSgd: number;
  tenYearCumulativeSgd: number;
  paybackYears: number | null;
}

export interface StalenessWarning {
  dataset: string;
  lastUpdated: string;
  monthsSinceUpdate: number;
  thresholdMonths: number;
}

export interface TargetComparison {
  targetPct: number;
  targetYear: number;
  requiredAnnualAvoidedTCo2e: number;
  projectedAnnualAvoidedTCo2e: number;
  onTrack: boolean;
}

export interface AssumptionLine {
  label: string;
  value: string;
  source: string;
}

export interface KpiItem {
  id: string;
  label: string;
  value: number;
  unit: string;
  tooltip: string;
  /** Only present where a real sourced benchmark exists (energy/carbon intensity). */
  benchmark?: { best: number; average: number; poor: number };
}

export interface CalculationResult {
  baselineScope1TCo2e: number;
  baselineScope2TCo2e: number;
  baselineScope3TCo2e: number;
  totalScope12TCo2e: number;
  currentAnnualCarbonCostSgd: number;
  energySavingRatePct: number;
  sectorPositionLabel: string;
  calibration: CalibrationCurve;
  yearRows: YearRow[];
  paybackYears: number | null;
  netInvestmentSgd: number;
  confidence: {
    level: ConfidenceLevel;
    rangeWidthPct: number;
    year1Range: { low: number; high: number };
    tenYearRange: { low: number; high: number };
    reasons: string[];
  };
  compliance: ComplianceFlag[];
  products: ProductRecommendation[];
  scenarioComparison: ScenarioSummary[];
  staleness: StalenessWarning[];
  targetComparison: TargetComparison | null;
  assumptions: AssumptionLine[];
  kpis: KpiItem[];
  narrative: string;
  dataVersion: string;
  warnings: string[];
}
