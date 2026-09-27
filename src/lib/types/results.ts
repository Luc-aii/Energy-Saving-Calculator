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

export interface EnergyEndUseItem {
  id: string;
  label: string;
  pct: number;
  userAdjusted: boolean;
}

export interface EnergyCostBreakdown {
  dirtyKwh: number;
  cleanKwh: number;
  dirtyPaymentSgd: number;
  cleanPaymentSgd: number;
  greenPremiumPaidSgd: number;
  /** Physical grid mix only — ignores any REC/PPA/green-tariff claim. */
  scope2LocationBasedTCo2e: number;
  /** Zeroes the renewable-covered share — what the $ savings math and headline Scope 2 figure use, consistent with the GHG Protocol market-based method. */
  scope2MarketBasedTCo2e: number;
}

export interface EcmBreakdownItem {
  ecmId: string;
  label: string;
  endUseId: string;
  endUseLabel: string;
  /** This end-use's share of total electricity (0-100) and the kWh/year it represents — the base the measure's saving % is applied against. */
  endUseSharePct: number;
  endUseKwh: number;
  kwhSavedMid: number;
  contributionToRatePctMid: number;
  /** kwhSavedMid × the tariff used for this calculation — same rate as everywhere else in the results, so this measure's row and the headline $ figures stay consistent. */
  dollarSavedPerYearMid: number;
  /** The measure's own saving range as % of its end-use's energy (not total electricity) — e.g. 0.30-0.60 for LED retrofits against lighting. */
  savingRangeLow: number;
  savingRangeHigh: number;
  /** "high" = hardware/capital measure with a fixed physical effect; "variable" = controls/software/behavioral measure whose realized saving depends on ongoing configuration and use. */
  certainty: "high" | "variable";
  effortTier: "low" | "medium" | "high";
  evidence: string;
  /** Plain-language "what you'd actually do" for this measure — distinct from `evidence`, which is the sourced saving-rate claim, not implementation guidance. */
  howToImplement: string;
  /** Rough order-of-magnitude cost range for this single measure (same COST_TIER_SGD bands used everywhere else) — lets every row, not just the Top 3, answer "how much does this cost." */
  costLowSgd: number;
  costHighSgd: number;
  /** Cost (mid) ÷ dollarSavedPerYearMid — null when this measure saves $0 (e.g. end-use share is 0). Drives the default sort order for the full "further opportunity" list, same ranking logic as the Top 3. */
  paybackYearsMid: number | null;
  /** The raw tier costLowSgd/costHighSgd were bucketed from — drives the "who's typically involved" / "when to do it" guidance (see ecmGuidance.ts), which is grounded in this + effortTier/certainty rather than invented per-measure. */
  costTier: "low" | "medium" | "high";
}

export interface EcmResultSummary {
  ratePctLow: number;
  ratePctMid: number;
  ratePctHigh: number;
  breakdown: EcmBreakdownItem[];
}

export interface EmissionsSourceItem {
  id: string;
  label: string;
  tCo2e: number;
}

/** Per-source Scope 1 and per-category Scope 3 breakdown — usability finding M6: totals alone don't show a user *where* their emissions come from. */
export interface EmissionsBreakdown {
  scope1BySource: EmissionsSourceItem[];
  scope3ByCategory: EmissionsSourceItem[];
}

/** A rough investment range implied by the cost tiers of the user's selected ECMs — usability finding M3: the typed investment figure was otherwise disconnected from what was actually chosen. Null when no ECMs are selected. */
export interface SuggestedInvestment {
  lowSgd: number;
  highSgd: number;
}

/** One further (not-yet-implemented) ECM ranked for the Top-3 recommendation, sorted by payback (cost ÷ saving — combines cost and benefit into one honest ROI number, "least effort most gain"). */
export interface EcmRankedItem {
  ecmId: string;
  label: string;
  endUseId: string;
  kwhSavedPerMonthMid: number;
  dollarSavedPerMonthMid: number;
  costLowSgd: number;
  costHighSgd: number;
  /** Null when the measure has no positive modeled saving (shouldn't normally happen, guarded against divide-by-zero). */
  paybackYearsMid: number | null;
  /** "high" = hardware/capital measure with a fixed physical effect; "variable" = controls/software/behavioral measure whose realized saving depends on ongoing configuration and use. */
  certainty: "high" | "variable";
  effortTier: "low" | "medium" | "high";
  evidence: string;
  /** Plain-language "what you'd actually do" for this measure — distinct from `evidence`, which is the sourced saving-rate claim, not implementation guidance. */
  howToImplement: string;
  costTier: "low" | "medium" | "high";
}

/** Estimated ongoing value of measures the company told us are already implemented/in progress — computed against current usage, not a claimed historical before/after delta (no pre-implementation baseline is known). Null when nothing was selected. */
export interface AlreadyImplementedEcmSummary {
  ids: string[];
  ratePctMid: number;
  kwhSavedPerMonthMid: number;
  dollarSavedPerMonthMid: number;
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
  /** High-severity subset of warnings (missing/implausible core data) — surfaced on the live KPI strip on every step, not just buried in the results-page notes (usability findings H2, M4). */
  criticalWarnings: string[];
  energyEndUseBreakdown: EnergyEndUseItem[];
  energyCostBreakdown: EnergyCostBreakdown;
  ecmResult: EcmResultSummary | null;
  emissionsBreakdown: EmissionsBreakdown;
  suggestedInvestment: SuggestedInvestment | null;
  /** True PUE (total kWh / IT-load kWh) — Data Centre only, and only when IT load was supplied. */
  computedPue: number | null;
  /** Top 3 further (not-yet-implemented) ECMs by payback — drives the results hero. Fewer than 3 when the sector has fewer relevant remaining measures. */
  topEcmRecommendations: EcmRankedItem[];
  /** Estimated value of measures already implemented/in progress — null when none were selected. */
  alreadyImplementedEcm: AlreadyImplementedEcmSummary | null;
  /** Monthly framing of the headline figures — computed once here (not derived ad hoc in the UI) so they stay consistent with the confidence ranges below. */
  monthlySavingSgdRange: { low: number; high: number };
  monthlyCo2eAvoidedTonnesMid: number;
  monthlyCurrentEnergyCostSgd: number;
}
