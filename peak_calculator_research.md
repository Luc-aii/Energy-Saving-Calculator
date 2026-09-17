# PEAK Calculator — Research & Design Foundation
> Schneider Electric Emissions-to-Dollar Calculator | Singapore Context | September 2026

---

## 1. WHAT THIS TOOL IS

A **live, instant calculator** that converts a client's own emissions/energy numbers into dollar figures and ties the result directly to specific Schneider Electric products. Clients toggle between **MNC mode** and **SME mode**.

### What the calculator produces for every user:
| Output | SME | MNC |
|---|---|---|
| Total Scope 1+2 emissions (tCO₂e/year) | ✅ | ✅ |
| Scope 3 emissions (tCO₂e/year, quantified) | ✅ Simplified | ✅ Full 6-cat |
| Estimated annual financial saving (S$ range) | ✅ | ✅ |
| Carbon tax cost today vs. 2026 vs. 2030 | ✅ | ✅ |
| Payback period with/without grants | ✅ | ✅ |
| Named Schneider product recommendations | ✅ | ✅ |
| Confidence rating on outputs | ✅ | ✅ |
| 5-year cumulative savings chart | ✅ | ✅ |
| AI plain-English summary | ✅ | ✅ |
| Applicable government grants (EEG etc.) | ✅ | ✅ |
| Scope 3 deep-dive (per GHG Protocol category) | ❌ | ✅ |
| Custom tariff / multi-site inputs | ❌ | ✅ |
| Exportable PDF report | ✅ | ✅ |

---

## 2. EMISSION FACTORS — CONFIRMED SOURCES

> [!IMPORTANT]
> All emission factors below are sourced from authoritative Singapore/international bodies and must be cited in the tool's methodology footnotes.

### 2.1 Singapore Electricity Grid

| Factor | Value | Source | Year |
|---|---|---|---|
| Grid Emission Factor (GEF) | **0.402 kg CO₂/kWh** | EMA (Energy Market Authority) | 2024 |
| Prior year GEF | 0.412 kg CO₂/kWh | EMA | 2023 |
| Trend | Declining (~0.01/year) due to solar uptake | EMA | — |

**Decision**: Use **0.402 kg CO₂/kWh** as the base electricity emission factor. Apply a declining trend assumption (−0.005/year) for forward-looking payback projections.

### 2.2 Diesel / Transport Fuel (Scope 1 + Scope 3 Cat 4 logistics)

| Factor | Value | Source |
|---|---|---|
| Diesel combustion | **2.68 kg CO₂e/litre** | NEA / Singapore Emission Factors Registry (SEFR) |
| Petrol combustion | 2.29 kg CO₂e/litre | SEFR |
| CNG (compressed natural gas) | 2.15 kg CO₂e/kg | SEFR |

### 2.3 Refrigerant Gases (Scope 1 — Fugitive)

| Gas | GWP (100yr) | Source |
|---|---|---|
| R-410A | 2,088 | IPCC AR6 |
| R-32 | 675 | IPCC AR6 |
| R-134a | 1,430 | IPCC AR6 |

> [!NOTE]
> Refrigerant leakage is a significant but frequently overlooked Scope 1 source for commercial buildings. Include as optional advanced field for MNC mode.

### 2.4 Scope 3 Emission Factors (Spend-Based Fallback)
For SME mode where activity data is unavailable, use **EEIO (Environmentally Extended Input-Output)** spend-based factors:

| Category | Factor | Source |
|---|---|---|
| Purchased goods (manufacturing avg) | ~0.5–0.8 kg CO₂e/USD | US EPA EEIO v2.0 |
| Air freight | ~1.5 kg CO₂e/tonne-km | DEFRA 2024 |
| Sea freight | ~0.01–0.04 kg CO₂e/tonne-km | DEFRA 2024 |
| Road freight (diesel HGV) | ~0.11 kg CO₂e/tonne-km | DEFRA 2024 |
| Business travel (long-haul economy) | ~0.195 kg CO₂e/passenger-km | DEFRA 2024 |

**Primary source for Scope 3**: **DEFRA 2024 GHG Conversion Factors** (publicly available, updated annually, widely accepted by SBTi and GRI)

> [!NOTE]
> **Data currency (2026-09-17):** DEFRA published its 2026 update on 11 June 2026 — two annual cycles after this document's "2024" baseline. The live calculator has been updated for business travel (long-haul economy revised to 0.11704 kgCO2e/pax-km — a load-factor methodology correction, not a real efficiency gain) via `scope3_factors.json`. Air/road freight factors also moved in DEFRA 2026 but not uniformly by vehicle class/mode, so no single blended replacement figure could be sourced with confidence — those remain at the 2024 values shown above with a flag in the data file pending an exact table pull. See `data/changelog.md` for the full sourced trail.

---

## 3. DOLLAR MULTIPLIERS — CONFIRMED NUMBERS

### 3.1 Singapore Carbon Tax Trajectory

| Year | S$ per tonne CO₂e | Status |
|---|---|---|
| 2024 | **S$25** | ✅ Live |
| 2025 | **S$25** | ✅ Confirmed |
| 2026 | **S$45** | ✅ Legislated |
| 2027 | **S$45** | ✅ Legislated |
| 2030 | **S$50–S$80** | Indicative range |

> [!IMPORTANT]
> The jump from S$25 → S$45 in **2026** is the single most important multiplier lever in the calculator. A company saving 1,000 tCO₂e/year sees their avoided carbon tax jump from **S$25,000/yr → S$45,000/yr** overnight. This 80% increase should be prominently featured in the output.

**For calculator logic:** Use **S$25** as current-year baseline, show a **2026 uplift scenario** and a **2030 conservative/optimistic range (S$50/S$80)**.

### 3.2 Singapore Electricity Tariff

| Period | Rate (before GST) |
|---|---|
| Q1 2024 | 29.79 ¢/kWh |
| Q2 2024 | 29.69 ¢/kWh |
| Q3 2024 | 30.11 ¢/kWh |
| Q4 2024 | 29.10 ¢/kWh |
| **2024 Average** | **~29.7 ¢/kWh** |
| After 9% GST | **~32.4 ¢/kWh** |

**Decision**: Use **S$0.30/kWh** (before GST) as the base tariff for calculations — round number, defensible, within Q3 peak.

For MNC mode: allow custom tariff input (many MNCs are on contestable market rates, often 10–20% lower than regulated tariff).

> [!NOTE]
> **Data currency (2026-09-17):** the S$0.30/kWh figure above reflects the 2024 rate this document was originally written against. The live PEAK Calculator has since been updated to Q3 2026's rate of **31.91¢/kWh before GST** (a record high, +17% on Q2 2026) via `tariff_config.json` — see `data/changelog.md` in the application repo for the sourced update. Worked dollar examples elsewhere in this document (e.g. Section 6.4) retain the original S$0.30 baseline and were not recalculated, to keep each example internally consistent — treat the running application's output, not this document's mockups, as the current figure.

### 3.3 Singapore Government Grants (Offsets / Incentives to Show)

| Grant | Value | Eligibility | Validity |
|---|---|---|---|
| Energy Efficiency Grant (EEG) — Base | Up to **S$30,000**, 70% co-fund | SMEs, all sectors | Extended to Mar 2028 |
| Energy Efficiency Grant — Advanced | Project-dependent | Larger facilities | Mar 2028 |
| SME Sustainability Reporting Programme | Up to **70% subsidy** on reporting fees | Non-listed SMEs | Until Mar 2026 (50% from Apr 2026) |
| Productivity Solutions Grant (PSG) — Carbon Mgmt | Up to 70% | SMEs | Active |
| Enterprise Sustainability Programme (ESP) | Subsidised capability building | All sizes | Active |

> [!TIP]
> The EEG grant should appear as a deduction in the calculator's payback timeline: "Estimated net investment after EEG grant: S$X" — this meaningfully shortens payback periods for SMEs.

---

## 4. CALCULATION LOGIC — DECISIONS MADE

### 4.1 Calculation Method by Mode

| Mode | Method | Rationale |
|---|---|---|
| **MNC Mode** | **Activity-based** (GHG Protocol Tier 2) | MNCs have metered data; activity-based is more accurate and SBTi-compliant |
| **SME Mode** | **Hybrid**: activity-based for Scope 1&2, spend-based for Scope 3 | SMEs typically have utility bills (easy Scope 2) but no supplier data |

### 4.2 Core Emissions-to-Dollar Formula

```
Financial Saving (S$) = 
  (kWh_saved × tariff_rate) +           ← Energy cost saving
  (tCO₂e_avoided × carbon_tax_rate) +   ← Carbon tax avoidance
  (grant_value × applicable_flag)        ← One-time grant deduction
```

**Where:**
- `kWh_saved` = annual electricity reduction from Schneider solution
- `tariff_rate` = S$0.30/kWh (default, customisable)
- `tCO₂e_avoided` = kWh_saved × 0.402 (GEF) + fuel_litres_saved × 2.68
- `carbon_tax_rate` = S$25 (2024-25), S$45 (2026-27), S$50-80 (2030)

### 4.3 Annual Saving Projection Table (what to show on screen)

| Year | Energy Saving | Carbon Tax Saving | Total | Cumulative |
|---|---|---|---|---|
| 2025 | S$X | S$Y (@ S$25/t) | S$Z | S$Z |
| 2026 | S$X | S$Y+80% (@ S$45/t) | S$Z | S$ZZ |
| 2030 | S$X | S$Y ×2-3x (@ S$65/t mid) | S$Z | S$ZZZ |

---

## 5. WHAT USERS MUST ENTER — FULL INPUT SPECIFICATION

> [!IMPORTANT]
> Every field below is mapped to: (a) which emission scope it feeds, (b) which dollar output it drives, and (c) which Schneider product it informs. No field is decorative.

---

### 5.0 UNIVERSAL INPUTS (Both SME & MNC — Step 1)

These fields appear first, before scope-specific questions. They set the baseline and determine which benchmark ranges and products are relevant.

