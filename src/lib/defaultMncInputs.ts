import type { MncInputs } from "@/lib/types/mncInputs";

export const defaultMncInputs: MncInputs = {
  companyName: "Regional HQ Pte Ltd",
  sector: "Office/Professional Services",
  isListedOnSgx: true,
  totalEmployees: 1200,
  sites: [
    { id: "site-1", name: "Site 1 — HQ Tower", monthlyElectricityKwh: 291667, renewableCoveragePct: 5, floorAreaM2: 25000 },
    { id: "site-2", name: "Site 2 — Regional Office A", monthlyElectricityKwh: 291667, renewableCoveragePct: 0, floorAreaM2: 25000 },
    { id: "site-3", name: "Site 3 — Regional Office B", monthlyElectricityKwh: 291667, renewableCoveragePct: 0, floorAreaM2: 25000 },
  ],
  fuelFleet: {
    mobileDieselLitresPerYear: 15000,
    isManufacturing: false,
  },
  refrigerants: {
    entries: [{ gasType: "R-410A", kgPerYear: 50 }],
  },
  scope3: {
    purchasedGoodsSpendByCategorySgd: [{ category: "IT equipment & services", spendSgd: 15000000 }],
    shortHaulPassengerKm: 100000,
    longHaulPassengerKm: 500000,
    hotelNights: 200,
    commuteModeSplitPct: { public: 60, car: 30 },
    averageCommuteKm: 15,
    wfhDaysPerWeek: 1,
  },
  baseline: {
    sbtiStatus: "in-progress",
    sbtiTargetYear: 2030,
    reportingFramework: "SGX mandatory",
    budgetRange: "500k-5M",
    engagementModel: "Not sure",
    isFinancialInstitution: false,
    isSupplierToSbtiBuyer: false,
    implementedOrInProgressEcmIds: [],
  },
  estimatedInvestmentSgd: 2000000,
  carbonPriceScenario: "base",
  sensitivity: {},
  tariffEscalationPctPerYear: 0,
};

/**
 * A genuinely blank starting point. defaultMncInputs pre-fills a full sample
 * portfolio — including "Manufacturing facility = Yes" with 5,000 GJ of
 * process combustion and sample freight/travel/purchased-goods figures —
 * which was silently feeding real results for sectors the sample doesn't
 * describe (usability finding H1, worst in MNC mode: a Hospitality or Data
 * Centre client would inherit a manufacturing-facility flag they never set).
 * This is what "Clear all fields" resets to.
 */
export const blankMncInputs: MncInputs = {
  companyName: "",
  sector: "Other",
  isListedOnSgx: false,
  sites: [{ id: "site-blank-1", name: "Site 1", monthlyElectricityKwh: 0, renewableCoveragePct: 0 }],
  fuelFleet: {
    isManufacturing: false,
  },
  refrigerants: {
    entries: [],
  },
  scope3: {
    purchasedGoodsSpendByCategorySgd: [],
    commuteModeSplitPct: { public: 0, car: 0 },
    averageCommuteKm: 0,
    wfhDaysPerWeek: 0,
  },
  baseline: {
    sbtiStatus: "none",
    reportingFramework: "None",
    budgetRange: "<50k",
    engagementModel: "Not sure",
    isFinancialInstitution: false,
    isSupplierToSbtiBuyer: false,
    implementedOrInProgressEcmIds: [],
  },
  estimatedInvestmentSgd: 0,
  carbonPriceScenario: "base",
  sensitivity: {},
  tariffEscalationPctPerYear: 0,
};
