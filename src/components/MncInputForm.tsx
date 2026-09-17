"use client";

import type { Dispatch, SetStateAction } from "react";
import type { Sector } from "@/lib/types/inputs";
import type { MncInputs, MncSite, RefrigerantEntry } from "@/lib/types/mncInputs";
import { FieldRow, SectionCard, inputClass, checkboxInputClass, checkboxLabelClass } from "./FormField";
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

interface Props {
  inputs: MncInputs;
  setInputs: Dispatch<SetStateAction<MncInputs>>;
  /** Which wizard step to render: 0 = profile, 1 = energy & fuel, 2 = value chain, 3 = goals & investment. */
  step: number;
}

export const MNC_INPUT_STEPS = ["Business profile", "Energy & fuel", "Value chain", "Goals & investment"];

function numOrUndef(v: string): number | undefined {
  if (v === "") return undefined;
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
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
      annualElectricityKwh: 1000000,
      renewableCoveragePct: 0,
    };
    patch("sites", [...inputs.sites, newSite]);
  };

  const removeSite = (id: string) => {
    if (inputs.sites.length <= 1) return;
    patch("sites", inputs.sites.filter((s) => s.id !== id));
  };

  const toggleExistingSolution = (id: string) => {
    const set = new Set(inputs.baseline.existingSolutionIds);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    patchBaseline("existingSolutionIds", Array.from(set));
  };

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
      {step === 0 && (
      <SectionCard title="Profile & Goals" subtitle="MNC universal inputs">
        <FieldRow label="Company name">
          <input className={inputClass} value={inputs.companyName} onChange={(e) => patch("companyName", e.target.value)} />
        </FieldRow>
        <FieldRow label="Industry sector">
          <select className={inputClass} value={inputs.sector} onChange={(e) => patch("sector", e.target.value as Sector)}>
            {SECTORS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </FieldRow>
        <FieldRow label="Total employees (all sites)">
          <input type="number" className={inputClass} value={inputs.totalEmployees ?? ""} onChange={(e) => patch("totalEmployees", numOrUndef(e.target.value))} />
        </FieldRow>
        <FieldRow label="Annual revenue (S$)" hint="Optional — powers the energy-cost-as-%-of-revenue KPI only">
          <input type="number" className={inputClass} value={inputs.annualRevenueSgd ?? ""} onChange={(e) => patch("annualRevenueSgd", numOrUndef(e.target.value))} />
        </FieldRow>
        <FieldRow label="Listed on SGX?">
          <select className={inputClass} value={inputs.isListedOnSgx ? "yes" : "no"} onChange={(e) => patch("isListedOnSgx", e.target.value === "yes")}>
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </FieldRow>
        <FieldRow label="Estimated solution investment (S$)">
          <input type="number" className={inputClass} value={inputs.estimatedInvestmentSgd} onChange={(e) => patch("estimatedInvestmentSgd", Number(e.target.value) || 0)} />
        </FieldRow>
        <FieldRow label="2030 carbon price scenario">
          <select className={inputClass} value={inputs.carbonPriceScenario} onChange={(e) => patch("carbonPriceScenario", e.target.value as MncInputs["carbonPriceScenario"])}>
            <option value="conservative">Conservative — S$50/t</option>
            <option value="base">Base case — S$65/t</option>
            <option value="optimistic">Optimistic — S$80/t</option>
          </select>
        </FieldRow>
      </SectionCard>
      )}

      {step === 1 && (
      <>
      <div className="animate-step rounded-2xl border border-border bg-card p-4 shadow-sm shadow-brand-700/5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-ink">Sites — Scope 2 (per site)</h3>
            <p className="text-xs text-ink-soft">Electricity, tariff, renewable coverage, gas — per site</p>
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
                <FieldRow label="Annual electricity (kWh)">
                  <input type="number" className={inputClass} value={site.annualElectricityKwh} onChange={(e) => patchSite(site.id, "annualElectricityKwh", Number(e.target.value) || 0)} />
                </FieldRow>
                <FieldRow label="Tariff (S$/kWh)" hint="Blank = reference tariff">
                  <input type="number" step="0.01" className={inputClass} value={site.tariffSgdPerKwh ?? ""} onChange={(e) => patchSite(site.id, "tariffSgdPerKwh", numOrUndef(e.target.value))} />
                </FieldRow>
                <FieldRow label="Renewable coverage (%)">
                  <input type="number" min={0} max={100} className={inputClass} value={site.renewableCoveragePct} onChange={(e) => patchSite(site.id, "renewableCoveragePct", Math.min(Math.max(Number(e.target.value) || 0, 0), 100))} />
                </FieldRow>
                <FieldRow label="Floor area (m²)" hint="Optional — for benchmarking">
                  <input type="number" className={inputClass} value={site.floorAreaM2 ?? ""} onChange={(e) => patchSite(site.id, "floorAreaM2", numOrUndef(e.target.value))} />
                </FieldRow>
                <FieldRow label="Natural gas (GJ/year)">
                  <input type="number" className={inputClass} value={site.annualNaturalGasGJ ?? ""} onChange={(e) => patchSite(site.id, "annualNaturalGasGJ", numOrUndef(e.target.value))} />
                </FieldRow>
                <FieldRow label="Purchased heat/cooling (GJ/year)">
                  <input type="number" className={inputClass} value={site.annualHeatCoolingGJ ?? ""} onChange={(e) => patchSite(site.id, "annualHeatCoolingGJ", numOrUndef(e.target.value))} />
                </FieldRow>
              </div>
            </div>
          ))}
        </div>
      </div>

      <SectionCard title="Scope 1 — Fuel & Fleet">
        <FieldRow label="Stationary diesel (litres/year)" hint="Generators, boilers">
          <input type="number" className={inputClass} value={inputs.fuelFleet.stationaryDieselLitresPerYear ?? ""} onChange={(e) => patchFuel("stationaryDieselLitresPerYear", numOrUndef(e.target.value))} />
        </FieldRow>
        <FieldRow label="Mobile fleet diesel (litres/year)">
          <input type="number" className={inputClass} value={inputs.fuelFleet.mobileDieselLitresPerYear ?? ""} onChange={(e) => patchFuel("mobileDieselLitresPerYear", numOrUndef(e.target.value))} />
        </FieldRow>
        <FieldRow label="Petrol, company cars (litres/year)">
          <input type="number" className={inputClass} value={inputs.fuelFleet.petrolLitresPerYear ?? ""} onChange={(e) => patchFuel("petrolLitresPerYear", numOrUndef(e.target.value))} />
        </FieldRow>
        <FieldRow label="CNG/LPG (kg/year)">
          <input type="number" className={inputClass} value={inputs.fuelFleet.cngKgPerYear ?? ""} onChange={(e) => patchFuel("cngKgPerYear", numOrUndef(e.target.value))} />
        </FieldRow>
        <FieldRow label="Manufacturing facility?">
          <select className={inputClass} value={inputs.fuelFleet.isManufacturing ? "yes" : "no"} onChange={(e) => patchFuel("isManufacturing", e.target.value === "yes")}>
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </FieldRow>
        {inputs.fuelFleet.isManufacturing && (
          <FieldRow label="Process combustion (GJ/year)">
            <input type="number" className={inputClass} value={inputs.fuelFleet.processCombustionGJPerYear ?? ""} onChange={(e) => patchFuel("processCombustionGJPerYear", numOrUndef(e.target.value))} />
          </FieldRow>
        )}
      </SectionCard>

      <div className="animate-step rounded-2xl border border-border bg-card p-4 shadow-sm shadow-brand-700/5">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-bold text-ink">Scope 1 — Refrigerants & SF6</h3>
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
              <input type="number" className={inputClass} placeholder="kg/year" value={entry.kgPerYear} onChange={(e) => updateRefrigerantEntry(i, (prev) => ({ ...prev, kgPerYear: Number(e.target.value) || 0 }))} />
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
      </>
      )}

      {step === 2 && (
      <>
      <SectionCard title="Scope 3 — Cat 1, 4, 9 (spend / freight)">
        <FieldRow label="Purchased goods spend (S$/year)" hint="Aggregate across categories">
          <input
            type="number"
            className={inputClass}
            value={inputs.scope3.purchasedGoodsSpendByCategorySgd[0]?.spendSgd ?? ""}
            onChange={(e) => patchScope3("purchasedGoodsSpendByCategorySgd", [{ category: "Aggregate", spendSgd: Number(e.target.value) || 0 }])}
          />
        </FieldRow>
        <FieldRow label="Upstream freight — road (tonne-km/year)">
          <input type="number" className={inputClass} value={inputs.scope3.upstreamFreightTonneKm?.road ?? ""} onChange={(e) => patchScope3("upstreamFreightTonneKm", { road: Number(e.target.value) || 0, rail: inputs.scope3.upstreamFreightTonneKm?.rail ?? 0, sea: inputs.scope3.upstreamFreightTonneKm?.sea ?? 0, air: inputs.scope3.upstreamFreightTonneKm?.air ?? 0 })} />
        </FieldRow>
        <FieldRow label="Upstream freight — sea (tonne-km/year)">
          <input type="number" className={inputClass} value={inputs.scope3.upstreamFreightTonneKm?.sea ?? ""} onChange={(e) => patchScope3("upstreamFreightTonneKm", { road: inputs.scope3.upstreamFreightTonneKm?.road ?? 0, rail: inputs.scope3.upstreamFreightTonneKm?.rail ?? 0, sea: Number(e.target.value) || 0, air: inputs.scope3.upstreamFreightTonneKm?.air ?? 0 })} />
        </FieldRow>
        <FieldRow label="Upstream freight — air (tonne-km/year)">
          <input type="number" className={inputClass} value={inputs.scope3.upstreamFreightTonneKm?.air ?? ""} onChange={(e) => patchScope3("upstreamFreightTonneKm", { road: inputs.scope3.upstreamFreightTonneKm?.road ?? 0, rail: inputs.scope3.upstreamFreightTonneKm?.rail ?? 0, sea: inputs.scope3.upstreamFreightTonneKm?.sea ?? 0, air: Number(e.target.value) || 0 })} />
        </FieldRow>
        <FieldRow label="Downstream freight — road (tonne-km/year)">
          <input type="number" className={inputClass} value={inputs.scope3.downstreamFreightTonneKm?.road ?? ""} onChange={(e) => patchScope3("downstreamFreightTonneKm", { road: Number(e.target.value) || 0, sea: inputs.scope3.downstreamFreightTonneKm?.sea ?? 0, air: inputs.scope3.downstreamFreightTonneKm?.air ?? 0 })} />
        </FieldRow>
        <FieldRow label="Downstream freight — sea (tonne-km/year)">
          <input type="number" className={inputClass} value={inputs.scope3.downstreamFreightTonneKm?.sea ?? ""} onChange={(e) => patchScope3("downstreamFreightTonneKm", { road: inputs.scope3.downstreamFreightTonneKm?.road ?? 0, sea: Number(e.target.value) || 0, air: inputs.scope3.downstreamFreightTonneKm?.air ?? 0 })} />
        </FieldRow>
      </SectionCard>

      <SectionCard title="Scope 3 — Cat 6, 7 (travel & commuting)">
        <FieldRow label="Short-haul business travel (pax-km/year)">
          <input type="number" className={inputClass} value={inputs.scope3.shortHaulPassengerKm ?? ""} onChange={(e) => patchScope3("shortHaulPassengerKm", numOrUndef(e.target.value))} />
        </FieldRow>
        <FieldRow label="Long-haul business travel (pax-km/year)">
          <input type="number" className={inputClass} value={inputs.scope3.longHaulPassengerKm ?? ""} onChange={(e) => patchScope3("longHaulPassengerKm", numOrUndef(e.target.value))} />
        </FieldRow>
        <FieldRow label="Hotel nights/year">
          <input type="number" className={inputClass} value={inputs.scope3.hotelNights ?? ""} onChange={(e) => patchScope3("hotelNights", numOrUndef(e.target.value))} />
        </FieldRow>
        <FieldRow label="Average commute distance (km, one-way)">
          <input type="number" className={inputClass} value={inputs.scope3.averageCommuteKm} onChange={(e) => patchScope3("averageCommuteKm", Number(e.target.value) || 0)} />
        </FieldRow>
        <FieldRow label="Commute mode — % public transport">
          <input type="number" min={0} max={100} className={inputClass} value={inputs.scope3.commuteModeSplitPct.public} onChange={(e) => patchScope3("commuteModeSplitPct", { ...inputs.scope3.commuteModeSplitPct, public: Number(e.target.value) || 0 })} />
        </FieldRow>
        <FieldRow label="Commute mode — % private car">
          <input type="number" min={0} max={100} className={inputClass} value={inputs.scope3.commuteModeSplitPct.car} onChange={(e) => patchScope3("commuteModeSplitPct", { ...inputs.scope3.commuteModeSplitPct, car: Number(e.target.value) || 0 })} />
        </FieldRow>
        <FieldRow label="Work-from-home days/week">
          <input type="number" min={0} max={5} className={inputClass} value={inputs.scope3.wfhDaysPerWeek} onChange={(e) => patchScope3("wfhDaysPerWeek", Number(e.target.value) || 0)} />
        </FieldRow>
      </SectionCard>
      </>
      )}

      {step === 3 && (
      <>
      <SectionCard title="Baseline, Targets & Context">
        <FieldRow label="Current carbon tax exposure reported (tCO2e/year)" hint="If already taxable/reported to IRAS">
          <input type="number" className={inputClass} value={inputs.baseline.currentCarbonTaxExposureTonnes ?? ""} onChange={(e) => patchBaseline("currentCarbonTaxExposureTonnes", numOrUndef(e.target.value))} />
        </FieldRow>
        <FieldRow label="SBTi / net-zero commitment">
          <select className={inputClass} value={inputs.baseline.sbtiStatus} onChange={(e) => patchBaseline("sbtiStatus", e.target.value as MncInputs["baseline"]["sbtiStatus"])}>
            <option value="none">No</option>
            <option value="in-progress">In progress</option>
            <option value="committed">Committed</option>
          </select>
        </FieldRow>
        {inputs.baseline.sbtiStatus !== "none" && (
          <FieldRow label="Target year">
            <input type="number" className={inputClass} value={inputs.baseline.sbtiTargetYear ?? ""} onChange={(e) => patchBaseline("sbtiTargetYear", numOrUndef(e.target.value))} />
          </FieldRow>
        )}
        <FieldRow label="Sustainability reporting framework">
          <select className={inputClass} value={inputs.baseline.reportingFramework} onChange={(e) => patchBaseline("reportingFramework", e.target.value as MncInputs["baseline"]["reportingFramework"])}>
            <option value="None">None</option>
            <option value="GRI">GRI</option>
            <option value="ISSB/IFRS S2">ISSB/IFRS S2</option>
            <option value="TCFD">TCFD</option>
            <option value="CDP">CDP</option>
            <option value="SGX mandatory">SGX mandatory</option>
          </select>
        </FieldRow>
        <FieldRow label="Budget range for investment">
          <select className={inputClass} value={inputs.baseline.budgetRange} onChange={(e) => patchBaseline("budgetRange", e.target.value as MncInputs["baseline"]["budgetRange"])}>
            <option value="<50k">Under S$50k</option>
            <option value="50k-500k">S$50k – S$500k</option>
            <option value="500k-5M">S$500k – S$5M</option>
            <option value=">5M">Over S$5M</option>
          </select>
        </FieldRow>
        <FieldRow label="Preferred engagement model">
          <select className={inputClass} value={inputs.baseline.engagementModel} onChange={(e) => patchBaseline("engagementModel", e.target.value as MncInputs["baseline"]["engagementModel"])}>
            <option value="Buy outright">Buy outright</option>
            <option value="EaaS">EaaS (no capex)</option>
            <option value="Consulting only">Consulting only</option>
            <option value="Not sure">Not sure</option>
          </select>
        </FieldRow>
        <div className="sm:col-span-2 flex flex-wrap gap-x-5 gap-y-2.5">
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
      </SectionCard>

      <SectionCard title="Sensitivity — What If?">
        <FieldRow label="Electricity tariff override (S$/kWh)" hint="Leave blank to use the weighted-average per-site tariff">
          <input type="number" step="0.01" className={inputClass} value={inputs.sensitivity.tariffOverrideSgdPerKwh ?? ""} onChange={(e) => patchSensitivity("tariffOverrideSgdPerKwh", numOrUndef(e.target.value))} />
        </FieldRow>
        <FieldRow label="Energy saving rate override (%)">
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
          <input type="range" min={0} max={5} step={0.5} value={inputs.sensitivity.tariffEscalationPctPerYear * 100} onChange={(e) => patchSensitivity("tariffEscalationPctPerYear", Number(e.target.value) / 100)} />
        </FieldRow>
      </SectionCard>
      </>
      )}
    </div>
  );
}