| Field | Format | Why It's Needed | Feeds Into |
|---|---|---|---|
| **Company name** | Text | For personalised PDF output | Report header |
| **Industry sector** | Dropdown: Manufacturing / Hospitality / F&B / Retail / Office/Professional Services / Healthcare / Logistics / Data Centre / Other | Determines benchmark energy intensity ranges; triggers sector-specific Schneider products | Benchmark comparison; product mapping |
| **Number of sites** | Number (1–100+) | Single-site vs. multi-site changes product recommendation (Resource Advisor needed for >1 site) | Product mapping |
| **Primary country** | Dropdown (defaults: Singapore) | Selects emission factor set and carbon tax regime | Emission factor database |
| **Floor area (m²)** OR **Number of employees** | Number | Used as denominator for intensity metrics (kgCO₂/m², kgCO₂/employee); also used for benchmarking vs. industry peers | Intensity output; benchmark flag |
| **Mode toggle** | SME / MNC | Routes to correct input form and calculation depth | Entire calculation path |

---

### 5.1 SME MODE — COMPLETE INPUT GUIDE

> **Who this is for:** Companies with <200 employees or <S$100M annual revenue. Designed to be completable using only utility bills and basic operational knowledge. No consultant needed.

#### BLOCK A — Energy & Electricity (Scope 1 + 2)
*This is the single biggest driver of savings for most SMEs.*

| Field | Format | Source (where to find it) | Emission Scope | Drives Output |
|---|---|---|---|---|
| **Monthly electricity consumption** | kWh/month (enter up to 12 months, or just latest bill) | SP Group / Geneco / Keppel Electric monthly bill | Scope 2 | tCO₂e/year; energy cost saving; carbon tax avoidance; EBO/smart meter recommendation |
| **Monthly electricity spend** | S$/month (auto-calculated if kWh entered, or enter manually) | Same bill | Scope 2 | Validates kWh input; baseline for % saving display |
| **Do you generate any onsite solar?** | Yes/No toggle → if Yes: monthly generation in kWh | Solar inverter app / utility net metering bill | Scope 2 offset | Reduces net grid consumption; affects GEF-based calculation |
| **Monthly natural gas consumption** *(if applicable)* | GJ/month OR S$/month | City Gas bill | Scope 1 | tCO₂e/year; gas cost saving |

> [!TIP]
> AI assist: If user doesn't know kWh, they can enter their monthly S$ electricity bill — the calculator back-calculates kWh using the current SP Group tariff (S$0.30/kWh). Flag this as estimated.

---

#### BLOCK B — Fuel & Fleet (Scope 1)
*For SMEs with delivery vehicles, company cars, or diesel generators.*

| Field | Format | Source | Emission Scope | Drives Output |
|---|---|---|---|---|
| **Do you operate company vehicles?** | Yes/No toggle | — | — | Triggers fuel fields |
| **Monthly fuel consumption** | Litres/month (diesel, petrol, or CNG — select type) | Petrol receipts / fleet card statement / estimated from km driven | Scope 1 | tCO₂e/year; fuel cost saving; fleet electrification recommendation |
| **Alternative: monthly fuel spend** | S$/month | Same receipts | Scope 1 | Back-calculated to litres using current pump price |
| **Number of vehicles** | Count | Internal records | Scope 1 | Fleet electrification product match |
| **Do you have a diesel generator (backup power)?** | Yes/No → if Yes: estimated hours run/month + tank size | Generator logbook | Scope 1 | Adds to Scope 1; microgrid/EaaS recommendation trigger |

---

#### BLOCK C — Refrigerants (Scope 1 — Fugitive) *(Optional for SME)*
*Small but high-impact for F&B, retail cold chain, hotels.*

| Field | Format | Source | Emission Scope | Drives Output |
|---|---|---|---|---|
| **Do you use refrigeration/air conditioning equipment?** | Yes/No | — | — | Triggers refrigerant fields |
| **Refrigerant type** | Dropdown: R-410A / R-32 / R-134a / R-22 (phased out) / Unknown | Equipment label / maintenance records | Scope 1 (fugitive) | GWP-weighted tCO₂e; often shockingly high (R-410A = 2,088× CO₂) |
| **Annual top-up quantity** | kg/year (from aircon service records) | ACMV service invoice | Scope 1 (fugitive) | Adds to Scope 1 total; triggers EcoStruxure refrigerant monitoring |

> [!NOTE]
> Even a small 5 kg top-up of R-410A = 10.4 tCO₂e — equivalent to ~26,000 kWh of electricity. Always prompt users to check this field.

---

#### BLOCK D — Scope 3 (Simplified — SME)
*Quantified only, not monetised. Gives the company a full carbon picture.*

| Field | Format | Source | Scope 3 Category | Drives Output |
|---|---|---|---|---|
| **Annual logistics/freight spend** | S$/year OR: select volume-based (tonnes shipped, avg distance) | Finance / accounts payable | Cat 4 (upstream) + Cat 9 (downstream) | Scope 3 tCO₂e estimate via EEIO spend factor; shown as context, not in $ saving |
| **Primary freight mode** | Dropdown: Road / Sea / Air / Mixed | Logistics team | Cat 4/9 | Selects correct DEFRA emission factor (air freight 10–50× higher than sea) |
| **Number of business flights per year** | Count (split: domestic/short-haul/long-haul) | Finance / travel booking records | Cat 6 (business travel) | tCO₂e from DEFRA passenger-km factor |
| **Number of employees commuting** | Employee count (pre-filled from Block 0) + dominant mode (public transport / car / both) | HR / survey estimate | Cat 7 (employee commuting) | tCO₂e estimate; shown as context |
| **Annual purchased goods spend** *(optional)* | S$/year, broad sector (e.g., electronics, packaging, food inputs) | Finance | Cat 1 (purchased goods) | Spend-based EEIO tCO₂e estimate; flags where supply chain action needed |

---

#### BLOCK E — Current Baseline & Goals (SME)
*Tells the calculator what already exists and what target to model toward.*

| Field | Format | Why Needed | Drives Output |
|---|---|---|---|
| **Any Schneider solutions already deployed?** | Multi-select checkbox (EBO / Resource Advisor / PowerLogic / Solar / None) | Avoids recommending something they already have; baselines savings accurately | Product recommendation filter |
| **Current energy efficiency initiatives** | Free text / checkbox (LED lighting done / HVAC upgraded / ISO 50001 certified / None) | Reduces double-counting of savings | Confidence range adjustment |
| **Emissions reduction target (if any)** | % reduction by year (e.g., 30% by 2030) OR "No target yet" | Sets the output goal line on the 5-year chart | Chart target line |
| **Preferred investment horizon** | Dropdown: <2 years / 2–5 years / 5+ years / No preference | Filters product recommendations by payback period | Product match + grant flagging |

---

### 5.2 MNC MODE — COMPLETE INPUT GUIDE

> **Who this is for:** Companies with regional/global operations, typically with ESG teams and existing data infrastructure. Fields are more granular and align with GHG Protocol Corporate Standard and SBTi requirements.

#### BLOCK A — Energy & Electricity (Scope 1 + 2) — MNC

| Field | Format | Source | Scope | Drives Output |
|---|---|---|---|---|
| **Electricity consumption per site** | kWh/year per site (upload multi-site data via CSV or enter per site) | Utility bills / energy management system / BMS export | Scope 2 | Per-site and aggregate tCO₂e; site-level product recommendations |
| **Electricity tariff per site** | S$ or local currency/kWh (customisable per site) | Electricity retailer contract | Scope 2 | Accurate energy cost saving (MNCs often on contestable rates 20–30% below regulated tariff) |
| **Renewable energy coverage** | % of consumption from: onsite solar / PPA / RECs / Green tariff (per site) | Energy procurement / sustainability team | Scope 2 | Market-based vs. location-based Scope 2 split; affects SBTi reporting |
| **Natural gas consumption** | GJ/year (per site) | Gas utility bills / sub-metering | Scope 1 | tCO₂e; gas cost saving; EaaS CHP/microgrid trigger |
| **Heat / steam / cooling purchased** *(if applicable)* | GJ/year | District cooling provider / thermal utility bill | Scope 2 | Adds to Scope 2 where applicable |

---

#### BLOCK B — Fuel & Fleet (Scope 1) — MNC

| Field | Format | Source | Scope | Drives Output |
|---|---|---|---|---|
| **Diesel (stationary)** — generators, boilers | Litres/year | Fuel delivery records | Scope 1 | tCO₂e; cost saving; microgrid/solar recommendation |
| **Diesel (mobile fleet)** — company trucks, vans | Litres/year OR km/year + fleet avg consumption | Fleet management system / fuel cards | Scope 1 | tCO₂e; cost saving; EV fleet recommendation |
| **Petrol (company cars)** | Litres/year | Fleet cards / expense records | Scope 1 | tCO₂e |
| **CNG / LPG / other fuels** | kg/year or GJ/year | Fuel supplier records | Scope 1 | tCO₂e |
| **Fleet size by fuel type** | Count (diesel / petrol / hybrid / EV) | Fleet registry | Scope 1 | EV transition savings model; fleet electrification product |
| **Process combustion** *(manufacturing only)* | GJ/year by fuel type | Production energy records | Scope 1 | Industrial decarbonisation pathway |

---

#### BLOCK C — Refrigerants & Fugitive Emissions (Scope 1) — MNC

| Field | Format | Source | Scope | Drives Output |
|---|---|---|---|---|
| **Refrigerant top-up by gas type** | kg/year per refrigerant type (R-410A, R-32, R-134a, HFOs) | ACMV maintenance records / environmental compliance register | Scope 1 (fugitive) | GWP × kg = tCO₂e; often 5–15% of total Scope 1 for MNCs with large HVAC |
| **SF₆ in electrical equipment** *(utilities/data centres)* | kg/year leakage | Electrical maintenance records | Scope 1 (fugitive) | SF₆ GWP = 23,500 — even small leaks are significant |

---

#### BLOCK D — Scope 3: Six Priority Categories — MNC

> [!IMPORTANT]
> These 6 categories cover ~80% of most MNCs' Scope 3 footprint. Remaining 9 GHG Protocol categories can be added in Phase 2.

