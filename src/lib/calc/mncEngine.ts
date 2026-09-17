import emissionFactors from "@data/emission_factors.json";
import refrigerantGwp from "@data/refrigerant_gwp.json";
import scope3Factors from "@data/scope3_factors.json";
import tariffConfig from "@data/tariff_config.json";

import type { MncInputs } from "@/lib/types/mncInputs";
import type { CalculationResult, YearRow } from "@/lib/types/results";
import { carbonTaxRateForYear } from "./carbonTax";
import { estimateSavingsRate, getCalibrationCurve, checkIntensityAnomaly } from "./benchmark";
import { scoreMncConfidence } from "./mncConfidence";
import { buildComplianceFlags, buildMncComplianceFlags, buildSharedComplianceFlags, isCarbonTaxLiable } from "./compliance";
import { recommendProductsMnc } from "./mncProducts";
import { checkStaleness } from "./staleness";
import { buildMncAssumptions, MNC_DATA_VERSION } from "./mncAssumptions";
import { buildKpis } from "./kpi";
import { buildMncNarrative } from "./mncNarrative";

const PROJECTION_YEARS = 10;
const GEF_BASE = emissionFactors.electricity.singapore.gridEmissionFactorKgPerKwh;
const GEF_ANNUAL_DECLINE = emissionFactors.electricity.singapore.annualDeclineAssumption;
const DEFAULT_TARIFF = tariffConfig.currentBaseTariffSgdPerKwh;
/** SBTi's published minimum linear annual reduction rate for a 1.5C-aligned near-term target. */
const SBTI_MIN_ANNUAL_REDUCTION_PCT = 4.2;

