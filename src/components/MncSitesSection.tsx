"use client";

import type { MncInputs, MncSite } from "@/lib/types/mncInputs";
import { FieldRow, inputClass } from "./FormField";
import { EnergyEndUseChart } from "./EnergyEndUseChart";
import { Advanced } from "./ui/Advanced";
import { NumberInput } from "./ui/NumberInput";
import { getEndUseBreakdown, subProfileOptions, subProfileYesNoQuestion, getTopEndUse } from "@/lib/calc/ecm";
import { SectorSpotlight } from "./SectorSpotlight";
import { numOrUndef } from "@/lib/formNumber";
import type { MncFormPatchers } from "@/hooks/useMncFormPatchers";

let siteCounter = 0;

/** Wizard step 1, first block: per-site Scope 2 inputs and the portfolio-level end-use chart. Split out of MncInputForm.tsx. */
export function MncSitesSection({ inputs, patchers }: { inputs: MncInputs; patchers: MncFormPatchers }) {
  const { patch, patchSite } = patchers;

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

  // Portfolio-level end-use chart uses the first site's sub-profile — matches the simplification in mncEngine.ts.
  const primarySubProfile = inputs.sites[0]?.subProfile;
  const endUseBreakdown = getEndUseBreakdown(inputs.sector, primarySubProfile, undefined);
  const subProfiles = subProfileOptions(inputs.sector);
  const subProfileQuestion = subProfileYesNoQuestion(inputs.sector);
  const topEndUse = getTopEndUse(endUseBreakdown);

  return (
    <div className="animate-step rounded-2xl border border-border bg-card p-4 shadow-sm shadow-brand-700/5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-base font-bold text-ink">Sites — Scope 2 (per site)</h3>
          <p className="text-xs text-ink-soft">Monthly electricity, renewable coverage — per site</p>
        </div>
        <button type="button" onClick={addSite} className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-ink-soft hover:border-brand-400">
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
                type="button"
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
              <FieldRow label="Renewable coverage (%)" hint="RECs/PPA/green tariff for this site. Splits its cost into a clean share (priced with a premium) and dirty share, and lowers the CO2e-avoided figure this site's savings measures can claim, since already-clean kWh can't avoid further emissions. Also surfaces onsite generation / backup-power measures for this site.">
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
  );
}
