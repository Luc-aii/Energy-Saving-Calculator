import { describe, it, expect } from "vitest";
import { isCarbonTaxLiable, CARBON_TAX_THRESHOLD_TCO2E } from "./compliance";

describe("isCarbonTaxLiable", () => {
  it("is not liable strictly below the 25,000 tCO2e/year threshold", () => {
    expect(isCarbonTaxLiable(CARBON_TAX_THRESHOLD_TCO2E - 1)).toBe(false);
    expect(isCarbonTaxLiable(0)).toBe(false);
  });

  it("is liable at or above the threshold", () => {
    expect(isCarbonTaxLiable(CARBON_TAX_THRESHOLD_TCO2E)).toBe(true);
    expect(isCarbonTaxLiable(CARBON_TAX_THRESHOLD_TCO2E + 1)).toBe(true);
  });

  it("a positive self-reported tonnage overrides the calculated figure, even below threshold", () => {
    expect(isCarbonTaxLiable(100, 5000)).toBe(true);
  });

  it("liability is judged on direct Scope 1 alone, not combined Scope 1+2 — caller's responsibility to pass Scope 1 only", () => {
    // This test documents the contract rather than testing new logic: the function takes whatever
    // number it's given as "direct Scope 1" — engine.ts/mncEngine.ts must never pass a combined total.
    expect(isCarbonTaxLiable(CARBON_TAX_THRESHOLD_TCO2E)).toBe(true);
  });
});