export function calculateMnc(inputs: MncInputs): CalculationResult {
  const warnings: string[] = [];
  const currentYear = new Date().getFullYear();

  // ---- Scope 2: electricity, aggregated across sites ----
  const totalGridKwh = inputs.sites.reduce((sum, s) => sum + s.annualElectricityKwh, 0);
  const totalElectricityCostSgd = inputs.sites.reduce(
    (sum, s) => sum + s.annualElectricityKwh * (s.tariffSgdPerKwh ?? DEFAULT_TARIFF),
    0
  );
  const weightedTariff = totalGridKwh > 0 ? totalElectricityCostSgd / totalGridKwh : DEFAULT_TARIFF;
  const clampPct = (v: number) => Math.min(Math.max(v, 0), 100);
  const weightedRenewablePct =
    totalGridKwh > 0
      ? inputs.sites.reduce((sum, s) => sum + s.annualElectricityKwh * (clampPct(s.renewableCoveragePct) / 100), 0) / totalGridKwh
      : 0;
  if (inputs.sites.some((s) => s.renewableCoveragePct < 0 || s.renewableCoveragePct > 100)) {
    warnings.push("One or more sites had a renewable coverage % outside 0-100 — clamped to a valid range for this calculation.");
  }
  const scope2ElectricityTCo2e = (totalGridKwh * (1 - weightedRenewablePct) * GEF_BASE) / 1000;

  const totalHeatCoolingGJ = inputs.sites.reduce((sum, s) => sum + (s.annualHeatCoolingGJ ?? 0), 0);
  const heatCoolingTCo2e = (totalHeatCoolingGJ * emissionFactors.naturalGas.kgCo2ePerGJ) / 1000;
  if (totalHeatCoolingGJ > 0) {
    warnings.push("Purchased heat/steam/cooling uses the natural gas factor as a proxy — no dedicated district cooling/steam factor was sourced.");
  }
  const baselineScope2TCo2e = scope2ElectricityTCo2e + heatCoolingTCo2e;

  // ---- Scope 1: gas, fleet fuel, process combustion, refrigerants, SF6 ----
  const totalGasGJ = inputs.sites.reduce((sum, s) => sum + (s.annualNaturalGasGJ ?? 0), 0);
  const gasTCo2e = (totalGasGJ * emissionFactors.naturalGas.kgCo2ePerGJ) / 1000;

  const stationaryDieselTCo2e = ((inputs.fuelFleet.stationaryDieselLitresPerYear ?? 0) * emissionFactors.fuels.dieselKgCo2ePerLitre) / 1000;
  const mobileDieselTCo2e = ((inputs.fuelFleet.mobileDieselLitresPerYear ?? 0) * emissionFactors.fuels.dieselKgCo2ePerLitre) / 1000;
  const petrolTCo2e = ((inputs.fuelFleet.petrolLitresPerYear ?? 0) * emissionFactors.fuels.petrolKgCo2ePerLitre) / 1000;
  const cngTCo2e = ((inputs.fuelFleet.cngKgPerYear ?? 0) * emissionFactors.fuels.cngKgCo2ePerKg) / 1000;
  const fleetFuelTCo2e = stationaryDieselTCo2e + mobileDieselTCo2e + petrolTCo2e + cngTCo2e;

  let processCombustionTCo2e = 0;
  if (inputs.fuelFleet.isManufacturing && inputs.fuelFleet.processCombustionGJPerYear) {
    processCombustionTCo2e = (inputs.fuelFleet.processCombustionGJPerYear * emissionFactors.naturalGas.kgCo2ePerGJ) / 1000;
    warnings.push("Process combustion uses the natural gas factor as a proxy since fuel type wasn't specified — refine with actual fuel mix for compliance-grade reporting.");
  }

  let refrigerantTCo2e = 0;
  for (const entry of inputs.refrigerants.entries) {
    if (entry.gasType === "Unknown") {
      warnings.push("One or more refrigerant entries have an unknown gas type — excluded from the fugitive emissions total.");
      continue;
    }
    const gwp = refrigerantGwp.gases[entry.gasType as keyof typeof refrigerantGwp.gases];
    refrigerantTCo2e += (entry.kgPerYear * gwp) / 1000;
    if (entry.gasType === "R-22") warnings.push(refrigerantGwp.phaseOutNotice["R-22"]);
  }
  const sf6TCo2e = ((inputs.refrigerants.sf6LeakageKgPerYear ?? 0) * refrigerantGwp.gases.SF6) / 1000;

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
    (inputs.scope3.purchasedGoodsSpendByCategorySgd.reduce((sum, c) => sum + c.spendSgd, 0) * fx * midSpendFactor) / 1000;

  const wttEligibleTCo2e = gasTCo2e + fleetFuelTCo2e + processCombustionTCo2e;
  const cat3TCo2e = wttEligibleTCo2e * scope3Factors.wellToTank.multiplierOnScope1Fuel;

  let cat4TCo2e = 0;
  if (inputs.scope3.upstreamFreightTonneKm) {
    const f = inputs.scope3.upstreamFreightTonneKm;
    if (f.rail > 0) warnings.push("Rail freight isn't quantified (no sourced DEFRA rail factor) — excluded from Cat 4/9 totals.");
    cat4TCo2e =
      (f.road * scope3Factors.freight.roadDieselHgvKgCo2ePerTonneKm +
        f.air * scope3Factors.freight.airKgCo2ePerTonneKm +
        f.sea * ((scope3Factors.freight.seaKgCo2ePerTonneKm.low + scope3Factors.freight.seaKgCo2ePerTonneKm.high) / 2)) /
      1000;
  } else if (inputs.scope3.upstreamFreightSpendSgd) {
    cat4TCo2e = (inputs.scope3.upstreamFreightSpendSgd * fx * midSpendFactor) / 1000;
  }

  const cat6TCo2e =
    ((inputs.scope3.shortHaulPassengerKm ?? 0) * scope3Factors.businessTravel.shortHaulEconomyKgCo2ePerPassengerKm +
      (inputs.scope3.longHaulPassengerKm ?? 0) * scope3Factors.businessTravel.longHaulEconomyKgCo2ePerPassengerKm +
      (inputs.scope3.hotelNights ?? 0) * scope3Factors.businessTravel.hotelNightKgCo2e) /
    1000;
  if (inputs.scope3.hotelNights) {
    warnings.push("Hotel-night emissions use an indicative industry-average factor, not a DEFRA-sourced figure.");
  }

  let cat7TCo2e = 0;
  if (inputs.totalEmployees) {
    const { public: pubPct, car: carPct } = inputs.scope3.commuteModeSplitPct;
    const blendedFactor =
      (pubPct / 100) * scope3Factors.commuting.kgCo2ePerPassengerKm.public + (carPct / 100) * scope3Factors.commuting.kgCo2ePerPassengerKm.car;
    const effectiveDaysPerWeek = Math.max(5 - inputs.scope3.wfhDaysPerWeek, 0);
    const annualCommuteDays = scope3Factors.commuting.workingDaysPerYear * (effectiveDaysPerWeek / 5);
    const roundTripKm = inputs.scope3.averageCommuteKm * 2;
    cat7TCo2e = (inputs.totalEmployees * roundTripKm * annualCommuteDays * blendedFactor) / 1000;
    warnings.push("Employee commuting uses placeholder per-mode emission factors pending DEFRA-sourced sign-off — see data/scope3_factors.json.");
  }

  let cat9TCo2e = 0;
  if (inputs.scope3.downstreamFreightTonneKm) {
    const f = inputs.scope3.downstreamFreightTonneKm;
    cat9TCo2e =
      (f.road * scope3Factors.freight.roadDieselHgvKgCo2ePerTonneKm +
        f.air * scope3Factors.freight.airKgCo2ePerTonneKm +
        f.sea * ((scope3Factors.freight.seaKgCo2ePerTonneKm.low + scope3Factors.freight.seaKgCo2ePerTonneKm.high) / 2)) /
      1000;
  } else if (inputs.scope3.downstreamFreightSpendSgd) {
    cat9TCo2e = (inputs.scope3.downstreamFreightSpendSgd * fx * midSpendFactor) / 1000;
  }

  const baselineScope3TCo2e = cat1TCo2e + cat3TCo2e + cat4TCo2e + cat6TCo2e + cat7TCo2e + cat9TCo2e;

  // ---- Savings rate from portfolio-wide calibration curve ----
  const sitesWithArea = inputs.sites.filter((s) => s.floorAreaM2);
  const totalFloorArea = sitesWithArea.reduce((sum, s) => sum + (s.floorAreaM2 ?? 0), 0);
  const energyIntensity = totalFloorArea > 0 ? totalGridKwh / totalFloorArea : null;
  const { savingRatePct, positionLabel } = estimateSavingsRate(inputs.sector, energyIntensity);
  const calibration = getCalibrationCurve(inputs.sector, energyIntensity);
  const intensityAnomaly = checkIntensityAnomaly(inputs.sector, energyIntensity);
  if (intensityAnomaly) warnings.push(intensityAnomaly);

  const finalSavingRatePct = inputs.sensitivity.savingsRateOverridePct ?? savingRatePct;
  if (finalSavingRatePct > 0.4) warnings.push("Estimated savings exceed 40% — unusually high, please verify inputs.");
  if (finalSavingRatePct < 0.05) warnings.push("Estimated savings are below 5% — below the typical minimum threshold for most Schneider solutions.");

  const kwhSaved = totalGridKwh * finalSavingRatePct;
  const tariff = inputs.sensitivity.tariffOverrideSgdPerKwh ?? weightedTariff;

  // ---- No automatic grant for MNC scale (EEG Advanced is project-dependent per PRD) ----
  const netInvestmentSgd = inputs.estimatedInvestmentSgd;

  const currentYearRate = carbonTaxRateForYear(currentYear, inputs.carbonPriceScenario);
  const currentAnnualCarbonCostSgd = isLiable
    ? totalGridKwh * (1 - weightedRenewablePct) * tariff + baselineScope1TCo2e * currentYearRate
    : totalGridKwh * (1 - weightedRenewablePct) * tariff;

  // ---- Year-by-year projection ----
  const yearRows: YearRow[] = [];
  let cumulativeSavingSgd = 0;
  const escalation = inputs.sensitivity.tariffEscalationPctPerYear;
  for (let year = 1; year <= PROJECTION_YEARS; year++) {
    const calendarYear = currentYear + year - 1;
    const rate = carbonTaxRateForYear(calendarYear, inputs.carbonPriceScenario);
    const gefThisYear = Math.max(GEF_BASE - GEF_ANNUAL_DECLINE * (year - 1), 0.1);
    const carbonAvoidedTCo2e = (kwhSaved * (1 - weightedRenewablePct) * gefThisYear) / 1000;
    const escalatedTariff = tariff * Math.pow(1 + escalation, year - 1);
    const energySavingSgd = kwhSaved * escalatedTariff;
    const carbonTaxSavingSgd = isLiable ? carbonAvoidedTCo2e * rate : 0;
    const totalSavingSgd = energySavingSgd + carbonTaxSavingSgd;
    cumulativeSavingSgd += totalSavingSgd;
    const doNothingCarbonTaxSgd = isLiable ? carbonAvoidedTCo2e * rate : 0;

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
      doNothingCarbonTaxSgd,
      differenceSgd: totalSavingSgd + doNothingCarbonTaxSgd,
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
  if (paybackYears !== null && paybackYears < 2) {
    warnings.push("Payback period under 2 years is unusually fast — please double-check your investment cost estimate.");
  }

  // ---- Confidence ----
  const confidenceScore = scoreMncConfidence(inputs);
  const year1Total = yearRows[0].totalSavingSgd;
  const tenYearTotal = yearRows[yearRows.length - 1].cumulativeSavingSgd;
  const w = confidenceScore.rangeWidthPct;

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

  const staleness = checkStaleness();
  const assumptions = buildMncAssumptions(inputs, weightedTariff, finalSavingRatePct, isLiable);
  const kpis = buildKpis({
    sector: inputs.sector,
    energyIntensityKwhPerM2: energyIntensity,
    totalScope12TCo2e,
    totalScope3TCo2e: baselineScope3TCo2e,
    employeeCount: inputs.totalEmployees,
    annualRevenueSgd: inputs.annualRevenueSgd,
    annualEnergyCostSgd: totalGridKwh * (1 - weightedRenewablePct) * tariff,
    currentAnnualCarbonTaxSgd: isLiable ? baselineScope1TCo2e * currentYearRate : 0,
    renewableCoveragePct: weightedRenewablePct * 100,
  });

  const result: CalculationResult = {
    baselineScope1TCo2e,
    baselineScope2TCo2e,
    baselineScope3TCo2e,
    totalScope12TCo2e,
    currentAnnualCarbonCostSgd,
    energySavingRatePct: finalSavingRatePct,
    sectorPositionLabel: positionLabel,
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
  };

  result.narrative = buildMncNarrative(inputs, result);
  return result;
}
