"use client";

import type { MncInputs } from "@/lib/types/mncInputs";
import { FieldRow, SectionCard, inputClass, checkboxInputClass, checkboxLabelClass } from "./FormField";
import { Advanced } from "./ui/Advanced";
import { NumberInput } from "./ui/NumberInput";
import { numOrUndef, nonNegNum } from "@/lib/formNumber";
import type { MncFormPatchers } from "@/hooks/useMncFormPatchers";

/** Wizard step 1, fourth block: portfolio-wide overrides, targets, compliance, and optional Scope 3. Split out of MncInputForm.tsx. */
export function MncAdvancedSettingsSection({ inputs, patchers }: { inputs: MncInputs; patchers: MncFormPatchers }) {
  const { patch, patchScope3, patchBaseline, patchSensitivity } = patchers;

  return (
    <SectionCard title="Targets & advanced settings" subtitle="Overrides, context, compliance & optional Scope 3">
      <Advanced title="Advanced / optional" subtitle="Overrides, context & Scope 3">
        <FieldRow label="Portfolio default tariff (S$/kWh)" hint="High impact — the fallback S$/kWh multiplier for every site left blank above, which flows straight into their $ figures. Fills sites left blank, before the SP Group reference tariff.">
          <input type="number" step="0.01" className={inputClass} value={inputs.defaultTariffOverrideSgdPerKwh ?? ""} onChange={(e) => patch("defaultTariffOverrideSgdPerKwh", numOrUndef(e.target.value))} />
        </FieldRow>
        <FieldRow label="Portfolio default grid factor (kg CO2/kWh)" hint="Scales tCO2e figures for every site left blank above — no $ effect. Fills sites left blank, before the EMA Singapore reference figure.">
          <input type="number" step="0.001" className={inputClass} value={inputs.defaultGridEmissionFactorOverrideKgPerKwh ?? ""} onChange={(e) => patch("defaultGridEmissionFactorOverrideKgPerKwh", numOrUndef(e.target.value))} />
        </FieldRow>
        <FieldRow label={`Tariff escalation (%/year): ${(inputs.tariffEscalationPctPerYear * 100).toFixed(1)}%`} hint="Compounds into every future year — the main driver of how much bigger your 10-year cumulative saving looks vs. Year 1. Applied portfolio-wide.">
          <input type="range" min={0} max={5} step={0.5} value={inputs.tariffEscalationPctPerYear * 100} onChange={(e) => patch("tariffEscalationPctPerYear", Number(e.target.value) / 100)} />
        </FieldRow>
        <FieldRow label="Current carbon tax exposure reported (tCO2e/year)" hint="High impact if set: any value above 0 makes you carbon-tax-liable in this illustration, adding a direct carbon-tax-saving line to every year's $ total — regardless of your computed Scope 1 tonnage. If already taxable/reported to IRAS.">
          <input type="number" className={inputClass} value={inputs.baseline.currentCarbonTaxExposureTonnes ?? ""} onChange={(e) => patchBaseline("currentCarbonTaxExposureTonnes", numOrUndef(e.target.value))} />
        </FieldRow>
        <FieldRow label="SBTi / net-zero commitment" hint="Feeds a separate target-tracking comparison and a compliance flag, and (if committed) recommends the Net Zero Advisory product — no effect on your $ savings, payback or CO2e-avoided figures themselves.">
          <select className={inputClass} value={inputs.baseline.sbtiStatus} onChange={(e) => patchBaseline("sbtiStatus", e.target.value as MncInputs["baseline"]["sbtiStatus"])}>
            <option value="none">No</option>
            <option value="in-progress">In progress</option>
            <option value="committed">Committed</option>
          </select>
        </FieldRow>
        {inputs.baseline.sbtiStatus !== "none" && (
          <FieldRow label="Target year" hint="Required for target tracking to show in your results — same no-effect-on-$-savings scope as above">
            <input type="number" className={inputClass} value={inputs.baseline.sbtiTargetYear ?? ""} onChange={(e) => patchBaseline("sbtiTargetYear", numOrUndef(e.target.value))} />
          </FieldRow>
        )}
        <FieldRow label="Sustainability reporting framework" hint="Adds an SGX compliance flag if set to 'SGX mandatory' — otherwise no effect on your results.">
          <select className={inputClass} value={inputs.baseline.reportingFramework} onChange={(e) => patchBaseline("reportingFramework", e.target.value as MncInputs["baseline"]["reportingFramework"])}>
            <option value="None">None</option>
            <option value="GRI">GRI</option>
            <option value="ISSB/IFRS S2">ISSB/IFRS S2</option>
            <option value="TCFD">TCFD</option>
            <option value="CDP">CDP</option>
            <option value="SGX mandatory">SGX mandatory</option>
          </select>
        </FieldRow>
        <FieldRow label="Budget range for investment" hint="Appears in your AI-generated summary text only — no effect on any $ savings, payback or CO2e figure.">
          <select className={inputClass} value={inputs.baseline.budgetRange} onChange={(e) => patchBaseline("budgetRange", e.target.value as MncInputs["baseline"]["budgetRange"])}>
            <option value="<50k">Under S$50k</option>
            <option value="50k-500k">S$50k – S$500k</option>
            <option value="500k-5M">S$500k – S$5M</option>
            <option value=">5M">Over S$5M</option>
          </select>
        </FieldRow>
        <FieldRow label="Preferred engagement model" hint="Appears in your AI-generated summary text only — no effect on any $ savings, payback or CO2e figure.">
          <select className={inputClass} value={inputs.baseline.engagementModel} onChange={(e) => patchBaseline("engagementModel", e.target.value as MncInputs["baseline"]["engagementModel"])}>
            <option value="Buy outright">Buy outright</option>
            <option value="EaaS">EaaS (no capex)</option>
            <option value="Consulting only">Consulting only</option>
            <option value="Not sure">Not sure</option>
          </select>
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
            <FieldRow label="Purchased goods spend (S$/year)" hint="Aggregate across categories">
              <input
                type="number"
                className={inputClass}
                value={inputs.scope3.purchasedGoodsSpendByCategorySgd[0]?.spendSgd ?? ""}
                onChange={(e) => patchScope3("purchasedGoodsSpendByCategorySgd", [{ category: "Aggregate", spendSgd: nonNegNum(e.target.value) }])}
              />
            </FieldRow>
            <FieldRow label="Upstream freight — road (tonne-km/year)">
              <input type="number" className={inputClass} value={inputs.scope3.upstreamFreightTonneKm?.road ?? ""} onChange={(e) => patchScope3("upstreamFreightTonneKm", { road: nonNegNum(e.target.value), rail: inputs.scope3.upstreamFreightTonneKm?.rail ?? 0, sea: inputs.scope3.upstreamFreightTonneKm?.sea ?? 0, air: inputs.scope3.upstreamFreightTonneKm?.air ?? 0 })} />
            </FieldRow>
            <FieldRow label="Upstream freight — sea (tonne-km/year)">
              <input type="number" className={inputClass} value={inputs.scope3.upstreamFreightTonneKm?.sea ?? ""} onChange={(e) => patchScope3("upstreamFreightTonneKm", { road: inputs.scope3.upstreamFreightTonneKm?.road ?? 0, rail: inputs.scope3.upstreamFreightTonneKm?.rail ?? 0, sea: nonNegNum(e.target.value), air: inputs.scope3.upstreamFreightTonneKm?.air ?? 0 })} />
            </FieldRow>
            <FieldRow label="Upstream freight — air (tonne-km/year)">
              <input type="number" className={inputClass} value={inputs.scope3.upstreamFreightTonneKm?.air ?? ""} onChange={(e) => patchScope3("upstreamFreightTonneKm", { road: inputs.scope3.upstreamFreightTonneKm?.road ?? 0, rail: inputs.scope3.upstreamFreightTonneKm?.rail ?? 0, sea: inputs.scope3.upstreamFreightTonneKm?.sea ?? 0, air: nonNegNum(e.target.value) })} />
            </FieldRow>
            <FieldRow label="Downstream freight — road (tonne-km/year)">
              <input type="number" className={inputClass} value={inputs.scope3.downstreamFreightTonneKm?.road ?? ""} onChange={(e) => patchScope3("downstreamFreightTonneKm", { road: nonNegNum(e.target.value), sea: inputs.scope3.downstreamFreightTonneKm?.sea ?? 0, air: inputs.scope3.downstreamFreightTonneKm?.air ?? 0 })} />
            </FieldRow>
            <FieldRow label="Downstream freight — sea (tonne-km/year)">
              <input type="number" className={inputClass} value={inputs.scope3.downstreamFreightTonneKm?.sea ?? ""} onChange={(e) => patchScope3("downstreamFreightTonneKm", { road: inputs.scope3.downstreamFreightTonneKm?.road ?? 0, sea: nonNegNum(e.target.value), air: inputs.scope3.downstreamFreightTonneKm?.air ?? 0 })} />
            </FieldRow>
            <FieldRow label="Or: upstream freight spend (S$/year)" hint="Only used if you leave the upstream tonne-km fields above blank.">
              <input type="number" className={inputClass} value={inputs.scope3.upstreamFreightSpendSgd ?? ""} onChange={(e) => patchScope3("upstreamFreightSpendSgd", numOrUndef(e.target.value))} />
            </FieldRow>
            <FieldRow label="Or: downstream freight spend (S$/year)" hint="Only used if you leave the downstream tonne-km fields above blank.">
              <input type="number" className={inputClass} value={inputs.scope3.downstreamFreightSpendSgd ?? ""} onChange={(e) => patchScope3("downstreamFreightSpendSgd", numOrUndef(e.target.value))} />
            </FieldRow>
            <FieldRow label="Short-haul business travel (pax-km/year)" hint="Optional">
              <input type="number" className={inputClass} value={inputs.scope3.shortHaulPassengerKm ?? ""} onChange={(e) => patchScope3("shortHaulPassengerKm", numOrUndef(e.target.value))} />
            </FieldRow>
            <FieldRow label="Long-haul business travel (pax-km/year)" hint="Optional">
              <input type="number" className={inputClass} value={inputs.scope3.longHaulPassengerKm ?? ""} onChange={(e) => patchScope3("longHaulPassengerKm", numOrUndef(e.target.value))} />
            </FieldRow>
            <FieldRow label="Hotel nights/year" hint="Optional">
              <input type="number" className={inputClass} value={inputs.scope3.hotelNights ?? ""} onChange={(e) => patchScope3("hotelNights", numOrUndef(e.target.value))} />
            </FieldRow>
            <FieldRow label="Average commute distance (km, one-way)">
              <NumberInput className={inputClass} value={inputs.scope3.averageCommuteKm} onChange={(n) => patchScope3("averageCommuteKm", n)} />
            </FieldRow>
            <FieldRow label="Commute mode — % public transport">
              <NumberInput min={0} max={100} className={inputClass} value={inputs.scope3.commuteModeSplitPct.public} onChange={(n) => patchScope3("commuteModeSplitPct", { ...inputs.scope3.commuteModeSplitPct, public: Math.min(n, 100) })} />
            </FieldRow>
            <FieldRow label="Commute mode — % private car">
              <NumberInput min={0} max={100} className={inputClass} value={inputs.scope3.commuteModeSplitPct.car} onChange={(n) => patchScope3("commuteModeSplitPct", { ...inputs.scope3.commuteModeSplitPct, car: Math.min(n, 100) })} />
            </FieldRow>
            <FieldRow label="Work-from-home days/week">
              <NumberInput min={0} max={5} className={inputClass} value={inputs.scope3.wfhDaysPerWeek} onChange={(n) => patchScope3("wfhDaysPerWeek", Math.min(n, 5))} />
            </FieldRow>
          </Advanced>
        </div>
      </Advanced>
    </SectionCard>
  );
}
