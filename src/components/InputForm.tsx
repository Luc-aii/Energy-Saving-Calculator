"use client";

import type { Dispatch, SetStateAction } from "react";
import type { Sector, SmeInputs } from "@/lib/types/inputs";
import { FieldRow, SectionCard, inputClass, checkboxInputClass, checkboxLabelClass } from "./FormField";
import { AiGuidedInput } from "./AiGuidedInput";
import { BillUploadPanel } from "./BillUploadPanel";
import { EnergyEndUseChart } from "./EnergyEndUseChart";
import { EcmMultiSelect } from "./EcmMultiSelect";
import { EcmAiMatch } from "./EcmAiMatch";
import { Advanced } from "./ui/Advanced";
import { NumberInput } from "./ui/NumberInput";
import { getEndUseBreakdown, subProfileOptions, subProfileYesNoQuestion, getTopEndUse } from "@/lib/calc/ecm";
import { SectorSpotlight } from "./SectorSpotlight";

const SECTORS: Sector[] = [
  "Manufacturing",
  "Hospitality",
  "F&B",
  "Retail",
  "Office/Professional Services",
  "Healthcare",
  "Logistics",
  "Data Centre",
  "Other",
];

interface Props {
  inputs: SmeInputs;
  setInputs: Dispatch<SetStateAction<SmeInputs>>;
  /** Which wizard step to render: 0 = your business, 1 = energy & fuel. */
  step: number;
}

export const SME_INPUT_STEPS = ["Your business", "Energy & fuel"];

/**
 * Every numeric field on this form is a physical quantity or a dollar amount
 * — none of them can legitimately be negative — so this clamps at the
 * source rather than letting a mistyped "-5000" flow into the engine, where
 * only an explicit `> 0` check (not a truthiness check) would have caught it
 * (usability finding H2).
 */
function numOrUndef(v: string): number | undefined {
  if (v === "") return undefined;
  const n = Number(v);
  if (Number.isNaN(n)) return undefined;
  return Math.max(n, 0);
}

