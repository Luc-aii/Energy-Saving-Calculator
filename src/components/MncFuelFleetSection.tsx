"use client";

import type { MncInputs } from "@/lib/types/mncInputs";
import { FieldRow, SectionCard, inputClass } from "./FormField";
import { Advanced } from "./ui/Advanced";
import { numOrUndef } from "@/lib/formNumber";
import type { MncFormPatchers } from "@/hooks/useMncFormPatchers";

/** Wizard step 1, second block: group-wide Scope 1 fuel and fleet inputs. Split out of MncInputForm.tsx. */
export function MncFuelFleetSection({ inputs, patchers }: { inputs: MncInputs; patchers: MncFormPatchers }) {
  const { patchFuel } = patchers;

  return (
    <SectionCard
      title="Scope 1 — Fuel & Fleet"
      subtitle="These feed your Scope 1 emissions total and regulatory-exposure check — they don't move your $ savings or payback unless your direct emissions are large enough to be carbon-tax-liable. Two exceptions below surface further measure recommendations."
    >
      <FieldRow label="Stationary diesel (litres/year)" hint="Also surfaces onsite generation / backup-power measures if set. Generators, boilers — optional, leave blank if none group-wide.">
        <input type="number" className={inputClass} value={inputs.fuelFleet.stationaryDieselLitresPerYear ?? ""} onChange={(e) => patchFuel("stationaryDieselLitresPerYear", numOrUndef(e.target.value))} />
      </FieldRow>
      <FieldRow label="Mobile fleet diesel (litres/year)" hint="Optional — leave blank if no diesel company vehicles">
        <input type="number" className={inputClass} value={inputs.fuelFleet.mobileDieselLitresPerYear ?? ""} onChange={(e) => patchFuel("mobileDieselLitresPerYear", numOrUndef(e.target.value))} />
      </FieldRow>
      <FieldRow label="Manufacturing facility?" hint="Also surfaces power-quality / distribution measures if yes.">
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
  );
}
