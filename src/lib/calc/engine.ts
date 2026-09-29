import emissionFactors from "@data/emission_factors.json";
import refrigerantGwp from "@data/refrigerant_gwp.json";
import scope3Factors from "@data/scope3_factors.json";
import tariffConfig from "@data/tariff_config.json";
import grantsData from "@data/grants.json";
import fuelPrices from "@data/fuel_prices.json";

import type { SmeInputs } from "@/lib/types/inputs";
import type { CalculationResult, YearRow } from "@/lib/types/results";
import { carbonTaxRateForYear } from "./carbonTax";
import { estimateSavingsRate, getCalibrationCurve, checkIntensityAnomaly, estimateAnnualKwhFromFloorArea } from "./benchmark";
import { scoreConfidence } from "./confidence";
import { buildComplianceFlags, buildSharedComplianceFlags, isCarbonTaxLiable } from "./compliance";
import { recommendProducts } from "./products";
import { checkStaleness } from "./staleness";
import { buildAssumptions, DATA_VERSION } from "./assumptions";
import { buildKpis } from "./kpi";
import { buildNarrative } from "./narrative";
import {
  getEndUseBreakdown,
  computeEcmSavingsRate,
  estimateInvestmentRange,
  allRemainingEcmIdsForSector,
  rankRemainingEcms,
  computeAlreadyImplementedValue,
} from "./ecm";
import { nonNeg, buildFinalPositionLabel, savingsRateSanityWarnings, fastPaybackWarning } from "./sharedEngineHelpers";

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

/** Implausible even for a large single-site SME — flags the value rather than silently showing a billion-dollar cost with no warning (usability finding H2). */
const IMPLAUSIBLE_ANNUAL_KWH = 200_000_000;

const HORIZON_UPPER_BOUND_YEARS: Record<SmeInputs["baseline"]["investmentHorizon"], number> = {
  "<2": 2,
  "2-5": 5,
  "5+": Infinity,
  none: Infinity,
};