**Cat 1 — Purchased Goods & Services**
| Field | Format | Data Source Options | Method |
|---|---|---|---|
| Supplier-specific data (preferred) | tCO₂e per supplier, uploaded via CSV | Supplier sustainability reports / CDP disclosures | Activity-based |
| Spend-based fallback | S$/year by category (electronics, raw materials, packaging, professional services) | Accounts payable / procurement system | EEIO spend-based |
| Data quality flag | Auto-set: High (supplier data) / Low (spend-based) | System | Widens confidence range |

**Cat 3 — Fuel & Energy Related Activities (Well-to-Tank)**
| Field | Format | Source | Method |
|---|---|---|---|
| Auto-calculated | Derived from Scope 1 fuel quantities (Blocks A+B) × WTT factor | DEFRA 2024 WTT factors | Activity-based |
| *No additional user input needed* | — | — | — |

**Cat 4 — Upstream Transportation & Distribution**
| Field | Format | Source | Method |
|---|---|---|---|
| Freight volume + distance by mode | tonne-km/year: Road / Rail / Sea / Air (split) | Logistics team / 3PL reports | DEFRA tonne-km factor |
| OR: Annual logistics spend by mode | S$/year per mode | Finance / procurement | EEIO spend-based fallback |
| Number of inbound shipments/year | Count (optional — for sanity check) | Procurement / ERP | Validation |

**Cat 6 — Business Travel**
| Field | Format | Source | Method |
|---|---|---|---|
| Air travel by class + distance | Passenger-km/year (short <3hr / medium 3–6hr / long >6hr) split by economy/business | Corporate travel system / expense reports | DEFRA passenger-km |
| Hotel nights/year | Nights (optional) | Travel records | DEFRA hotel factor |
| Rental car + rail travel | km/year or spend | Expense reports | Activity / spend-based |

**Cat 7 — Employee Commuting**
| Field | Format | Source | Method |
|---|---|---|---|
| Number of employees | Pre-filled from Block 0 | HR | — |
| Primary commute mode split | % Public transport / Private car / Cycling/Walking | HR survey estimate | Industry average distance × mode |
| Average commute distance | km one-way (or use national average: Singapore ~15 km) | HR survey / national avg | Activity-based |
| Work-from-home days/week average | Days (reduces commuting tCO₂e) | HR policy | Reduces Cat 7 total |

**Cat 9 — Downstream Transportation & Distribution**
| Field | Format | Source | Method |
|---|---|---|---|
| Outbound freight volume + distance by mode | tonne-km/year: Road / Sea / Air | Logistics / distribution team | DEFRA tonne-km factor |
| OR: Annual outbound logistics spend | S$/year | Finance | EEIO fallback |

---

#### BLOCK E — Baseline, Targets & Context — MNC

| Field | Format | Why Needed | Drives Output |
|---|---|---|---|
| **Current carbon tax exposure** | Tonnes/year already reported to IRAS (if taxable facility) | IRAS carbon tax filing / sustainability team | Carbon tax avoidance calculation (only incremental savings on top of existing) |
| **SBTi or net-zero commitment** | Yes (with target year) / In progress / No | Sustainability team | Flags urgency; adjusts 2030 carbon price scenario weighting |
| **Existing Schneider solutions** | Multi-select (EBO / Resource Advisor / PowerLogic / EaaS / None) | Internal IT/facilities | Filters product recommendations; avoids upselling what's already deployed |
| **Current sustainability report framework** | Dropdown: GRI / ISSB/IFRS S2 / TCFD / CDP / SGX mandatory / None | Sustainability team | Aligns output format to their reporting standard |
| **Budget range for investment** | Dropdown: <S$50k / S$50k–S$500k / S$500k–S$5M / >S$5M | Finance team / procurement | Filters product recommendations by investment tier |
| **Preferred Schneider engagement model** | Dropdown: Buy outright / EaaS (no capex) / Consulting only / Not sure | Procurement preference | Routes to correct product/commercial model |

---

### 5.3 INPUT-TO-OUTPUT TRACEABILITY MAP

This table shows exactly which input feeds which output — so every field has a clear reason to exist.

| User Input | Feeds Scope | Drives Dollar Output | Informs Product |
|---|---|---|---|
| Monthly kWh (electricity) | Scope 2 | Energy cost saving (kWh × S$0.30) + Carbon tax saving (kWh × 0.402 × S$25/45) | EcoStruxure Building Operation, PowerLogic smart metering |
| Monthly diesel litres (fleet) | Scope 1 | Fuel cost saving if shifted to EV/lower consumption | EV fleet / EcoStruxure for Mobility |
| Diesel (stationary generators) | Scope 1 | Replaced by microgrid/solar saving | EcoStruxure Microgrid / EaaS |
| Natural gas (GJ) | Scope 1 | Gas cost saving; CHP potential | EcoStruxure EaaS / CHP advisory |
| Refrigerant top-up (kg) | Scope 1 fugitive | Carbon tax on GWP-weighted tCO₂e | EcoStruxure refrigerant monitoring, ACMV optimisation |
| Solar generation (kWh) | Scope 2 offset | Reduces net electricity cost | EcoStruxure Microgrid |
| Logistics spend S$ (SME) | Scope 3 Cat 4/9 | Not monetised — shown as tCO₂e context only | Resource Advisor (Scope 3 tracking) |
| Supplier tCO₂e data (MNC) | Scope 3 Cat 1 | Not monetised — shown as tCO₂e context + SBTi gap | Resource Advisor (Scope 3 module) |
| Business flights (count/km) | Scope 3 Cat 6 | Not monetised — context | Resource Advisor |
| Employee commuting data | Scope 3 Cat 7 | Not monetised — context | Resource Advisor |
| Upstream freight tonne-km | Scope 3 Cat 4 | Not monetised — context | Resource Advisor |
| Floor area / employee count | Benchmark denominator | Intensity ratio vs. sector peers | Benchmarking flag |
| Industry sector | Benchmark filter | Calibrates expected savings % range | Product shortlist |
| Investment horizon | Filter | Filters products by payback period match | Product prioritisation |
| Budget range (MNC) | Filter | Filters by investment tier | Product + commercial model |
| Existing SE solutions | Exclusion filter | Removes already-deployed products | Product recommendation |
| SBTi commitment | Urgency flag | Weights 2030 scenario more heavily | Decarbonisation pathway output |

---

## 6. OUTPUT DESIGN — FINANCIAL ILLUSTRATION FORMAT

> [!IMPORTANT]
> The output is designed to look and feel like a **financial advisor's client illustration** — the same format used by insurance and investment consultants. Every number is traceable, every assumption is stated, and the document is structured for a CFO or Finance Director to read and trust without needing a sustainability expert in the room.

---

### 6.0 CONCEPT MAPPING — Carbon Savings as a Financial Product

This is the mental model that shapes the entire output design:

| Financial Consultant Concept | PEAK Calculator Equivalent |
|---|---|
| **Premium / Initial Investment** | Cost of Schneider solution (EBO, Resource Advisor, EaaS, etc.) |
| **Guaranteed Return** | Energy cost saving (locked-in, based on physics of efficiency) |
| **Non-Guaranteed / Projected Return** | Carbon tax avoidance (policy-dependent; shown with trajectory) |
| **Bonus / Upside** | Government grants (EEG), rising carbon price post-2026 |
| **Sum Assured / Maturity Value** | Cumulative savings over 5 / 10 years |
| **Break-Even Point** | Payback period |
| **Risk Rating** | Confidence level (High / Medium / Low based on data quality) |
| **Inflation Adjustment** | Carbon tax escalation (S$25 → S$45 → S$50–80) |
| **Illustration Basis** | Stated assumptions: tariff, GEF, carbon tax rate, savings % |
| **Benefit Illustration Table** | Year-by-year projection table |
| **Policy Summary** | Named Schneider product + engagement model |

---

### 6.1 INPUT PHASE — "FACT-FIND" FLOW (TABBED)
*Mirrors how a financial advisor conducts a client needs analysis, separated clearly by emission Scopes.*

```
TAB 1: Profile & Goals          (2 min)
  └─ Company name, sector, size, country, mode (SME/MNC)
  └─ Existing solutions, investment horizon, emissions targets

TAB 2: Scope 1 — Direct         (3 min)
  └─ "What do you burn onsite?"
  └─ Natural gas, diesel generators, mobile fleet fuel
  └─ Refrigerant gas top-ups

TAB 3: Scope 2 — Indirect       (2 min)
  └─ "What power do you purchase?"
  └─ Electricity consumption/bills
  └─ Purchased cooling or steam (MNC)

TAB 4: Scope 3 — Value Chain    (2 min — optional)
  └─ "What is your supply chain impact?"
  └─ Logistics, travel, employee commuting, purchased goods

                    ▼
            [ GENERATE ILLUSTRATION ]
```

---

### 6.2 OUTPUT PAGE 1 — CLIENT COVER SUMMARY
*The first thing the client sees. Clean, confident, no jargon.*

```
╔══════════════════════════════════════════════════════════════╗
║           DECARBONISATION INVESTMENT ILLUSTRATION            ║
║                                                              ║
║  Prepared for:   Acme Manufacturing Pte Ltd                  ║
║  Date:           17 September 2026                           ║
║  Prepared by:    Schneider Electric Singapore                ║
║  Mode:           MNC — Multi-site                            ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  YOUR CURRENT CARBON COST                S$ 312,000 / year   ║
║  (Energy + carbon tax at today's rates)                      ║
║                                                              ║
║  ESTIMATED ANNUAL SAVING               S$ 95,000–142,000     ║
║  (Energy efficiency + carbon tax avoidance)                  ║
║                                                              ║
║  ESTIMATED PAYBACK PERIOD                   3.2 – 5.1 years  ║
║                                                              ║
║  10-YEAR CUMULATIVE SAVING          S$ 1.2M – S$ 1.8M       ║
║                                                              ║
║  CONFIDENCE LEVEL                    ●●●○○  MEDIUM           ║
║  (Based on estimated consumption data — upload bills         ║
║   to upgrade to HIGH confidence)                             ║
║                                                              ║
║  CO₂e AVOIDED                           ~680 tonnes / year   ║
╚══════════════════════════════════════════════════════════════╝
```

