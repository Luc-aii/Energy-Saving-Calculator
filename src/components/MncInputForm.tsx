"use client";

import type { Dispatch, SetStateAction } from "react";
import type { Sector } from "@/lib/types/inputs";
import type { MncInputs, MncSite, RefrigerantEntry } from "@/lib/types/mncInputs";
import { FieldRow, SectionCard, inputClass, checkboxInputClass, checkboxLabelClass } from "./FormField";
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
  inputs: MncInputs;
  setInputs: Dispatch<SetStateAction<MncInputs>>;
  /** Which wizard step to render: 0 = your business, 1 = energy & fuel. */
  step: number;
}

export const MNC_INPUT_STEPS = ["Your business", "Energy & fuel"];

/**
 * Every numeric field on this form is a physical quantity or a dollar amount
 * — none of them can legitimately be negative — so this clamps at the
 * source rather than letting a mistyped negative value flow into the engine
 * (usability finding H2).
 */
function numOrUndef(v: string): number | undefined {
  if (v === "") return undefined;
  const n = Number(v);
  if (Number.isNaN(n)) return undefined;
  return Math.max(n, 0);
}

/** Same non-negative guard as numOrUndef, for the required (non-optional) numeric fields that default to 0 rather than undefined. */
function nonNegNum(v: string): number {
  return Math.max(Number(v) || 0, 0);
}

let siteCounter = 0;

