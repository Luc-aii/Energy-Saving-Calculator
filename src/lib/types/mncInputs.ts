import type { CarbonPriceScenario, CommuteMode, FreightMode, RefrigerantType, SensitivitySettings } from "./inputs";

export type ReportingFramework = "GRI" | "ISSB/IFRS S2" | "TCFD" | "CDP" | "SGX mandatory" | "None";
export type BudgetRange = "<50k" | "50k-500k" | "500k-5M" | ">5M";
export type EngagementModel = "Buy outright" | "EaaS" | "Consulting only" | "Not sure";
export type SbtiStatus = "committed" | "in-progress" | "none";
export type FleetFuelType = "diesel" | "petrol" | "hybrid" | "ev";

export interface MncSite {
  id: string;
  name: string;
  annualElectricityKwh: number;
  /** Per-site tariff — MNCs are often on contestable rates below the regulated tariff. */
  tariffSgdPerKwh?: number;
  /** % of consumption covered by onsite solar / PPA / RECs / green tariff (market-based accounting). */
  renewableCoveragePct: number;
  annualNaturalGasGJ?: number;
  annualHeatCoolingGJ?: number;
  floorAreaM2?: number;
}

export interface MncFuelFleet {
  stationaryDieselLitresPerYear?: number;
  mobileDieselLitresPerYear?: number;
  petrolLitresPerYear?: number;
  cngKgPerYear?: number;
  fleetByFuelType: Record<FleetFuelType, number>;
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
  commuteModeSplitPct: { public: number; car: number; activeOrWfh: number };
  averageCommuteKm: number;
  wfhDaysPerWeek: number;

  // Cat 9 — Downstream Transportation & Distribution
  downstreamFreightTonneKm?: { road: number; sea: number; air: number };
  downstreamFreightSpendSgd?: number;

  freightMode?: FreightMode;
}

export interface MncBaseline {
  currentCarbonTaxExposureTonnes?: number;
  sbtiStatus: SbtiStatus;
  sbtiTargetYear?: number;
  /** Vendor-neutral category ids from existingMeasures.ts — never Schneider product ids. */
  existingSolutionIds: string[];
  /** Free-text — anything not covered by the checkbox categories. Shown as context only, never parsed. */
  otherMeasuresText?: string;
  reportingFramework: ReportingFramework;
  budgetRange: BudgetRange;
  engagementModel: EngagementModel;
  /** Triggers the MAS Climate Risk Guidelines compliance flag. */
  isFinancialInstitution: boolean;
  /** Triggers the Scope 3 downstream-pressure compliance flag. */
  isSupplierToSbtiBuyer: boolean;
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
}

export type { CommuteMode };
