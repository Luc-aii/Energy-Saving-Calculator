import { describe, it, expect } from "vitest";
import { calculateSme } from "./engine";
import { calculateMnc } from "./mncEngine";
import { defaultSmeInputs, blankSmeInputs } from "@/lib/defaultInputs";
import { defaultMncInputs, blankMncInputs } from "@/lib/defaultMncInputs";

/**
 * End-to-end smoke tests against the app's own sample inputs (the same fixtures a first-time user
 * sees), run through the real calculateSme/calculateMnc entry points — the strongest available
 * regression guard for the sharedEngineHelpers.ts extraction (buildFinalPositionLabel,
 * savingsRateSanityWarnings, fastPaybackWarning, nonNeg), which touched both files' output shape.
 */
describe("calculateSme", () => {
  it("runs end-to-end on the default sample inputs without throwing, producing a sane result", () => {
    const result = calculateSme(defaultSmeInputs);
    expect(result.totalScope12TCo2e).toBeGreaterThanOrEqual(0);
    expect(result.energySavingRatePct).toBeGreaterThan(0);
    expect(result.sectorPositionLabel).toMatch(/%/);
    expect(result.yearRows.length).toBeGreaterThan(0);
  });

  it("a blank/zeroed input set doesn't throw and reports the no-electricity critical warning", () => {
    const result = calculateSme(blankSmeInputs);
    expect(result.criticalWarnings.some((w) => w.includes("No electricity usage"))).toBe(true);
  });

  it("sectorPositionLabel never states the assumed rate twice (regression: previously duplicated when ECM-driven)", () => {
    const result = calculateSme(defaultSmeInputs);
    const occurrences = (result.sectorPositionLabel.match(/\d+%/g) ?? []).length;
    // At most 2 numbers expected ("sector curve suggests X%; your N measures give Y%") — never the same
    // number repeated as a trailing "assumed energy saving rate Y%" on top of that.
    expect(occurrences).toBeLessThanOrEqual(2);
  });
});

describe("calculateMnc", () => {
  it("runs end-to-end on the default sample inputs without throwing, producing a sane result", () => {
    const result = calculateMnc(defaultMncInputs);
    expect(result.totalScope12TCo2e).toBeGreaterThanOrEqual(0);
    expect(result.energySavingRatePct).toBeGreaterThan(0);
    expect(result.sectorPositionLabel).toMatch(/%/);
    expect(result.yearRows.length).toBeGreaterThan(0);
  });

  it("a blank/zeroed portfolio doesn't throw", () => {
    expect(() => calculateMnc(blankMncInputs)).not.toThrow();
  });

  it("sectorPositionLabel never states the assumed rate twice", () => {
    const result = calculateMnc(defaultMncInputs);
    const occurrences = (result.sectorPositionLabel.match(/\d+%/g) ?? []).length;
    expect(occurrences).toBeLessThanOrEqual(2);
  });
});
