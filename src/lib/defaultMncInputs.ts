import type { MncInputs } from "@/lib/types/mncInputs";

export const defaultMncInputs: MncInputs = {
  companyName: "Regional HQ Pte Ltd",
  sector: "Manufacturing",
  isListedOnSgx: true,
  totalEmployees: 1200,
  sites: [
    { id: "site-1", name: "Site 1 — HQ", annualElectricityKwh: 10000000, renewableCoveragePct: 5 },
    { id: "site-2", name: "Site 2 — Plant A", annualElectricityKwh: 10000000, renewableCoveragePct: 0 },
    { id: "site-3", name: "Site 3 — Plant B", annualElectricityKwh: 10000000, renewableCoveragePct: 0 },
  ],
  fuelFleet: {
    mobileDieselLitresPerYear: 60000,
    fleetByFuelType: { diesel: 50, petrol: 0, hybrid: 0, ev: 0 },
    isManufacturing: true,
    processCombustionGJPerYear: 5000,
  },
  refrigerants: {
    entries: [{ gasType: "R-410A", kgPerYear: 50 }],
  },
  scope3: {
    purchasedGoodsSpendByCategorySgd: [{ category: "Raw materials", spendSgd: 50000000 }],
    upstreamFreightTonneKm: { road: 1500000, rail: 0, sea: 500000, air: 0 },
    shortHaulPassengerKm: 100000,
    longHaulPassengerKm: 500000,
    hotelNights: 200,
    commuteModeSplitPct: { public: 60, car: 30, activeOrWfh: 10 },
    averageCommuteKm: 15,
    wfhDaysPerWeek: 1,
    downstreamFreightTonneKm: { road: 500000, sea: 200000, air: 0 },
  },
  baseline: {
    sbtiStatus: "in-progress",
    sbtiTargetYear: 2030,
    existingSolutionIds: [],
    reportingFramework: "SGX mandatory",
    budgetRange: "500k-5M",
    engagementModel: "Not sure",
    isFinancialInstitution: false,
    isSupplierToSbtiBuyer: false,
  },
  estimatedInvestmentSgd: 2000000,
  carbonPriceScenario: "base",
  sensitivity: { tariffEscalationPctPerYear: 0 },
};
