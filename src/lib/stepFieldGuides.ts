export interface FieldGuideEntry {
  field: string;
  help: string;
}

export interface StepGuide {
  title: string;
  intro: string;
  fields: FieldGuideEntry[];
}

/** Field-by-field help text shown in the contextual "How to use" panel, one entry per wizard step. */
export const SME_STEP_GUIDES: StepGuide[] = [
  {
    title: "Business profile",
    intro: "Sets your industry benchmark and the overall scenario the rest of the calculator runs on.",
    fields: [
      { field: "Company name", help: "Appears on your exported PDF illustration and in the AI-generated summary." },
      { field: "Industry sector", help: "Sets which sector benchmark band (energy/carbon intensity) your business is compared against." },
      { field: "Number of sites", help: "How many physical locations this illustration covers — use 1 for a single-site SME." },
      { field: "Floor area (m²)", help: "Total floor area across your site(s). Used to calculate your energy intensity (kWh/m²) against the sector benchmark." },
      { field: "Number of employees", help: "Used for the carbon-per-employee KPI and to sanity-check your energy use is plausible for your headcount." },
      { field: "Annual revenue (S$)", help: "Optional — only powers the \"energy cost as % of revenue\" KPI. Leave blank if you'd rather not share it." },
      { field: "Estimated solution investment (S$)", help: "Your rough budget for the recommended package. It's a starting estimate — refine it with an advisor later." },
      { field: "2030 carbon price scenario", help: "Which of the three carbon-price trajectories to use for the national policy context chart." },
    ],
  },
  {
    title: "Energy & fuel",
    intro: "Your electricity bill and anything you burn onsite or in vehicles. Don't know your kWh? Use the bill upload above instead.",
    fields: [
      { field: "Monthly electricity (kWh)", help: "Your latest bill's consumption. Used if you don't provide 12 months of history below." },
      { field: "Or: monthly electricity spend (S$)", help: "Only needed if you don't know your kWh — we back-calculate it at the reference tariff." },
      { field: "Up to 12 months of kWh readings", help: "Comma-separated. Averaging several months gives a more representative baseline than one." },
      { field: "Onsite solar generation?", help: "Nets your self-generated solar off your grid draw before we calculate your Scope 2 emissions." },
      { field: "Monthly natural gas (GJ)", help: "Leave blank if you don't burn gas onsite (e.g. for a boiler or kitchen)." },
      { field: "Do you operate company vehicles?", help: "Toggles the fleet fuel fields — these capture your Scope 1 (direct) transport emissions." },
      { field: "Monthly fuel consumption (litres)", help: "Your fleet's total fuel use per month, across all vehicles." },
      { field: "Fuel type", help: "Diesel, petrol, or CNG — changes which emission factor is applied." },
      { field: "Diesel backup generator?", help: "Toggles generator fields — any one of diesel litres, or hours run + tank size, is enough to estimate its use." },
    ],
  },
  {
    title: "Value chain",
    intro: "Refrigerants, freight, and travel. This section is quantified for context — it's never included in your $ savings, per the Scope 3 methodology.",
    fields: [
      { field: "Use refrigeration / aircon equipment?", help: "Refrigerant leakage is a high-warming-potential Scope 1 source — toggles the fields below." },
      { field: "Refrigerant type", help: "Determines the global-warming-potential factor applied to your top-up quantity." },
      { field: "Annual top-up quantity (kg)", help: "How much refrigerant gas is topped up per year — used as a proxy for how much has leaked." },
      { field: "Annual logistics/freight spend (S$)", help: "Feeds a spend-based estimate of your upstream/downstream freight emissions." },
      { field: "Primary freight mode", help: "Road, sea, air, or mixed — each has a very different emissions intensity per dollar spent." },
      { field: "Business flights per year", help: "A rough count used for a Scope 3 business-travel estimate." },
      { field: "Employees commuting", help: "Defaults to your total employee count from Step 1 if left blank." },
      { field: "Dominant commute mode", help: "Public transport, private car, or mixed — changes the per-person commuting factor used." },
    ],
  },
  {
    title: "Goals & investment",
    intro: "What you've already deployed (any vendor), your targets, and the assumptions you can override.",
    fields: [
      { field: "Green/efficiency measures already in place", help: "Check anything you already have, from any vendor — this tells us what gap still needs closing, not what brand to compare against." },
      { field: "Anything else already in place?", help: "Free text for anything not covered by the checkboxes — shown as context only, never scored." },
      { field: "Preferred investment horizon", help: "Used to flag if the recommended package's payback period is longer than your appetite for it." },
      { field: "Emissions reduction target (%) / Target year", help: "Optional — if set, we check whether your projected savings trajectory is actually on track to hit it." },
      { field: "MAS-regulated financial institution / SBTi-supplier checkboxes", help: "Surfaces the relevant regulatory/compliance flags for you in the results." },
      { field: "Electricity tariff override", help: "Leave blank to use the current reference tariff — override only if you're on a specific contracted rate." },
      { field: "Energy saving rate override (%)", help: "Leave blank to use our calibration-curve estimate based on your sector position." },
      { field: "Tariff escalation (%/year)", help: "How much you expect your electricity tariff to rise annually — compounds into future years' projected savings." },
    ],
  },
  {
    title: "Your results",
    intro: "Everything here is computed deterministically from what you entered — the AI-generated summary and insights only phrase these numbers, never calculate their own.",
    fields: [
      { field: "Top KPI strip", help: "The headline pitch numbers — carbon cost, saving range, payback, and confidence — visible on every step." },
      { field: "Summary", help: "Click \"Write with AI\" for a live plain-English narrative, or read the fixed-template version shown by default." },
      { field: "What you can improve", help: "Click \"Get AI insights\" for gap-and-recommendation pairs grounded in your own computed results." },
      { field: "Energy intensity KPI dashboard", help: "Seven operational metrics; only energy and carbon intensity carry a sourced sector benchmark bar." },
      { field: "Recommended solution package", help: "The specific products that address the gaps identified above, with typical savings ranges and evidence." },
      { field: "Illustration basis & assumptions", help: "Every number's source — tariff, emission factors, carbon tax schedule — so you can defend the figures to a client." },
      { field: "Regulatory exposure check", help: "Flags whether you're a direct carbon taxpayer, EEG-grant eligible, or subject to MAS/SBTi-related disclosure pressure." },
    ],
  },
];

