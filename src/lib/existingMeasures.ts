/**
 * Vendor-neutral categories for "what do you already have in place" — used on
 * the input side so the question isn't leading (a company running a
 * competitor's BMS should be able to say so, not just "none of these
 * Schneider products"). Product recommendation logic (products.ts,
 * mncProducts.ts) gates on these category ids, not on brand names — Schneider
 * products are only named on the results/recommendation side.
 */
export const EXISTING_MEASURE_CATEGORIES = [
  { id: "bms", label: "Building management / automation system (BMS)" },
  { id: "energy-monitoring", label: "Energy monitoring / sub-metering" },
  { id: "power-quality", label: "Power quality / distribution monitoring" },
  { id: "onsite-renewable-microgrid", label: "On-site solar or microgrid" },
  { id: "carbon-reporting-software", label: "Sustainability reporting / carbon accounting software" },
] as const;

export type ExistingMeasureId = (typeof EXISTING_MEASURE_CATEGORIES)[number]["id"];
