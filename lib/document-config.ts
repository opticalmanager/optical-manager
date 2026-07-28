import type { Shop, Customer } from "@/types";

/**
 * Returns shop business details for document rendering.
 * TODO: Replace with database fetch from shop/organization settings
 * when the settings pages are developed.
 */
export function getShopBusinessDetails(shop: Shop | null | undefined) {
  const settings = (shop?.settings as Record<string, any>) || {};

  return {
    name: shop?.name || "Optical Store",
    address: shop?.address || "",
    phone: shop?.phone || "",
    email: shop?.email || "",

    // Business compliance (only real DB fields, no hardcoded fallbacks)
    gstin: shop?.gstin || "",
    cin: shop?.cin || "",
    msmeUdyam: shop?.msmeUdyam || "",

    // Bank details (only real DB fields, no hardcoded fallbacks)
    bankName: shop?.bankName || "",
    bankBranch: shop?.bankBranch || "",
    bankAccountNumber: shop?.bankAccountNumber || "",
    bankIfsc: shop?.bankIfsc || "",

    // Toggle flags from JSONB settings
    enableBankDetails: settings.enableBankDetails ?? false,
    enableTerms: settings.enableTerms ?? true,
  };
}

/**
 * Returns customer tax/compliance details for document rendering.
 * TODO: Replace with actual customer fields when B2B invoicing is built.
 */
export function getCustomerTaxDetails(customer: Customer | null | undefined) {
  return {
    pan: (customer as any)?.pan || "",
    gstin: (customer as any)?.gstin || "",
    state: customer?.state || "",
    stateCode: (customer as any)?.stateCode || "",
  };
}