---

### 6.3 OUTPUT PAGE 2 — STATED ASSUMPTIONS
*Every single number in the illustration is based on these declared assumptions — just like a financial product illustration states its assumed investment return rate.*

```
┌──────────────────────────────────────────────────────────────┐
│  ILLUSTRATION BASIS & ASSUMPTIONS                            │
│  (All calculations use these values — version 2.3.1)        │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ENERGY & EMISSIONS                                          │
│  Grid Emission Factor        0.402 kg CO₂/kWh               │
│                              [EMA Singapore, Jan 2024]       │
│  Electricity Tariff          S$0.30/kWh                      │
│                              [SP Group Q3 2024]              │
│  Diesel Emission Factor      2.68 kg CO₂e/litre             │
│                              [SEFR / NEA Singapore]          │
│                                                              │
│  CARBON PRICING                                              │
│  Current Rate (2024–2025)    S$25 per tCO₂e                 │
│  Legislated Rate (2026–2027) S$45 per tCO₂e                 │
│  Indicative Rate (2030)      S$50–S$80 per tCO₂e            │
│                              [NEA / MSE Singapore]           │
│                                                              │
│  SOLUTION PERFORMANCE                                        │
│  Energy Saving Applied       22% (Conservative: 15%)        │
│  Basis                       EcoStruxure Building Operation  │
│                              — Commercial office benchmark   │
│  Source                      JLL Asia-Pacific: 30% achieved  │
│                              Marriott: 15% achieved          │
│                              Illustration uses mid-range     │
│                                                              │
│  GRANTS & INCENTIVES                                         │
│  EEG Base Tier Applied       S$21,000 (70% of equipment)    │
│  Eligibility                 Confirmed: SME, all sectors     │
│                              [EnterpriseSG, valid to         │
│                               March 2028]                    │
│                                                              │
│  SCOPE 3                                                     │
│  Method                      Spend-based (EEIO)             │
│  Factors                     DEFRA 2024 GHG Conversion      │
│  Status                      Quantified only — not included  │
│                              in financial saving calculation │
└──────────────────────────────────────────────────────────────┘
```

---

### 6.4 OUTPUT PAGE 3 — YEAR-BY-YEAR BENEFIT ILLUSTRATION TABLE
*The core of the financial illustration. Mirrors a life insurance benefit table or investment projection. Shows exactly what the client gets each year.*

```
ANNUAL BENEFIT ILLUSTRATION
Basis: Base Case | EcoStruxure Building Operation | Acme Manufacturing

Year │ Energy    │ Carbon Tax  │ Carbon Tax  │ Grant    │ TOTAL     │ CUMULATIVE │ Carbon
     │ Saving    │ Saving      │ Rate Used   │ (once)   │ SAVING    │ SAVING     │ Avoided
     │ (S$)      │ (S$)        │ (S$/tCO₂e) │ (S$)     │ (S$)      │ (S$)       │ (tCO₂e)
─────┼───────────┼─────────────┼─────────────┼──────────┼───────────┼────────────┼─────────
  1  │  55,000   │   17,000    │     25      │  21,000  │   93,000  │    93,000  │   680
  2  │  55,000   │   17,000    │     25      │     —    │   72,000  │   165,000  │   680
  3  │  55,000   │   30,600    │     45 ▲   │     —    │   85,600  │   250,600  │   680
  4  │  55,000   │   30,600    │     45      │     —    │   85,600  │   336,200  │   680
  5  │  55,000   │   30,600    │     45      │     —    │   85,600  │   421,800  │   680
     │           │             │             │          │           │            │
 10  │  55,000   │   44,200    │  65 (mid)   │     —    │   99,200  │   889,000  │   680
─────┴───────────┴─────────────┴─────────────┴──────────┴───────────┴────────────┴─────────

 ▲ Carbon tax increases to S$45/tCO₂e from 2026 — legislated by NEA Singapore

 BREAK-EVEN POINT:  Year 3.4  (investment recovered from cumulative savings)
 ESTIMATED INVESTMENT:  S$300,000 (before EEG grant of S$21,000 → net S$279,000)
```

**Conservative / Optimistic Variants:**

| | Conservative | **Base Case** | Optimistic |
|---|---|---|---|
| Energy saving rate | 15% | **22%** | 30% |
| Carbon tax (2030) | S$50/t | **S$65/t** | S$80/t |
| **Year 1 Total** | **S$62,000** | **S$93,000** | **S$124,000** |
| **10-Year Total** | **S$650,000** | **S$889,000** | **S$1,180,000** |
| **Payback** | **5.1 yrs** | **3.4 yrs** | **2.6 yrs** |

---

### 6.5 OUTPUT PAGE 4 — RECOMMENDED SOLUTIONS ("YOUR POLICY")
*Like an insurance policy summary — exactly what product, what it covers, what it costs, what it pays out.*

```
┌──────────────────────────────────────────────────────────────┐
│  YOUR RECOMMENDED SCHNEIDER SOLUTION PACKAGE                 │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  SOLUTION 1 — Primary                                        │
│  Product:    EcoStruxure Building Operation (EBO)            │
│  Covers:     HVAC optimisation, lighting control,            │
│              occupancy-based energy management               │
│  Saves:      15–30% of electricity consumption               │
│  Your Est.:  S$55,000/year (energy) + S$17,000–30,600/year  │
│              (carbon tax avoidance)                          │
│  Evidence:   JLL Asia-Pacific HQ — 30% energy reduction      │
│              achieved using EBO + IoT sensors                │
│  Payback:    3.4 years (with EEG grant applied)              │
│  EEG Grant:  S$21,000 available (70% co-fund, Base Tier)    │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  SOLUTION 2 — Recommended Add-On                             │
│  Product:    EcoStruxure Resource Advisor                    │
│  Covers:     Scope 1, 2 & 3 data collection, carbon         │
│              reporting (GRI, ISSB, CDP-ready)                │
│  Saves:      Compliance cost avoidance; anomaly detection    │
│              prevents 5–15% energy waste                     │
│  Your Est.:  S$8,000–15,000/year (anomaly savings)          │
│  Evidence:   Marriott International — 15% energy savings     │
│              via centralised Resource Advisor reporting      │
│  Note:       Required for SGX mandatory sustainability       │
│              reporting (applies to listed companies)         │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  SCOPE 3 — Identified, Not Yet Monetised                     │
│  Your Est.:  ~1,240 tCO₂e/year (upstream logistics + travel)│
│  Action:     Resource Advisor Scope 3 module can track       │
│              and report these for SBTi submission            │
│  Note:       Not included in financial saving calculation — │
│              Schneider does not directly control these       │
│              emissions. Shown for full carbon picture only.  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

### 6.6 OUTPUT PAGE 5 — VISUAL CHARTS

**Chart A — Cumulative Savings vs. Break-Even**
```
S$ (cumulative)
1.2M │                                          ╱ Optimistic
     │                                    ╱────
 889k│                              ╱────       Base Case
     │                        ╱────
 650k│                  ╱────                   Conservative
     │            ╱────
 300k│──────╱────  ← Break-even (investment recovered)
     │╱────
   0 ┼────┬────┬────┬────┬────┬────┬────┬────┬────┬───→ Year
     0    1    2    3    4    5    6    7    8    9   10
```

**Chart B — What's Driving Your Savings (Stacked Bar)**
```
Year 1:  [████████ Energy S$55k] [███ Carbon Tax S$17k] [████ Grant S$21k]
Year 3:  [████████ Energy S$55k] [█████ Carbon Tax S$30k]
Year 10: [████████ Energy S$55k] [███████ Carbon Tax S$44k]
         ↑ Carbon tax bar grows each year as price escalates
```

**Chart C — Carbon Tax Exposure: Act Now vs. Wait**
```
S$/year
45k │          ████  ← 2026 rate (S$45/t) — LOCKED IN BY LAW
    │    ████
25k │────████  ← Current rate (S$25/t)
    │
    │  2025  2026  2027  2030
    Waiting costs you S$13,600/year MORE from 2026 onwards
```

---

### 6.7 OUTPUT PAGE 6 — CONFIDENCE RATING CARD
*Mirrors a financial product's risk disclosure — transparent, honest, actionable.*

```
┌──────────────────────────────────────────────────────────────┐
│  CONFIDENCE RATING: ●●●○○  MEDIUM                            │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  WHAT WE KNOW WITH HIGH CONFIDENCE                           │
│  ✅  Your electricity consumption (from uploaded bill)       │
│  ✅  Singapore's carbon tax rate (legislated to 2027)        │
│  ✅  Grid emission factor (EMA official, 2024)               │
│  ✅  EEG grant eligibility (confirmed for your sector)       │
│                                                              │
│  WHAT IS ESTIMATED / PROJECTED                               │
│  ⚠️   Energy saving rate (22%) — based on sector benchmark  │
│       Actual rate confirmed after Schneider site audit       │
│  ⚠️   Carbon tax rate post-2027 (S$50–S$80 range)           │
│       Government target, not yet legislated                  │
│  ⚠️   Scope 3 emissions (spend-based estimate ±40%)         │
│       Provide tonne-km data to improve accuracy             │
│                                                              │
│  HOW TO UPGRADE TO HIGH CONFIDENCE  ●●●●●                   │
│  → Upload 12 months of utility bills (not just latest)      │
│  → Request a Schneider site energy audit (free for MNCs)    │
│  → Provide actual freight tonne-km data                     │
│                                                              │
│  This illustration is indicative only. Actual savings       │
│  depend on site conditions, occupancy, and energy prices.   │
│  A Schneider advisor will confirm figures after site visit. │
└──────────────────────────────────────────────────────────────┘
```

---

### 6.8 OUTPUT — AI PLAIN-ENGLISH SUMMARY (shown at top of report)

```
"Acme Manufacturing currently spends approximately S$312,000 per year on 
energy and carbon costs across its 3 Singapore sites.

