/**
 * Types and interfaces for AI Bill Scanning and Extraction.
 */

export interface OrganizationAISettings {
  geminiApiKey?: string;
  geminiModel?: string; // e.g. "gemini-2.5-flash", "gemini-1.5-flash", "gemini-3.1-flash"
  customEndpoint?: string;
}

export interface OrganizationSettings {
  ai?: OrganizationAISettings;
  [key: string]: any;
}

export interface ExtractedBillItem {
  id: string; // generated client-side id
  productName: string;
  productCode?: string;
  category: "FRAME" | "LENS" | "CONTACT_LENS" | "ACCESSORY" | "SOLUTION";
  hsnCode?: string;
  quantity: number;
  unitPrice: number; // rate or unit amount
  basePrice: number;
  gstPercent: number; // e.g. 12, 18, 5
  cgstPercent: number;
  cgstAmount: number;
  sgstPercent: number;
  sgstAmount: number;
  igstPercent: number;
  igstAmount: number;
  purchasePrice: number; // unitPrice + tax
  totalPurchasePrice: number; // (unitPrice * qty) + tax
  retailPrice: number;

  // Extended optical specs (auto-filled for the Add Details modal)
  brand?: string;
  model?: string;
  gender?: string;
  color?: string;
  size?: string;
  type?: string;
  material?: string;
  frameShape?: string;
  modelNumber?: string;
  rackLocation?: string;

  // Lens Specs
  design?: string;
  refractiveIndex?: string;
  lensMaterial?: string;
  blankDiameter?: number;
  stockPower?: string;

  // Contact Lens Specs
  modality?: string;
  boxQuantity?: number;
  baseCurve?: string;
  diameter?: string;
  contactColor?: string;

  // Expiry & Batch
  requiresExpiryTracking?: boolean;
  batchNumber?: string;
  expiryDate?: string;
}

export interface ExtractedBillData {
  vendorName?: string;
  vendorGstin?: string;
  matchedVendorId?: string | null;
  isNewVendor?: boolean;
  invoiceNumber?: string;
  invoiceDate?: string; // YYYY-MM-DD
  taxType?: "SGST_CGST" | "IGST";
  taxRule?: "EXCLUDE" | "INCLUDE";
  items: ExtractedBillItem[];
  rawItemCount: number;
  totalAmount?: number;
  totalGst?: number;
  confidence?: "high" | "medium" | "low";
  notes?: string;
}

export interface BillExtractionResult {
  success: boolean;
  data?: ExtractedBillData;
  error?: string;
  needsKeySetup?: boolean;
}
