"use client";

import type { Dispatch, SetStateAction } from "react";
import type { EfficiencyInitiative, Sector, SmeInputs } from "@/lib/types/inputs";
import { FieldRow, SectionCard, inputClass, checkboxInputClass, checkboxLabelClass } from "./FormField";
import { AiGuidedInput } from "./AiGuidedInput";
import { BillUploadPanel } from "./BillUploadPanel";
import { EXISTING_MEASURE_CATEGORIES } from "@/lib/existingMeasures";

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

const EFFICIENCY_INITIATIVES: { id: EfficiencyInitiative; label: string }[] = [
  { id: "led-lighting", label: "LED lighting done" },
  { id: "hvac-upgraded", label: "HVAC upgraded" },
  { id: "iso-50001", label: "ISO 50001 certified" },
];

interface Props {
  inputs: SmeInputs;
  setInputs: Dispatch<SetStateAction<SmeInputs>>;
  /** Which wizard step to render: 0 = profile, 1 = energy & fuel, 2 = value chain, 3 = goals & investment. */
  step: number;
}

export const SME_INPUT_STEPS = ["Business profile", "Energy & fuel", "Value chain", "Goals & investment"];

function numOrUndef(v: string): number | undefined {
  if (v === "") return undefined;
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
}

function parseReadings(v: string): number[] | undefined {
  const nums = v
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);
  return nums.length > 0 ? nums.slice(0, 12) : undefined;
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

  const toggleExistingSolution = (id: string) => {
    const set = new Set(inputs.baseline.existingSolutionIds);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    patchBaseline("existingSolutionIds", Array.from(set));
  };

  const toggleInitiative = (id: EfficiencyInitiative) => {
    const set = new Set(inputs.baseline.currentEfficiencyInitiatives);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    patchBaseline("currentEfficiencyInitiatives", Array.from(set));
  };

  return (
    <div className="flex flex-col gap-4">
      {step === 0 && <AiGuidedInput setInputs={setInputs} />}
      {step === 1 && <BillUploadPanel setInputs={setInputs} />}

      {step === 0 && (
      <SectionCard title="Profile & Goals" subtitle="Universal inputs — sets your benchmark and scenario">
        <FieldRow label="Company name">
          <input
            className={inputClass}
            value={inputs.universal.companyName}
            onChange={(e) => patchUniversal("companyName", e.target.value)}
          />
        </FieldRow>
        <FieldRow label="Industry sector">
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
        <FieldRow label="Number of sites">
          <input
            type="number"
            min={1}
            className={inputClass}
            value={inputs.universal.numberOfSites}
            onChange={(e) => patchUniversal("numberOfSites", Number(e.target.value) || 1)}
          />
        </FieldRow>
        <FieldRow label="Floor area (m²)" hint="Used for energy intensity benchmarking">
          <input
            type="number"
            className={inputClass}
            value={inputs.universal.floorAreaM2 ?? ""}
            onChange={(e) => patchUniversal("floorAreaM2", numOrUndef(e.target.value))}
          />
        </FieldRow>
        <FieldRow label="Number of employees">
          <input
            type="number"
            className={inputClass}
            value={inputs.universal.employeeCount ?? ""}
            onChange={(e) => patchUniversal("employeeCount", numOrUndef(e.target.value))}
          />
        </FieldRow>
        <FieldRow label="Annual revenue (S$)" hint="Optional — powers the energy-cost-as-%-of-revenue KPI only">
          <input
            type="number"
            className={inputClass}
            value={inputs.universal.annualRevenueSgd ?? ""}
            onChange={(e) => patchUniversal("annualRevenueSgd", numOrUndef(e.target.value))}
          />
        </FieldRow>
        <FieldRow label="Estimated solution investment (S$)" hint="Adjustable — default guess, refine with a Schneider advisor">
          <input
            type="number"
            className={inputClass}
            value={inputs.estimatedInvestmentSgd}
            onChange={(e) => patch("estimatedInvestmentSgd", Number(e.target.value) || 0)}
          />
        </FieldRow>
        <FieldRow label="2030 carbon price scenario">
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
      </SectionCard>
      )}

      {step === 1 && (
      <>
      <SectionCard title="Scope 2 — Electricity" subtitle="What power do you purchase?">
        <FieldRow label="Monthly electricity (kWh)" hint="Latest bill — used if no 12-month history is entered below">
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
        <FieldRow label="Up to 12 months of kWh readings (optional)" hint="Comma-separated, e.g. 15000, 14200, 15800 — averaged if provided">
          <input
            className={inputClass}
            placeholder="15000, 14200, 15800, ..."
            defaultValue={inputs.energy.electricityMonthlyReadings?.join(", ") ?? ""}
            onBlur={(e) => patchEnergy("electricityMonthlyReadings", parseReadings(e.target.value))}
          />
        </FieldRow>
        <FieldRow label="Onsite solar generation?">
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
          <FieldRow label="Monthly solar generation (kWh)">
            <input
              type="number"
              className={inputClass}
              value={inputs.energy.solarMonthlyGenerationKwh ?? ""}
              onChange={(e) => patchEnergy("solarMonthlyGenerationKwh", numOrUndef(e.target.value))}
            />
          </FieldRow>
        )}
        <FieldRow label="Monthly natural gas (GJ)" hint="Leave blank if not applicable">
          <input
            type="number"
            className={inputClass}
            value={inputs.energy.monthlyNaturalGasGJ ?? ""}
            onChange={(e) => patchEnergy("monthlyNaturalGasGJ", numOrUndef(e.target.value))}
          />
        </FieldRow>
      </SectionCard>

      <SectionCard title="Scope 1 — Fuel & Fleet" subtitle="What do you burn onsite?">
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
            <FieldRow label="Monthly fuel consumption (litres)">
              <input
                type="number"
                className={inputClass}
                value={inputs.fuelFleet.monthlyFuelLitres ?? ""}
                onChange={(e) => patchFuel("monthlyFuelLitres", numOrUndef(e.target.value))}
              />
            </FieldRow>
            <FieldRow label="Or: monthly fuel spend (S$)" hint="Used only if litres unknown — back-calculated at an indicative pump price">
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
            <FieldRow label="Number of vehicles">
              <input
                type="number"
                className={inputClass}
                value={inputs.fuelFleet.numberOfVehicles ?? ""}
                onChange={(e) => patchFuel("numberOfVehicles", numOrUndef(e.target.value))}
              />
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
          <>
            <FieldRow label="Generator monthly diesel (litres)" hint="Leave blank to estimate from runtime + tank size instead">
              <input
                type="number"
                className={inputClass}
                value={inputs.fuelFleet.generatorMonthlyFuelLitres ?? ""}
                onChange={(e) => patchFuel("generatorMonthlyFuelLitres", numOrUndef(e.target.value))}
              />
            </FieldRow>
            <FieldRow label="Or: hours run / month">
              <input
                type="number"
                className={inputClass}
                value={inputs.fuelFleet.generatorHoursPerMonth ?? ""}
                onChange={(e) => patchFuel("generatorHoursPerMonth", numOrUndef(e.target.value))}
              />
            </FieldRow>
            <FieldRow label="Tank size (litres)">
              <input
                type="number"
                className={inputClass}
                value={inputs.fuelFleet.generatorTankSizeLitres ?? ""}
                onChange={(e) => patchFuel("generatorTankSizeLitres", numOrUndef(e.target.value))}
              />
            </FieldRow>
          </>
        )}
      </SectionCard>

      </>
      )}

      {step === 2 && (
      <>
      <SectionCard title="Scope 1 — Refrigerants (optional)" subtitle="Small but high-impact for F&B, retail cold chain, hotels">
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
            <FieldRow label="Refrigerant type">
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
            <FieldRow label="Annual top-up quantity (kg)">
              <input
                type="number"
                className={inputClass}
                value={inputs.refrigerants.refrigerantAnnualTopUpKg ?? ""}
                onChange={(e) => patchRefrigerants("refrigerantAnnualTopUpKg", numOrUndef(e.target.value))}
              />
            </FieldRow>
          </>
        )}
      </SectionCard>

      <SectionCard title="Scope 3 — Value Chain (simplified)" subtitle="Quantified only — not included in $ savings">
        <FieldRow label="Annual logistics/freight spend (S$)">
          <input
            type="number"
            className={inputClass}
            value={inputs.scope3.annualLogisticsSpendSgd ?? ""}
            onChange={(e) => patchScope3("annualLogisticsSpendSgd", numOrUndef(e.target.value))}
          />
        </FieldRow>
        <FieldRow label="Primary freight mode">
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
        <FieldRow label="Business flights per year">
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
      </SectionCard>

      </>
      )}

      {step === 3 && (
      <>
      <SectionCard title="Baseline & Goals" subtitle="What already exists, and what you're aiming for">
        <div className="sm:col-span-2 flex flex-col gap-4">
          <div>
            <p className="text-sm font-medium text-ink">Green/efficiency measures already in place</p>
            <p className="mt-0.5 text-xs text-ink-soft">Any vendor — this just tells us what gap still needs closing, not what brand you use today.</p>
            <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-2.5">
              {EXISTING_MEASURE_CATEGORIES.map((s) => (
                <label key={s.id} className={checkboxLabelClass}>
                  <input
                    type="checkbox"
                    className={checkboxInputClass}
                    checked={inputs.baseline.existingSolutionIds.includes(s.id)}
                    onChange={() => toggleExistingSolution(s.id)}
                  />
                  {s.label}
                </label>
              ))}
            </div>
          </div>
          <FieldRow label="Anything else already in place? (optional)" hint="Free text — used as context only, never scored against your recommendations.">
            <input
              className={inputClass}
              placeholder="e.g. Siemens Desigo BMS installed 2022"
              value={inputs.baseline.otherMeasuresText ?? ""}
              onChange={(e) => patchBaseline("otherMeasuresText", e.target.value || undefined)}
            />
          </FieldRow>
        </div>
        <div className="sm:col-span-2">
          <p className="text-sm font-medium text-ink">Current efficiency initiatives</p>
          <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-2.5">
            {EFFICIENCY_INITIATIVES.map((i) => (
              <label key={i.id} className={checkboxLabelClass}>
                <input
                  type="checkbox"
                  className={checkboxInputClass}
                  checked={inputs.baseline.currentEfficiencyInitiatives.includes(i.id)}
                  onChange={() => toggleInitiative(i.id)}
                />
                {i.label}
              </label>
            ))}
          </div>
        </div>
        <FieldRow label="Preferred investment horizon">
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
        <FieldRow label="Emissions reduction target (%)" hint="Optional — e.g. 30 for '30% by 2030'">
          <input
            type="number"
            className={inputClass}
            value={inputs.baseline.emissionsReductionTargetPct ?? ""}
            onChange={(e) => patchBaseline("emissionsReductionTargetPct", numOrUndef(e.target.value))}
          />
        </FieldRow>
        <FieldRow label="Target year">
          <input
            type="number"
            className={inputClass}
            value={inputs.baseline.targetYear ?? ""}
            onChange={(e) => patchBaseline("targetYear", numOrUndef(e.target.value))}
          />
        </FieldRow>
        <div className="sm:col-span-2 mt-1 flex flex-wrap gap-x-5 gap-y-2.5">
          <label className={checkboxLabelClass}>
            <input
              type="checkbox"
              className={checkboxInputClass}
              checked={inputs.baseline.isFinancialInstitution}
              onChange={(e) => patchBaseline("isFinancialInstitution", e.target.checked)}
            />
            MAS-regulated financial institution
          </label>
          <label className={checkboxLabelClass}>
            <input
              type="checkbox"
              className={checkboxInputClass}
              checked={inputs.baseline.isSupplierToSbtiBuyer}
              onChange={(e) => patchBaseline("isSupplierToSbtiBuyer", e.target.checked)}
            />
            Supplier to an SBTi-committed buyer
          </label>
        </div>
      </SectionCard>

      <SectionCard title="Sensitivity — What If?" subtitle="Override the calculator's default assumptions">
        <FieldRow label={`Electricity tariff override (S$/kWh)`} hint="Leave blank to use the current reference tariff (see Illustration basis & assumptions below)">
          <input
            type="number"
            step="0.01"
            min={0.2}
            max={0.45}
            className={inputClass}
            value={inputs.sensitivity.tariffOverrideSgdPerKwh ?? ""}
            onChange={(e) => patchSensitivity("tariffOverrideSgdPerKwh", numOrUndef(e.target.value))}
          />
        </FieldRow>
        <FieldRow label="Energy saving rate override (%)" hint="Leave blank to use the calibration-curve estimate">
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
        <FieldRow label={`Tariff escalation (%/year): ${(inputs.sensitivity.tariffEscalationPctPerYear * 100).toFixed(1)}%`}>
          <input
            type="range"
            min={0}
            max={5}
            step={0.5}
            value={inputs.sensitivity.tariffEscalationPctPerYear * 100}
            onChange={(e) => patchSensitivity("tariffEscalationPctPerYear", Number(e.target.value) / 100)}
          />
        </FieldRow>
      </SectionCard>
      </>
      )}
    </div>
  );
}
