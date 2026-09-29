"use client";

import type { Dispatch, SetStateAction } from "react";
import type { SmeInputs } from "@/lib/types/inputs";
import { FieldRow, SectionCard, inputClass } from "./FormField";
import { BillUploadPanel } from "./BillUploadPanel";
import { EnergyEndUseChart } from "./EnergyEndUseChart";
import { NumberInput } from "./ui/NumberInput";
import { getEndUseBreakdown, subProfileOptions, subProfileYesNoQuestion, getTopEndUse } from "@/lib/calc/ecm";
import { SectorSpotlight } from "./SectorSpotlight";
import { numOrUndef } from "@/lib/formNumber";
import type { SmeFormPatchers } from "@/hooks/useSmeFormPatchers";

/** Wizard step 1, first card: electricity, solar, and the energy end-use breakdown. Split out of InputForm.tsx. */
export function Scope2ElectricitySection({
  inputs,
  setInputs,
  patchers,
}: {
  inputs: SmeInputs;
  setInputs: Dispatch<SetStateAction<SmeInputs>>;
  patchers: SmeFormPatchers;
}) {
  const { patchEnergy } = patchers;

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
    <>
      <BillUploadPanel setInputs={setInputs} />
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
        <FieldRow label="Onsite solar generation?" hint="Also surfaces onsite generation / backup-power measures below if yes">
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
              {(() => {
                /* Show raw user values — not the normalized ones — so the inputs don't shift under
                 * your fingers while you're typing. The engine normalizes internally regardless,
                 * so calculation accuracy is unaffected. */
                const raw = inputs.energy.customEndUsePct ?? {};
                const rawTotal = Object.values(raw).reduce((s, v) => s + Math.max(v, 0), 0);
                const isExact = Math.abs(rawTotal - 100) < 0.5;

                return (
                  <>
                    {endUseBreakdown.map((item) => (
                      <FieldRow key={item.id} label={item.label}>
                        <NumberInput
                          min={0}
                          max={100}
                          className={inputClass}
                          value={raw[item.id] != null ? Math.round(raw[item.id]) : Math.round(item.pct)}
                          onChange={(n) => patchEndUsePct(item.id, Math.min(n, 100))}
                        />
                      </FieldRow>
                    ))}

                    {/* Running total + normalize button */}
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-ink-soft">
                        Total:{" "}
                        <span className={isExact ? "font-semibold text-green-600" : "font-semibold text-amber-600"}>
                          {Math.round(rawTotal)}%
                        </span>
                        {!isExact && " — the engine normalizes this for calculations, but you can tidy it up below."}
                      </p>
                      {!isExact && (
                        <button
                          type="button"
                          className="ml-2 whitespace-nowrap rounded bg-brand-600 px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
                          onClick={() => {
                            /* Scale every raw value so the total becomes exactly 100. */
                            if (rawTotal <= 0) return;
                            const normalized = Object.fromEntries(
                              Object.entries(raw).map(([id, v]) => [id, Math.round((Math.max(v, 0) / rawTotal) * 100)])
                            );
                            /* Adjust rounding residual on the largest bucket so it sums to exactly 100. */
                            const normSum = Object.values(normalized).reduce((s, v) => s + v, 0);
                            if (normSum !== 100) {
                              const largestId = Object.entries(normalized).sort((a, b) => b[1] - a[1])[0]?.[0];
                              if (largestId) normalized[largestId] += 100 - normSum;
                            }
                            patchEnergy("customEndUsePct", normalized);
                          }}
                        >
                          Normalize to 100%
                        </button>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      </SectionCard>
    </>
  );
}
