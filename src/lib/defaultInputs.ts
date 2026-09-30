import type { SmeInputs } from "@/lib/types/inputs";

export const defaultSmeInputs: SmeInputs = {
  universal: {
    companyName: "Your Company Pte Ltd",
    sector: "F&B",
    numberOfSites: 1,
    floorAreaM2: 300,
    employeeCount: 30,
  },
  energy: {
    monthlyElectricityKwh: 15000,
    hasSolar: false,
    monthlyNaturalGasGJ: undefined,
    // 2%/year — an illustrative assumption, not a precise forecast: SP Group's own recent quarterly
    // tariff has been too volatile to derive a reliable trend from (+17% in 2026-Q3, then -10.4% in
    // 2026-Q4 alone — see tariff_config.json), so this isn't back-derived from that noisy window.
    // Grounded instead in the documented structural upward pressure (carbon tax rising toward
    // S$50-80/tCO2e by 2030, ~95% import-gas exposure) and matches the same assumption already used
    // for the judge company illustration reports elsewhere in this project.
    tariffEscalationPctPerYear: 0.02,
  },
  fuelFleet: {
    hasVehicles: true,
    monthlyFuelLitres: 500,
    fuelType: "diesel",
    numberOfVehicles: 3,
    hasGenerator: false,
  },
  refrigerants: {
    hasRefrigerants: true,
    refrigerantType: "R-410A",
    refrigerantAnnualTopUpKg: 8,
  },
  scope3: {
    annualLogisticsSpendSgd: 200000,
    freightMode: "Road",
    commuteMode: "both",
  },
  baseline: {
    investmentHorizon: "2-5",
    isFinancialInstitution: false,
    isSupplierToSbtiBuyer: false,
    implementedOrInProgressEcmIds: [],
  },
  estimatedInvestmentSgd: 21000,
  carbonPriceScenario: "base",
  sensitivity: {},
};

/**
 * A genuinely blank starting point — distinct from defaultSmeInputs, which
 * pre-fills realistic-looking sample numbers so first-time users see the
 * tool working. Those samples were silently feeding real results if never
 * replaced (usability finding H1); this is what "Clear all fields" resets
 * to, so a user who deliberately starts fresh gets zeros/blanks, not a
 * different set of invented numbers.
 */
export const blankSmeInputs: SmeInputs = {
  universal: {
    companyName: "",
    sector: "Other",
    numberOfSites: 1,
  },
  energy: {
    hasSolar: false,
    tariffEscalationPctPerYear: 0,
  },
  fuelFleet: {
    hasVehicles: false,
    hasGenerator: false,
  },
  refrigerants: {
    hasRefrigerants: false,
  },
  scope3: {},
  baseline: {
    investmentHorizon: "none",
    isFinancialInstitution: false,
    isSupplierToSbtiBuyer: false,
    implementedOrInProgressEcmIds: [],
  },
  estimatedInvestmentSgd: 0,
  carbonPriceScenario: "base",
  sensitivity: {},
};