export function MncInputForm({ inputs, setInputs, step }: Props) {
  const patch = <K extends keyof MncInputs>(key: K, value: MncInputs[K]) => setInputs((prev) => ({ ...prev, [key]: value }));

  const patchFuel = <K extends keyof MncInputs["fuelFleet"]>(key: K, value: MncInputs["fuelFleet"][K]) =>
    setInputs((prev) => ({ ...prev, fuelFleet: { ...prev.fuelFleet, [key]: value } }));

  const patchScope3 = <K extends keyof MncInputs["scope3"]>(key: K, value: MncInputs["scope3"][K]) =>
    setInputs((prev) => ({ ...prev, scope3: { ...prev.scope3, [key]: value } }));

  const patchBaseline = <K extends keyof MncInputs["baseline"]>(key: K, value: MncInputs["baseline"][K]) =>
    setInputs((prev) => ({ ...prev, baseline: { ...prev.baseline, [key]: value } }));

  const patchSensitivity = <K extends keyof MncInputs["sensitivity"]>(key: K, value: MncInputs["sensitivity"][K]) =>
    setInputs((prev) => ({ ...prev, sensitivity: { ...prev.sensitivity, [key]: value } }));

  const patchSite = <K extends keyof MncSite>(id: string, key: K, value: MncSite[K]) =>
    setInputs((prev) => ({ ...prev, sites: prev.sites.map((s) => (s.id === id ? { ...s, [key]: value } : s)) }));

  const addSite = () => {
    siteCounter += 1;
    const newSite: MncSite = {
      id: `site-new-${Date.now()}-${siteCounter}`,
      name: `Site ${inputs.sites.length + 1}`,
      monthlyElectricityKwh: 83333,
      renewableCoveragePct: 0,
    };
    patch("sites", [...inputs.sites, newSite]);
  };

  const removeSite = (id: string) => {
    if (inputs.sites.length <= 1) return;
    patch("sites", inputs.sites.filter((s) => s.id !== id));
  };

  const toggleEcm = (id: string) => {
    const set = new Set(inputs.baseline.implementedOrInProgressEcmIds);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    patchBaseline("implementedOrInProgressEcmIds", Array.from(set));
  };

  // Portfolio-level end-use chart uses the first site's sub-profile — matches the simplification in mncEngine.ts.
  const primarySubProfile = inputs.sites[0]?.subProfile;
  const endUseBreakdown = getEndUseBreakdown(inputs.sector, primarySubProfile, undefined);
  const subProfiles = subProfileOptions(inputs.sector);
  const subProfileQuestion = subProfileYesNoQuestion(inputs.sector);
  const topEndUse = getTopEndUse(endUseBreakdown);

  const updateRefrigerantEntry = (index: number, patchFn: (e: RefrigerantEntry) => RefrigerantEntry) => {
    const entries = inputs.refrigerants.entries.map((e, i) => (i === index ? patchFn(e) : e));
    patch("refrigerants", { ...inputs.refrigerants, entries });
  };

  const addRefrigerantEntry = () => {
    patch("refrigerants", { ...inputs.refrigerants, entries: [...inputs.refrigerants.entries, { gasType: "R-410A", kgPerYear: 0 }] });
  };

  const removeRefrigerantEntry = (index: number) => {
    patch("refrigerants", { ...inputs.refrigerants, entries: inputs.refrigerants.entries.filter((_, i) => i !== index) });
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-ink-soft">
        <span className="text-red-500">*</span> required — everything else is optional and can be refined later.
      </p>
      {step === 0 && (
      <SectionCard title="Your business" subtitle="MNC universal inputs">
        <FieldRow label="Company name">
          <input className={inputClass} value={inputs.companyName} onChange={(e) => patch("companyName", e.target.value)} />
        </FieldRow>
        <FieldRow label="Industry sector" required>
          <select className={inputClass} value={inputs.sector} onChange={(e) => patch("sector", e.target.value as Sector)}>
            {SECTORS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </FieldRow>
        <FieldRow label="Total employees (all sites)" hint="Powers the carbon-per-employee KPI and the Cat 7 commuting estimate — no effect on $ savings or payback. Optional.">
          <input type="number" className={inputClass} value={inputs.totalEmployees ?? ""} onChange={(e) => patch("totalEmployees", numOrUndef(e.target.value))} />
        </FieldRow>
        <FieldRow label="Listed on SGX?" hint="Adds a compliance flag (mandatory sustainability reporting) only — no effect on $ figures.">
          <select className={inputClass} value={inputs.isListedOnSgx ? "yes" : "no"} onChange={(e) => patch("isListedOnSgx", e.target.value === "yes")}>
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </FieldRow>
        <FieldRow label="Estimated solution investment (S$)" required>
          <NumberInput className={inputClass} value={inputs.estimatedInvestmentSgd} onChange={(n) => patch("estimatedInvestmentSgd", n)} />
        </FieldRow>
        <div className="sm:col-span-2 flex flex-col gap-2.5">
          <p className="text-sm font-medium text-ink">Already implemented or in progress</p>
          <p className="-mt-1.5 text-xs text-ink-soft">
            Select or type any measures already in place across your sites, or actively rolling out — just what&apos;s in place, no recommendations
            here. <strong className="font-semibold text-ink">This directly changes your savings rate</strong>: each measure ticked here is removed
            from the further-opportunity pool below, so your Top 3 and $ savings figures shift to reflect what&apos;s genuinely still available.
          </p>
          <EcmMultiSelect sector={inputs.sector} selectedIds={inputs.baseline.implementedOrInProgressEcmIds} onToggle={toggleEcm} />
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
            sector={inputs.sector}
            text={inputs.baseline.otherMeasuresText}
            selectedIds={inputs.baseline.implementedOrInProgressEcmIds}
            onToggle={toggleEcm}
            mode="mnc"
          />
        </div>
        <Advanced title="Advanced / optional">
          <FieldRow label="Annual revenue (S$)" hint="Powers one KPI card only (energy cost as % of revenue) — no effect on $ savings, payback or CO2e.">
            <input type="number" className={inputClass} value={inputs.annualRevenueSgd ?? ""} onChange={(e) => patch("annualRevenueSgd", numOrUndef(e.target.value))} />
          </FieldRow>
          <FieldRow label="2030 carbon price scenario" hint="Only matters if your direct emissions are large enough to be carbon-tax-liable, or you've reported IRAS exposure below — otherwise it only reshapes the carbon-price trajectory chart, not your $ savings.">
            <select className={inputClass} value={inputs.carbonPriceScenario} onChange={(e) => patch("carbonPriceScenario", e.target.value as MncInputs["carbonPriceScenario"])}>
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
      <div className="animate-step rounded-2xl border border-border bg-card p-4 shadow-sm shadow-brand-700/5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-ink">Sites — Scope 2 (per site)</h3>
            <p className="text-xs text-ink-soft">Monthly electricity, renewable coverage — per site</p>
          </div>
          <button onClick={addSite} className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-ink-soft hover:border-brand-400">
            + Add site
          </button>
        </div>
        <div className="flex flex-col gap-3">
          {inputs.sites.map((site) => (
            <div key={site.id} className="rounded-lg border border-border p-3">
              <div className="mb-2 flex items-center justify-between">
                <input
                  className={`${inputClass} font-medium`}
                  value={site.name}
                  onChange={(e) => patchSite(site.id, "name", e.target.value)}
                />
                <button
                  onClick={() => removeSite(site.id)}
                  disabled={inputs.sites.length <= 1}
                  className="ml-2 text-xs text-red-600 disabled:opacity-30"
                >
                  Remove
                </button>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FieldRow label="Monthly electricity (kWh)" required>
                  <NumberInput className={inputClass} value={site.monthlyElectricityKwh} onChange={(n) => patchSite(site.id, "monthlyElectricityKwh", n)} />
                </FieldRow>
                <FieldRow label="Renewable coverage (%)" hint="RECs/PPA/green tariff for this site. Splits its cost into a clean share (priced with a premium) and dirty share, and lowers the CO2e-avoided figure this site's savings measures can claim, since already-clean kWh can't avoid further emissions. Also triggers the Microgrid/EaaS product recommendation.">
                  <NumberInput min={0} max={100} className={inputClass} value={site.renewableCoveragePct} onChange={(n) => patchSite(site.id, "renewableCoveragePct", Math.min(n, 100))} />
                </FieldRow>
                <FieldRow label="Floor area (m²)" hint="Feeds this site's energy-intensity benchmark. If this site's kWh is left blank, it also becomes the basis for estimating that site's electricity use — and therefore its $ savings, payback and CO2e.">
                  <input type="number" className={inputClass} value={site.floorAreaM2 ?? ""} onChange={(e) => patchSite(site.id, "floorAreaM2", numOrUndef(e.target.value))} />
                </FieldRow>
                {inputs.sector === "Data Centre" && (
                  <FieldRow label="Annual IT load (kWh)" hint="Optional — lets us compute this site's true PUE (kWh ÷ IT load) instead of assuming a sector average">
                    <input type="number" min={0} className={inputClass} value={site.itLoadKwh ?? ""} onChange={(e) => patchSite(site.id, "itLoadKwh", numOrUndef(e.target.value))} />
                  </FieldRow>
                )}
                {subProfileQuestion && (
                  <FieldRow label={subProfileQuestion.question} hint="Tailors this site's energy breakdown and ECM recommendations to match">
                    <select
                      className={inputClass}
                      value={site.subProfile === subProfileQuestion.id ? "yes" : "no"}
                      onChange={(e) => patchSite(site.id, "subProfile", e.target.value === "yes" ? subProfileQuestion.id : "default")}
                    >
                      <option value="no">No</option>
                      <option value="yes">Yes</option>
                    </select>
                  </FieldRow>
                )}
                {!subProfileQuestion && subProfiles.length > 1 && (
                  <FieldRow label="Energy profile" hint="Changes the sector's typical energy end-use split (shown below, uses the first site's profile)">
                    <select className={inputClass} value={site.subProfile ?? "default"} onChange={(e) => patchSite(site.id, "subProfile", e.target.value)}>
                      {subProfiles.map((p) => (
                        <option key={p.id} value={p.id}>{p.label}</option>
                      ))}
                    </select>
                  </FieldRow>
                )}
              </div>
              <div className="mt-3">
                <Advanced title="Advanced / optional — this site">
                  <FieldRow label="Tariff (S$/kWh)" hint="High impact — this site's S$/kWh multiplier behind every $ figure it contributes. Also tightens confidence if set (a missing tariff widens your confidence range). Blank = portfolio default, then reference tariff.">
                    <input type="number" step="0.01" className={inputClass} value={site.tariffSgdPerKwh ?? ""} onChange={(e) => patchSite(site.id, "tariffSgdPerKwh", numOrUndef(e.target.value))} />
                  </FieldRow>
                  <FieldRow label="Grid emission factor override (kg CO2/kWh)" hint="Scales this site's tCO2e figures proportionally — no $ effect. Blank = portfolio default, then EMA Singapore reference — set this for a non-Singapore site.">
                    <input type="number" step="0.001" className={inputClass} value={site.gridEmissionFactorOverrideKgPerKwh ?? ""} onChange={(e) => patchSite(site.id, "gridEmissionFactorOverrideKgPerKwh", numOrUndef(e.target.value))} />
                  </FieldRow>
                  {site.renewableCoveragePct > 0 && (
                    <FieldRow label="Green tariff premium override (S$/kWh)" hint="Minor $ effect — only changes the cost of this site's renewable-covered share above. Blank = typical Singapore market premium.">
                      <input type="number" step="0.001" className={inputClass} value={site.greenTariffPremiumOverrideSgdPerKwh ?? ""} onChange={(e) => patchSite(site.id, "greenTariffPremiumOverrideSgdPerKwh", numOrUndef(e.target.value))} />
                    </FieldRow>
                  )}
                  <FieldRow label="Natural gas (GJ/year)" hint="Adds to this site's Scope 1 emissions total only — no $ effect. Leave blank if this site doesn't burn gas onsite.">
                    <input type="number" className={inputClass} value={site.annualNaturalGasGJ ?? ""} onChange={(e) => patchSite(site.id, "annualNaturalGasGJ", numOrUndef(e.target.value))} />
                  </FieldRow>
                  <FieldRow label="Purchased heat/cooling (GJ/year)" hint="Adds to this site's Scope 2 emissions total only — no $ effect. District cooling/steam, if applicable.">
                    <input type="number" className={inputClass} value={site.annualHeatCoolingGJ ?? ""} onChange={(e) => patchSite(site.id, "annualHeatCoolingGJ", numOrUndef(e.target.value))} />
                  </FieldRow>
                </Advanced>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 border-t border-border pt-3">
          <p className="text-sm font-medium text-ink">Where your energy goes</p>
          <p className="mb-2 mt-0.5 text-xs text-ink-soft">Sector-typical split (indicative, international benchmark) — feeds the Energy Conservation Measure recommendations in the next step.</p>
          <SectorSpotlight sector={inputs.sector} topEndUse={topEndUse} />
          <EnergyEndUseChart items={endUseBreakdown} />
        </div>
      </div>

      <SectionCard
        title="Scope 1 — Fuel & Fleet"
        subtitle="These feed your Scope 1 emissions total and regulatory-exposure check — they don't move your $ savings or payback unless your direct emissions are large enough to be carbon-tax-liable. Two exceptions below trigger a product recommendation."
      >
        <FieldRow label="Stationary diesel (litres/year)" hint="Also triggers the Microgrid/EaaS product recommendation if set. Generators, boilers — optional, leave blank if none group-wide.">
          <input type="number" className={inputClass} value={inputs.fuelFleet.stationaryDieselLitresPerYear ?? ""} onChange={(e) => patchFuel("stationaryDieselLitresPerYear", numOrUndef(e.target.value))} />
        </FieldRow>
        <FieldRow label="Mobile fleet diesel (litres/year)" hint="Optional — leave blank if no diesel company vehicles">
          <input type="number" className={inputClass} value={inputs.fuelFleet.mobileDieselLitresPerYear ?? ""} onChange={(e) => patchFuel("mobileDieselLitresPerYear", numOrUndef(e.target.value))} />
        </FieldRow>
        <FieldRow label="Manufacturing facility?" hint="Also triggers the PowerLogic product recommendation (power quality/distribution) if yes.">
          <select className={inputClass} value={inputs.fuelFleet.isManufacturing ? "yes" : "no"} onChange={(e) => patchFuel("isManufacturing", e.target.value === "yes")}>
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </FieldRow>
        {inputs.fuelFleet.isManufacturing && (
          <FieldRow label="Process combustion (GJ/year)" hint="Optional — furnaces, kilns; uses the natural gas factor as a proxy since fuel type isn't specified">
            <input type="number" className={inputClass} value={inputs.fuelFleet.processCombustionGJPerYear ?? ""} onChange={(e) => patchFuel("processCombustionGJPerYear", numOrUndef(e.target.value))} />
          </FieldRow>
        )}
        <Advanced title="Advanced / optional">
          <FieldRow label="Petrol, company cars (litres/year)" hint="Optional — leave blank if not applicable">
            <input type="number" className={inputClass} value={inputs.fuelFleet.petrolLitresPerYear ?? ""} onChange={(e) => patchFuel("petrolLitresPerYear", numOrUndef(e.target.value))} />
          </FieldRow>
          <FieldRow label="CNG/LPG (kg/year)" hint="Optional — leave blank if not applicable">
            <input type="number" className={inputClass} value={inputs.fuelFleet.cngKgPerYear ?? ""} onChange={(e) => patchFuel("cngKgPerYear", numOrUndef(e.target.value))} />
          </FieldRow>
        </Advanced>
      </SectionCard>

      <div className="animate-step rounded-2xl border border-border bg-card p-4 shadow-sm shadow-brand-700/5">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-ink">Scope 1 — Refrigerants & SF6</h3>
            <p className="text-xs text-ink-soft">Fugitive emissions only — adds to your Scope 1 total and regulatory-exposure check, no $ effect.</p>
          </div>
          <button onClick={addRefrigerantEntry} className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-ink-soft hover:border-brand-400">
            + Add gas
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {inputs.refrigerants.entries.map((entry, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <select className={inputClass} value={entry.gasType} onChange={(e) => updateRefrigerantEntry(i, (prev) => ({ ...prev, gasType: e.target.value as RefrigerantEntry["gasType"] }))}>
                <option value="R-410A">R-410A</option>
                <option value="R-32">R-32</option>
                <option value="R-134a">R-134a</option>
                <option value="R-22">R-22 (phased out)</option>
                <option value="Unknown">Unknown</option>
              </select>
              <NumberInput className={inputClass} placeholder="kg/year" value={entry.kgPerYear} onChange={(n) => updateRefrigerantEntry(i, (prev) => ({ ...prev, kgPerYear: n }))} />
              <button onClick={() => removeRefrigerantEntry(i)} className="text-xs text-red-600">Remove</button>
            </div>
          ))}
        </div>
        <div className="mt-3">
          <FieldRow label="SF6 leakage (kg/year)" hint="Electrical equipment — utilities/data centres">
            <input type="number" className={inputClass} value={inputs.refrigerants.sf6LeakageKgPerYear ?? ""} onChange={(e) => patch("refrigerants", { ...inputs.refrigerants, sf6LeakageKgPerYear: numOrUndef(e.target.value) })} />
          </FieldRow>
        </div>
      </div>

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
      </>
      )}
    </div>
  );
}
