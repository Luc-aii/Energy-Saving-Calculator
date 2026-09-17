import emissionFactors from "@data/emission_factors.json";
import refrigerantGwp from "@data/refrigerant_gwp.json";
import scope3Factors from "@data/scope3_factors.json";
import tariffConfig from "@data/tariff_config.json";
import grantsData from "@data/grants.json";
import fuelPrices from "@data/fuel_prices.json";

import type { SmeInputs } from "@/lib/types/inputs";
import type { CalculationResult, YearRow } from "@/lib/types/results";
import { carbonTaxRateForYear } from "./carbonTax";
import { estimateSavingsRate, getCalibrationCurve, checkIntensityAnomaly } from "./benchmark";
import { scoreConfidence } from "./confidence";
import { buildComplianceFlags, buildSharedComplianceFlags, isCarbonTaxLiable } from "./compliance";
import { recommendProducts } from "./products";
import { checkStaleness } from "./staleness";
import { buildAssumptions, DATA_VERSION } from "./assumptions";
import { buildKpis } from "./kpi";
import { buildNarrative } from "./narrative";

const PROJECTION_YEARS = 10;
const GEF_BASE = emissionFactors.electricity.singapore.gridEmissionFactorKgPerKwh;
const GEF_ANNUAL_DECLINE = emissionFactors.electricity.singapore.annualDeclineAssumption;
const DEFAULT_TARIFF = tariffConfig.currentBaseTariffSgdPerKwh;
const EEG = grantsData.grants.find((g) => g.id === "eeg-base")!;
/** Rule-of-thumb: a full tank of a backup genset lasts ~10 continuous hours. Not PRD-sourced — placeholder. */
const GENERATOR_TANK_HOURS_ASSUMPTION = 10;

function fuelFactorKgPerLitre(fuelType: "diesel" | "petrol" | "cng" | undefined): number {
  if (fuelType === "petrol") return emissionFactors.fuels.petrolKgCo2ePerLitre;
  if (fuelType === "cng") return emissionFactors.fuels.cngKgCo2ePerKg;
  return emissionFactors.fuels.dieselKgCo2ePerLitre;
}

function fuelPriceSgdPerUnit(fuelType: "diesel" | "petrol" | "cng" | undefined): number {
  if (fuelType === "petrol") return fuelPrices.pricesSgdPerUnit.petrol;
  if (fuelType === "cng") return fuelPrices.pricesSgdPerUnit.cng;
  return fuelPrices.pricesSgdPerUnit.diesel;
}

const HORIZON_UPPER_BOUND_YEARS: Record<SmeInputs["baseline"]["investmentHorizon"], number> = {
  "<2": 2,
  "2-5": 5,
  "5+": Infinity,
  none: Infinity,
};

