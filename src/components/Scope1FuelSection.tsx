"use client";

import type { SmeInputs } from "@/lib/types/inputs";
import { FieldRow, SectionCard, inputClass } from "./FormField";
import { Advanced } from "./ui/Advanced";
import { numOrUndef } from "@/lib/formNumber";
import type { SmeFormPatchers } from "@/hooks/useSmeFormPatchers";

/** Wizard step 1, second card: fleet/generator fuel and refrigerants. Split out of InputForm.tsx. */
export function Scope1FuelSection({ inputs, patchers }: { inputs: SmeInputs; patchers: SmeFormPatchers }) {
  const { patchFuel, patchRefrigerants } = patchers;

  return (
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
  );
}
