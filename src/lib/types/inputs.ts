export type Sector =
  | "Manufacturing"
  | "Hospitality"
  | "F&B"
  | "Retail"
  | "Office/Professional Services"
  | "Healthcare"
  | "Logistics"
  | "Data Centre"
  | "Other";

export type FuelType = "diesel" | "petrol" | "cng";
export type RefrigerantType = "R-410A" | "R-32" | "R-134a" | "R-22" | "Unknown";
export type FreightMode = "Road" | "Sea" | "Air" | "Mixed";
export type InvestmentHorizon = "<2" | "2-5" | "5+" | "none";
export type CarbonPriceScenario = "conservative" | "base" | "optimistic";
export type CommuteMode = "public" | "car" | "both";

export interface UniversalInputs {
  companyName: string;
  sector: Sector;
  numberOfSites: number;
  floorAreaM2?: number;
  employeeCount?: number;
  /** Optional — powers the "energy cost as % of revenue" KPI only. */
  annualRevenueSgd?: number;
}

export interface BlockAEnergy {
  /** Latest month, used when electricityMonthlyReadings is not supplied. */
  monthlyElectricityKwh?: number;
  monthlyElectricitySpendSgd?: number;
  /** Up to 12 monthly kWh readings; averaged when present (PRD 5.1 Block A). */
  electricityMonthlyReadings?: number[];
  hasSolar: boolean;
  solarMonthlyGenerationKwh?: number;
  monthlyNaturalGasGJ?: number;
  /** Overrides the data-file reference tariff (tariff_config.json) when set. */
  tariffOverrideSgdPerKwh?: number;
  /** Overrides the EMA Singapore grid emission factor (emission_factors.json) when set — e.g. a known non-Singapore grid factor for context, or a supplier-disclosed figure. */
  gridEmissionFactorOverrideKgPerKwh?: number;
  /** Forward-looking annual tariff escalation, e.g. 0.02 = 2%/year. */
  tariffEscalationPctPerYear: number;
  /** % of electricity covered by RECs/PPA/green tariff (market-based accounting) — distinct from hasSolar, which nets off physically self-generated kWh. 0-100. */
  renewableCoveragePct?: number;
  /** Overrides the default green-tariff premium (tariff_config.json greenPremium) when set. */
  greenTariffPremiumOverrideSgdPerKwh?: number;
  /** Sub-profile id for sectors with a bimodal energy end-use split (e.g. Retail "supermarket", Logistics "coldStorage") — indexes into data/sector_energy_enduse.json. Undefined/"default" uses the sector's default split. */
  subProfile?: string;
  /** User-edited energy end-use split (id -> %), overriding the sector default shown in the "where your energy goes" chart. */
  customEndUsePct?: Record<string, number>;
  /** Data Centre only — annual IT-load kWh, lets us compute a true PUE (total kWh / IT load) instead of falling back to a generic sector-average assumption. */
  itLoadKwh?: number;
}

export interface BlockBFuelFleet {
  hasVehicles: boolean;
  monthlyFuelLitres?: number;
  /** Alternative to monthlyFuelLitres — back-calculated using a reference pump price. */
  monthlyFuelSpendSgd?: number;
  fuelType?: FuelType;
  numberOfVehicles?: number;
  hasGenerator: boolean;
  generatorMonthlyFuelLitres?: number;
  /** Alternative to generatorMonthlyFuelLitres — estimated from runtime x tank size. */
  generatorHoursPerMonth?: number;
  generatorTankSizeLitres?: number;
}

export interface BlockCRefrigerants {
  hasRefrigerants: boolean;
  refrigerantType?: RefrigerantType;
  refrigerantAnnualTopUpKg?: number;
}

export interface BlockDScope3Simplified {
  annualLogisticsSpendSgd?: number;
  freightMode?: FreightMode;
  flightsPerYear?: number;
  employeesCommuting?: number;
  commuteMode?: CommuteMode;
  annualPurchasedGoodsSpendSgd?: number;
}

export interface BlockEBaselineGoals {
  /** Free-text — anything already in place not covered by the ECM catalog. Shown as context only, never parsed. */
  otherMeasuresText?: string;
  /** Measure ids from data/ecm_catalog.json the company already has in place or is actively rolling out. Excluded from the further-opportunity/Top-3 recommendation set and used to compute the "already saving" credit (see src/lib/calc/ecm.ts). */
  implementedOrInProgressEcmIds: string[];
  investmentHorizon: InvestmentHorizon;
  emissionsReductionTargetPct?: number;
  targetYear?: number;
  /** Triggers the MAS Climate Risk Guidelines compliance flag. */
  isFinancialInstitution: boolean;
  /** Triggers the Scope 3 downstream-pressure compliance flag. */
  isSupplierToSbtiBuyer: boolean;
}

export interface SensitivitySettings {
  /** Overrides the calibration-curve/ECM-derived energy saving rate (0-1) when set — the manual escape hatch, shown next to the ECM picker. */
  savingsRateOverridePct?: number;
}

export interface SmeInputs {
  universal: UniversalInputs;
  energy: BlockAEnergy;
  fuelFleet: BlockBFuelFleet;
  refrigerants: BlockCRefrigerants;
  scope3: BlockDScope3Simplified;
  baseline: BlockEBaselineGoals;
  /** Estimated project investment for the recommended solution package (S$). User-adjustable. */
  estimatedInvestmentSgd: number;
  carbonPriceScenario: CarbonPriceScenario;
  sensitivity: SensitivitySettings;
}