export function calculateSme(inputs: SmeInputs): CalculationResult {
  const warnings: string[] = [];
  const currentYear = new Date().getFullYear();
  const tariff = inputs.sensitivity.tariffOverrideSgdPerKwh ?? DEFAULT_TARIFF;

  // ---- Scope 2: electricity ----
  let annualElectricityKwh = 0;
  const readings = inputs.energy.electricityMonthlyReadings?.filter((v) => Number.isFinite(v));
  if (readings && readings.length > 0) {
    const avgMonthly = readings.reduce((a, b) => a + b, 0) / readings.length;
    annualElectricityKwh = avgMonthly * 12;
  } else if (inputs.energy.monthlyElectricityKwh) {
    annualElectricityKwh = inputs.energy.monthlyElectricityKwh * 12;
  } else if (inputs.energy.monthlyElectricitySpendSgd) {
    annualElectricityKwh = (inputs.energy.monthlyElectricitySpendSgd / tariff) * 12;
    warnings.push("Electricity consumption was back-calculated from your S$ spend using the reference tariff — this is an estimate.");
  }
  const annualSolarKwh = inputs.energy.hasSolar ? (inputs.energy.solarMonthlyGenerationKwh ?? 0) * 12 : 0;
  const netAnnualElectricityKwh = Math.max(annualElectricityKwh - annualSolarKwh, 0);
  const scope2TCo2e = (netAnnualElectricityKwh * GEF_BASE) / 1000;

  // ---- Scope 1: natural gas ----
  const annualGasGJ = (inputs.energy.monthlyNaturalGasGJ ?? 0) * 12;
  const gasScope1TCo2e = (annualGasGJ * emissionFactors.naturalGas.kgCo2ePerGJ) / 1000;
  if (annualGasGJ > 0) {
    warnings.push("Natural gas emission factor is an unconfirmed placeholder (IPCC default) pending team sign-off — see data/emission_factors.json.");
  }

  // ---- Scope 1: fleet + generator fuel ----
  let fuelScope1TCo2e = 0;
  if (inputs.fuelFleet.hasVehicles) {
    let annualLitres = 0;
    if (inputs.fuelFleet.monthlyFuelLitres) {
      annualLitres = inputs.fuelFleet.monthlyFuelLitres * 12;
    } else if (inputs.fuelFleet.monthlyFuelSpendSgd) {
      annualLitres = (inputs.fuelFleet.monthlyFuelSpendSgd / fuelPriceSgdPerUnit(inputs.fuelFleet.fuelType)) * 12;
      warnings.push("Fleet fuel volume was back-calculated from your S$ spend using an indicative pump price — see data/fuel_prices.json.");
    }
    fuelScope1TCo2e += (annualLitres * fuelFactorKgPerLitre(inputs.fuelFleet.fuelType)) / 1000;
  }
  if (inputs.fuelFleet.hasGenerator) {
    let annualLitres = 0;
    if (inputs.fuelFleet.generatorMonthlyFuelLitres) {
      annualLitres = inputs.fuelFleet.generatorMonthlyFuelLitres * 12;
    } else if (inputs.fuelFleet.generatorHoursPerMonth && inputs.fuelFleet.generatorTankSizeLitres) {
      const litresPerHour = inputs.fuelFleet.generatorTankSizeLitres / GENERATOR_TANK_HOURS_ASSUMPTION;
      annualLitres = inputs.fuelFleet.generatorHoursPerMonth * litresPerHour * 12;
      warnings.push("Generator fuel use was estimated from runtime x tank size using a rule-of-thumb consumption rate — not a sourced figure.");
    }
    fuelScope1TCo2e += (annualLitres * emissionFactors.fuels.dieselKgCo2ePerLitre) / 1000;
  }

  // ---- Scope 1: refrigerants (fugitive) ----
  let refrigerantScope1TCo2e = 0;
  if (inputs.refrigerants.hasRefrigerants) {
    if (inputs.refrigerants.refrigerantType && inputs.refrigerants.refrigerantType !== "Unknown") {
      const gwp = refrigerantGwp.gases[inputs.refrigerants.refrigerantType as keyof typeof refrigerantGwp.gases];
      const kg = inputs.refrigerants.refrigerantAnnualTopUpKg ?? 0;
      refrigerantScope1TCo2e = (kg * gwp) / 1000;
      if (inputs.refrigerants.refrigerantType === "R-22") {
        warnings.push(refrigerantGwp.phaseOutNotice["R-22"]);
      }
    } else {
      warnings.push("Refrigerant type is unknown — fugitive emissions were not included. Check your ACMV service records to add this.");
    }
  }

  const baselineScope1TCo2e = gasScope1TCo2e + fuelScope1TCo2e + refrigerantScope1TCo2e;
  const baselineScope2TCo2e = scope2TCo2e;
  const totalScope12TCo2e = baselineScope1TCo2e + baselineScope2TCo2e;

  /**
   * Singapore's carbon tax applies only to a facility's direct (Scope 1)
   * emissions above 25,000 tCO2e/year (~50 large industrial sites). A
   * typical grid-electricity buyer has no separate NEA/IRAS bill — their
   * only exposure is a small pass-through already embedded in the tariff
   * used for the energy-cost-saving line above. Charging a second,
   * full-statutory-rate "carbon tax saving" on top of that for a
   * non-liable client double-counts the same underlying cost mechanism.
   */
  const isLiable = isCarbonTaxLiable(baselineScope1TCo2e);
  if (!isLiable) {
    warnings.push(
      "No separate carbon tax saving is shown: Singapore's carbon tax applies only to ~50 large facilities with ≥25,000 tCO2e/year of direct (Scope 1) emissions. Your exposure is a small pass-through already reflected in the electricity tariff used for the energy saving above — showing it twice would double-count the same cost."
    );
  }

  // ---- Scope 3 (quantified only, spend-based EEIO — PRD Option A) ----
  const fx = scope3Factors.assumptions.fxSgdToUsd;
  const purchasedGoodsMidFactor =
    (scope3Factors.spendBased.purchasedGoodsKgCo2ePerUsd.low + scope3Factors.spendBased.purchasedGoodsKgCo2ePerUsd.high) / 2;

  let logisticsTCo2e = 0;
  if (inputs.scope3.annualLogisticsSpendSgd) {
    const usd = inputs.scope3.annualLogisticsSpendSgd * fx;
    const modeMultiplier =
      inputs.scope3.freightMode === "Air" ? 2.5 : inputs.scope3.freightMode === "Sea" ? 0.5 : 1;
    logisticsTCo2e = (usd * purchasedGoodsMidFactor * modeMultiplier) / 1000;
  }

  let flightsTCo2e = 0;
  if (inputs.scope3.flightsPerYear) {
    const passengerKm = inputs.scope3.flightsPerYear * scope3Factors.assumptions.defaultBusinessFlightRoundTripKm;
    // The default 4,000km round-trip is documented as a "regional hub" assumption (e.g. Singapore-Hong Kong),
    // which is short/medium-haul, not long-haul — DEFRA's short-haul factor is actually higher per km than
    // long-haul (take-off/landing overhead is a bigger share of a shorter flight), so using long-haul here
    // was silently understating this line.
    flightsTCo2e = (passengerKm * scope3Factors.businessTravel.shortHaulEconomyKgCo2ePerPassengerKm) / 1000;
  }

  let purchasedGoodsTCo2e = 0;
  if (inputs.scope3.annualPurchasedGoodsSpendSgd) {
    const usd = inputs.scope3.annualPurchasedGoodsSpendSgd * fx;
    purchasedGoodsTCo2e = (usd * purchasedGoodsMidFactor) / 1000;
  }

  let commutingTCo2e = 0;
  const commutingEmployees = inputs.scope3.employeesCommuting ?? inputs.universal.employeeCount;
  if (commutingEmployees) {
    const roundTripKm = scope3Factors.commuting.singaporeAverageOneWayKm * 2;
    const annualPassengerKm = commutingEmployees * roundTripKm * scope3Factors.commuting.workingDaysPerYear;
    const mode = inputs.scope3.commuteMode ?? "both";
    const factor =
      mode === "public"
        ? scope3Factors.commuting.kgCo2ePerPassengerKm.public
        : mode === "car"
        ? scope3Factors.commuting.kgCo2ePerPassengerKm.car
        : (scope3Factors.commuting.kgCo2ePerPassengerKm.public + scope3Factors.commuting.kgCo2ePerPassengerKm.car) / 2;
    commutingTCo2e = (annualPassengerKm * factor) / 1000;
    warnings.push("Employee commuting uses placeholder per-mode emission factors pending DEFRA-sourced sign-off — see data/scope3_factors.json.");
  }

  const baselineScope3TCo2e = logisticsTCo2e + flightsTCo2e + purchasedGoodsTCo2e + commutingTCo2e;

  // ---- Savings rate from calibration curve (with overrides/discounts) ----
  const energyIntensity = inputs.universal.floorAreaM2
    ? annualElectricityKwh / inputs.universal.floorAreaM2
    : null;
  const { savingRatePct: computedRate, positionLabel } = estimateSavingsRate(inputs.universal.sector, energyIntensity);
  const calibration = getCalibrationCurve(inputs.universal.sector, energyIntensity);

  const intensityAnomaly = checkIntensityAnomaly(inputs.universal.sector, energyIntensity);
  if (intensityAnomaly) warnings.push(intensityAnomaly);

  let savingRatePct = inputs.sensitivity.savingsRateOverridePct ?? computedRate;
  if (!inputs.sensitivity.savingsRateOverridePct) {
    // Block E double-counting adjustment: discount for capability already deployed/underway (any vendor).
    if (inputs.baseline.existingSolutionIds.includes("bms")) {
      savingRatePct *= 0.5;
      warnings.push("Savings rate halved — you already have a building management system in place, so much of this efficiency opportunity is likely already captured.");
    }
    if (inputs.baseline.currentEfficiencyInitiatives.length > 0) {
      const discount = Math.min(inputs.baseline.currentEfficiencyInitiatives.length * 0.03, 0.1);
      savingRatePct = Math.max(savingRatePct - discount, 0.02);
      warnings.push(`Savings rate reduced by ${(discount * 100).toFixed(0)} points to avoid double-counting your existing efficiency initiatives.`);
    }
  }

  if (savingRatePct > 0.4) warnings.push("Estimated savings exceed 40% — unusually high, please verify inputs.");
  if (savingRatePct < 0.05) warnings.push("Estimated savings are below 5% — below the typical minimum threshold for most Schneider solutions.");

  const kwhSaved = netAnnualElectricityKwh * savingRatePct;

  // ---- Grant ----
  const grantValue = Math.min(inputs.estimatedInvestmentSgd * (EEG.coFundRate ?? 0.7), EEG.maxAmountSgd ?? Infinity);
  const netInvestmentSgd = Math.max(inputs.estimatedInvestmentSgd - grantValue, 0);

  // ---- Current annual carbon cost (cover summary) ----
  const currentYearRate = carbonTaxRateForYear(currentYear, inputs.carbonPriceScenario);
  const currentAnnualCarbonCostSgd = isLiable
    ? netAnnualElectricityKwh * tariff + baselineScope1TCo2e * currentYearRate
    : netAnnualElectricityKwh * tariff;

  // ---- Year-by-year projection ----
  const yearRows: YearRow[] = [];
  let cumulativeSavingSgd = 0;
  const escalation = inputs.sensitivity.tariffEscalationPctPerYear;
  for (let year = 1; year <= PROJECTION_YEARS; year++) {
    const calendarYear = currentYear + year - 1;
    const rate = carbonTaxRateForYear(calendarYear, inputs.carbonPriceScenario);
    const gefThisYear = Math.max(GEF_BASE - GEF_ANNUAL_DECLINE * (year - 1), 0.1);
    const carbonAvoidedTCo2e = (kwhSaved * gefThisYear) / 1000;
    const escalatedTariff = tariff * Math.pow(1 + escalation, year - 1);
    const energySavingSgd = kwhSaved * escalatedTariff;
    // Only a genuine direct taxpayer avoids a real NEA/IRAS bill by cutting emissions — see isLiable note above.
    const carbonTaxSavingSgd = isLiable ? carbonAvoidedTCo2e * rate : 0;
    const grantSgd = year === 1 ? grantValue : 0;
    const totalSavingSgd = energySavingSgd + carbonTaxSavingSgd + grantSgd;
    cumulativeSavingSgd += totalSavingSgd;
    const doNothingCarbonTaxSgd = isLiable ? carbonAvoidedTCo2e * rate : 0;
    const differenceSgd = totalSavingSgd + doNothingCarbonTaxSgd;

    yearRows.push({
      year,
      calendarYear,
      energySavingSgd,
      carbonTaxSavingSgd,
      carbonTaxRateUsed: rate,
      grantSgd,
      totalSavingSgd,
      cumulativeSavingSgd,
      carbonAvoidedTCo2e,
      doNothingCarbonTaxSgd,
      differenceSgd,
    });
  }

  // ---- Payback period (linear interpolation across the crossing year) ----
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
  const horizonBound = HORIZON_UPPER_BOUND_YEARS[inputs.baseline.investmentHorizon];
  if (paybackYears !== null && paybackYears > horizonBound) {
    warnings.push(`Payback period (${paybackYears.toFixed(1)}y) exceeds your stated investment horizon (${inputs.baseline.investmentHorizon} years) — consider a smaller-scope solution or phased rollout.`);
  } else if (paybackYears === null && horizonBound < PROJECTION_YEARS) {
    warnings.push(`This investment does not pay back within the 10-year projection at all, let alone your stated investment horizon (${inputs.baseline.investmentHorizon} years) — consider a smaller-scope solution or phased rollout.`);
  }

  // ---- Confidence ----
  const confidenceScore = scoreConfidence(inputs);
  const year1Total = yearRows[0].totalSavingSgd;
  const tenYearTotal = yearRows[yearRows.length - 1].cumulativeSavingSgd;
  const w = confidenceScore.rangeWidthPct;

  // ---- Target comparison ----
  let targetComparison: CalculationResult["targetComparison"] = null;
  if (inputs.baseline.emissionsReductionTargetPct && inputs.baseline.targetYear) {
    const requiredAnnualAvoidedTCo2e = totalScope12TCo2e * (inputs.baseline.emissionsReductionTargetPct / 100);
    const yearsOut = Math.min(Math.max(inputs.baseline.targetYear - currentYear + 1, 1), PROJECTION_YEARS);
    const projectedAnnualAvoidedTCo2e = yearRows[yearsOut - 1].carbonAvoidedTCo2e;
    targetComparison = {
      targetPct: inputs.baseline.emissionsReductionTargetPct,
      targetYear: inputs.baseline.targetYear,
      requiredAnnualAvoidedTCo2e,
      projectedAnnualAvoidedTCo2e,
      onTrack: projectedAnnualAvoidedTCo2e >= requiredAnnualAvoidedTCo2e,
    };
  }

  const staleness = checkStaleness();
  const assumptions = buildAssumptions(inputs, tariff, savingRatePct, isLiable);
  const kpis = buildKpis({
    sector: inputs.universal.sector,
    energyIntensityKwhPerM2: energyIntensity,
    totalScope12TCo2e,
    totalScope3TCo2e: baselineScope3TCo2e,
    employeeCount: inputs.universal.employeeCount,
    annualRevenueSgd: inputs.universal.annualRevenueSgd,
    annualEnergyCostSgd: netAnnualElectricityKwh * tariff,
    currentAnnualCarbonTaxSgd: isLiable ? baselineScope1TCo2e * currentYearRate : 0,
    renewableCoveragePct: annualElectricityKwh > 0 ? (annualSolarKwh / annualElectricityKwh) * 100 : 0,
  });

  const result: CalculationResult = {
    baselineScope1TCo2e,
    baselineScope2TCo2e,
    baselineScope3TCo2e,
    totalScope12TCo2e,
    currentAnnualCarbonCostSgd,
    energySavingRatePct: savingRatePct,
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
      ...buildComplianceFlags(baselineScope1TCo2e, isLiable, true),
      ...buildSharedComplianceFlags(inputs.baseline.isFinancialInstitution, inputs.baseline.isSupplierToSbtiBuyer),
    ],
    products: recommendProducts(inputs),
    scenarioComparison: [],
    staleness,
    targetComparison,
    assumptions,
    kpis,
    narrative: "",
    dataVersion: DATA_VERSION,
    warnings,
  };

  result.narrative = buildNarrative(inputs, result);
  return result;
}
