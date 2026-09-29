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
    title: "Your business",
    intro: "Sets your industry benchmark, what you already have in place, and the overall scenario the rest of the calculator runs on.",
    fields: [
      { field: "Company name", help: "Appears on your exported PDF illustration and in the AI-generated summary — display only, no effect on any calculated figure." },
      { field: "Industry sector", help: "Required — sets which sector benchmark band, ECM catalog, and energy end-use split your business is compared against and calculated from. One of the highest-impact fields on this page." },
      { field: "Number of sites", help: "How many physical locations this illustration covers — use 1 for a single-site SME. Descriptive only, shown in your summary text; doesn't change your $ savings, payback, or CO2e figures." },
      { field: "Floor area (m²)", help: "Total floor area across your site(s). Always feeds the energy-intensity (kWh/m²) benchmark and sector position label. If you leave both electricity kWh and S$ spend blank in the next step, it also becomes the basis for estimating your electricity use itself — and therefore your $ savings, payback, and CO2e figures." },
      { field: "Number of employees", help: "Used for the carbon-per-employee KPI and to default the Scope 3 commuting count — no effect on your $ savings or payback." },
      { field: "Estimated solution investment (S$)", help: "Required — the direct denominator of your payback figure (payback = this ÷ annual saving). Your rough budget for the recommended package; refine it with an advisor later." },
      { field: "Already implemented or in progress", help: "High impact — search or select specific measures from the catalog you already have or are actively rolling out. Each one is removed from the further-opportunity pool, so this directly reshapes your Top-3, savings rate, and $ figures — not just a declaration." },
      { field: "Anything else already in place?", help: "Free text for anything not in the catalog — on its own, context only, never scored. Use the AI-match button below it to check the text against the catalog and actually apply a match." },
      { field: "Advanced / optional", help: "Annual revenue (KPI only, no $ effect) and the carbon-price scenario (only matters if you're carbon-tax-liable; otherwise just reshapes a chart)." },
    ],
  },
  {
    title: "Energy & fuel",
    intro: "Your electricity bill (monthly) and anything you burn or run onsite. Don't know your kWh? Use the bill upload above instead.",
    fields: [
      { field: "Monthly electricity (kWh)", help: "Required — your latest bill's consumption, the primary driver of every $ and CO2e figure in your results." },
      { field: "Or: monthly electricity spend (S$)", help: "Only needed if you don't know your kWh — we back-calculate it at the reference tariff, same downstream impact as kWh itself." },
      { field: "Onsite solar generation?", help: "Nets your self-generated solar off your grid draw before any savings math runs — directly lowers your current cost and the base your savings are calculated from. Also surfaces onsite generation / backup-power measures." },
      { field: "Monthly natural gas (GJ)", help: "Adds to your Scope 1 emissions total only — no effect on $ savings or payback. Leave blank if you don't burn gas onsite." },
      { field: "Energy profile (sub-profile)", help: "For Retail/Logistics — switches between the sector's alternate energy end-use splits (e.g. general retail vs. supermarket)." },
      { field: "Where your energy goes", help: "Sector-typical energy end-use split — click \"Customize this breakdown\" to enter your own if you know it. Feeds the ECM recommendations in your results." },
      { field: "Do you operate company vehicles? / Diesel backup generator?", help: "Toggle the fleet/generator fields — capture your Scope 1 (direct) transport and backup-power emissions. No effect on $ savings or payback unless your direct emissions cross the carbon-tax threshold." },
      { field: "Use refrigeration / aircon equipment?", help: "Refrigerant leakage is a high-warming-potential Scope 1 source — same no-$-effect scope as above." },
      { field: "Targets & advanced settings", help: "Mixed impact — tariff override, grid-factor override, and tariff escalation meaningfully move your $/CO2e figures; investment horizon, emissions target, and the compliance checkboxes only affect warnings/flags, not the figures themselves. The manual savings-rate override is the single highest-impact field here: it replaces the ECM-driven rate entirely. Nested inside: the optional Scope 3 value-chain estimate (informational only, never included in $ savings)." },
    ],
  },
  {
    title: "Your results",
    intro: "Payback, your Top 3 recommended measures, and projected savings come first (\"General\" tab) — the full math and detail live in the \"In-depth\" tab. Computed deterministically from what you entered; the AI narrative only phrases these numbers, never calculates its own.",
    fields: [
      { field: "General tab", help: "Payback period, your Top 3 further Energy Conservation Measures (ranked by payback), long-run projected savings, monthly $ and CO2e saved, and — if you told us what's already in place — what that's already worth." },
      { field: "In-depth tab", help: "Full footprint breakdown, the complete ECM opportunity table with the math behind each measure, KPI dashboard, charts, year-by-year table, scenario comparison, recommended products, illustration basis & assumptions, confidence rating, compliance flags, and the AI summary (kept last — it reads best as a closing wrap-up, especially in the exported PDF)." },
      { field: "Download Illustration PDF", help: "Exports both tabs — General and In-depth — into one paginated PDF, regardless of which tab is open on screen." },
    ],
  },
];