export const MNC_STEP_GUIDES: StepGuide[] = [
  {
    title: "Business profile",
    intro: "Sets your industry benchmark and the overall scenario the rest of the calculator runs on.",
    fields: [
      { field: "Company name / Industry sector", help: "Sector sets which benchmark band your business is compared against." },
      { field: "Total employees (all sites)", help: "Used for the carbon-per-employee KPI across your whole group." },
      { field: "Annual revenue (S$)", help: "Optional — only powers the \"energy cost as % of revenue\" KPI." },
      { field: "Listed on SGX?", help: "Triggers the SGX mandatory sustainability reporting compliance flag in your results." },
      { field: "Estimated solution investment (S$)", help: "Your rough group-wide budget for the recommended package — a starting estimate, not a quote." },
      { field: "2030 carbon price scenario", help: "Which of the three carbon-price trajectories to use for the national policy context chart." },
    ],
  },
  {
    title: "Energy & fuel",
    intro: "Per-site electricity plus your group's Scope 1 fuel, fleet, and refrigerants — add one row per physical site.",
    fields: [
      { field: "Site name / Annual electricity (kWh)", help: "One row per site. Add or remove sites with the buttons — at least one site is required." },
      { field: "Tariff (S$/kWh)", help: "Leave blank to use the reference tariff — override if that site is on a specific contracted rate (common for MNCs)." },
      { field: "Renewable coverage (%)", help: "Share of that site's electricity covered by onsite solar, a PPA, RECs, or a green tariff — clamped 0-100." },
      { field: "Floor area (m²)", help: "Optional per site — enables the energy-intensity benchmark comparison for that site." },
      { field: "Natural gas / Purchased heat-cooling (GJ/year)", help: "Per-site Scope 1/2 energy beyond grid electricity, if applicable." },
      { field: "Stationary / mobile diesel, petrol, CNG/LPG", help: "Group-wide fuel use — generators & boilers (stationary) vs. company vehicles (mobile)." },
      { field: "Manufacturing facility? / Process combustion", help: "If yes, process combustion (e.g. furnaces, kilns) is added as its own Scope 1 source." },
      { field: "Refrigerants & SF6", help: "Add one row per refrigerant gas type used across your sites — the GWP factor is applied automatically. SF6 leakage is tracked separately (electrical switchgear)." },
    ],
  },
  {
    title: "Value chain",
    intro: "Your group's Scope 3 footprint — quantified for context, never included in your $ savings, per the Scope 3 methodology.",
    fields: [
      { field: "Purchased goods spend (S$/year)", help: "Aggregate spend across all purchased-goods categories — feeds a spend-based Scope 3 Category 1 estimate." },
      { field: "Upstream/downstream freight (tonne-km/year)", help: "Split by road/sea/air — each has a very different emissions intensity per tonne-km moved." },
      { field: "Short-haul / long-haul business travel (pax-km/year)", help: "Enter actual passenger-km if known — this is more precise than the SME mode's flight-count estimate." },
      { field: "Hotel nights/year", help: "Used with an industry-average per-night factor for a rough Category 6 estimate." },
      { field: "Average commute distance / mode split / WFH days", help: "Drives your Category 7 employee commuting estimate across the whole group." },
    ],
  },
  {
    title: "Goals & investment",
    intro: "What you've already deployed (any vendor), your regulatory context, targets, and the assumptions you can override.",
    fields: [
      { field: "Current carbon tax exposure reported (tCO2e/year)", help: "Fill this in if any of your facilities are already registered NEA/IRAS taxpayers — this can trigger liability even if none of your sites individually clears the 25,000t Scope 1 threshold in this illustration." },
      { field: "SBTi / net-zero commitment", help: "A committed (not just \"in progress\") target changes which carbon-price scenario your target-tracking assumes." },
      { field: "Sustainability reporting framework", help: "Context only — doesn't change the numbers, but shapes which compliance flags are most relevant to mention." },
      { field: "Budget range / engagement model", help: "Helps frame which tier of the recommended package to lead with — outright purchase, EaaS, or advisory-only." },
      { field: "MAS-regulated / SBTi-supplier checkboxes", help: "Surfaces the relevant regulatory/compliance flags for you in the results." },
      { field: "Green/efficiency measures already in place", help: "Check anything you already have, from any vendor — tells us what gap still needs closing, not what brand to compare against." },
      { field: "Electricity tariff / energy saving rate overrides", help: "Leave blank to use the weighted per-site tariff and calibration-curve estimate — override only with a specific known figure." },
      { field: "Tariff escalation (%/year)", help: "How much you expect tariffs to rise annually — compounds into future years' projected savings." },
    ],
  },
  {
    title: "Your results",
    intro: "Everything here is computed deterministically from what you entered across all sites — the AI-generated summary and insights only phrase these numbers, never calculate their own.",
    fields: [
      { field: "Top KPI strip", help: "The headline pitch numbers — carbon cost, saving range, payback, and confidence — visible on every step." },
      { field: "Summary", help: "Click \"Write with AI\" for a live plain-English narrative, or read the fixed-template version shown by default." },
      { field: "What you can improve", help: "Click \"Get AI insights\" for gap-and-recommendation pairs grounded in your own computed results." },
      { field: "Energy intensity KPI dashboard", help: "Group-wide operational metrics; energy/carbon intensity only show a benchmark bar if at least one site has floor area entered." },
      { field: "Recommended solution package", help: "The specific products that address the gaps identified above, sized for a multi-site deployment." },
      { field: "Illustration basis & assumptions", help: "Every number's source — tariff, emission factors, carbon tax schedule — so you can defend the figures to a client." },
      { field: "Regulatory exposure check", help: "Flags direct carbon tax liability, SGX mandatory reporting, SBTi commitment status, and MAS/supplier-pressure signals." },
    ],
  },
];