By deploying EcoStruxure Building Operation, you could save an estimated 
S$72,000–S$93,000 per year — recovering the investment in 3.4 years 
at base case. This figure rises significantly from 2026, when Singapore's 
carbon tax increases 80% from S$25 to S$45 per tonne — adding S$13,600 
more in annual savings automatically, with no additional action required.

Over 10 years, the cumulative financial benefit is estimated at S$650,000 
to S$1.18 million, depending on carbon price trajectory.

Your Scope 3 footprint of ~1,240 tCO₂e/year is identified but not included 
in the financial saving — EcoStruxure Resource Advisor can help you track 
and report this for SBTi and SGX sustainability reporting purposes."
```

---

## 7. SCHNEIDER PRODUCT-TO-SAVING MAPPING

> [!IMPORTANT]
> This is what makes it a Schneider tool, not a generic calculator. Every output row must name a specific product.

| Saving Type | Schneider Product/Service | Typical Saving Range | Evidence |
|---|---|---|---|
| Building energy efficiency (HVAC, lighting) | **EcoStruxure Building Operation (EBO)** | 15–30% energy reduction | MBS: 20% ops savings; JLL: 30% energy reduction |
| Energy data management & carbon reporting | **EcoStruxure Resource Advisor** | 5–15% waste reduction via anomaly detection | Platform capability; Marriott: 15% savings |
| Distributed energy / solar + storage | **EcoStruxure Microgrid** / **EaaS** | 20–40% energy cost reduction | Kallang Pulse: 3.3yr payback; Chew's Agri: ~50% utility savings |
| Power quality & distribution | **EcoStruxure Power** (PowerLogic metering) | 5–10% demand charge reduction | Cross-portfolio benchmark |
| Sustainability reporting & decarbonisation planning | **Schneider Sustainability Business** / **Net Zero Advisory** | Compliance cost avoidance + SBTi alignment | Marriott partnership |
| Scope 3 supply chain visibility | **EcoStruxure Resource Advisor (Scope 3 module)** | Quantification only (not direct $ saving) | Platform has 200+ GHG protocol factors |

---

## 8. REAL CASE STUDY BENCHMARKS (Validation Numbers)

Use these to sanity-check calculator outputs — if a result is wildly outside these ranges, flag a warning.

| Client | Industry | Solution | Verified Result | Source |
|---|---|---|---|---|
| **Marina Bay Sands** | Hospitality/IR | EcoStruxure (full suite) | **48% carbon reduction since 2012**; 20% energy ops savings; 31.4% energy reduction (2020 operational adjustment) | MBS Sustainability Report + SE case study |
| **JLL Asia-Pacific HQ** | Commercial Office | EcoStruxure for Real Estate | **30% energy reduction** via IoT BMS + condition-based maintenance | SE case study |
| **Marriott International** | Hospitality (global) | EcoStruxure Building + Resource Advisor | **Up to 15% energy savings** across portfolio | SE / Architecture & Design |
| **Chew's Agriculture** | Agri/F&B | EcoStruxure + onsite solar | **~50% utility cost savings**; 25%+ electricity exported to grid | SE case study |
| **Kallang Pulse (SE HQ SG)** | Commercial Office | Integrated EcoStruxure | **3.3-year payback**; 30% passive + 10-15% active energy reduction; Carbon neutral 2020 | SE case study |
| **General commercial occupancy control** | Office | EcoStruxure occupancy sensors | **22% reduction** in operational energy & carbon | SE research |

### Benchmark Ranges (for output sanity-check)

| Building Type | Typical Energy Saving | Typical Carbon Reduction | Payback Range |
|---|---|---|---|
| Commercial office | 15–30% | 15–30% | 3–6 years |
| Hotel/Hospitality | 10–20% | 10–25% | 4–8 years |
| Industrial/Manufacturing | 10–25% | 10–20% | 3–7 years |
| Data centre | 10–20% PUE improvement | 10–20% | 3–5 years |

> [!WARNING]
> If calculator output shows >40% savings or <2yr payback for a standard building, flag as "unusually high — please verify inputs." If <5% savings, flag "below minimum threshold for most Schneider solutions."

---

## 9. SCOPE 3 — DECISION REQUIRED (TEAM SIGN-OFF NEEDED)

> [!CAUTION]
> This section requires an explicit team decision before build. Do not assume a position.

### The Core Problem
Schneider Electric **does not directly control** a client's Scope 3 emissions (upstream supplier production, downstream product use, employee commuting, etc.). Tying a specific dollar savings figure to a specific Schneider product for Scope 3 is intellectually dishonest and would not withstand scrutiny.

### Option A: Scope 3 = Quantified but NOT Monetised ✅ *Recommended*
- Calculator shows Scope 3 in **tonnes CO₂e** only
- Labelled: *"Scope 3 emissions identified — these are for reporting & target-setting, not included in financial savings calculation"*
- Linked to **EcoStruxure Resource Advisor** as the tool for tracking and reporting Scope 3
- SME Scope 3 data source: **spend-based EEIO factors** (from DEFRA 2024 or EPA EEIO v2)

**Why this is defensible**: Schneider can legitimately help clients *measure and report* Scope 3 via Resource Advisor. The $value is in compliance cost avoidance and SBTi credibility, not in direct emissions reduction.

### Option B: Scope 3 = Partially Monetised (selective categories only)
- Only Cat 4 (upstream freight) and Cat 9 (downstream freight) tied to dollar values
- These can be linked to **logistics optimisation** via EcoStruxure — but only if client is in logistics/manufacturing
- Risk: Still a stretch unless client is in a sector where SE directly influences logistics

### Option C: Scope 3 = Fully in Calculator (not recommended)
- Fraught with double-counting, unclear causation, and audit risk
- Would be called out in any MNC procurement review
- ❌ Not recommended

### Scope 3 Input Fields if Option A Selected (SME)
- Annual logistics spend (S$) → converted to tCO₂e via spend-based EEIO
- Number of flights/year → DEFRA passenger-km factor
- Display: "Your estimated Scope 3: X tCO₂e/year — see Resource Advisor for full supply chain tracking"

---

## 10. CONFIDENCE RANGE METHODOLOGY

> [!IMPORTANT]
> The range must have a real rule behind it, not just look plausible.

### Proposed Method: Input Data Quality Score

**Step 1 — Score the input data quality:**

| Data Type Provided | Quality Score |
|---|---|
| Actual meter readings / utility bills | High (±10%) |
| Estimated from floor area / headcount | Medium (±25%) |
| Industry benchmark / sector average | Low (±40%) |
| Spend-based proxy only | Very Low (±50%) |

**Step 2 — Assign range width based on dominant score:**

| Dominant Score | Range Width Applied |
|---|---|
| High (all actual data) | ±10% around base case |
| Medium | ±20% |
| Low / Mixed | ±35% |

**Step 3 — Apply scenario logic to the range:**
- **Conservative end**: Lower-bound savings efficiency (e.g., 15% energy reduction, current carbon tax S$25)
- **Optimistic end**: Upper-bound savings efficiency (e.g., 30% energy reduction, carbon tax at S$45 2026 rate)

**Step 4 — Display:**
```
Confidence: [●●●○○] Medium
Your range: S$95,000 – S$145,000/year
Based on: Estimated consumption data. Upload utility bills to narrow range.
```

---

## 11. OPEN QUESTIONS FOR TEAM DECISION

Before any build starts, the following need explicit team answers:

| # | Question | Options | Recommended |
|---|---|---|---|
| 1 | **Scope 3 in calculator**: monetised or quantified-only? | A: Quantify only / B: Partial money / C: Full money | **A** |
| 2 | **Scope 3 data source for SMEs**: what do they actually input? | Spend (S$) / Physical (kg, km) / None | **Spend-based (S$)** |
| 3 | **Tariff assumption**: fixed S$0.30 or quarterly-updated? | Fixed / Live API from SP Group | **Fixed with manual update schedule** |
| 4 | **Carbon tax in calculator**: current rate only or show trajectory? | Current only / Show 2026 uplift / Show 2030 range | **Show 2026 uplift prominently** |
| 5 | **MNC Scope 3 categories**: all 15 or priority subset? | All 15 / 6 priority cats / Scope 1&2 only with S3 flag | **6 priority cats** |
| 6 | **Grant display**: show EEG as deduction or separate section? | Deduction in payback / Separate "funding" tab / Not shown | **Deduction in payback** |
| 7 | **Output format**: range only, or named-product breakdown first? | Range first / Product table first / Side-by-side | **Range first, product table below** |
| 8 | **Building type as input**: required or optional? | Required / Optional / Inferred from sector | **Required dropdown** |

---

## 12. RECOMMENDED BUILD SEQUENCE — V1 + V2 FULL PLAN

### V1 — Core Calculator (Weeks 1–6)

```
Phase 1 — Decisions & Data (Week 1)
  └── Team workshop: answer all 8 open questions (Section 11)
  └── Confirm Scope 3 treatment (Option A: quantify only — recommended)
  └── Sign off product-to-saving mapping table (Section 7)
  └── Confirm multi-country scope for V1 (Singapore only or ASEAN-5)
  └── Set up versioned /data JSON file structure (Section 17.2)
  └── Assign data update ownership per file (Section 17.1)

Phase 2 — Math Engine (Week 2)
  └── Build emission factor lookup (static JSON: GEF, diesel, gas, refrigerants)
  └── Build Scope 3 EEIO factor lookup (DEFRA 2024, ASEAN grid factors)
  └── Build core formula engine:
        → Scope 1+2: activity-based (kWh × GEF, litres × 2.68)
        → Scope 3: spend-based EEIO (SME) + activity tonne-km (MNC)
        → Dollar conversion: energy cost + carbon tax (by year)
        → Grant offset: EEG eligibility check
  └── Build "Do Nothing" cost projection (parallel to savings projection)
  └── Build carbon tax escalation schedule (S$25 → S$45 → S$65 → S$80)
  └── Build confidence range scoring logic (data quality → ±% range)
  └── Build compliance risk threshold checker (25,000 tCO₂e trigger)
  └── Back-test against all 3 test profiles (Section 13)

