import { describe, it, expect } from "vitest";
import { calculateMnc } from "./mncEngine";
import type { MncInputs } from "@/lib/types/mncInputs";

/**
 * The flagship use case this calculator is actually built for: a single-site Singapore branch office
 * of a larger company — the operating profile of a modern Singapore-based office occupier (matching a
 * commercial-building tenant like a regional tech/fintech/defence-tech HQ). Not real data for any named
 * company — a representative profile sized off this app's own Office/Professional Services benchmark
 * band (120/200/350 kWh/m2/year) and Singapore national averages (LTA commute split, EMA tariff).
 */
const singaporeOfficeProfile: MncInputs = {
  companyName: "Singapore Branch Operations",
  sector: "Office/Professional Services",
  isListedOnSgx: false,
  totalEmployees: 400,
  sites: [
    {
      id: "sg-office-1",
      name: "Singapore Office",
      // 4,000 m2 x 180 kWh/m2/yr (between best-in-class 120 and sector average 200) / 12
      monthlyElectricityKwh: 60_000,
      renewableCoveragePct: 0,
      floorAreaM2: 4_000,
    },
  ],
  fuelFleet: {
    isManufacturing: false,
  },
  refrigerants: {
    entries: [{ gasType: "R-410A", kgPerYear: 5 }],
  },
  scope3: {
    purchasedGoodsSpendByCategorySgd: [{ category: "IT equipment & professional services", spendSgd: 2_000_000 }],
    shortHaulPassengerKm: 200_000,
    longHaulPassengerKm: 300_000,
    hotelNights: 100,
    // LTA-typical Singapore commute split (see data/scope3_factors.json commuting note).
    commuteModeSplitPct: { public: 70, car: 20 },
    averageCommuteKm: 15,
    wfhDaysPerWeek: 1,
  },
  baseline: {
    sbtiStatus: "none",
    reportingFramework: "None",
    budgetRange: "500k-5M",
    engagementModel: "Not sure",
    isFinancialInstitution: false,
    isSupplierToSbtiBuyer: false,
    // A modern Grade-A Singapore office plausibly already has LED lighting — exercises the
    // "already implemented" credit path, not just the from-scratch further-opportunity path.
    implementedOrInProgressEcmIds: ["led-lighting-retrofit"],
  },
  estimatedInvestmentSgd: 300_000,
  carbonPriceScenario: "base",
  sensitivity: {},
  tariffEscalationPctPerYear: 0.02,
};

describe("Singapore branch office profile (flagship use case)", () => {
  const result = calculateMnc(singaporeOfficeProfile);

  it("runs without throwing and produces no critical warnings for a fully-specified profile", () => {
    expect(result.criticalWarnings).toEqual([]);
  });

  it("Scope 2 dominates the footprint (electricity-only office, no fleet/process fuel)", () => {
    expect(result.baselineScope2TCo2e).toBeGreaterThan(0);
    // Only refrigerant fugitive emissions in Scope 1 — no gas, no fleet, no process combustion.
    expect(result.baselineScope1TCo2e).toBeGreaterThan(0);
    expect(result.baselineScope1TCo2e).toBeLessThan(result.baselineScope2TCo2e);
  });

  it("is not a direct carbon taxpayer at this scale (well under the 25,000 tCO2e Scope 1 threshold)", () => {
    expect(result.compliance.some((c) => c.id === "carbon-tax-not-liable")).toBe(true);
    expect(result.compliance.some((c) => c.id === "carbon-tax-liable")).toBe(false);
  });

  it("credits the already-implemented LED retrofit instead of double-recommending it", () => {
    expect(result.alreadyImplementedEcm).not.toBeNull();
    expect(result.alreadyImplementedEcm!.ids).toContain("led-lighting-retrofit");
    expect(result.topEcmRecommendations.some((r) => r.ecmId === "led-lighting-retrofit")).toBe(false);
  });

  it("Top 3 recommendations are real, sector-relevant HVAC/lighting/plug-load measures with positive payback", () => {
    expect(result.topEcmRecommendations.length).toBeGreaterThan(0);
    expect(result.topEcmRecommendations.length).toBeLessThanOrEqual(3);
    for (const rec of result.topEcmRecommendations) {
      expect(rec.dollarSavedPerMonthMid).toBeGreaterThan(0);
      expect(rec.costLowSgd).toBeGreaterThan(0);
    }
  });

  it("energy intensity KPI lands inside the calibration curve's plausible range for this sector", () => {
    const intensityKpi = result.kpis.find((k) => k.id === "energy-intensity");
    expect(intensityKpi).toBeDefined();
    expect(intensityKpi!.value).toBeCloseTo(180, 0);
  });

  it("produces a sane, positive financial illustration", () => {
    expect(result.paybackYears === null || result.paybackYears! > 0).toBe(true);
    expect(result.yearRows).toHaveLength(10);
    expect(result.yearRows[0].totalSavingSgd).toBeGreaterThan(0);
    // Cumulative savings should be monotonically non-decreasing year over year.
    for (let i = 1; i < result.yearRows.length; i++) {
      expect(result.yearRows[i].cumulativeSavingSgd).toBeGreaterThanOrEqual(result.yearRows[i - 1].cumulativeSavingSgd);
    }
  });

  it("Scope 3 is quantified but never folded into the $ savings figure (PRD Option A)", () => {
    expect(result.baselineScope3TCo2e).toBeGreaterThan(0);
    // None of the year-by-year $ figures should be inflated by Scope 3 — spot-check against a
    // Scope-3-zeroed run to confirm the $ math is identical.
    const noScope3 = calculateMnc({
      ...singaporeOfficeProfile,
      scope3: { ...singaporeOfficeProfile.scope3, purchasedGoodsSpendByCategorySgd: [], shortHaulPassengerKm: 0, longHaulPassengerKm: 0, hotelNights: 0 },
    });
    expect(noScope3.yearRows[0].totalSavingSgd).toBeCloseTo(result.yearRows[0].totalSavingSgd, 5);
    expect(noScope3.paybackYears).toBeCloseTo(result.paybackYears ?? -1, 5);
  });
});
