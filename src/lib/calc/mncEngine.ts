import emissionFactors from "@data/emission_factors.json";
import refrigerantGwp from "@data/refrigerant_gwp.json";
import scope3Factors from "@data/scope3_factors.json";
import tariffConfig from "@data/tariff_config.json";

import type { MncInputs } from "@/lib/types/mncInputs";
import type { CalculationResult, YearRow } from "@/lib/types/results";
import { carbonTaxRateForYear } from "./carbonTax";
import { estimateSavingsRate, getCalibrationCurve, checkIntensityAnomaly, estimateAnnualKwhFromFloorArea } from "./benchmark";
import { scoreMncConfidence } from "./mncConfidence";
import { buildComplianceFlags, buildMncComplianceFlags, buildSharedComplianceFlags, isCarbonTaxLiable } from "./compliance";
import { recommendProductsMnc } from "./mncProducts";
import { checkStaleness } from "./staleness";
import { buildMncAssumptions, MNC_DATA_VERSION } from "./mncAssumptions";
import { buildKpis } from "./kpi";
import { buildMncNarrative } from "./mncNarrative";
import {
  getEndUseBreakdown,
  computeEcmSavingsRate,
  estimateInvestmentRange,
  allRemainingEcmIdsForSector,
  rankRemainingEcms,
  computeAlreadyImplementedValue,
} from "./ecm";
import { nonNeg, buildFinalPositionLabel, savingsRateSanityWarnings, fastPaybackWarning, applySavingsRateDelta } from "./sharedEngineHelpers";

const PROJECTION_YEARS = 10;
const GEF_BASE = emissionFactors.electricity.singapore.gridEmissionFactorKgPerKwh;
const GEF_ANNUAL_DECLINE = emissionFactors.electricity.singapore.annualDeclineAssumption;
const DEFAULT_TARIFF = tariffConfig.currentBaseTariffSgdPerKwh;
/** SBTi's published minimum linear annual reduction rate for a 1.5C-aligned near-term target. */
const SBTI_MIN_ANNUAL_REDUCTION_PCT = 4.2;

/** Implausible even for a large multi-site MNC portfolio — flags the value rather than silently showing a nonsensical cost with no warning (usability finding H2). */
const IMPLAUSIBLE_ANNUAL_KWH = 5_000_000_000;