Phase 3 — UI: Input (Fact-Find Flow) (Week 3)
  └── Build SME/MNC toggle + mode routing
  └── Build 5-step fact-find flow (Section 6.1)
  └── Build all SME input blocks (A–E, Section 5.1)
  └── Build all MNC input blocks (A–E, Section 5.2)
  └── Build AI-guided input option (chat-to-form, Section 16.2)
  └── Build bill upload + OCR extraction (Section 16.3)
  └── Build anomaly detection rules (>2× or <0.5× sector benchmark)
  └── Build sensitivity sliders (tariff / carbon tax / savings % — Section 14.4)

Phase 4 — UI: Output (Financial Illustration) (Week 4)
  └── Page 1: Cover summary (Section 6.2)
  └── Page 2: Stated assumptions panel (Section 6.3)
  └── Page 3: Year-by-year benefit table with "Do Nothing" column (Section 6.4 + 14.1)
  └── Page 4: Recommended solution package — "Your Policy" (Section 6.5)
  └── Page 5: Visual charts — cumulative savings, stacked bar, act-now vs wait (Section 6.6)
  └── Page 6: Confidence rating card (Section 6.7)
  └── Page 7: Energy intensity KPI dashboard vs. sector benchmarks (Section 14.6)
  └── Page 8: Calibration curve — where you sit vs. best-in-class (Section 14.2)
  └── Page 9: Compliance risk flag panel (Section 14.3)
  └── Page 10: Sales CTA panel — 4 action buttons (Section 14.5)
  └── AI plain-English summary (Section 6.8 + 16.4)

Phase 5 — PDF Export + Admin (Week 5)
  └── Build PDF export (all 10 output pages, branded, client-ready)
  └── Build admin dashboard for data factor updates (Section 17.5)
  └── Build staleness warning system (Section 17.4)
  └── Build version stamping on every calculation output (Section 17.3)
  └── Build "share via email" link generation

Phase 6 — Validation & QA (Week 6)
  └── Run all 3 test profiles — verify outputs against benchmarks
  └── Test "Do Nothing" column figures vs. NEA carbon tax projections
  └── Test compliance trigger at 25,000 tCO₂e boundary
  └── Test calibration curve against EMA published sector benchmarks
  └── Review with Schneider product team — product mapping accuracy
  └── Legal review: disclaimer language, data privacy statement
  └── Soft-launch to 2–3 Schneider account managers for field testing
```

### V2 — Enhanced Platform (Weeks 7–12)

```
Phase 7 — Multi-Country Expansion
  └── Add ASEAN-5 grid factors (MY, TH, ID, PH, VN — Section 14.7)
  └── Add per-country carbon pricing where applicable
  └── Add multi-site, multi-currency input for MNC mode

Phase 8 — Returning User / Year-on-Year Tracking
  └── User accounts (email login)
  └── Save & resume calculation sessions
  └── Year-on-year comparison: projected vs. actual savings
  └── "You deployed EBO in March — here is your performance" dashboard

Phase 9 — CRM & Sales Integration
  └── Schneider Salesforce CRM integration — completed calculations → leads
  └── Account manager assignment on PDF download / CTA click
  └── Usage analytics dashboard (which sectors use it most, drop-off points)

Phase 10 — Advanced Features
  └── Mobile/tablet optimised layout (sales rep use in client meetings)
  └── Multi-language support (English + Mandarin)
  └── "What if" advanced scenario builder (multiple product combinations)
  └── Competitor comparison mode (vs. doing nothing / generic auditor)
```

---

## 13. THREE TEST PROFILES (For Prototype Validation)

### Profile A — SME: F&B Company, 30 staff, Kallang industrial unit
- Monthly electricity: 15,000 kWh
- Monthly diesel (delivery vans): 500 litres
- No refrigerant data
- Annual logistics spend: S$200,000
- **Expected output**: ~18 tCO₂e/month (S1+S2) + ~40 tCO₂e Scope 3 estimated
- **Expected annual saving** (energy efficiency + monitoring): S$15,000–S$30,000
- **Relevant products**: EcoStruxure Power (smart meters), EEG grant applicable

### Profile B — Mid-market: Hotel, 250 rooms, CBD Singapore
- Monthly electricity: 800,000 kWh
- Natural gas: 500 GJ/month
- Refrigerant R-410A: 20 kg/year top-up
- Business travel: 200 flights/year
- **Expected output**: ~500–600 tCO₂e/month (S1+S2)
- **Expected annual saving**: S$400,000–S$800,000 (Marriott benchmark: 15%)
- **Relevant products**: EBO (BMS), Resource Advisor, EaaS feasibility

### Profile C — MNC: Regional HQ, 1,200 employees, manufacturing + distribution
- Monthly electricity: 2,500,000 kWh across 3 sites
- Fleet: 50 diesel trucks (5,000 L/month)
- Upstream freight: 2M tonne-km/year (road + sea)
- Purchased goods: S$50M/year
- **Expected output**: 2,000–3,000 tCO₂e/month (S1+S2); 15,000+ tCO₂e Scope 3
- **Expected annual saving**: S$2M–S$5M
- **Carbon tax exposure (2026)**: ~S$1.35M/year (1,000 taxable tonnes × S$45/t — estimated)
- **Relevant products**: Full EcoStruxure suite, Net Zero Advisory, Resource Advisor

---

## 14. ADDITIONAL FEATURE SPECIFICATIONS

### 14.1 THE "DO NOTHING" COST — FULL SPEC

> [!IMPORTANT]
> This is the single most persuasive number in the tool. It reframes the conversation from "cost of investing" to "cost of not investing."

**What it shows:**
A parallel column in the year-by-year table showing cumulative carbon tax + energy cost *if the company takes no action*.

**Formula:**
```
Do Nothing Cost (Year N) =
  (Annual kWh × tariff_rate) +          ← Energy bill stays the same
  (tCO₂e_taxable × carbon_tax_rate_N)   ← Carbon tax bill grows each year
```

**Year-by-Year Table with Do Nothing Column:**

```
Year │ SAVING (Act Now) │ CARBON TAX BILL (Do Nothing) │ Difference
─────┼──────────────────┼──────────────────────────────┼────────────
  1  │ S$93,000         │ S$17,000                     │ S$110,000
  2  │ S$72,000         │ S$17,000                     │ S$89,000
  3  │ S$85,600         │ S$30,600 ▲ (+80%)            │ S$116,200
  4  │ S$85,600         │ S$30,600                     │ S$116,200
  5  │ S$85,600         │ S$30,600                     │ S$116,200
 10  │ S$99,200         │ S$44,200 ▲                   │ S$143,400
─────┴──────────────────┴──────────────────────────────┴────────────
TOTAL│ S$889,000 saved  │ S$296,000 paid with no return│ S$1,185,000
```

**UI callout (shown prominently):**
```
┌─────────────────────────────────────────────────────────┐
│  ⚠️  THE COST OF WAITING                               │
│                                                         │
│  If you take no action, your carbon tax bill alone      │
│  grows by S$13,600/year from 2026 — automatically,      │
│  with no change in your operations.                     │
│                                                         │
│  Over 10 years: S$296,000 paid in carbon tax            │
│  with nothing to show for it.                          │
└─────────────────────────────────────────────────────────┘
```

---

### 14.2 CALIBRATION CURVE — ENERGY INTENSITY BENCHMARKING

**Purpose:** Show the company exactly where they sit vs. best-in-class and worst-in-class in their sector. This is the anchor for the savings % assumption — the further from best-in-class, the higher the realistic savings potential.

**How it's calculated:**
```
User's energy intensity = Annual kWh ÷ floor area (kWh/m²/year)
                      OR = Annual kWh ÷ employees (kWh/person/year)

Plotted against sector benchmark bands from EMA / BCA Green Mark data
```

**Sector Benchmark Table (Singapore — Source: EMA, BCA):**

| Sector | Best-in-Class | Average | Poor | Unit |
|---|---|---|---|---|
| Commercial office | 120 | 200 | 350 | kWh/m²/year |
| Hotel (4–5 star) | 200 | 350 | 550 | kWh/m²/year |
| Retail mall | 250 | 400 | 600 | kWh/m²/year |
| Industrial/light manufacturing | 80 | 180 | 320 | kWh/m²/year |
| Data centre | 1.2 PUE | 1.5 PUE | 2.0 PUE | PUE ratio |
| F&B / Restaurant | 400 | 700 | 1,100 | kWh/m²/year |
| Healthcare | 300 | 500 | 750 | kWh/m²/year |

**Visual Output (Calibration Curve):**
```
  Best-in-class        Sector average          Your position    Poor
       ↓                     ↓                      ↓             ↓
 ──────[●]─────────────────[───]────────────────────[YOU]──────────[  ]
      120               200                        280            350
                                                        kWh/m²/year

  Improvement gap: 160 kWh/m²  →  potential S$X,XXX/year saving
  At your current tariff (S$0.30/kWh) and floor area (Xm²)
