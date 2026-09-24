import type { CarbonPriceScenario, CommuteMode, RefrigerantType, SensitivitySettings } from "./inputs";

export type ReportingFramework = "GRI" | "ISSB/IFRS S2" | "TCFD" | "CDP" | "SGX mandatory" | "None";
export type BudgetRange = "<50k" | "50k-500k" | "500k-5M" | ">5M";
export type EngagementModel = "Buy outright" | "EaaS" | "Consulting only" | "Not sure";
export type SbtiStatus = "committed" | "in-progress" | "none";

export interface MncSite {
  id: string;
  name: string;
  /** Primary electricity input — monthly, consistent with monthly-first framing across the tool. Annualized internally (x12). */
  monthlyElectricityKwh: number;
  /** Per-site tariff — MNCs are often on contestable rates below the regulated tariff. Falls back to MncInputs.defaultTariffOverrideSgdPerKwh, then the data-file reference tariff. */
  tariffSgdPerKwh?: number;
  /** % of consumption covered by onsite solar / PPA / RECs / green tariff (market-based accounting). */
  renewableCoveragePct: number;
  /** Per-site grid emission factor override — e.g. a non-Singapore site's actual grid factor. Falls back to MncInputs.defaultGridEmissionFactorOverrideKgPerKwh, then the Singapore EMA reference factor. */
  gridEmissionFactorOverrideKgPerKwh?: number;
  /** Overrides the default green-tariff premium (tariff_config.json greenPremium) for this site's renewable-covered share. */
  greenTariffPremiumOverrideSgdPerKwh?: number;
  /** Sub-profile id for sectors with a bimodal energy end-use split (e.g. Retail "supermarket", Logistics "coldStorage") — indexes into data/sector_energy_enduse.json. */
  subProfile?: string;
  annualNaturalGasGJ?: number;
  annualHeatCoolingGJ?: number;
  floorAreaM2?: number;
  /** Data Centre only — this site's annual IT-load kWh, lets us compute a true PUE (site kWh / IT load) instead of falling back to a generic sector-average assumption. */
  itLoadKwh?: number;
}

export interface MncFuelFleet {
  stationaryDieselLitresPerYear?: number;
  mobileDieselLitresPerYear?: number;
  petrolLitresPerYear?: number;
  cngKgPerYear?: number;
  isManufacturing: boolean;
  processCombustionGJPerYear?: number;
}

export interface RefrigerantEntry {
  gasType: RefrigerantType;
  kgPerYear: number;
}

export interface MncRefrigerants {
  entries: RefrigerantEntry[];
  sf6LeakageKgPerYear?: number;
}

export interface MncScope3 {
  // Cat 1 — Purchased Goods & Services
  purchasedGoodsSpendByCategorySgd: { category: string; spendSgd: number }[];

  // Cat 4 — Upstream Transportation & Distribution
  upstreamFreightTonneKm?: { road: number; rail: number; sea: number; air: number };
  upstreamFreightSpendSgd?: number;

  // Cat 6 — Business Travel
  shortHaulPassengerKm?: number;
  longHaulPassengerKm?: number;
  hotelNights?: number;

  // Cat 7 — Employee Commuting
  /** The remainder (100 - public - car) is implicitly active transport/WFH — zero-emission, not separately tracked. */
  commuteModeSplitPct: { public: number; car: number };
  averageCommuteKm: number;
  wfhDaysPerWeek: number;

  // Cat 9 — Downstream Transportation & Distribution
  downstreamFreightTonneKm?: { road: number; sea: number; air: number };
  downstreamFreightSpendSgd?: number;
}

export interface MncBaseline {
  currentCarbonTaxExposureTonnes?: number;
  sbtiStatus: SbtiStatus;
  sbtiTargetYear?: number;
  /** Free-text — anything already in place not covered by the ECM catalog. Shown as context only, never parsed. */
  otherMeasuresText?: string;
  reportingFramework: ReportingFramework;
  budgetRange: BudgetRange;
  engagementModel: EngagementModel;
  /** Triggers the MAS Climate Risk Guidelines compliance flag. */
  isFinancialInstitution: boolean;
  /** Triggers the Scope 3 downstream-pressure compliance flag. */
  isSupplierToSbtiBuyer: boolean;
  /** Measure ids from data/ecm_catalog.json the company already has in place or is actively rolling out. Excluded from the further-opportunity/Top-3 recommendation set and used to compute the "already saving" credit (see src/lib/calc/ecm.ts). */
  implementedOrInProgressEcmIds: string[];
}

export interface MncInputs {
  companyName: string;
  sector: import("./inputs").Sector;
  isListedOnSgx: boolean;
  totalEmployees?: number;
  /** Optional — powers the "energy cost as % of revenue" KPI only. */
  annualRevenueSgd?: number;
  sites: MncSite[];
  fuelFleet: MncFuelFleet;
  refrigerants: MncRefrigerants;
  scope3: MncScope3;
  baseline: MncBaseline;
  estimatedInvestmentSgd: number;
  carbonPriceScenario: CarbonPriceScenario;
  sensitivity: SensitivitySettings;
  /** Forward-looking annual tariff escalation applied portfolio-wide, e.g. 0.02 = 2%/year. */
  tariffEscalationPctPerYear: number;
  /** Portfolio-wide fallback tariff for sites that don't set their own tariffSgdPerKwh — fills the gap before falling back to the data-file reference tariff. */
  defaultTariffOverrideSgdPerKwh?: number;
  /** Portfolio-wide fallback grid emission factor for sites that don't set their own — useful for an MNC with several sites on the same non-Singapore grid. */
  defaultGridEmissionFactorOverrideKgPerKwh?: number;
}

export type { CommuteMode };
