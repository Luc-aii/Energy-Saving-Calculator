import { describe, it, expect } from "vitest";
import {
  getEndUseBreakdown,
  computeEcmSavingsRate,
  estimateInvestmentRange,
  allRemainingEcmIdsForSector,
  rankRemainingEcms,
  computeAlreadyImplementedValue,
  sortEcmBreakdownForDisplay,
} from "./ecm";

const SECTOR = "Office/Professional Services";
const TOTAL_KWH = 500_000;
const TARIFF = 0.3191;

describe("computeEcmSavingsRate", () => {
  const breakdown = getEndUseBreakdown(SECTOR, undefined, undefined);

  it("returns null with no selected measures or no end-use data", () => {
    expect(computeEcmSavingsRate({ endUseBreakdown: breakdown, selectedEcmIds: [], totalElectricityKwh: TOTAL_KWH, tariffSgdPerKwh: TARIFF })).toBeNull();
    expect(
      computeEcmSavingsRate({ endUseBreakdown: [], selectedEcmIds: ["led-lighting-retrofit"], totalElectricityKwh: TOTAL_KWH, tariffSgdPerKwh: TARIFF })
    ).toBeNull();
  });

  it("computes a single measure's kWh/$ from its end-use share and saving range midpoint", () => {
    const result = computeEcmSavingsRate({
      endUseBreakdown: breakdown,
      selectedEcmIds: ["led-lighting-retrofit"],
      totalElectricityKwh: TOTAL_KWH,
      tariffSgdPerKwh: TARIFF,
    });
    expect(result).not.toBeNull();
    expect(result!.breakdown).toHaveLength(1);
    const row = result!.breakdown[0];
    const lightingShare = breakdown.find((b) => b.id === "lighting")!.pct / 100;
    // LED retrofit: 30-60% saving on lighting energy, mid 45%.
    const expectedKwh = TOTAL_KWH * lightingShare * 0.45;
    expect(row.kwhSavedMid).toBeCloseTo(expectedKwh, 5);
    expect(row.dollarSavedPerYearMid).toBeCloseTo(expectedKwh * TARIFF, 5);
    expect(result!.ratePctMid).toBeCloseTo(lightingShare * 0.45, 10);
  });

  it("combines two measures on the same end-use multiplicatively, never exceeding 100% of that end-use", () => {
    // Two lighting measures: LED retrofit (30-60%) + occupancy/daylight controls (10-30%).
    const result = computeEcmSavingsRate({
      endUseBreakdown: breakdown,
      selectedEcmIds: ["led-lighting-retrofit", "lighting-occupancy-daylight-controls"],
      totalElectricityKwh: TOTAL_KWH,
      tariffSgdPerKwh: TARIFF,
    });
    const lightingShare = breakdown.find((b) => b.id === "lighting")!.pct / 100;
    // Combined mid = mean(1-(1-.3)(1-.1), 1-(1-.6)(1-.3)) = mean(0.37, 0.72) = 0.545
    const combinedMid = ((1 - (1 - 0.3) * (1 - 0.1)) + (1 - (1 - 0.6) * (1 - 0.3))) / 2;
    expect(result!.ratePctMid).toBeCloseTo(lightingShare * combinedMid, 10);
    // Sanity: combined saving on the end-use itself can never exceed 100%.
    expect(combinedMid).toBeLessThan(1);
  });

  it("every breakdown row's cost/payback is internally consistent: paybackYearsMid = costMid / dollarSavedPerYearMid", () => {
    const result = computeEcmSavingsRate({
      endUseBreakdown: breakdown,
      selectedEcmIds: allRemainingEcmIdsForSector(SECTOR, []),
      totalElectricityKwh: TOTAL_KWH,
      tariffSgdPerKwh: TARIFF,
    });
    for (const row of result!.breakdown) {
      const costMid = (row.costLowSgd + row.costHighSgd) / 2;
      if (row.dollarSavedPerYearMid > 0) {
        expect(row.paybackYearsMid).not.toBeNull();
        expect(row.paybackYearsMid!).toBeCloseTo(costMid / row.dollarSavedPerYearMid, 6);
      } else {
        expect(row.paybackYearsMid).toBeNull();
      }
    }
  });
});