export function calculateSme(inputs: SmeInputs): CalculationResult {
  const warnings: string[] = [];
  const criticalWarnings: string[] = [];
  const currentYear = new Date().getFullYear();
  const tariff = inputs.energy.tariffOverrideSgdPerKwh ?? DEFAULT_TARIFF;
  const gef = inputs.energy.gridEmissionFactorOverrideKgPerKwh ?? GEF_BASE;
  if (inputs.energy.gridEmissionFactorOverrideKgPerKwh !== undefined) {
    warnings.push("A custom grid emission factor is in use instead of the EMA Singapore reference figure — confirm this is the correct factor for your electricity source.");
  }

  // ---- Scope 2: electricity ----
  let annualElectricityKwh = 0;
  const readings = inputs.energy.electricityMonthlyReadings?.filter((v) => Number.isFinite(v) && v > 0);
  if (readings && readings.length > 0) {
    const avgMonthly = readings.reduce((a, b) => a + b, 0) / readings.length;
    annualElectricityKwh = avgMonthly * 12;
  } else if (nonNeg(inputs.energy.monthlyElectricityKwh) > 0) {
    annualElectricityKwh = nonNeg(inputs.energy.monthlyElectricityKwh) * 12;
  } else if (nonNeg(inputs.energy.monthlyElectricitySpendSgd) > 0) {
    annualElectricityKwh = (nonNeg(inputs.energy.monthlyElectricitySpendSgd) / tariff) * 12;
    warnings.push("Electricity consumption was back-calculated from your S$ spend using the reference tariff — this is an estimate.");
  } else {
    const floorAreaEstimate = estimateAnnualKwhFromFloorArea(inputs.universal.sector, inputs.energy.subProfile, nonNeg(inputs.universal.floorAreaM2));
    if (floorAreaEstimate !== null) {
      annualElectricityKwh = floorAreaEstimate;
      warnings.push(
        `No kWh or spend was entered, so electricity consumption was estimated from your floor area (${nonNeg(inputs.universal.floorAreaM2).toLocaleString("en-SG")} m²) × the ${inputs.universal.sector} sector-average energy intensity — this is a rough GFA-based estimate; enter your actual kWh or spend in Scope 2 for an accurate illustration.`
      );
    }
  }
  if (annualElectricityKwh <= 0) {
    criticalWarnings.push(
      "No electricity usage has been entered yet — every figure below only reflects the EEG grant and any fuel/refrigerant data you've added, not real energy savings. Enter your monthly kWh (or spend, or 12 months of readings) in Scope 2 for an accurate illustration."
    );
  } else if (annualElectricityKwh > IMPLAUSIBLE_ANNUAL_KWH) {
    criticalWarnings.push(
      `Your electricity usage (${Math.round(annualElectricityKwh).toLocaleString("en-SG")} kWh/year) is far beyond what a typical facility uses — please double-check the units and figure entered in Scope 2.`
    );
  }
  const annualSolarKwh = inputs.energy.hasSolar ? nonNeg(inputs.energy.solarMonthlyGenerationKwh) * 12 : 0;
  if (inputs.energy.hasSolar && annualSolarKwh === 0) {
    warnings.push("Onsite solar is set to \"Yes\" but no generation figure was entered — 0 kWh of solar credit was applied.");
  }
  const netAnnualElectricityKwh = Math.max(annualElectricityKwh - annualSolarKwh, 0);

  // ---- Clean vs. dirty energy price/emissions split (market-based accounting) ----
  const renewablePct = Math.min(Math.max(inputs.energy.renewableCoveragePct ?? 0, 0), 100) / 100;
  if (inputs.energy.renewableCoveragePct !== undefined && (inputs.energy.renewableCoveragePct < 0 || inputs.energy.renewableCoveragePct > 100)) {
    warnings.push("Renewable coverage % was outside 0-100 — clamped to a valid range for this calculation.");
  }
  const greenPremium = inputs.energy.greenTariffPremiumOverrideSgdPerKwh ?? tariffConfig.greenPremium.typicalSgdPerKwh;
  const dirtyKwh = netAnnualElectricityKwh * (1 - renewablePct);
  const cleanKwh = netAnnualElectricityKwh * renewablePct;
  const dirtyPaymentSgd = dirtyKwh * tariff;
  const cleanPaymentSgd = cleanKwh * (tariff + greenPremium);
  const greenPremiumPaidSgd = cleanKwh * greenPremium;
  if (cleanKwh > 0) {
    warnings.push(`Renewable coverage assumes RECs, a PPA, or a green tariff plan backs that ${(renewablePct * 100).toFixed(0)}% share (market-based accounting) — a ${greenPremium.toFixed(4)} S$/kWh premium is applied on that share; the underlying physical grid mix is unchanged. See "Illustration basis" for the source.`);
  }
  const scope2LocationBasedTCo2e = (netAnnualElectricityKwh * gef) / 1000;
  const scope2TCo2e = (dirtyKwh * gef) / 1000; // market-based — zeroes the REC/PPA/green-tariff-covered share

  // ---- Scope 1: natural gas ----
  const annualGasGJ = nonNeg(inputs.energy.monthlyNaturalGasGJ) * 12;
  const gasScope1TCo2e = (annualGasGJ * emissionFactors.naturalGas.kgCo2ePerGJ) / 1000;
  if (annualGasGJ > 0) {
    warnings.push("Natural gas emission factor is a DEFRA (UK) stand-in — no Singapore-specific SEFR value has been published for natural gas combustion; combustion chemistry doesn't vary materially by country, so this is a reasonable proxy, not an unsourced placeholder — see data/emission_factors.json.");
  }

  // ---- Scope 1: fleet + generator fuel (tracked separately for the per-source breakdown, M6) ----
  let fleetFuelScope1TCo2e = 0;
  if (inputs.fuelFleet.hasVehicles) {
    let annualLitres = 0;
    if (nonNeg(inputs.fuelFleet.monthlyFuelLitres) > 0) {
      annualLitres = nonNeg(inputs.fuelFleet.monthlyFuelLitres) * 12;
    } else if (nonNeg(inputs.fuelFleet.monthlyFuelSpendSgd) > 0) {
      annualLitres = (nonNeg(inputs.fuelFleet.monthlyFuelSpendSgd) / fuelPriceSgdPerUnit(inputs.fuelFleet.fuelType)) * 12;
      warnings.push("Fleet fuel volume was back-calculated from your S$ spend using an indicative pump price — see data/fuel_prices.json.");
    } else {
      warnings.push("Company vehicles is set to \"Yes\" but no fuel litres or spend was entered — 0 fleet fuel emissions were counted.");
    }
    fleetFuelScope1TCo2e = (annualLitres * fuelFactorKgPerLitre(inputs.fuelFleet.fuelType)) / 1000;
  }
  let generatorFuelScope1TCo2e = 0;
  if (inputs.fuelFleet.hasGenerator) {
    let annualLitres = 0;
    if (nonNeg(inputs.fuelFleet.generatorMonthlyFuelLitres) > 0) {
      annualLitres = nonNeg(inputs.fuelFleet.generatorMonthlyFuelLitres) * 12;
    } else if (nonNeg(inputs.fuelFleet.generatorHoursPerMonth) > 0 && nonNeg(inputs.fuelFleet.generatorTankSizeLitres) > 0) {
      const litresPerHour = nonNeg(inputs.fuelFleet.generatorTankSizeLitres) / GENERATOR_TANK_HOURS_ASSUMPTION;
      annualLitres = nonNeg(inputs.fuelFleet.generatorHoursPerMonth) * litresPerHour * 12;
      warnings.push("Generator fuel use was estimated from runtime x tank size using a rule-of-thumb consumption rate — not a sourced figure.");
    } else {
      warnings.push("Diesel backup generator is set to \"Yes\" but no litres, or runtime + tank size, was entered — 0 generator emissions were counted.");
    }
    generatorFuelScope1TCo2e = (annualLitres * emissionFactors.fuels.dieselKgCo2ePerLitre) / 1000;
  }
  const fuelScope1TCo2e = fleetFuelScope1TCo2e + generatorFuelScope1TCo2e;

  // ---- Scope 1: refrigerants (fugitive) ----
  let refrigerantScope1TCo2e = 0;
  if (inputs.refrigerants.hasRefrigerants) {
    if (inputs.refrigerants.refrigerantType && inputs.refrigerants.refrigerantType !== "Unknown") {
      const gwp = refrigerantGwp.gases[inputs.refrigerants.refrigerantType as keyof typeof refrigerantGwp.gases];
      const kg = nonNeg(inputs.refrigerants.refrigerantAnnualTopUpKg);
      refrigerantScope1TCo2e = (kg * gwp) / 1000;
      if (inputs.refrigerants.refrigerantType === "R-22") {
        warnings.push(refrigerantGwp.phaseOutNotice["R-22"]);
      }
      if (kg === 0) {
        warnings.push("Refrigeration equipment is in use but the annual top-up quantity was left blank — 0 kg assumed, so no fugitive emissions were counted. Check your ACMV service records for the actual figure.");
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
  if (nonNeg(inputs.scope3.annualLogisticsSpendSgd) > 0) {
    const usd = nonNeg(inputs.scope3.annualLogisticsSpendSgd) * fx;
    const modeMultiplier =
      inputs.scope3.freightMode === "Air" ? 2.5 : inputs.scope3.freightMode === "Sea" ? 0.5 : 1;
    logisticsTCo2e = (usd * purchasedGoodsMidFactor * modeMultiplier) / 1000;
  }

  let flightsTCo2e = 0;
  if (nonNeg(inputs.scope3.flightsPerYear) > 0) {
    const passengerKm = nonNeg(inputs.scope3.flightsPerYear) * scope3Factors.assumptions.defaultBusinessFlightRoundTripKm;
    // The default 4,000km round-trip is documented as a "regional hub" assumption (e.g. Singapore-Hong Kong),
    // which is short/medium-haul, not long-haul — DEFRA's short-haul factor is actually higher per km than
    // long-haul (take-off/landing overhead is a bigger share of a shorter flight), so using long-haul here
    // was silently understating this line.
    flightsTCo2e = (passengerKm * scope3Factors.businessTravel.shortHaulEconomyKgCo2ePerPassengerKm) / 1000;
  }

  let purchasedGoodsTCo2e = 0;
  if (nonNeg(inputs.scope3.annualPurchasedGoodsSpendSgd) > 0) {
    const usd = nonNeg(inputs.scope3.annualPurchasedGoodsSpendSgd) * fx;
    purchasedGoodsTCo2e = (usd * purchasedGoodsMidFactor) / 1000;
  }

  let commutingTCo2e = 0;
  const commutingEmployees = nonNeg(inputs.scope3.employeesCommuting ?? inputs.universal.employeeCount);
  if (commutingEmployees > 0) {
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
  }

  const baselineScope3TCo2e = logisticsTCo2e + flightsTCo2e + purchasedGoodsTCo2e + commutingTCo2e;

  // ---- Savings rate from calibration curve (with overrides/discounts) ----
  const energyIntensity = inputs.universal.floorAreaM2
    ? annualElectricityKwh / inputs.universal.floorAreaM2
    : null;
  // Data Centre only, and only when the user has supplied an IT-load figure — lets that sector compare
  // on a true PUE basis instead of always falling back to "sector average assumed" (usability finding M5).
  const computedPue =
    inputs.universal.sector === "Data Centre" && nonNeg(inputs.energy.itLoadKwh) > 0 && annualElectricityKwh > 0
      ? annualElectricityKwh / nonNeg(inputs.energy.itLoadKwh)
      : null;
  const { savingRatePct: computedRate, positionLabel } = estimateSavingsRate(
    inputs.universal.sector,
    energyIntensity,
    inputs.energy.subProfile,
    computedPue
  );
  const calibration = getCalibrationCurve(inputs.universal.sector, energyIntensity, inputs.energy.subProfile, computedPue);

  const intensityAnomaly = checkIntensityAnomaly(inputs.universal.sector, energyIntensity, inputs.energy.subProfile, computedPue);
  if (intensityAnomaly) warnings.push(intensityAnomaly);

  // ---- Energy end-use breakdown & ECM-driven bottom-up savings rate ----
  // Savings are now always ECM-driven once a sector has catalog coverage (all 8 named sectors do):
  // the "further opportunity" set is every relevant catalog measure the company hasn't already told
  // us it has. The calibration-curve rate is kept only as positioning context (finalPositionLabel)
  // and as the last-resort fallback for a sector with zero catalog coverage.
  const energyEndUseBreakdown = getEndUseBreakdown(inputs.universal.sector, inputs.energy.subProfile, inputs.energy.customEndUsePct);
  const implementedIds = inputs.baseline.implementedOrInProgressEcmIds;
  const remainingEcmIds = allRemainingEcmIdsForSector(inputs.universal.sector, implementedIds);
  const ecmResult = computeEcmSavingsRate({
    endUseBreakdown: energyEndUseBreakdown,
    selectedEcmIds: remainingEcmIds,
    totalElectricityKwh: netAnnualElectricityKwh,
    tariffSgdPerKwh: tariff,
  });
  const alreadyImplementedEcm = computeAlreadyImplementedValue(energyEndUseBreakdown, implementedIds, netAnnualElectricityKwh, tariff);
  const topEcmRecommendations = rankRemainingEcms(inputs.universal.sector, energyEndUseBreakdown, implementedIds, netAnnualElectricityKwh, tariff);

  const savingRatePct = inputs.sensitivity.savingsRateOverridePct ?? ecmResult?.ratePctMid ?? computedRate;

  // The sector-position label (e.g. "worst quartile") describes where the calibration curve places this
  // business — but when an ECM-derived or manual rate is actually used, showing that label next to a
  // different % read as contradictory (usability finding M1). buildFinalPositionLabel makes the
  // relationship explicit and always states the assumed rate exactly once (shared with mncEngine.ts).
  const finalPositionLabel = buildFinalPositionLabel(positionLabel, computedRate, ecmResult, inputs.sensitivity.savingsRateOverridePct);

  warnings.push(...savingsRateSanityWarnings(savingRatePct));

  const kwhSaved = netAnnualElectricityKwh * savingRatePct;

  // ---- Grant ----
  // Deliberately NOT applied to the savings/payback math: grant eligibility and the actual awarded
  // amount are assessed case-by-case by EnterpriseSG, not a constant every applicant receives — folding
  // it into the headline figures would overstate the confidence of a number that isn't guaranteed.
  // Surfaced only as an informational note (below) and in "Illustration basis & assumptions".
  const netInvestmentSgd = inputs.estimatedInvestmentSgd;
  warnings.push(
    `An EEG grant (EnterpriseSG, up to S$${(EEG.maxAmountSgd ?? 0).toLocaleString("en-SG")}, ${((EEG.coFundRate ?? 0.7) * 100).toFixed(0)}% co-fund) may be available depending on eligibility — not included in the savings or payback figures above, since the award amount and eligibility are assessed case-by-case, not a constant every applicant receives. Confirm eligibility with a Schneider advisor.`
  );

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

  // ---- Current annual carbon cost (cover summary) ----
  const totalElectricityCostSgd = dirtyPaymentSgd + cleanPaymentSgd;
  const currentYearRate = carbonTaxRateForYear(currentYear, inputs.carbonPriceScenario);
  const currentAnnualCarbonCostSgd = isLiable
    ? totalElectricityCostSgd + baselineScope1TCo2e * currentYearRate
    : totalElectricityCostSgd;

  // ---- Year-by-year projection ----
  const yearRows: YearRow[] = [];
  let cumulativeSavingSgd = 0;
  const escalation = inputs.energy.tariffEscalationPctPerYear;
  for (let year = 1; year <= PROJECTION_YEARS; year++) {
    const calendarYear = currentYear + year - 1;
    const rate = carbonTaxRateForYear(calendarYear, inputs.carbonPriceScenario);
    const gefThisYear = Math.max(gef - GEF_ANNUAL_DECLINE * (year - 1), 0.1);
    const carbonAvoidedTCo2e = (kwhSaved * (1 - renewablePct) * gefThisYear) / 1000;
    const escalatedTariff = tariff * Math.pow(1 + escalation, year - 1);
    const blendedEffectiveRate = (1 - renewablePct) * escalatedTariff + renewablePct * (escalatedTariff + greenPremium);
    const energySavingSgd = kwhSaved * blendedEffectiveRate;
    // Only a genuine direct taxpayer avoids a real NEA/IRAS bill by cutting emissions — see isLiable note above.
    const carbonTaxSavingSgd = isLiable ? carbonAvoidedTCo2e * rate : 0;
    // Grant is intentionally excluded from totals — see the note above.
    const grantSgd = 0;
    const totalSavingSgd = energySavingSgd + carbonTaxSavingSgd + grantSgd;
    cumulativeSavingSgd += totalSavingSgd;

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

  const fastPaybackMsg = fastPaybackWarning(paybackYears);
  if (fastPaybackMsg) warnings.push(fastPaybackMsg);
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
  let w = confidenceScore.rangeWidthPct;
  if (ecmResult && ecmResult.ratePctMid > 0) {
    // Naming specific sourced measures narrows the range if it's tighter than the generic data-quality-based one.
    const ecmWidthPct = (ecmResult.ratePctHigh - ecmResult.ratePctLow) / (2 * ecmResult.ratePctMid);
    if (ecmWidthPct < w) w = ecmWidthPct;
  }

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

  if (inputs.baseline.otherMeasuresText) {
    warnings.push(`You noted you already have: "${inputs.baseline.otherMeasuresText}" — shown here as context only, not scored against your recommendations.`);
  }

  const staleness = checkStaleness();
  const assumptions = buildAssumptions(inputs, tariff, gef, savingRatePct, isLiable);
  const kpis = buildKpis({
    sector: inputs.universal.sector,
    subProfile: inputs.energy.subProfile,
    pue: computedPue,
    energyIntensityKwhPerM2: energyIntensity,
    totalScope12TCo2e,
    totalScope3TCo2e: baselineScope3TCo2e,
    employeeCount: inputs.universal.employeeCount,
    annualRevenueSgd: inputs.universal.annualRevenueSgd,
    annualEnergyCostSgd: totalElectricityCostSgd,
    currentAnnualCarbonTaxSgd: isLiable ? baselineScope1TCo2e * currentYearRate : 0,
    renewableCoveragePct: annualElectricityKwh > 0 ? ((annualSolarKwh + cleanKwh) / annualElectricityKwh) * 100 : 0,
  });

  const result: CalculationResult = {
    baselineScope1TCo2e,
    baselineScope2TCo2e,
    baselineScope3TCo2e,
    totalScope12TCo2e,
    currentAnnualCarbonCostSgd,
    energySavingRatePct: savingRatePct,
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
    criticalWarnings,
    energyEndUseBreakdown,
    energyCostBreakdown: {
      dirtyKwh,
      cleanKwh,
      dirtyPaymentSgd,
      cleanPaymentSgd,
      greenPremiumPaidSgd,
      scope2LocationBasedTCo2e,
      scope2MarketBasedTCo2e: scope2TCo2e,
    },
    ecmResult,
    emissionsBreakdown: {
      scope1BySource: [
        { id: "gas", label: "Natural gas", tCo2e: gasScope1TCo2e },
        { id: "fleet-fuel", label: "Fleet fuel", tCo2e: fleetFuelScope1TCo2e },
        { id: "generator", label: "Backup generator", tCo2e: generatorFuelScope1TCo2e },
        { id: "refrigerants", label: "Refrigerants (fugitive)", tCo2e: refrigerantScope1TCo2e },
      ].filter((s) => s.tCo2e > 0),
      scope3ByCategory: [
        { id: "freight", label: "Logistics / freight", tCo2e: logisticsTCo2e },
        { id: "flights", label: "Business flights", tCo2e: flightsTCo2e },
        { id: "purchased-goods", label: "Purchased goods", tCo2e: purchasedGoodsTCo2e },
        { id: "commuting", label: "Employee commuting", tCo2e: commutingTCo2e },
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

  result.narrative = buildNarrative(inputs, result);
  return result;
}
