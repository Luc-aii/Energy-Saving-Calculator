export interface EditableField {
  file: string;
  field: string;
  label: string;
  type: "number" | "text";
}

/**
 * Fields exposed in the admin editor, matching PRD section 16.1's ownership
 * table exactly. carbon_tax_schedule.json, sector_benchmarks.json and
 * product_mapping.json are deliberately NOT here — section 16.6 says those
 * need policy/product-team sign-off, not routine data-team updates.
 */
export const EDITABLE_FIELDS: EditableField[] = [
  { file: "emission_factors.json", field: "electricity.singapore.gridEmissionFactorKgPerKwh", label: "Grid Emission Factor (kg CO2/kWh)", type: "number" },
  { file: "emission_factors.json", field: "fuels.dieselKgCo2ePerLitre", label: "Diesel (kg CO2e/litre)", type: "number" },
  { file: "emission_factors.json", field: "fuels.petrolKgCo2ePerLitre", label: "Petrol (kg CO2e/litre)", type: "number" },
  { file: "emission_factors.json", field: "fuels.cngKgCo2ePerKg", label: "CNG (kg CO2e/kg)", type: "number" },
  { file: "emission_factors.json", field: "naturalGas.kgCo2ePerGJ", label: "Natural gas (kg CO2e/GJ)", type: "number" },

  { file: "tariff_config.json", field: "currentBaseTariffSgdPerKwh", label: "Reference electricity tariff (S$/kWh)", type: "number" },

  { file: "scope3_factors.json", field: "businessTravel.longHaulEconomyKgCo2ePerPassengerKm", label: "Business travel, long-haul economy (kg CO2e/pax-km)", type: "number" },
  { file: "scope3_factors.json", field: "freight.airKgCo2ePerTonneKm", label: "Air freight (kg CO2e/tonne-km)", type: "number" },
  { file: "scope3_factors.json", field: "freight.roadDieselHgvKgCo2ePerTonneKm", label: "Road freight, diesel HGV (kg CO2e/tonne-km)", type: "number" },
  { file: "scope3_factors.json", field: "assumptions.fxSgdToUsd", label: "SGD to USD exchange rate", type: "number" },

  { file: "refrigerant_gwp.json", field: "gases.R-410A", label: "R-410A GWP", type: "number" },
  { file: "refrigerant_gwp.json", field: "gases.R-32", label: "R-32 GWP", type: "number" },
  { file: "refrigerant_gwp.json", field: "gases.R-134a", label: "R-134a GWP", type: "number" },
  { file: "refrigerant_gwp.json", field: "gases.R-22", label: "R-22 GWP", type: "number" },

  { file: "grants.json", field: "grants.0.maxAmountSgd", label: "EEG Base — max grant (S$)", type: "number" },
  { file: "grants.json", field: "grants.0.coFundRate", label: "EEG Base — co-fund rate (0-1)", type: "number" },
  { file: "grants.json", field: "grants.0.validUntil", label: "EEG Base — valid until", type: "text" },

  { file: "fuel_prices.json", field: "pricesSgdPerUnit.diesel", label: "Diesel pump price (S$/litre)", type: "number" },
  { file: "fuel_prices.json", field: "pricesSgdPerUnit.petrol", label: "Petrol pump price (S$/litre)", type: "number" },
  { file: "fuel_prices.json", field: "pricesSgdPerUnit.cng", label: "CNG pump price (S$/kg)", type: "number" },
];

/** Shown in the admin UI as view-only, with a note on why they're not editable here. */
export const READ_ONLY_FILES = [
  { file: "carbon_tax_schedule.json", reason: "Pre-legislated by NEA/MSE — not a data-team update (PRD section 16.6)." },
  { file: "sector_benchmarks.json", reason: "Reviewed annually for stability, not ad-hoc (PRD section 16.6)." },
  { file: "product_mapping.json", reason: "Requires Schneider product-team sign-off (PRD section 16.6)." },
];

export const EDITABLE_FILE_NAMES = Array.from(new Set(EDITABLE_FIELDS.map((f) => f.file)));
export const ALL_MANAGED_FILES = [
  ...EDITABLE_FILE_NAMES,
  ...READ_ONLY_FILES.map((f) => f.file),
];