describe("rankRemainingEcms vs. computeEcmSavingsRate — ranking consistency", () => {
  // Regression test for a real bug: the Top-3 badge (rankRemainingEcms) and the full "further
  // opportunity" list (computeEcmSavingsRate's breakdown, sorted by its own paybackYearsMid in the UI)
  // independently computed payback via two different arithmetic paths (monthly x12 vs. direct annual).
  // A near-tied payback between two measures broke differently in each, letting an unbadged measure
  // outrank a badged one in the UI. Asserting the two payback numbers agree for every measure, for every
  // sector, closes that gap at the source instead of only patching the symptom in the UI sort.
  const sectors = [
    "Office/Professional Services",
    "F&B",
    "Retail",
    "Hospitality",
    "Healthcare",
    "Logistics",
    "Manufacturing",
    "Data Centre",
  ] as const;

  for (const sector of sectors) {
    it(`${sector}: rankRemainingEcms and computeEcmSavingsRate agree on payback for every measure`, () => {
      const breakdown = getEndUseBreakdown(sector, undefined, undefined);
      if (breakdown.length === 0) return; // "Other"-style sectors with no sourced end-use data.

      const remainingIds = allRemainingEcmIdsForSector(sector, []);
      const fullRanking = rankRemainingEcms(sector, breakdown, [], TOTAL_KWH, TARIFF, remainingIds.length);
      const savingsResult = computeEcmSavingsRate({
        endUseBreakdown: breakdown,
        selectedEcmIds: remainingIds,
        totalElectricityKwh: TOTAL_KWH,
        tariffSgdPerKwh: TARIFF,
      });

      const paybackByIdFromRanking = new Map(fullRanking.map((r) => [r.ecmId, r.paybackYearsMid]));
      for (const row of savingsResult?.breakdown ?? []) {
        const rankedPayback = paybackByIdFromRanking.get(row.ecmId);
        if (rankedPayback === undefined) continue; // measure has 0 weight in this sector's end-use mix
        if (rankedPayback === null || row.paybackYearsMid === null) {
          expect(rankedPayback).toBe(row.paybackYearsMid);
        } else {
          expect(rankedPayback).toBeCloseTo(row.paybackYearsMid, 6);
        }
      }
    });
  }

  it("rankRemainingEcms sorts ascending by payback, nulls last", () => {
    const breakdown = getEndUseBreakdown(SECTOR, undefined, undefined);
    const ranked = rankRemainingEcms(SECTOR, breakdown, [], TOTAL_KWH, TARIFF, 100);
    for (let i = 1; i < ranked.length; i++) {
      const prev = ranked[i - 1].paybackYearsMid;
      const curr = ranked[i].paybackYearsMid;
      if (prev === null) {
        expect(curr).toBeNull();
      } else if (curr !== null) {
        expect(curr).toBeGreaterThanOrEqual(prev);
      }
    }
  });

  it("excludes already-implemented measures from the ranking", () => {
    const breakdown = getEndUseBreakdown(SECTOR, undefined, undefined);
    const ranked = rankRemainingEcms(SECTOR, breakdown, ["led-lighting-retrofit"], TOTAL_KWH, TARIFF, 100);
    expect(ranked.find((r) => r.ecmId === "led-lighting-retrofit")).toBeUndefined();
  });
});

describe("sortEcmBreakdownForDisplay", () => {
  // Extracted from ResultsPanel.tsx (was inline JSX) — locks in the exact tie-break fix from
  // earlier this session: the Top 3 badge order is pinned first regardless of ties, never
  // re-derived by re-sorting the whole list on its own paybackYearsMid.
  it("always pins the Top 3 first, in their official rankRemainingEcms order", () => {
    const endUseBreakdown = getEndUseBreakdown(SECTOR, undefined, undefined);
    const remainingIds = allRemainingEcmIdsForSector(SECTOR, []);
    const ecmResult = computeEcmSavingsRate({
      endUseBreakdown,
      selectedEcmIds: remainingIds,
      totalElectricityKwh: TOTAL_KWH,
      tariffSgdPerKwh: TARIFF,
    });
    const top3 = rankRemainingEcms(SECTOR, endUseBreakdown, [], TOTAL_KWH, TARIFF, 3);
    expect(ecmResult).not.toBeNull();
    const sorted = sortEcmBreakdownForDisplay(ecmResult!.breakdown, top3);

    const top3Ids = top3.map((t) => t.ecmId);
    expect(sorted.slice(0, top3Ids.length).map((b) => b.ecmId)).toEqual(top3Ids);
  });

  it("ranks everything past the Top 3 by its own payback, nulls last", () => {
    const endUseBreakdown = getEndUseBreakdown(SECTOR, undefined, undefined);
    const remainingIds = allRemainingEcmIdsForSector(SECTOR, []);
    const ecmResult = computeEcmSavingsRate({
      endUseBreakdown,
      selectedEcmIds: remainingIds,
      totalElectricityKwh: TOTAL_KWH,
      tariffSgdPerKwh: TARIFF,
    });
    const top3 = rankRemainingEcms(SECTOR, endUseBreakdown, [], TOTAL_KWH, TARIFF, 3);
    const sorted = sortEcmBreakdownForDisplay(ecmResult!.breakdown, top3);

    const top3Ids = new Set(top3.map((t) => t.ecmId));
    const rest = sorted.filter((b) => !top3Ids.has(b.ecmId));
    for (let i = 1; i < rest.length; i++) {
      const prev = rest[i - 1].paybackYearsMid;
      const curr = rest[i].paybackYearsMid;
      if (prev === null) {
        expect(curr).toBeNull();
      } else if (curr !== null) {
        expect(curr).toBeGreaterThanOrEqual(prev);
      }
    }
  });
});

describe("estimateInvestmentRange", () => {
  it("returns null for an empty selection", () => {
    expect(estimateInvestmentRange([])).toBeNull();
  });

  it("sums cost tiers across selected measures", () => {
    // led-lighting-retrofit is "low" cost tier (5,000-20,000); high-efficiency-chiller-replacement is "high" (80,000-300,000).
    const result = estimateInvestmentRange(["led-lighting-retrofit", "high-efficiency-chiller-replacement"]);
    expect(result).not.toBeNull();
    expect(result!.lowSgd).toBe(5_000 + 80_000);
    expect(result!.highSgd).toBe(20_000 + 300_000);
  });
});

describe("computeAlreadyImplementedValue", () => {
  it("returns null when nothing is selected", () => {
    const breakdown = getEndUseBreakdown(SECTOR, undefined, undefined);
    expect(computeAlreadyImplementedValue(breakdown, [], TOTAL_KWH, TARIFF)).toBeNull();
  });

  it("credits ongoing $ value for measures already in place, using the same tariff as everywhere else", () => {
    const breakdown = getEndUseBreakdown(SECTOR, undefined, undefined);
    const result = computeAlreadyImplementedValue(breakdown, ["led-lighting-retrofit"], TOTAL_KWH, TARIFF);
    expect(result).not.toBeNull();
    expect(result!.dollarSavedPerMonthMid).toBeGreaterThan(0);
    expect(result!.dollarSavedPerMonthMid).toBeCloseTo((result!.kwhSavedPerMonthMid) * TARIFF, 5);
  });
});