```

**How this feeds the savings % assumption:**
- User is in worst 25% of sector → apply 25–30% savings rate (high end)
- User is at sector average → apply 15–22% savings rate (mid range)
- User is already near best-in-class → apply 5–10% savings rate (flag: limited upside)
- User is at best-in-class → flag: "Your energy intensity is already excellent. Schneider solutions would focus on reporting & carbon tax management."

**Carbon intensity version (secondary chart):**
```
Same chart but Y-axis = kg CO₂/m²/year
Calculated as: energy intensity × GEF (0.402)
Shows carbon performance, not just energy performance
```

---

### 14.3 COMPLIANCE RISK TRIGGER — REGULATORY FLAG PANEL

**Purpose:** Automatically flag whether the company may be legally required to act — turning a "nice to have" conversation into a "must do" one.

**Trigger Logic:**

| Threshold | What's Triggered | Regulatory Body | Action Required |
|---|---|---|---|
| ≥25,000 tCO₂e/year (facility level) | Singapore Carbon Tax liability | IRAS / NEA | Mandatory annual reporting + tax payment |
| Listed on SGX Mainboard or Catalist | SGX Mandatory Sustainability Reporting | SGX | Climate disclosures, board governance statement |
| Revenue > S$100M or employees > 200 | Likely MNC mode required | — | Suggest MNC mode if not already selected |
| Supplier to SBTi-committed buyer | Scope 3 downstream pressure | CDP / SBTi | Supplier data requests from buyers |
| Financial institution (MAS regulated) | MAS Climate Risk Guidelines | MAS | TCFD alignment required |

**UI Output — Compliance Risk Panel:**
```
┌──────────────────────────────────────────────────────────────┐
│  ⚖️  REGULATORY EXPOSURE CHECK                               │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Based on your inputs (~28,400 tCO₂e/year):                 │
│                                                              │
│  🔴  CARBON TAX LIABLE                                       │
│      Your estimated emissions exceed 25,000 tCO₂e/year      │
│      → You are required to report to IRAS annually           │
│      → Carbon tax bill at S$45/t (2026): ~S$1,278,000/year  │
│      → Confirm exact threshold with your legal/finance team  │
│                                                              │
│  🟡  SGX REPORTING                                           │
│      If listed: mandatory sustainability reporting applies   │
│      EcoStruxure Resource Advisor supports SGX disclosure    │
│                                                              │
│  🟢  EEG GRANT ELIGIBLE                                      │
│      Your sector and size qualify for the Energy Efficiency  │
│      Grant (up to S$30,000, 70% co-funded)                  │
│      Apply via GoBusiness before March 2028                  │
│                                                              │
│  ⚠️  DISCLAIMER: This is indicative only. Confirm your       │
│  regulatory obligations with a qualified advisor.           │
└──────────────────────────────────────────────────────────────┘
```

---

### 14.4 SENSITIVITY SLIDERS — "WHAT IF" ANALYSIS

**Purpose:** Let users test their own assumptions. Like a financial calculator where you drag the interest rate — the projection table and charts update live.

**Sliders to include:**

| Slider | Default | Min | Max | What It Changes |
|---|---|---|---|---|
| **Energy saving rate** | 22% | 5% | 40% | All energy cost savings figures |
| **Electricity tariff** | S$0.30/kWh | S$0.20 | S$0.45 | All energy cost figures |
| **Carbon tax 2030** | S$65/t | S$50/t | S$80/t | Year 6–10 carbon tax savings |
| **Solution investment cost** | S$300,000 | S$10,000 | S$10M | Payback period calculation |
| **Tariff escalation** | 0%/yr | 0% | 5%/yr | Forward-looking energy cost savings |

**UI behaviour:**
- All sliders have a tooltip explaining what they represent
- Moving a slider instantly recalculates the full illustration in real time
- A "Reset to defaults" button restores all sliders to base case
- Changed sliders are highlighted in the Stated Assumptions panel: *(User-modified — default: S$65/t)*
- If user sets a value that conflicts with stated data (e.g., tariff below S$0.20), show a warning: *"This is below current market rates — illustration may be unrealistic"*

**"What if carbon tax hits S$80 by 2030?" example output:**
```
With S$80/t carbon tax by 2030:
  Year 10 carbon tax saving:  S$56,600/year (vs. S$44,200 at S$65/t)
  10-year cumulative saving:  S$1,034,000 (vs. S$889,000)
  Payback period:             2.9 years (vs. 3.4 years)
```

---

### 14.5 SALES CTA LAYER — LEAD CONVERSION SPEC

**Purpose:** Every completed illustration must have a clear, frictionless next step. This is how the calculator converts from an awareness tool to a sales lead.

**Four CTA Buttons (shown after every output):**

```
┌──────────────────────────────────────────────────────────────┐
│  WHAT WOULD YOU LIKE TO DO NEXT?                             │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  [📋 Download Full Illustration PDF]                         │
│      Get the complete 10-page financial illustration,        │
│      branded and ready to share with your Finance Director   │
│      → Requires: name + email (lead capture)                 │
│                                                              │
│  [📅 Book a Free Site Energy Audit]                          │
│      A Schneider engineer visits your site to confirm        │
│      these numbers and produce a formal proposal             │
│      Free for: companies >500 employees (MNC)               │
│      Small fee for: SMEs (refundable on solution purchase)  │
│      → Calendly or Schneider booking link                    │
│                                                              │
│  [💬 Talk to a Schneider Advisor (5 min)]                    │
│      Speak to a Singapore-based sustainability consultant    │
│      → Typeform intake → advisor call back within 1 day      │
│                                                              │
│  [📧 Email This Illustration to a Colleague]                 │
│      Send the full output to your Finance Director,          │
│      Sustainability Manager, or Procurement team             │
│      → Unique shareable link + PDF attachment option         │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Lead Data Captured on PDF Download:**
- Name, email, company name, job title (optional)
- Mode used (SME/MNC)
- Sector
- Estimated annual saving shown
- Schneider products recommended
- Confidence level
- → Auto-populated into Schneider CRM / Salesforce (V2)

**Email Illustration spec:**
- Unique URL generated per calculation session (e.g., `peak.se.com/illustration/abc123`)
- Link expires after 30 days
- Recipient sees full output without needing to re-enter data
- CTA buttons appear for recipient too

---

### 14.6 ENERGY INTENSITY KPI DASHBOARD

**Purpose:** Give the company a set of standardised performance metrics they can track year-over-year — turning the calculator from a one-off tool into an ongoing performance tracker.

**KPIs Displayed:**

| KPI | Formula | Your Value | Sector Average | Best-in-Class | Unit |
|---|---|---|---|---|---|
| **Energy intensity** | Annual kWh ÷ m² | — | — | — | kWh/m²/year |
| **Carbon intensity** | Annual tCO₂e ÷ m² | — | — | — | kg CO₂/m²/year |
| **Carbon per employee** | Annual tCO₂e ÷ headcount | — | — | — | tCO₂e/person |
| **Energy cost ratio** | Annual energy S$ ÷ revenue S$ | — | — | — | % of revenue |
| **Carbon tax exposure** | Taxable tCO₂e × S$45 (2026) | — | — | — | S$/year |
| **Scope 3 ratio** | Scope 3 tCO₂e ÷ total tCO₂e | — | — | — | % |
| **Renewable coverage** | RE kWh ÷ total kWh | — | — | — | % |

**UI Treatment:**
- Each KPI shown as a gauge/meter: your value plotted on a scale from worst to best
- Colour coded: 🔴 Poor | 🟡 Average | 🟢 Good | ⭐ Best-in-class
- Tooltip on each: *"This metric tells you X. To improve it, Schneider recommends Y."*
- Year-on-year trend arrows (V2): ↑ improving / ↓ worsening / → stable

---

### 14.7 MULTI-COUNTRY ASEAN EMISSION FACTORS (MNC Mode)

**Purpose:** MNCs with multi-country operations need per-country factors for an accurate full-portfolio footprint.

| Country | Grid EF (kg CO₂/kWh) | Source | Carbon Tax? |
|---|---|---|---|
| **Singapore** | 0.402 | EMA 2024 | ✅ S$25/t (2025), S$45/t (2026) |
| **Malaysia** | 0.621 | Suruhanjaya Tenaga 2023 | ❌ None (as of 2026) |
| **Thailand** | 0.513 | EGAT 2023 | ❌ None (pilot ETS proposed) |
| **Indonesia** | 0.709 | PLN 2022 | ⚠️ Limited ETS pilot 2023 |
| **Vietnam** | 0.612 | EVN 2023 | ❌ None |
| **Philippines** | 0.519 | DOE 2023 | ❌ None |
| **China (avg)** | 0.559 | MEE 2023 | ⚠️ ETS active (power sector) |
| **India (avg)** | 0.708 | CEA 2023 | ❌ None (PAT scheme) |
| **Australia** | 0.510 | DCCEEW 2023 | ⚠️ Safeguard Mechanism |
| **UK** | 0.207 | DEFRA 2024 | ✅ UK ETS active |
| **EU (avg)** | 0.276 | EEA 2023 | ✅ EU ETS active |

**Implementation:** In MNC mode, each site has a country selector. The correct GEF is loaded automatically. Carbon tax fields are shown/hidden based on country.

---

### 14.8 RETURNING USER / YEAR-ON-YEAR TRACKING (V2 Spec)

**Purpose:** Transform the calculator from a one-shot sales tool into an ongoing performance management platform. Creates annual touchpoints with every client.

**User Flow:**
```
First visit (Year 0):
  └── Complete fact-find → Generate illustration
  └── Download PDF → CTA clicked → Lead created
  └── Account created (email + company)
  └── Calculation saved to account

Return visit (Year 1):
  └── Log in → "Welcome back, Acme Manufacturing"
  └── "Last year you projected S$93,000 saving from EBO"
  └── "How did you actually perform? Enter your last 12 months of bills"
  └── Actual vs. projected comparison generated
  └── New illustration for next 10 years updated with actual baseline

Return visit (Year 2+):
  └── Trend view: 3-year trajectory chart
  └── "You've saved S$187,000 to date — S$702,000 remaining over 8 years"
  └── New product recommendations based on what's already deployed
```

**Data Stored Per Account:**
- Company profile (sector, size, country, mode)
- Each year's calculation snapshot (inputs + outputs + version stamp)
- Products deployed (user self-reports)
- Actual utility bills (optional upload)
- Year-on-year delta (projected vs. actual)

**Privacy:** Data stored in Schneider's secure cloud. Users can delete their account and all data at any time. No data sold or shared. Statement required in tool footer and on sign-up.

---

## 15. SOURCES & REFERENCES

