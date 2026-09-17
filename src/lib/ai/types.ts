/**
 * Shapes shared between the AI API routes and the client review UI. Every
 * extracted field carries a `source` so the UI can render the PRD 16.2/16.3
 * required "[AI estimated]" vs "[From your input]" / "[Read from uploaded
 * bill]" provenance labels — these values are never applied to the form
 * until the user reviews and confirms them.
 */
export type FieldSource = "stated" | "estimated";

export interface ExtractedField<T> {
  value: T;
  source: FieldSource;
}

export interface ProfileExtraction {
  companyName?: ExtractedField<string>;
  sector?: ExtractedField<string>;
  employeeCount?: ExtractedField<number>;
  floorAreaM2?: ExtractedField<number>;
  numberOfSites?: ExtractedField<number>;
  hasVehicles?: ExtractedField<boolean>;
  hasSolar?: ExtractedField<boolean>;
  hasRefrigerants?: ExtractedField<boolean>;
  monthlyElectricityKwh?: ExtractedField<number>;
  notes?: string;
}

export interface BillExtraction {
  documentType?: string;
  billingPeriodStart?: string;
  billingPeriodEnd?: string;
  totalKwh?: number;
  totalAmountSgd?: number;
  impliedTariffSgdPerKwh?: number;
  extractionNotes?: string;
}
