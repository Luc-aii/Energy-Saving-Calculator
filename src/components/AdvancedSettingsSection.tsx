"use client";

import type { SmeInputs } from "@/lib/types/inputs";
import { FieldRow, SectionCard, inputClass, checkboxInputClass, checkboxLabelClass } from "./FormField";
import { Advanced } from "./ui/Advanced";
import { numOrUndef } from "@/lib/formNumber";
import type { SmeFormPatchers } from "@/hooks/useSmeFormPatchers";

/** Wizard step 1, third card: overrides, targets, compliance flags, and optional Scope 3. Split out of InputForm.tsx. */
export function AdvancedSettingsSection({ inputs, patchers }: { inputs: SmeInputs; patchers: SmeFormPatchers }) {
  const { patchEnergy, patchScope3, patchBaseline, patchSensitivity } = patchers;

  return (
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
  );
}
