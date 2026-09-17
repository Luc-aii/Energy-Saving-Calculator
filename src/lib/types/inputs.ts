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
export type EfficiencyInitiative = "led-lighting" | "hvac-upgraded" | "iso-50001";

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
  /** Vendor-neutral category ids from existingMeasures.ts — never Schneider product ids. */
  existingSolutionIds: string[];
  /** Free-text — anything not covered by the checkbox categories. Shown as context only, never parsed. */
  otherMeasuresText?: string;
  currentEfficiencyInitiatives: EfficiencyInitiative[];
  investmentHorizon: InvestmentHorizon;
  emissionsReductionTargetPct?: number;
  targetYear?: number;
  /** Triggers the MAS Climate Risk Guidelines compliance flag. */
  isFinancialInstitution: boolean;
  /** Triggers the Scope 3 downstream-pressure compliance flag. */
  isSupplierToSbtiBuyer: boolean;
}

export interface SensitivitySettings {
  /** Overrides the data-file reference tariff (tariff_config.json) when set. */
  tariffOverrideSgdPerKwh?: number;
  /** Overrides the calibration-curve-derived energy saving rate (0-1) when set. */
  savingsRateOverridePct?: number;
  /** Forward-looking annual tariff escalation, e.g. 0.02 = 2%/year. */
  tariffEscalationPctPerYear: number;
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
