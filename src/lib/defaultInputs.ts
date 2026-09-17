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
  },
  fuelFleet: {
    hasVehicles: true,
    monthlyFuelLitres: 500,
    fuelType: "diesel",
    numberOfVehicles: 3,
    hasGenerator: false,
  },
  refrigerants: {
    hasRefrigerants: false,
  },
  scope3: {
    annualLogisticsSpendSgd: 200000,
    freightMode: "Road",
    commuteMode: "both",
  },
  baseline: {
    existingSolutionIds: [],
    currentEfficiencyInitiatives: [],
    investmentHorizon: "2-5",
    isFinancialInstitution: false,
    isSupplierToSbtiBuyer: false,
  },
  estimatedInvestmentSgd: 150000,
  carbonPriceScenario: "base",
  sensitivity: {
    tariffEscalationPctPerYear: 0,
  },
};