export function InputForm({ inputs, setInputs, step }: Props) {
  const patch = <K extends keyof SmeInputs>(key: K, value: SmeInputs[K]) =>
    setInputs((prev) => ({ ...prev, [key]: value }));

  const patchUniversal = <K extends keyof SmeInputs["universal"]>(key: K, value: SmeInputs["universal"][K]) =>
    setInputs((prev) => ({ ...prev, universal: { ...prev.universal, [key]: value } }));

  const patchEnergy = <K extends keyof SmeInputs["energy"]>(key: K, value: SmeInputs["energy"][K]) =>
    setInputs((prev) => ({ ...prev, energy: { ...prev.energy, [key]: value } }));

  const patchFuel = <K extends keyof SmeInputs["fuelFleet"]>(key: K, value: SmeInputs["fuelFleet"][K]) =>
    setInputs((prev) => ({ ...prev, fuelFleet: { ...prev.fuelFleet, [key]: value } }));

  const patchRefrigerants = <K extends keyof SmeInputs["refrigerants"]>(key: K, value: SmeInputs["refrigerants"][K]) =>
    setInputs((prev) => ({ ...prev, refrigerants: { ...prev.refrigerants, [key]: value } }));

  const patchScope3 = <K extends keyof SmeInputs["scope3"]>(key: K, value: SmeInputs["scope3"][K]) =>
    setInputs((prev) => ({ ...prev, scope3: { ...prev.scope3, [key]: value } }));

  const patchBaseline = <K extends keyof SmeInputs["baseline"]>(key: K, value: SmeInputs["baseline"][K]) =>
    setInputs((prev) => ({ ...prev, baseline: { ...prev.baseline, [key]: value } }));

  const patchSensitivity = <K extends keyof SmeInputs["sensitivity"]>(key: K, value: SmeInputs["sensitivity"][K]) =>
    setInputs((prev) => ({ ...prev, sensitivity: { ...prev.sensitivity, [key]: value } }));

  const toggleEcm = (id: string) => {
    const set = new Set(inputs.baseline.implementedOrInProgressEcmIds);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    patchBaseline("implementedOrInProgressEcmIds", Array.from(set));
  };

  const showEndUseCustomizer = inputs.energy.customEndUsePct !== undefined;
  const endUseBreakdown = getEndUseBreakdown(inputs.universal.sector, inputs.energy.subProfile, inputs.energy.customEndUsePct);
  const patchEndUsePct = (id: string, pct: number) => {
    const next = { ...(inputs.energy.customEndUsePct ?? Object.fromEntries(endUseBreakdown.map((e) => [e.id, e.pct]))) };
    next[id] = pct;
    patchEnergy("customEndUsePct", next);
  };
  const subProfiles = subProfileOptions(inputs.universal.sector);
  const subProfileQuestion = subProfileYesNoQuestion(inputs.universal.sector);
  const topEndUse = getTopEndUse(endUseBreakdown);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-ink-soft">
        <span className="text-red-500">*</span> required — everything else is optional and can be refined later.
      </p>
      {step === 0 && <AiGuidedInput setInputs={setInputs} />}
      {step === 1 && <BillUploadPanel setInputs={setInputs} />}

      {step === 0 && (
      <SectionCard title="Your business" subtitle="Sets your benchmark and scenario">
        <FieldRow label="Company name">
          <input
            className={inputClass}
            value={inputs.universal.companyName}
            onChange={(e) => patchUniversal("companyName", e.target.value)}
          />
        </FieldRow>
        <FieldRow label="Industry sector" required>
          <select
            className={inputClass}
            value={inputs.universal.sector}
            onChange={(e) => patchUniversal("sector", e.target.value as Sector)}
          >
            {SECTORS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </FieldRow>
        <FieldRow label="Number of sites" hint="Descriptive only — doesn't change your $ savings, payback or CO2e figures">
          <NumberInput
            min={1}
            className={inputClass}
            value={inputs.universal.numberOfSites}
            onChange={(n) => patchUniversal("numberOfSites", Math.max(n, 1))}
          />
        </FieldRow>
        <FieldRow label="Floor area (m²)" hint="Feeds the energy-intensity benchmark below. If you leave both kWh and S$ spend blank further down, it also becomes the basis for estimating your electricity use itself — and therefore your $ savings, payback and CO2e — so it's worth entering accurately even though it's optional.">
          <input
            type="number"
            className={inputClass}
            value={inputs.universal.floorAreaM2 ?? ""}
            onChange={(e) => patchUniversal("floorAreaM2", numOrUndef(e.target.value))}
          />
        </FieldRow>
        <FieldRow label="Number of employees" hint="Optional — powers the carbon-per-employee KPI and defaults the commuting count in Advanced if left blank">
          <input
            type="number"
            className={inputClass}
            value={inputs.universal.employeeCount ?? ""}
            onChange={(e) => patchUniversal("employeeCount", numOrUndef(e.target.value))}
          />
        </FieldRow>
        <FieldRow label="Estimated solution investment (S$)" hint="Adjustable — default guess, refine with a Schneider advisor" required>
          <NumberInput className={inputClass} value={inputs.estimatedInvestmentSgd} onChange={(n) => patch("estimatedInvestmentSgd", n)} />
        </FieldRow>
        <div className="sm:col-span-2 flex flex-col gap-2.5">
          <p className="text-sm font-medium text-ink">Already implemented or in progress</p>
          <p className="-mt-1.5 text-xs text-ink-soft">
            Select or type any measures you already have, or are actively rolling out — just what&apos;s in place, no recommendations here.
            <strong className="font-semibold text-ink"> This directly changes your savings rate</strong>: each measure ticked here is removed
            from the further-opportunity pool below, so your Top 3 and $ savings figures shift to reflect what&apos;s genuinely still available.
          </p>
          <EcmMultiSelect sector={inputs.universal.sector} selectedIds={inputs.baseline.implementedOrInProgressEcmIds} onToggle={toggleEcm} />
        </div>
        <div className="sm:col-span-2 flex flex-col gap-2">
          <FieldRow label="Anything else already in place? (optional)" hint="Free text — on its own, just context. Use the AI match below to check it against the catalog above.">
            <input
              className={inputClass}
              placeholder="e.g. Siemens Desigo BMS installed 2022"
              value={inputs.baseline.otherMeasuresText ?? ""}
              onChange={(e) => patchBaseline("otherMeasuresText", e.target.value || undefined)}
            />
          </FieldRow>
          <EcmAiMatch
            sector={inputs.universal.sector}
            text={inputs.baseline.otherMeasuresText}
            selectedIds={inputs.baseline.implementedOrInProgressEcmIds}
            onToggle={toggleEcm}
            mode="sme"
          />
        </div>
        <Advanced title="Advanced / optional">
          <FieldRow label="Annual revenue (S$)" hint="Powers one KPI card only (energy cost as % of revenue) — no effect on $ savings, payback or CO2e.">
            <input
              type="number"
              className={inputClass}
              value={inputs.universal.annualRevenueSgd ?? ""}
              onChange={(e) => patchUniversal("annualRevenueSgd", numOrUndef(e.target.value))}
            />
          </FieldRow>
          <FieldRow label="2030 carbon price scenario" hint="Only matters if your direct emissions are large enough to be carbon-tax-liable (rare for most SMEs) — otherwise it only reshapes the carbon-price trajectory chart, not your $ savings.">
            <select
              className={inputClass}
              value={inputs.carbonPriceScenario}
              onChange={(e) => patch("carbonPriceScenario", e.target.value as SmeInputs["carbonPriceScenario"])}
            >
              <option value="conservative">Conservative — S$50/t</option>
              <option value="base">Base case — S$65/t</option>
              <option value="optimistic">Optimistic — S$80/t</option>
            </select>
          </FieldRow>
        </Advanced>
      </SectionCard>
      )}

      {step === 1 && (
      <>
      <SectionCard title="Scope 2 — Electricity" subtitle="What power do you purchase? (monthly)">
        <FieldRow label="Monthly electricity (kWh)" hint="Latest bill — used if no 12-month history is entered below. If left blank, we fall back to the S$ spend field, then a floor-area estimate — but this is the most accurate source." required>
          <input
            type="number"
            className={inputClass}
            value={inputs.energy.monthlyElectricityKwh ?? ""}
            onChange={(e) => patchEnergy("monthlyElectricityKwh", numOrUndef(e.target.value))}
          />
        </FieldRow>
        <FieldRow label="Or: monthly electricity spend (S$)" hint="Used only if kWh is unknown — back-calculated at the reference tariff">
          <input
            type="number"
            className={inputClass}
            value={inputs.energy.monthlyElectricitySpendSgd ?? ""}
            onChange={(e) => patchEnergy("monthlyElectricitySpendSgd", numOrUndef(e.target.value))}
          />
        </FieldRow>
        {inputs.universal.sector === "Data Centre" && (
          <FieldRow label="Annual IT load (kWh)" hint="Optional — lets us compute a true PUE (total kWh ÷ IT load) instead of assuming a sector average">
            <input
              type="number"
              min={0}
              className={inputClass}
              value={inputs.energy.itLoadKwh ?? ""}
              onChange={(e) => patchEnergy("itLoadKwh", numOrUndef(e.target.value))}
            />
          </FieldRow>
        )}
        <FieldRow label="Onsite solar generation?" hint="Also recommends the Microgrid/EaaS product below if yes">
          <select
            className={inputClass}
            value={inputs.energy.hasSolar ? "yes" : "no"}
            onChange={(e) => patchEnergy("hasSolar", e.target.value === "yes")}
          >
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </FieldRow>
        {inputs.energy.hasSolar && (
          <FieldRow label="Monthly solar generation (kWh)" hint="Nets off your electricity use before any savings math runs — directly lowers your current cost and the base your $ savings are calculated from. Leave blank = 0 kWh credited.">
            <input
              type="number"
              className={inputClass}
              value={inputs.energy.solarMonthlyGenerationKwh ?? ""}
              onChange={(e) => patchEnergy("solarMonthlyGenerationKwh", numOrUndef(e.target.value))}
            />
          </FieldRow>
        )}
        <FieldRow label="Monthly natural gas (GJ)" hint="Adds to your Scope 1 emissions total only — doesn't affect $ savings or payback. Leave blank if not applicable.">
          <input
            type="number"
            className={inputClass}
            value={inputs.energy.monthlyNaturalGasGJ ?? ""}
            onChange={(e) => patchEnergy("monthlyNaturalGasGJ", numOrUndef(e.target.value))}
          />
        </FieldRow>
        {subProfileQuestion && (
          <FieldRow label={subProfileQuestion.question} hint="Tailors your energy breakdown and ECM recommendations to match">
            <select
              className={inputClass}
              value={inputs.energy.subProfile === subProfileQuestion.id ? "yes" : "no"}
              onChange={(e) => patchEnergy("subProfile", e.target.value === "yes" ? subProfileQuestion.id : "default")}
            >
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </FieldRow>
        )}
        {!subProfileQuestion && subProfiles.length > 1 && (
          <FieldRow label="Energy profile" hint="Changes the sector's typical energy end-use split shown below">
            <select
              className={inputClass}
              value={inputs.energy.subProfile ?? "default"}
              onChange={(e) => patchEnergy("subProfile", e.target.value)}
            >
              {subProfiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </FieldRow>
        )}
        <div className="sm:col-span-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-ink">Where your energy goes</p>
            <button
              type="button"
              className="text-xs font-medium text-brand-600 hover:underline"
              onClick={() =>
                patchEnergy(
                  "customEndUsePct",
                  showEndUseCustomizer ? undefined : Object.fromEntries(endUseBreakdown.map((e) => [e.id, e.pct]))
                )
              }
            >
              {showEndUseCustomizer ? "Reset to sector default" : "Customize this breakdown"}
            </button>
          </div>
          <p className="mb-2 mt-0.5 text-xs text-ink-soft">
            Sector-typical split (indicative, international benchmark) — feeds the Energy Conservation Measure recommendations in the next step.
          </p>
          <SectorSpotlight sector={inputs.universal.sector} topEndUse={topEndUse} />
          {!showEndUseCustomizer && <EnergyEndUseChart items={endUseBreakdown} />}
          {showEndUseCustomizer && (
            <div className="flex flex-col gap-2">
              {endUseBreakdown.map((item) => (
                <FieldRow key={item.id} label={item.label}>
                  <NumberInput
                    min={0}
                    max={100}
                    className={inputClass}
                    value={Math.round(item.pct)}
                    onChange={(n) => patchEndUsePct(item.id, Math.min(n, 100))}
                  />
                </FieldRow>
              ))}
              <p className="text-[10px] text-ink-soft">Normalized to 100% automatically, even if your entries don&apos;t add up exactly.</p>
            </div>
          )}
        </div>
      </SectionCard>

      <SectionCard
        title="Scope 1 — Fuel, Fleet & Refrigerants"
        subtitle="What do you burn or run onsite? These feed your Scope 1 emissions total and regulatory-exposure check below — they don't move your $ savings or payback figures unless your direct emissions are large enough to be carbon-tax-liable (~50 large facilities nationally)."
      >
        <FieldRow label="Do you operate company vehicles?">
          <select
            className={inputClass}
            value={inputs.fuelFleet.hasVehicles ? "yes" : "no"}
            onChange={(e) => patchFuel("hasVehicles", e.target.value === "yes")}
          >
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </FieldRow>
        {inputs.fuelFleet.hasVehicles && (
          <>
            <FieldRow label="Monthly fuel consumption (litres)" hint="Leave blank if unknown — use the spend field below instead, or fleet fuel emissions will show as zero">
              <input
                type="number"
                className={inputClass}
                value={inputs.fuelFleet.monthlyFuelLitres ?? ""}
                onChange={(e) => patchFuel("monthlyFuelLitres", numOrUndef(e.target.value))}
              />
            </FieldRow>
            <FieldRow label="Or: monthly fuel spend (S$)" hint="Used only if litres above is left blank — back-calculated at an indicative pump price">
              <input
                type="number"
                className={inputClass}
                value={inputs.fuelFleet.monthlyFuelSpendSgd ?? ""}
                onChange={(e) => patchFuel("monthlyFuelSpendSgd", numOrUndef(e.target.value))}
              />
            </FieldRow>
            <FieldRow label="Fuel type">
              <select
                className={inputClass}
                value={inputs.fuelFleet.fuelType ?? "diesel"}
                onChange={(e) => patchFuel("fuelType", e.target.value as SmeInputs["fuelFleet"]["fuelType"])}
              >
                <option value="diesel">Diesel</option>
                <option value="petrol">Petrol</option>
                <option value="cng">CNG</option>
              </select>
            </FieldRow>
          </>
        )}
        <FieldRow label="Diesel backup generator?">
          <select
            className={inputClass}
            value={inputs.fuelFleet.hasGenerator ? "yes" : "no"}
            onChange={(e) => patchFuel("hasGenerator", e.target.value === "yes")}
          >
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </FieldRow>
        {inputs.fuelFleet.hasGenerator && (
          <FieldRow label="Generator monthly diesel (litres)" hint="Leave blank to estimate from runtime + tank size in Advanced below">
            <input
              type="number"
              className={inputClass}
              value={inputs.fuelFleet.generatorMonthlyFuelLitres ?? ""}
              onChange={(e) => patchFuel("generatorMonthlyFuelLitres", numOrUndef(e.target.value))}
            />
          </FieldRow>
        )}
        <FieldRow label="Use refrigeration / aircon equipment?">
          <select
            className={inputClass}
            value={inputs.refrigerants.hasRefrigerants ? "yes" : "no"}
            onChange={(e) => patchRefrigerants("hasRefrigerants", e.target.value === "yes")}
          >
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </FieldRow>
        {inputs.refrigerants.hasRefrigerants && (
          <>
            <FieldRow label="Refrigerant type" hint="Select Unknown if you're not sure — fugitive emissions won't be counted until you confirm the gas type">
              <select
                className={inputClass}
                value={inputs.refrigerants.refrigerantType ?? "Unknown"}
                onChange={(e) =>
                  patchRefrigerants("refrigerantType", e.target.value as SmeInputs["refrigerants"]["refrigerantType"])
                }
              >
                <option value="R-410A">R-410A</option>
                <option value="R-32">R-32</option>
                <option value="R-134a">R-134a</option>
                <option value="R-22">R-22 (phased out)</option>
                <option value="Unknown">Unknown</option>
              </select>
            </FieldRow>
            <FieldRow label="Annual top-up quantity (kg)" hint="Leave blank = 0 kg assumed (no fugitive emissions counted)">
              <input
                type="number"
                className={inputClass}
                value={inputs.refrigerants.refrigerantAnnualTopUpKg ?? ""}
                onChange={(e) => patchRefrigerants("refrigerantAnnualTopUpKg", numOrUndef(e.target.value))}
              />
            </FieldRow>
          </>
        )}
        <Advanced title="Advanced / optional">
          <FieldRow label="Or: fleet hours run / month" hint="Optional alternative — only used with tank size below if diesel litres above is left blank">
            <input
              type="number"
              className={inputClass}
              value={inputs.fuelFleet.generatorHoursPerMonth ?? ""}
              onChange={(e) => patchFuel("generatorHoursPerMonth", numOrUndef(e.target.value))}
            />
          </FieldRow>
          <FieldRow label="Tank size (litres)" hint="Optional alternative — pairs with hours run/month above">
            <input
              type="number"
              className={inputClass}
              value={inputs.fuelFleet.generatorTankSizeLitres ?? ""}
              onChange={(e) => patchFuel("generatorTankSizeLitres", numOrUndef(e.target.value))}
            />
          </FieldRow>
          <FieldRow label="Number of vehicles" hint="Optional — shown in your summary text only">
            <input
              type="number"
              className={inputClass}
              value={inputs.fuelFleet.numberOfVehicles ?? ""}
              onChange={(e) => patchFuel("numberOfVehicles", numOrUndef(e.target.value))}
            />
          </FieldRow>
        </Advanced>
      </SectionCard>

      <SectionCard title="Targets & advanced settings" subtitle="Overrides, targets, compliance & optional Scope 3">
        <Advanced title="Advanced / optional" subtitle="Overrides, targets & Scope 3">
          <FieldRow label="Electricity tariff override (S$/kWh)" hint="High impact — this is the S$/kWh multiplier behind every $ figure on your results (energy cost, savings, payback). Leave blank to use the current reference tariff.">
            <input
              type="number"
              step="0.01"
              min={0.2}
              max={0.45}
              className={inputClass}
              value={inputs.energy.tariffOverrideSgdPerKwh ?? ""}
              onChange={(e) => patchEnergy("tariffOverrideSgdPerKwh", numOrUndef(e.target.value))}
            />
          </FieldRow>
          <FieldRow label="Grid emission factor override (kg CO2/kWh)" hint="Scales every tCO2e figure (Scope 2, carbon avoided) proportionally — no effect on $ figures. Leave blank to use the EMA Singapore reference figure (0.402).">
            <input
              type="number"
              step="0.001"
              min={0}
              className={inputClass}
              value={inputs.energy.gridEmissionFactorOverrideKgPerKwh ?? ""}
              onChange={(e) => patchEnergy("gridEmissionFactorOverrideKgPerKwh", numOrUndef(e.target.value))}
            />
          </FieldRow>
          <FieldRow label={`Tariff escalation (%/year): ${(inputs.energy.tariffEscalationPctPerYear * 100).toFixed(1)}%`} hint="Compounds into every future year — the main driver of how much bigger your 10-year cumulative saving looks vs. Year 1. How much you expect your electricity tariff to rise annually.">
            <input
              type="range"
              min={0}
              max={5}
              step={0.5}
              value={inputs.energy.tariffEscalationPctPerYear * 100}
              onChange={(e) => patchEnergy("tariffEscalationPctPerYear", Number(e.target.value) / 100)}
            />
          </FieldRow>
          <FieldRow
            label={`Renewable / green tariff coverage: ${inputs.energy.renewableCoveragePct ?? 0}%`}
            hint="Two effects: splits your cost into a clean share (priced with a premium) and dirty share, and — since already-clean kWh can't avoid additional emissions — lowers the CO2e-avoided figure your savings measures can claim. % of your grid electricity covered by RECs, a PPA, or a green tariff plan (not onsite solar)."
          >
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={inputs.energy.renewableCoveragePct ?? 0}
              onChange={(e) => patchEnergy("renewableCoveragePct", Number(e.target.value))}
            />
          </FieldRow>
          {(inputs.energy.renewableCoveragePct ?? 0) > 0 && (
            <FieldRow label="Green tariff premium override (S$/kWh)" hint="Minor $ effect — only changes the cost of your renewable-covered share above. Leave blank to use the typical Singapore market premium.">
              <input
                type="number"
                step="0.001"
                min={0}
                className={inputClass}
                value={inputs.energy.greenTariffPremiumOverrideSgdPerKwh ?? ""}
                onChange={(e) => patchEnergy("greenTariffPremiumOverrideSgdPerKwh", numOrUndef(e.target.value))}
              />
            </FieldRow>
          )}
          <FieldRow label="Preferred investment horizon" hint="Doesn't change your payback number — only triggers a warning below if the computed payback exceeds this.">
            <select
              className={inputClass}
              value={inputs.baseline.investmentHorizon}
              onChange={(e) => patchBaseline("investmentHorizon", e.target.value as SmeInputs["baseline"]["investmentHorizon"])}
            >
              <option value="<2">Under 2 years</option>
              <option value="2-5">2–5 years</option>
              <option value="5+">5+ years</option>
              <option value="none">No preference</option>
            </select>
          </FieldRow>
          <FieldRow label="Emissions reduction target (%)" hint="Feeds a separate 'on track for your target' comparison only — doesn't change your $ savings, payback or the CO2e-avoided figure itself. Optional — e.g. 30 for '30% by 2030'.">
            <input
              type="number"
              className={inputClass}
              value={inputs.baseline.emissionsReductionTargetPct ?? ""}
              onChange={(e) => patchBaseline("emissionsReductionTargetPct", numOrUndef(e.target.value))}
            />
          </FieldRow>
          <FieldRow label="Target year" hint="Optional — needed together with the target % above; same no-effect-on-$-savings scope.">
            <input
              type="number"
              className={inputClass}
              value={inputs.baseline.targetYear ?? ""}
              onChange={(e) => patchBaseline("targetYear", numOrUndef(e.target.value))}
            />
          </FieldRow>
          <FieldRow label="Manual savings rate override (%)" hint="Highest-impact field on this page if set: it completely replaces the ECM-driven savings rate above (and everything computed from it — $ savings, payback, CO2e avoided) with a flat % you choose. Leave blank to use the ECM-driven estimate instead.">
            <input
              type="number"
              min={5}
              max={40}
              className={inputClass}
              value={inputs.sensitivity.savingsRateOverridePct ? Math.round(inputs.sensitivity.savingsRateOverridePct * 100) : ""}
              onChange={(e) => {
                const v = numOrUndef(e.target.value);
                patchSensitivity("savingsRateOverridePct", v !== undefined ? v / 100 : undefined);
              }}
            />
          </FieldRow>
          <div className="sm:col-span-2 flex flex-wrap gap-x-5 gap-y-2.5">
            <label className={checkboxLabelClass}>
              <input
                type="checkbox"
                className={checkboxInputClass}
                checked={inputs.baseline.isFinancialInstitution}
                onChange={(e) => patchBaseline("isFinancialInstitution", e.target.checked)}
              />
              MAS-regulated financial institution — adds a compliance flag only, no effect on $ figures
            </label>
            <label className={checkboxLabelClass}>
              <input
                type="checkbox"
                className={checkboxInputClass}
                checked={inputs.baseline.isSupplierToSbtiBuyer}
                onChange={(e) => patchBaseline("isSupplierToSbtiBuyer", e.target.checked)}
              />
              Supplier to an SBTi-committed buyer — adds a compliance flag only, no effect on $ figures
            </label>
          </div>

          <div className="sm:col-span-2">
            <Advanced title="Scope 3 (optional)" subtitle="Informational only — not included in $ savings">
              <FieldRow label="Annual logistics/freight spend (S$)" hint="Optional — leave blank if you don't track freight spend separately">
                <input
                  type="number"
                  className={inputClass}
                  value={inputs.scope3.annualLogisticsSpendSgd ?? ""}
                  onChange={(e) => patchScope3("annualLogisticsSpendSgd", numOrUndef(e.target.value))}
                />
              </FieldRow>
              <FieldRow label="Primary freight mode" hint="Only matters if you entered a freight spend above">
                <select
                  className={inputClass}
                  value={inputs.scope3.freightMode ?? "Road"}
                  onChange={(e) => patchScope3("freightMode", e.target.value as SmeInputs["scope3"]["freightMode"])}
                >
                  <option value="Road">Road</option>
                  <option value="Sea">Sea</option>
                  <option value="Air">Air</option>
                  <option value="Mixed">Mixed</option>
                </select>
              </FieldRow>
              <FieldRow label="Business flights per year" hint="Optional">
                <input
                  type="number"
                  className={inputClass}
                  value={inputs.scope3.flightsPerYear ?? ""}
                  onChange={(e) => patchScope3("flightsPerYear", numOrUndef(e.target.value))}
                />
              </FieldRow>
              <FieldRow label="Annual purchased goods spend (S$)" hint="Optional">
                <input
                  type="number"
                  className={inputClass}
                  value={inputs.scope3.annualPurchasedGoodsSpendSgd ?? ""}
                  onChange={(e) => patchScope3("annualPurchasedGoodsSpendSgd", numOrUndef(e.target.value))}
                />
              </FieldRow>
              <FieldRow label="Employees commuting" hint="Defaults to your total employee count">
                <input
                  type="number"
                  className={inputClass}
                  value={inputs.scope3.employeesCommuting ?? ""}
                  onChange={(e) => patchScope3("employeesCommuting", numOrUndef(e.target.value))}
                />
              </FieldRow>
              <FieldRow label="Dominant commute mode">
                <select
                  className={inputClass}
                  value={inputs.scope3.commuteMode ?? "both"}
                  onChange={(e) => patchScope3("commuteMode", e.target.value as SmeInputs["scope3"]["commuteMode"])}
                >
                  <option value="public">Public transport</option>
                  <option value="car">Private car</option>
                  <option value="both">Mixed / both</option>
                </select>
              </FieldRow>
            </Advanced>
          </div>
        </Advanced>
      </SectionCard>
      </>
      )}
    </div>
  );
}
