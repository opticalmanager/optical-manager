import type { Shop, Customer } from "@/types";

/**
 * Returns shop business details for document rendering.
 * TODO: Replace with database fetch from shop/organization settings
 * when the settings pages are developed.
 */
export function getShopBusinessDetails(shop: Shop | null | undefined) {
  return {
    name: shop?.name || "Clarity Eyecare Pvt. Ltd.",
    address: shop?.address || "Clarity Eyecare Pvt. Ltd., D 25/8, MIDC Turbhe, Turbhe, Maharashtra (27), India, 400710",
    phone: shop?.phone || "9137012156",
    email: shop?.email || "info@clarityeyecare.in",

    // Business compliance (hard-coded for now → fetch from DB later)
    gstin: "27AALCC7382F1ZC",
    cin: "U32507MH2024PTC422044",
    msmeUdyam: "UDYAM-MH-33-0456381",

    // Bank details (hard-coded for now → fetch from DB later)
    bankName: "Axis Bank Limited.",
    bankBranch: "MIDC Turbhe",
    bankAccountNumber: "924020033652178",
    bankIfsc: "UTIB0000661",
  };
}

/**
 * Returns customer tax/compliance details for document rendering.
 * TODO: Replace with actual customer fields when B2B invoicing is built.
 */
export function getCustomerTaxDetails(customer: Customer | null | undefined) {
  return {
    pan: "ABQFA8202M",        // Hardcoded fallback matching current invoices
    gstin: "19ABQFA8202M1ZY",  // Hardcoded fallback matching current invoices
    state: customer?.state || "West Bengal",
    stateCode: "19",           // West Bengal state code matching current supply place
  };
}