| # | Source | Used For |
|---|---|---|
| 1 | EMA Singapore — Grid Emission Factor 2024 | Electricity emission factor (0.402 kg/kWh) |
| 2 | NEA Singapore — Carbon Tax | Carbon tax trajectory S$25/S$45/S$50-80 |
| 3 | SP Group — Quarterly Tariff Announcements | Electricity tariff ~S$0.30/kWh |
| 4 | DEFRA 2024 GHG Conversion Factors | Scope 3 transport/freight/travel factors |
| 5 | US EPA EEIO v2.0 | Spend-based Scope 3 factors (fallback) |
| 6 | IPCC AR6 | Refrigerant GWP values |
| 7 | Singapore Emission Factors Registry (SEFR) | Diesel: 2.68 kg CO₂e/litre |
| 8 | Schneider Electric case studies (se.com) | Marina Bay Sands, JLL, Marriott, Chew's, Kallang Pulse |
| 9 | GHG Protocol — Corporate Value Chain Standard | Scope 3 category definitions & calculation methods |
| 10 | EnterpriseSG / GoBusiness | EEG grant, ESG grants, SME eligibility |

---

## 16. AI ASSISTANCE ARCHITECTURE

> [!IMPORTANT]
> AI is used to improve usability and explain outputs — never to generate emission factors or financial figures. All numbers come from locked, versioned static data files.

### 16.1 Where AI Is Used (and Where It Is Not)

| Feature | AI Used? | What AI Does | What AI Never Does |
|---|---|---|---|
| **Guided input (chat-to-form)** | ✅ Yes | Pre-fills fields from natural language (e.g. "200-person office in Jurong") | Generate or modify emission factors |
| **Bill/document upload parsing** | ✅ Yes | Reads uploaded utility bill PDF/image, extracts kWh and S$ figures automatically | Make assumptions about unreported fields |
| **Anomaly detection** | ✅ Yes | Flags inputs that are >2× or <0.5× industry benchmark; asks user to confirm | Silently correct numbers |
| **Plain-English output summary** | ✅ Yes | Writes a 2–3 sentence narrative of results tailored to user's sector and mode | Invent case study numbers |
| **Product recommendation explanation** | ✅ Yes | Explains *why* each Schneider product is recommended based on user's specific inputs | Recommend products not in the approved mapping table |
| **Scope 3 coaching** | ✅ Yes | Guides MNC users through GHG Protocol Cat 1/4/6/7/9 inputs; explains what data to find and where | Calculate a $ saving from Scope 3 |
| **Confidence range explanation** | ✅ Yes | Explains what is driving uncertainty (e.g. "your range is wide because you used spend-based logistics data — upload tonne-km data to narrow it") | Widen or narrow range without declared logic |
| **Core math engine** | ❌ No | — | AI must never touch the formula or factor lookup |

---

### 16.2 AI Assist UX Flow

```
User opens calculator
        │
        ▼
[Option A] Fill form manually  ──────────────────────────────────►  Standard form
        │
[Option B] "Let AI help me" toggle
        │
        ▼
Chat prompt: "Tell me about your business in a few sentences"
        │
        ▼
AI extracts: sector, employees, location, rough energy profile
        │
        ▼
Pre-fills form fields with extracted values
Flags each field as: [AI estimated] or [From your input]
        │
        ▼
User confirms / corrects each field
        │
        ▼
Calculator runs on confirmed data (not AI-generated data)
```

---

### 16.3 Bill Upload / OCR Feature

For SMEs who have their SP Group bill but don't know their kWh:

```
User uploads utility bill (PDF or photo)
        │
        ▼
AI (Vision model) extracts:
  - Billing period
  - Total kWh consumed
  - Total amount (S$)
  - Tariff rate implied
        │
        ▼
Pre-fills: Monthly kWh field + S$ spend field
Flags as: [Read from uploaded bill — please verify]
        │
        ▼
User confirms → Calculator runs
```

**Supported documents:**
- SP Group electricity bill
- City Gas bill
- Geneco / Keppel Electric bill
- Fuel card statement (litres + S$)
- ACMV maintenance invoice (refrigerant top-up kg)

---

### 16.4 AI Output Narration — Template Logic

After calculation, AI generates a plain-English summary using this structure:

```
"Based on your inputs, [Company] — a [sector] business with [X employees / Xm²] 
in Singapore — emits approximately [X tCO₂e/year] across Scope 1 and 2.

By deploying [Product 1] and [Product 2], you could reduce this by [X–X%], 
saving an estimated [S$X – S$X per year] at today's carbon tax rate — 
rising to [S$X] when Singapore's carbon price increases to S$45/tonne in 2026.

With [EEG grant / no grant], your payback period is approximately [X–X years].

Your Scope 3 footprint (not included in financial savings) is estimated at 
[X tCO₂e/year], primarily from [top category]. EcoStruxure Resource Advisor 
can help you track and report this."
```

---

### 16.5 AI Model Recommendation

| Use Case | Recommended Approach | Rationale |
|---|---|---|
| Chat-to-form input extraction | Gemini 1.5 Flash / GPT-4o-mini | Fast, cheap, good at structured extraction |
| Bill/document OCR parsing | Gemini 1.5 Pro Vision / GPT-4o Vision | Strong document understanding |
| Output narration | Gemini 1.5 Flash | Low latency, template-guided, no hallucination risk |
| Anomaly detection | Rule-based (no AI) | Deterministic rules are safer and cheaper for threshold checks |

> [!NOTE]
> All AI calls are **one-directional into the UI** — they never write to the emission factor database or modify the math engine. The calculation layer is entirely deterministic.

---

## 17. DATA SELF-UPDATE ARCHITECTURE

> [!CAUTION]
> Fully automated data updates are NOT recommended for a financial/compliance calculator. All factor changes must go through human verification before going live. This section defines a structured, semi-automated update process.

### 17.1 Data Update Schedule & Ownership

| Data Type | Update Frequency | Trigger | Owner | Method |
|---|---|---|---|---|
| **Singapore GEF** (grid emission factor) | Annual — January each year | EMA publishes annual electricity statistics | Sustainability/Data team | Manual pull from EMA website → update `emission_factors.json` → version bump |
| **SP Group electricity tariff** | Quarterly — Jan/Apr/Jul/Oct | SP Group quarterly announcement | Data team | Manual update to `tariff_config.json` → notify in tool UI |
| **Carbon tax rate** | Pre-legislated (known years ahead) | NEA/MSE legislative updates | Legal/Data team | Hard-coded schedule in `carbon_tax_schedule.json`; auto-activates by date |
| **DEFRA Scope 3 factors** | Annual — April each year | DEFRA publishes updated GHG conversion factors | Data team | Manual download + diff check → update `scope3_factors.json` |
| **IPCC GWP values** | Every 5–7 years (AR cycle) | IPCC Assessment Report release | Data team | Manual update to `refrigerant_gwp.json` |
| **Singapore grant amounts/eligibility** | Ad-hoc (policy changes) | GoBusiness / EnterpriseSG announcements | Data/Policy team | Manual update to `grants.json` |
| **Schneider product mapping table** | Ad-hoc (product launches/retirements) | Internal Schneider product team | Product team | Manual update to `product_mapping.json` |

---

### 17.2 Data File Structure

All emission factors and configuration live in versioned static JSON files. No live API calls for core calculation data.

```
/data
├── emission_factors.json        ← GEF, diesel, petrol, CNG, natural gas
├── scope3_factors.json          ← DEFRA 2024 transport/travel/spend factors
├── refrigerant_gwp.json         ← IPCC AR6 GWP values per refrigerant type
├── carbon_tax_schedule.json     ← S$25 (2024-25), S$45 (2026-27), S$65 (2030 mid)
├── tariff_config.json           ← Current SP Group tariff + historical log
├── grants.json                  ← EEG, PSG, ESP grant details + eligibility rules
├── product_mapping.json         ← Schneider product → saving type → typical % range
├── sector_benchmarks.json       ← Energy intensity benchmarks by sector (kWh/m²)
└── changelog.md                 ← Every update logged: date, changed value, source URL
```

---

### 17.3 Version Stamping & Transparency

Every calculation run records which data version was used. This is displayed in the output and the PDF report:

```
Calculation methodology:
  Grid emission factor:  0.402 kg CO₂/kWh  [EMA 2024, updated Jan 2025]
  Carbon tax rate:       S$25/tCO₂e         [NEA, effective 2024-2025]
  Electricity tariff:    S$0.30/kWh          [SP Group Q3 2024, updated Oct 2024]
  Scope 3 factors:       DEFRA 2024          [updated May 2024]
  Data version:          v2.3.1
```

This gives the output **audit-trail integrity** — critical for MNCs using this for compliance reporting.

---

### 17.4 In-Tool Data Staleness Warning

The calculator automatically shows a warning banner when any data file is overdue for update:

```
⚠️  Some emission factors may be outdated.
    Grid Emission Factor last updated: January 2024 (13 months ago)
    EMA typically publishes updated figures in January each year.
    Contact your Schneider account manager for the latest calculation.
```

Trigger logic:
- GEF: warn if >13 months since last update
- Tariff: warn if >4 months since last update (one quarter overdue)
- DEFRA factors: warn if >14 months since last update
- Carbon tax: no warning needed (pre-legislated schedule)

---

### 17.5 Admin Dashboard (Internal Tool)

A lightweight internal admin panel for the Schneider team to update data without touching code:

| Admin Feature | Function |
|---|---|
| **View current factor values** | See all live emission factors, tariffs, grants |
| **Edit factor values** | Update any value with required source URL + justification field |
| **Publish change** | Triggers version bump + changelog entry; change goes live after confirmation |
| **View changelog** | Full audit log of all historical changes |
| **Send update notification** | Pushes banner to active users: "Data updated — recalculate for latest results" |
| **Download factor set as CSV** | For sharing with clients or auditors |

> [!TIP]
> The admin dashboard prevents the common failure mode of "someone updated a spreadsheet but forgot to update the tool." All updates happen in one place with a mandatory source field.

---

### 17.6 What Is NOT Auto-Updated (and Why)

| Data | Why Not Auto-Updated |
|---|---|
| Emission factors (GEF, DEFRA) | Require human verification — a wrong factor in a financial calculator is a liability |
| Grant amounts | Policy nuance (eligibility criteria change, not just amounts) — needs human review |
| Schneider product mapping | Product accuracy/positioning requires product team sign-off |
| Carbon tax rate | Pre-legislated schedule is more reliable than scraping government websites |
| Sector benchmarks | Benchmarks should be reviewed annually, not updated automatically (stability matters for client comparisons) |