export function calculateMnc(inputs: MncInputs): CalculationResult {
  const warnings: string[] = [];
  const criticalWarnings: string[] = [];
  const currentYear = new Date().getFullYear();

  // ---- Scope 2: electricity, aggregated across sites (each site may carry its own tariff, GEF, and renewable coverage) ----
  const clampPct = (v: number) => Math.min(Math.max(v, 0), 100);
  if (inputs.sites.some((s) => s.renewableCoveragePct < 0 || s.renewableCoveragePct > 100)) {
    warnings.push("One or more sites had a renewable coverage % outside 0-100 — clamped to a valid range for this calculation.");
  }
  const anySiteGefOverride =
    inputs.sites.some((s) => s.gridEmissionFactorOverrideKgPerKwh !== undefined) || inputs.defaultGridEmissionFactorOverrideKgPerKwh !== undefined;
  if (anySiteGefOverride) {
    warnings.push(
      "One or more sites use a custom grid emission factor instead of the EMA Singapore reference figure — confirm each is correct for that site's electricity source (e.g. a non-Singapore grid)."
    );
  }

  let totalGridKwh = 0;
  let totalBaseTariffCostSgd = 0; // excludes any green premium — the "if it were all priced at the base rate" figure
  let dirtyKwhTotal = 0;
  let cleanKwhTotal = 0;
  let dirtyPaymentSgdTotal = 0;
  let cleanPaymentSgdTotal = 0;
  let greenPremiumPaidSgdTotal = 0;
  let scope2LocationBasedElectricityTCo2e = 0;
  let scope2ElectricityTCo2e = 0; // market-based — zeroes each site's REC/PPA/green-tariff-covered share
  let sitesEstimatedFromFloorArea = 0;

  for (const s of inputs.sites) {
    // Same priority order as SME mode (engine.ts): a 12-month reading history, if this site has
    // one, is averaged and takes priority over the single "latest month" field — a truer annual
    // total for a site with seasonal swings than one month x12.
    const siteReadings = s.electricityMonthlyReadings?.filter((v) => Number.isFinite(v) && v > 0);
    let siteKwh: number;
    if (siteReadings && siteReadings.length > 0) {
      const avgMonthly = siteReadings.reduce((a, b) => a + b, 0) / siteReadings.length;
      siteKwh = avgMonthly * 12;
    } else {
      siteKwh = nonNeg(s.monthlyElectricityKwh) * 12;
      if (siteKwh <= 0) {
        const floorAreaEstimate = estimateAnnualKwhFromFloorArea(inputs.sector, s.subProfile, nonNeg(s.floorAreaM2));
        if (floorAreaEstimate !== null) {
          siteKwh = floorAreaEstimate;
          sitesEstimatedFromFloorArea += 1;
        }
      }
    }
    const siteTariff = s.tariffSgdPerKwh ?? inputs.defaultTariffOverrideSgdPerKwh ?? DEFAULT_TARIFF;
    const siteGef = s.gridEmissionFactorOverrideKgPerKwh ?? inputs.defaultGridEmissionFactorOverrideKgPerKwh ?? GEF_BASE;
    const siteRenewablePct = clampPct(s.renewableCoveragePct) / 100;
    const siteGreenPremium = s.greenTariffPremiumOverrideSgdPerKwh ?? tariffConfig.greenPremium.typicalSgdPerKwh;
    const siteDirtyKwh = siteKwh * (1 - siteRenewablePct);
    const siteCleanKwh = siteKwh * siteRenewablePct;

    totalGridKwh += siteKwh;
    totalBaseTariffCostSgd += siteKwh * siteTariff;
    dirtyKwhTotal += siteDirtyKwh;
    cleanKwhTotal += siteCleanKwh;
    dirtyPaymentSgdTotal += siteDirtyKwh * siteTariff;
    cleanPaymentSgdTotal += siteCleanKwh * (siteTariff + siteGreenPremium);
    greenPremiumPaidSgdTotal += siteCleanKwh * siteGreenPremium;
    scope2LocationBasedElectricityTCo2e += (siteKwh * siteGef) / 1000;
    scope2ElectricityTCo2e += (siteDirtyKwh * siteGef) / 1000;
  }
  const totalElectricityCostSgd = totalBaseTariffCostSgd + greenPremiumPaidSgdTotal;
  if (totalGridKwh <= 0) {
    criticalWarnings.push(
      "No electricity usage has been entered for any site yet — every figure below only reflects fuel/refrigerant data you've added, not real energy savings. Enter each site's annual kWh in the Sites table for an accurate illustration."
    );
  } else if (totalGridKwh > IMPLAUSIBLE_ANNUAL_KWH) {
    criticalWarnings.push(
      `Your combined electricity usage across all sites (${Math.round(totalGridKwh).toLocaleString("en-SG")} kWh/year) is far beyond what a real portfolio uses — please double-check the units and figures entered per site.`
    );
  }
  if (sitesEstimatedFromFloorArea > 0) {
    warnings.push(
      `${sitesEstimatedFromFloorArea} site(s) had no monthly electricity entered, so consumption was estimated from floor area × the ${inputs.sector} sector-average energy intensity — a rough GFA-based estimate; enter actual kWh per site for an accurate illustration.`
    );
  }
  const weightedTariff = totalGridKwh > 0 ? totalBaseTariffCostSgd / totalGridKwh : DEFAULT_TARIFF;
  // kWh-weighted average GEF, back-derived from the per-site location-based total — used only for the simplified year-over-year decline projection below (per-site decline trajectories are out of scope for this iteration).
  const weightedGef = totalGridKwh > 0 ? (scope2LocationBasedElectricityTCo2e * 1000) / totalGridKwh : GEF_BASE;
  const weightedRenewablePct = totalGridKwh > 0 ? cleanKwhTotal / totalGridKwh : 0;
  const weightedGreenPremium = cleanKwhTotal > 0 ? greenPremiumPaidSgdTotal / cleanKwhTotal : tariffConfig.greenPremium.typicalSgdPerKwh;
  if (cleanKwhTotal > 0) {
    warnings.push(
      "Renewable coverage on one or more sites assumes RECs, a PPA, or a green tariff plan backs that share (market-based accounting) — a green-tariff premium is applied on that share; the underlying physical grid mix is unchanged. See 'Illustration basis' for the source."
    );
  }

  const totalHeatCoolingGJ = inputs.sites.reduce((sum, s) => sum + (s.annualHeatCoolingGJ ?? 0), 0);
  const heatCoolingTCo2e = (totalHeatCoolingGJ * emissionFactors.naturalGas.kgCo2ePerGJ) / 1000;
  if (totalHeatCoolingGJ > 0) {
    warnings.push("Purchased heat/steam/cooling uses the natural gas factor as a proxy — no dedicated district cooling/steam factor was sourced.");
  }
  const baselineScope2TCo2e = scope2ElectricityTCo2e + heatCoolingTCo2e;
  const scope2LocationBasedTCo2e = scope2LocationBasedElectricityTCo2e + heatCoolingTCo2e;

  // ---- Scope 1: gas, fleet fuel, process combustion, refrigerants, SF6 ----
  const totalGasGJ = inputs.sites.reduce((sum, s) => sum + nonNeg(s.annualNaturalGasGJ), 0);
  const gasTCo2e = (totalGasGJ * emissionFactors.naturalGas.kgCo2ePerGJ) / 1000;

  const stationaryDieselTCo2e = (nonNeg(inputs.fuelFleet.stationaryDieselLitresPerYear) * emissionFactors.fuels.dieselKgCo2ePerLitre) / 1000;
  const mobileDieselTCo2e = (nonNeg(inputs.fuelFleet.mobileDieselLitresPerYear) * emissionFactors.fuels.dieselKgCo2ePerLitre) / 1000;
  const petrolTCo2e = (nonNeg(inputs.fuelFleet.petrolLitresPerYear) * emissionFactors.fuels.petrolKgCo2ePerLitre) / 1000;
  const cngTCo2e = (nonNeg(inputs.fuelFleet.cngKgPerYear) * emissionFactors.fuels.cngKgCo2ePerKg) / 1000;
  const fleetFuelTCo2e = stationaryDieselTCo2e + mobileDieselTCo2e + petrolTCo2e + cngTCo2e;

  let processCombustionTCo2e = 0;
  if (inputs.fuelFleet.isManufacturing) {
    if (nonNeg(inputs.fuelFleet.processCombustionGJPerYear) > 0) {
      processCombustionTCo2e = (nonNeg(inputs.fuelFleet.processCombustionGJPerYear) * emissionFactors.naturalGas.kgCo2ePerGJ) / 1000;
      warnings.push("Process combustion uses the natural gas factor as a proxy since fuel type wasn't specified — refine with actual fuel mix for compliance-grade reporting.");
    } else {
      warnings.push("Manufacturing facility is set to \"Yes\" but no process combustion figure was entered — 0 process emissions were counted.");
    }
  }

  let refrigerantTCo2e = 0;
  for (const entry of inputs.refrigerants.entries) {
    if (entry.gasType === "Unknown") {
      warnings.push("One or more refrigerant entries have an unknown gas type — excluded from the fugitive emissions total.");
      continue;
    }
    const gwp = refrigerantGwp.gases[entry.gasType as keyof typeof refrigerantGwp.gases];
    refrigerantTCo2e += (nonNeg(entry.kgPerYear) * gwp) / 1000;
    if (entry.gasType === "R-22") warnings.push(refrigerantGwp.phaseOutNotice["R-22"]);
  }
  const sf6TCo2e = (nonNeg(inputs.refrigerants.sf6LeakageKgPerYear) * refrigerantGwp.gases.SF6) / 1000;

  const baselineScope1TCo2e = gasTCo2e + fleetFuelTCo2e + processCombustionTCo2e + refrigerantTCo2e + sf6TCo2e;
  const totalScope12TCo2e = baselineScope1TCo2e + baselineScope2TCo2e;

  /**
   * Singapore's carbon tax is levied on direct (Scope 1) emissions only,
   * above 25,000 tCO2e/year (~50 large facilities) — or use the company's
   * own self-reported IRAS exposure if given. A non-liable company's only
   * carbon-tax exposure is the pass-through already in its electricity
   * tariff, so no separate monetized line is shown for it.
   */
  const isLiable = isCarbonTaxLiable(baselineScope1TCo2e, inputs.baseline.currentCarbonTaxExposureTonnes);
  if (!isLiable) {
    warnings.push(
      "No separate carbon tax saving is shown: Singapore's carbon tax applies only to ~50 large facilities with ≥25,000 tCO2e/year of direct (Scope 1) emissions. Your exposure is a small pass-through already reflected in your electricity tariffs — showing it twice would double-count the same cost."
    );
  }

  // ---- Scope 3: six priority categories (quantified only) ----
  const fx = scope3Factors.assumptions.fxSgdToUsd;
  const midSpendFactor = (scope3Factors.spendBased.purchasedGoodsKgCo2ePerUsd.low + scope3Factors.spendBased.purchasedGoodsKgCo2ePerUsd.high) / 2;

  const cat1TCo2e =
    (inputs.scope3.purchasedGoodsSpendByCategorySgd.reduce((sum, c) => sum + nonNeg(c.spendSgd), 0) * fx * midSpendFactor) / 1000;

  const wttEligibleTCo2e = gasTCo2e + fleetFuelTCo2e + processCombustionTCo2e;
  const cat3TCo2e = wttEligibleTCo2e * scope3Factors.wellToTank.multiplierOnScope1Fuel;

  let cat4TCo2e = 0;
  if (inputs.scope3.upstreamFreightTonneKm) {
    const f = inputs.scope3.upstreamFreightTonneKm;
    if (f.rail > 0) warnings.push("Rail freight isn't quantified (no sourced DEFRA rail factor) — excluded from Cat 4/9 totals.");
    cat4TCo2e =
      (nonNeg(f.road) * scope3Factors.freight.roadDieselHgvKgCo2ePerTonneKm +
        nonNeg(f.air) * scope3Factors.freight.airKgCo2ePerTonneKm +
        nonNeg(f.sea) * ((scope3Factors.freight.seaKgCo2ePerTonneKm.low + scope3Factors.freight.seaKgCo2ePerTonneKm.high) / 2)) /
      1000;
  } else if (nonNeg(inputs.scope3.upstreamFreightSpendSgd) > 0) {
    cat4TCo2e = (nonNeg(inputs.scope3.upstreamFreightSpendSgd) * fx * midSpendFactor) / 1000;
  }

  const cat6TCo2e =
    (nonNeg(inputs.scope3.shortHaulPassengerKm) * scope3Factors.businessTravel.shortHaulEconomyKgCo2ePerPassengerKm +
      nonNeg(inputs.scope3.longHaulPassengerKm) * scope3Factors.businessTravel.longHaulEconomyKgCo2ePerPassengerKm +
      nonNeg(inputs.scope3.hotelNights) * scope3Factors.businessTravel.hotelNightKgCo2e) /
    1000;
  if (inputs.scope3.hotelNights) {
    warnings.push("Hotel-night emissions use an indicative industry-average factor, not a DEFRA-sourced figure.");
  }

  let cat7TCo2e = 0;
  const totalEmployeesNonNeg = nonNeg(inputs.totalEmployees);
  if (totalEmployeesNonNeg > 0) {
    const { public: pubPct, car: carPct } = inputs.scope3.commuteModeSplitPct;
    const blendedFactor =
      (pubPct / 100) * scope3Factors.commuting.kgCo2ePerPassengerKm.public + (carPct / 100) * scope3Factors.commuting.kgCo2ePerPassengerKm.car;
    const effectiveDaysPerWeek = Math.max(5 - inputs.scope3.wfhDaysPerWeek, 0);
    const annualCommuteDays = scope3Factors.commuting.workingDaysPerYear * (effectiveDaysPerWeek / 5);
    const roundTripKm = inputs.scope3.averageCommuteKm * 2;
    cat7TCo2e = (totalEmployeesNonNeg * roundTripKm * annualCommuteDays * blendedFactor) / 1000;
  }

  let cat9TCo2e = 0;
  if (inputs.scope3.downstreamFreightTonneKm) {
    const f = inputs.scope3.downstreamFreightTonneKm;
    cat9TCo2e =
      (nonNeg(f.road) * scope3Factors.freight.roadDieselHgvKgCo2ePerTonneKm +
        nonNeg(f.air) * scope3Factors.freight.airKgCo2ePerTonneKm +
        nonNeg(f.sea) * ((scope3Factors.freight.seaKgCo2ePerTonneKm.low + scope3Factors.freight.seaKgCo2ePerTonneKm.high) / 2)) /
      1000;
  } else if (nonNeg(inputs.scope3.downstreamFreightSpendSgd) > 0) {
    cat9TCo2e = (nonNeg(inputs.scope3.downstreamFreightSpendSgd) * fx * midSpendFactor) / 1000;
  }

  const baselineScope3TCo2e = cat1TCo2e + cat3TCo2e + cat4TCo2e + cat6TCo2e + cat7TCo2e + cat9TCo2e;

  // ---- Savings rate from portfolio-wide calibration curve (or ECM catalog, or manual override) ----
  const sitesWithArea = inputs.sites.filter((s) => nonNeg(s.floorAreaM2) > 0);
  const totalFloorArea = sitesWithArea.reduce((sum, s) => sum + nonNeg(s.floorAreaM2), 0);
  const energyIntensity = totalFloorArea > 0 ? totalGridKwh / totalFloorArea : null;
  const primarySubProfile = inputs.sites[0]?.subProfile;
  // Data Centre only, and only when at least one site has an IT-load figure — lets that sector compare on
  // a true PUE basis instead of always falling back to "sector average assumed" (usability finding M5).
  const totalItLoadKwh = inputs.sites.reduce((sum, s) => sum + nonNeg(s.itLoadKwh), 0);
  const computedPue = inputs.sector === "Data Centre" && totalItLoadKwh > 0 && totalGridKwh > 0 ? totalGridKwh / totalItLoadKwh : null;
  const { savingRatePct, positionLabel } = estimateSavingsRate(inputs.sector, energyIntensity, primarySubProfile, computedPue);
  const calibration = getCalibrationCurve(inputs.sector, energyIntensity, primarySubProfile, computedPue);
  const intensityAnomaly = checkIntensityAnomaly(inputs.sector, energyIntensity, primarySubProfile, computedPue);
  if (intensityAnomaly) warnings.push(intensityAnomaly);

  const energyEndUseBreakdown = getEndUseBreakdown(inputs.sector, primarySubProfile, undefined);
  const implementedIds = inputs.baseline.implementedOrInProgressEcmIds;
  const remainingEcmIds = allRemainingEcmIdsForSector(inputs.sector, implementedIds);
  const ecmResult = computeEcmSavingsRate({
    endUseBreakdown: energyEndUseBreakdown,
    selectedEcmIds: remainingEcmIds,
    totalElectricityKwh: totalGridKwh,
    tariffSgdPerKwh: weightedTariff,
  });
  const alreadyImplementedEcm = computeAlreadyImplementedValue(energyEndUseBreakdown, implementedIds, totalGridKwh, weightedTariff);
  const topEcmRecommendations = rankRemainingEcms(inputs.sector, energyEndUseBreakdown, implementedIds, totalGridKwh, weightedTariff);

  // The sector-position label (e.g. "worst quartile") describes where the calibration curve places this
  // portfolio — but when an ECM-derived or manual rate is actually used, showing that label next to a
  // different % read as contradictory (usability finding M1). buildFinalPositionLabel makes the
  // relationship explicit and always states the assumed rate exactly once (shared with engine.ts).
  const finalPositionLabel = buildFinalPositionLabel(positionLabel, savingRatePct, ecmResult, inputs.sensitivity.savingsRateOverridePct);

  const rawSavingRate = inputs.sensitivity.savingsRateOverridePct ?? ecmResult?.ratePctMid ?? savingRatePct;
  const finalSavingRatePct = applySavingsRateDelta(rawSavingRate, inputs.carbonPriceScenario, !!inputs.sensitivity.savingsRateOverridePct);
  warnings.push(...savingsRateSanityWarnings(finalSavingRatePct));

  // ---- Suggested investment range from the further-opportunity ECMs' cost tiers (usability finding M3) ----
  const suggestedInvestment = estimateInvestmentRange(remainingEcmIds);
  if (suggestedInvestment) {
    if (inputs.estimatedInvestmentSgd > suggestedInvestment.highSgd * 3) {
      warnings.push(
        `Your estimated investment (S$${inputs.estimatedInvestmentSgd.toLocaleString("en-SG")}) is well above the rough range implied by your selected measures (S$${suggestedInvestment.lowSgd.toLocaleString("en-SG")}–S$${suggestedInvestment.highSgd.toLocaleString("en-SG")}) — consider whether the scope matches, or add more measures.`
      );
    } else if (inputs.estimatedInvestmentSgd < suggestedInvestment.lowSgd / 3) {
      warnings.push(
        `Your estimated investment (S$${inputs.estimatedInvestmentSgd.toLocaleString("en-SG")}) is well below the rough range implied by your selected measures (S$${suggestedInvestment.lowSgd.toLocaleString("en-SG")}–S$${suggestedInvestment.highSgd.toLocaleString("en-SG")}) — the payback below may be unrealistically fast.`
      );
    }
  }

  const kwhSaved = totalGridKwh * finalSavingRatePct;
  const tariff = weightedTariff;

  // ---- No automatic grant for MNC scale (EEG Advanced is project-dependent per PRD) ----
  const netInvestmentSgd = inputs.estimatedInvestmentSgd;

  const currentYearRate = carbonTaxRateForYear(currentYear, inputs.carbonPriceScenario);
  const currentAnnualCarbonCostSgd = isLiable ? totalElectricityCostSgd + baselineScope1TCo2e * currentYearRate : totalElectricityCostSgd;

  // ---- Year-by-year projection ----
  const yearRows: YearRow[] = [];
  let cumulativeSavingSgd = 0;
  const escalation = inputs.tariffEscalationPctPerYear;
  for (let year = 1; year <= PROJECTION_YEARS; year++) {
    const calendarYear = currentYear + year - 1;
    const rate = carbonTaxRateForYear(calendarYear, inputs.carbonPriceScenario);
    const gefThisYear = Math.max(weightedGef - GEF_ANNUAL_DECLINE * (year - 1), 0.1);
    const carbonAvoidedTCo2e = (kwhSaved * (1 - weightedRenewablePct) * gefThisYear) / 1000;
    const escalatedTariff = tariff * Math.pow(1 + escalation, year - 1);
    const blendedEffectiveRate = (1 - weightedRenewablePct) * escalatedTariff + weightedRenewablePct * (escalatedTariff + weightedGreenPremium);
    const energySavingSgd = kwhSaved * blendedEffectiveRate;
    const carbonTaxSavingSgd = isLiable ? carbonAvoidedTCo2e * rate : 0;
    const totalSavingSgd = energySavingSgd + carbonTaxSavingSgd;
    cumulativeSavingSgd += totalSavingSgd;

    yearRows.push({
      year,
      calendarYear,
      energySavingSgd,
      carbonTaxSavingSgd,
      carbonTaxRateUsed: rate,
      grantSgd: 0,
      totalSavingSgd,
      cumulativeSavingSgd,
      carbonAvoidedTCo2e,
    });
  }

  // ---- Payback ----
  let paybackYears: number | null = null;
  let prevCumulative = 0;
  for (const row of yearRows) {
    if (row.cumulativeSavingSgd >= netInvestmentSgd) {
      const yearSaving = row.cumulativeSavingSgd - prevCumulative;
      const remainder = netInvestmentSgd - prevCumulative;
      paybackYears = row.year - 1 + (yearSaving > 0 ? remainder / yearSaving : 0);
      break;
    }
    prevCumulative = row.cumulativeSavingSgd;
  }
  const fastPaybackMsg = fastPaybackWarning(paybackYears);
  if (fastPaybackMsg) warnings.push(fastPaybackMsg);

  // ---- Confidence ----
  const confidenceScore = scoreMncConfidence(inputs);
  const year1Total = yearRows[0].totalSavingSgd;
  const tenYearTotal = yearRows[yearRows.length - 1].cumulativeSavingSgd;
  let w = confidenceScore.rangeWidthPct;
  if (ecmResult && ecmResult.ratePctMid > 0) {
    const ecmWidthPct = (ecmResult.ratePctHigh - ecmResult.ratePctLow) / (2 * ecmResult.ratePctMid);
    if (ecmWidthPct < w) w = ecmWidthPct;
  }

  // ---- SBTi-implied target comparison ----
  let targetComparison: CalculationResult["targetComparison"] = null;
  if (inputs.baseline.sbtiStatus !== "none" && inputs.baseline.sbtiTargetYear) {
    const yearsToTarget = Math.max(inputs.baseline.sbtiTargetYear - currentYear, 1);
    const impliedPct = Math.min(SBTI_MIN_ANNUAL_REDUCTION_PCT * yearsToTarget, 100);
    const requiredAnnualAvoidedTCo2e = totalScope12TCo2e * (impliedPct / 100);
    const yearsOut = Math.min(Math.max(inputs.baseline.sbtiTargetYear - currentYear + 1, 1), PROJECTION_YEARS);
    const projectedAnnualAvoidedTCo2e = yearRows[yearsOut - 1].carbonAvoidedTCo2e;
    targetComparison = {
      targetPct: Math.round(impliedPct),
      targetYear: inputs.baseline.sbtiTargetYear,
      requiredAnnualAvoidedTCo2e,
      projectedAnnualAvoidedTCo2e,
      onTrack: projectedAnnualAvoidedTCo2e >= requiredAnnualAvoidedTCo2e,
    };
    warnings.push(
      `Target comparison uses SBTi's published minimum linear reduction rate (4.2%/year) as an implied target, not your company's actual submitted SBTi target — refine if you have a specific % goal.`
    );
  }

  if (inputs.baseline.otherMeasuresText) {
    warnings.push(`You noted you already have: "${inputs.baseline.otherMeasuresText}" — shown here as context only, not scored against your recommendations.`);
  }

  const staleness = checkStaleness();
  const assumptions = buildMncAssumptions(inputs, weightedTariff, weightedGef, finalSavingRatePct, isLiable);
  const kpis = buildKpis({
    sector: inputs.sector,
    subProfile: primarySubProfile,
    pue: computedPue,
    energyIntensityKwhPerM2: energyIntensity,
    totalScope12TCo2e,
    totalScope3TCo2e: baselineScope3TCo2e,
    employeeCount: inputs.totalEmployees,
    annualRevenueSgd: inputs.annualRevenueSgd,
    annualEnergyCostSgd: totalElectricityCostSgd,
    currentAnnualCarbonTaxSgd: isLiable ? baselineScope1TCo2e * currentYearRate : 0,
    renewableCoveragePct: weightedRenewablePct * 100,
  });

  const result: CalculationResult = {
    carbonPriceScenario: inputs.carbonPriceScenario,
    baselineScope1TCo2e,
    baselineScope2TCo2e,
    baselineScope3TCo2e,
    totalScope12TCo2e,
    currentAnnualCarbonCostSgd,
    energySavingRatePct: finalSavingRatePct,
    sectorPositionLabel: finalPositionLabel,
    calibration,
    yearRows,
    paybackYears,
    netInvestmentSgd,
    confidence: {
      level: confidenceScore.level,
      rangeWidthPct: w,
      year1Range: { low: year1Total * (1 - w), high: year1Total * (1 + w) },
      tenYearRange: { low: tenYearTotal * (1 - w), high: tenYearTotal * (1 + w) },
      reasons: confidenceScore.reasons,
    },
    compliance: [
      ...buildComplianceFlags(baselineScope1TCo2e, isLiable, false),
      ...buildMncComplianceFlags({
        isListedOnSgx: inputs.isListedOnSgx,
        reportingFramework: inputs.baseline.reportingFramework,
        sbtiStatus: inputs.baseline.sbtiStatus,
        currentCarbonTaxExposureTonnes: inputs.baseline.currentCarbonTaxExposureTonnes,
        totalScope12TCo2e,
      }),
      ...buildSharedComplianceFlags(inputs.baseline.isFinancialInstitution, inputs.baseline.isSupplierToSbtiBuyer),
    ],
    products: recommendProductsMnc(inputs),
    scenarioComparison: [],
    staleness,
    targetComparison,
    assumptions,
    kpis,
    narrative: "",
    dataVersion: MNC_DATA_VERSION,
    warnings,
    criticalWarnings,
    energyEndUseBreakdown,
    energyCostBreakdown: {
      dirtyKwh: dirtyKwhTotal,
      cleanKwh: cleanKwhTotal,
      dirtyPaymentSgd: dirtyPaymentSgdTotal,
      cleanPaymentSgd: cleanPaymentSgdTotal,
      greenPremiumPaidSgd: greenPremiumPaidSgdTotal,
      scope2LocationBasedTCo2e,
      scope2MarketBasedTCo2e: baselineScope2TCo2e,
    },
    ecmResult,
    emissionsBreakdown: {
      scope1BySource: [
        { id: "gas", label: "Natural gas (sites)", tCo2e: gasTCo2e },
        { id: "fleet-fuel", label: "Fuel (stationary & fleet)", tCo2e: fleetFuelTCo2e },
        { id: "process-combustion", label: "Process combustion", tCo2e: processCombustionTCo2e },
        { id: "refrigerants", label: "Refrigerants (fugitive)", tCo2e: refrigerantTCo2e },
        { id: "sf6", label: "SF6 (switchgear)", tCo2e: sf6TCo2e },
      ].filter((s) => s.tCo2e > 0),
      scope3ByCategory: [
        { id: "purchased-goods", label: "Purchased goods (Cat 1)", tCo2e: cat1TCo2e },
        { id: "fuel-energy-wtt", label: "Fuel & energy well-to-tank (Cat 3)", tCo2e: cat3TCo2e },
        { id: "upstream-freight", label: "Upstream freight (Cat 4)", tCo2e: cat4TCo2e },
        { id: "business-travel", label: "Business travel (Cat 6)", tCo2e: cat6TCo2e },
        { id: "commuting", label: "Employee commuting (Cat 7)", tCo2e: cat7TCo2e },
        { id: "downstream-freight", label: "Downstream freight (Cat 9)", tCo2e: cat9TCo2e },
      ].filter((s) => s.tCo2e > 0),
    },
    suggestedInvestment,
    computedPue,
    topEcmRecommendations,
    alreadyImplementedEcm,
    monthlySavingSgdRange: { low: year1Total * (1 - w) / 12, high: year1Total * (1 + w) / 12 },
    monthlySavingSgdMid: year1Total / 12,
    monthlyCo2eAvoidedTonnesMid: yearRows[0].carbonAvoidedTCo2e / 12,
    monthlyCurrentEnergyCostSgd: currentAnnualCarbonCostSgd / 12,
  };

  result.narrative = buildMncNarrative(inputs, result);
  return result;
}
