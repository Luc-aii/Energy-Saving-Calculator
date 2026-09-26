import { describe, it, expect } from "vitest";
import { carbonTaxRateForYear } from "./carbonTax";
import carbonTaxSchedule from "@data/carbon_tax_schedule.json";

describe("carbonTaxRateForYear", () => {
  it("returns the exact legislated rate for legislated years", () => {
    for (const [year, rate] of Object.entries(carbonTaxSchedule.legislated)) {
      expect(carbonTaxRateForYear(Number(year), "base")).toBe(rate);
    }
  });

  it("holds flat at the last legislated rate for any year before the legislated window", () => {
    const firstLegislatedYear = Math.min(...Object.keys(carbonTaxSchedule.legislated).map(Number));
    const firstRate = carbonTaxSchedule.legislated[String(firstLegislatedYear) as keyof typeof carbonTaxSchedule.legislated];
    expect(carbonTaxRateForYear(firstLegislatedYear - 5, "base")).toBe(firstRate);
  });

  it("linearly interpolates between the last legislated year and 2030", () => {
    const lastLegislatedYear = Math.max(...Object.keys(carbonTaxSchedule.legislated).map(Number));
    const lastRate = carbonTaxSchedule.legislated[String(lastLegislatedYear) as keyof typeof carbonTaxSchedule.legislated];
    const target2030 = carbonTaxSchedule.indicative2030.base;
    const midpointYear = (lastLegislatedYear + 2030) / 2;
    const rate = carbonTaxRateForYear(midpointYear, "base");
    expect(rate).toBeCloseTo((lastRate + target2030) / 2, 5);
  });

  it("holds flat at the scenario's 2030 rate for every year at or after 2030", () => {
    for (const scenario of ["conservative", "base", "optimistic"] as const) {
      const target = carbonTaxSchedule.indicative2030[scenario];
      expect(carbonTaxRateForYear(2030, scenario)).toBe(target);
      expect(carbonTaxRateForYear(2045, scenario)).toBe(target);
    }
  });

  it("conservative < base < optimistic for any post-legislated year", () => {
    const conservative = carbonTaxRateForYear(2028, "conservative");
    const base = carbonTaxRateForYear(2028, "base");
    const optimistic = carbonTaxRateForYear(2028, "optimistic");
    expect(conservative).toBeLessThan(base);
    expect(base).toBeLessThan(optimistic);
  });
});
