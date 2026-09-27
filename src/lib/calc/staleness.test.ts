import { describe, it, expect } from "vitest";
import { checkStaleness } from "./staleness";

/**
 * Regression test for a real gap found in a manual audit: carbon_tax_schedule.json (the single
 * most consequential sourced figure in the tool — drives liability, savings, and the price
 * trajectory chart) and grants.json were never in the staleness check list at all, so either could
 * go stale with no warning ever surfacing. Fixed by adding both to staleness.ts.
 */
describe("checkStaleness", () => {
  it("flags the carbon tax schedule once it passes its 18-month threshold", () => {
    const justOverThreshold = new Date("2028-06-01"); // ~21 months after the 2026-09-27 refresh
    const warnings = checkStaleness(justOverThreshold);
    expect(warnings.some((w) => w.dataset === "Carbon tax schedule (NEA/MSE)")).toBe(true);
  });

  it("does not flag the carbon tax schedule shortly after it was last verified", () => {
    const soonAfter = new Date("2027-01-01");
    const warnings = checkStaleness(soonAfter);
    expect(warnings.some((w) => w.dataset === "Carbon tax schedule (NEA/MSE)")).toBe(false);
  });

  it("flags the EEG grant terms once they pass their 12-month threshold", () => {
    const wayOverThreshold = new Date("2029-01-01");
    const warnings = checkStaleness(wayOverThreshold);
    expect(warnings.some((w) => w.dataset === "EEG grant terms (EnterpriseSG)")).toBe(true);
  });

  it("reports no warnings shortly after every dataset was last touched (2026-09-27)", () => {
    const soonAfter = new Date("2026-10-15");
    expect(checkStaleness(soonAfter)).toEqual([]);
  });
});
