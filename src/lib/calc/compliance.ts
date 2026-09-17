import type { ComplianceFlag } from "@/lib/types/results";

export const CARBON_TAX_THRESHOLD_TCO2E = 25000;

/**
 * Singapore's carbon tax is levied on a facility's DIRECT (Scope 1) emissions
 * only — about 50 large industrial sites (refineries, petrochem, fabs,
 * gencos) clear the 25,000 tCO2e/year threshold. A company that just buys
 * grid electricity has no separate NEA/IRAS bill of its own; its only carbon
 * tax exposure is a small pass-through already baked into the SP Group
 * tariff. Liability must therefore be judged on Scope 1 alone, or on a
 * self-reported IRAS registration — never on combined Scope 1+2.
 */
export function isCarbonTaxLiable(directScope1TCo2e: number, selfReportedTaxTonnes?: number): boolean {
  if (selfReportedTaxTonnes && selfReportedTaxTonnes > 0) return true;
  return directScope1TCo2e >= CARBON_TAX_THRESHOLD_TCO2E;
}

export function buildComplianceFlags(
  directScope1TCo2e: number,
  isLiable: boolean,
  eegEligible: boolean
): ComplianceFlag[] {
  const flags: ComplianceFlag[] = [];

  if (isLiable) {
    flags.push({
      id: "carbon-tax-liable",
      severity: "red",
      title: "Carbon tax liable",
      detail: `Your estimated direct (Scope 1) emissions (${Math.round(
        directScope1TCo2e
      ).toLocaleString()} tCO2e/year) meet or self-report against the ${CARBON_TAX_THRESHOLD_TCO2E.toLocaleString()} tCO2e/year threshold — you are required to report to NEA/IRAS annually. Confirm exact liability with your finance/legal team.`,
    });
  } else {
    flags.push({
      id: "carbon-tax-not-liable",
      severity: "green",
      title: "Not a direct carbon taxpayer",
      detail:
        "Singapore's carbon tax applies only to facilities with ≥25,000 tCO2e/year of direct (Scope 1) emissions — about 50 large industrial sites. Your only exposure is a small pass-through already reflected in your electricity tariff, so no separate carbon tax saving is shown below.",
    });
  }

  if (eegEligible) {
    flags.push({
      id: "eeg-eligible",
      severity: "green",
      title: "EEG grant eligible",
      detail:
        "Your sector and size qualify for the Energy Efficiency Grant (up to S$30,000, 70% co-funded). Apply via GoBusiness before March 2028.",
    });
  }

  return flags;
}

/**
 * Shared triggers used by both SME and MNC modes per PRD section 14.3
 * (formerly 17.3): MAS Climate Risk Guidelines and Scope 3 downstream
 * pressure from an SBTi-committed buyer. Available to either mode since
 * neither signal is MNC-exclusive (a small fund manager or a boutique
 * supplier can trip either one).
 */
export function buildSharedComplianceFlags(isFinancialInstitution: boolean, isSupplierToSbtiBuyer: boolean): ComplianceFlag[] {
  const flags: ComplianceFlag[] = [];

  if (isFinancialInstitution) {
    flags.push({
      id: "mas-climate-risk",
      severity: "yellow",
      title: "MAS Climate Risk Guidelines",
      detail: "As a MAS-regulated financial institution, TCFD-aligned climate risk disclosure and governance are expected. EcoStruxure Resource Advisor supports TCFD-aligned reporting.",
    });
  }

  if (isSupplierToSbtiBuyer) {
    flags.push({
      id: "sbti-supplier-pressure",
      severity: "yellow",
      title: "Scope 3 downstream pressure",
      detail: "Supplying an SBTi-committed buyer means they may request your supplier-level emissions data for their own Scope 3 reporting. EcoStruxure Resource Advisor can help you respond with auditable figures.",
    });
  }

  return flags;
}

interface MncComplianceInputs {
  isListedOnSgx: boolean;
  reportingFramework: string;
  sbtiStatus: "committed" | "in-progress" | "none";
  currentCarbonTaxExposureTonnes?: number;
  totalScope12TCo2e: number;
}

/** Additional MNC-scale flags per PRD section 17.3 (SGX, SBTi) layered on top of buildComplianceFlags. */
export function buildMncComplianceFlags(inputs: MncComplianceInputs): ComplianceFlag[] {
  const flags: ComplianceFlag[] = [];

  if (inputs.isListedOnSgx || inputs.reportingFramework === "SGX mandatory") {
    flags.push({
      id: "sgx-reporting",
      severity: "yellow",
      title: "SGX mandatory sustainability reporting",
      detail: "As a listed entity, mandatory climate disclosures and board governance statements apply. EcoStruxure Resource Advisor supports SGX-aligned reporting.",
    });
  }

  if (inputs.sbtiStatus === "committed") {
    flags.push({
      id: "sbti-committed",
      severity: "green",
      title: "SBTi-committed",
      detail: "Your near-term target commitment weights the decarbonisation pathway toward the optimistic 2030 carbon price scenario in this illustration.",
    });
  }

  if (inputs.currentCarbonTaxExposureTonnes && inputs.currentCarbonTaxExposureTonnes < inputs.totalScope12TCo2e) {
    flags.push({
      id: "exposure-mismatch",
      severity: "yellow",
      title: "Reported exposure differs from estimated footprint",
      detail: `You reported ${Math.round(inputs.currentCarbonTaxExposureTonnes).toLocaleString()} tCO2e/year to IRAS, but this illustration estimates ${Math.round(inputs.totalScope12TCo2e).toLocaleString()} tCO2e/year — confirm which facilities/boundaries are in scope for each figure.`,
    });
  }

  return flags;
}