export const MNC_STEP_GUIDES: StepGuide[] = [
  {
    title: "Your business",
    intro: "Sets your industry benchmark, what you already have in place, and the overall scenario the rest of the calculator runs on.",
    fields: [
      { field: "Company name", help: "Appears on your exported PDF illustration and in the AI-generated summary — display only, no effect on any calculated figure." },
      { field: "Industry sector", help: "Required — sets which sector benchmark band, ECM catalog, and energy end-use split your portfolio is compared against and calculated from. One of the highest-impact fields on this page." },
      { field: "Total employees (all sites)", help: "Used for the carbon-per-employee KPI and the Cat 7 commuting estimate — no effect on your $ savings or payback." },
      { field: "Listed on SGX?", help: "Triggers the SGX mandatory sustainability reporting compliance flag in your results — no effect on $ figures." },
      { field: "Estimated solution investment (S$)", help: "Required — the direct denominator of your payback figure (payback = this ÷ annual saving). Your rough group-wide budget for the recommended package — a starting estimate, not a quote." },
      { field: "Already implemented or in progress", help: "High impact — search or select specific measures from the catalog already in place across your sites or actively rolling out. Each one is removed from the further-opportunity pool, so this directly reshapes your Top-3, savings rate, and $ figures — not just a declaration." },
      { field: "Anything else already in place?", help: "Free text for anything not in the catalog — on its own, context only, never scored. Use the AI-match button below it to check the text against the catalog and actually apply a match." },
      { field: "Advanced / optional", help: "Annual revenue (KPI only, no $ effect) and the carbon-price scenario (only matters if you're carbon-tax-liable; otherwise just reshapes a chart)." },
    ],
  },
  {
    title: "Energy & fuel",
    intro: "Per-site electricity (monthly) plus your group's Scope 1 fuel, fleet, and refrigerants — add one row per physical site.",
    fields: [
      { field: "Site name / Monthly electricity (kWh)", help: "Required per site — the primary driver of every $ and CO2e figure that site contributes. One row per site; add or remove with the buttons." },
      { field: "Renewable coverage (%)", help: "Share of that site's electricity covered by onsite solar, a PPA, RECs, or a green tariff. Splits its cost (clean share priced with a premium) and lowers the CO2e-avoided figure it can claim, since already-clean kWh can't avoid further emissions. Also surfaces onsite generation / backup-power measures." },
      { field: "Floor area (m²)", help: "Optional per site — feeds that site's energy-intensity benchmark comparison. If that site's kWh is left blank, it also becomes the basis for estimating that site's electricity use — and therefore its $ savings, payback, and CO2e." },
      { field: "Energy profile (sub-profile)", help: "For Retail/Logistics — switches between the sector's alternate energy end-use splits (e.g. general retail vs. supermarket)." },
      { field: "Where your energy goes", help: "Sector-typical energy end-use split (uses the first site's profile) — feeds the ECM recommendations in your results." },
      { field: "Stationary / mobile diesel, petrol, CNG/LPG", help: "Group-wide fuel use — generators & boilers (stationary) vs. company vehicles (mobile). Adds to your Scope 1 total and regulatory-exposure check only — no $ effect unless carbon-tax-liable. Stationary diesel also surfaces onsite generation / backup-power measures." },
      { field: "Manufacturing facility? / Process combustion", help: "If yes, process combustion (e.g. furnaces, kilns) is added as its own Scope 1 source, and power-quality / distribution measures are surfaced. No $ effect unless carbon-tax-liable." },
      { field: "Refrigerants & SF6", help: "Add one row per refrigerant gas type used across your sites — the GWP factor is applied automatically. SF6 leakage is tracked separately (electrical switchgear). Fugitive Scope 1 emissions only, no $ effect." },
      { field: "Targets & advanced settings", help: "Mixed impact. High: portfolio default tariff (fills blank sites), tariff escalation, and 'current carbon tax exposure reported' — entering any value there makes you carbon-tax-liable and adds a $ line regardless of your computed Scope 1 total. The manual savings-rate override is the single highest-impact field here: it replaces the ECM-driven rate entirely. Zero $ effect: SBTi commitment, reporting framework, budget range, engagement model, and the compliance checkboxes — these only affect flags, target tracking, or narrative text. Nested inside: the optional Scope 3 value-chain estimate across all sites (informational only, never included in $ savings)." },
    ],
  },
  {
    title: "Your results",
    intro: "Payback, your Top 3 recommended measures, and projected savings come first (\"General\" tab) — the full math and detail live in the \"In-depth\" tab. Computed deterministically from what you entered across all sites; the AI narrative only phrases these numbers, never calculates its own.",
    fields: [
      { field: "General tab", help: "Payback period, your Top 3 further Energy Conservation Measures (ranked by payback), long-run projected savings, monthly $ and CO2e saved, and — if you told us what's already in place — what that's already worth." },
      { field: "In-depth tab", help: "Full footprint breakdown, the complete ECM opportunity table with the math behind each measure, KPI dashboard, charts, year-by-year table, scenario comparison, recommended products, illustration basis & assumptions, confidence rating, compliance flags, and the AI summary (kept last — it reads best as a closing wrap-up, especially in the exported PDF)." },
      { field: "Download Illustration PDF", help: "Exports both tabs — General and In-depth — into one paginated PDF, regardless of which tab is open on screen." },
    ],
  },
];
