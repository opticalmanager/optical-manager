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
    showPrescriptionOnInvoice:
      settings?.customization?.invoices?.items?.find?.((i: any) => i.id === "print_show_prescription_invoice")?.enabled ??
      settings.showPrescriptionOnInvoice ??
      false,
    showPrescriptionOnBooking:
      settings?.customization?.invoices?.items?.find?.((i: any) => i.id === "print_show_prescription_booking")?.enabled ??
      settings.showPrescriptionOnBooking ??
      true,
  };
}

export const DEFAULT_PRESCRIPTION_ADVISORY_NOTE =
  "Prescription valid for 6–12 months. Regular comprehensive eye examinations are recommended for optimal vision care.";

/**
 * Resolves prescription and document print display flags from DocumentData
 * (merging shop.settings.documentTemplates, customizationConfig, and shop.settings).
 */
export function resolvePrescriptionDisplaySettings(data: any) {
  const customization = data?.customizationConfig;
  const invItems = customization?.invoices?.items || [];

  const getCustomItem = (id: string) => invItems.find((i: any) => i.id === id);

  const shopSettings = (data?.shop?.settings as Record<string, any>) || {};
  const shopDocTemplates = (shopSettings.documentTemplates as Record<string, any>) || {};
  const shopCustomizationItems = shopSettings?.customization?.invoices?.items;
  const getShopCustomItem = (id: string) =>
    Array.isArray(shopCustomizationItems)
      ? shopCustomizationItems.find((i: any) => i.id === id)
      : undefined;

  const resolveToggle = (
    docTemplateKey: string,
    customItemId: string,
    flatLegacyKey: string | null,
    defaultVal: boolean
  ): boolean => {
    if (typeof shopDocTemplates[docTemplateKey] === "boolean") {
      return shopDocTemplates[docTemplateKey];
    }
    const shopCustom = getShopCustomItem(customItemId);
    if (typeof shopCustom?.enabled === "boolean") {
      return shopCustom.enabled;
    }
    const orgCustom = getCustomItem(customItemId);
    if (typeof orgCustom?.enabled === "boolean") {
      return orgCustom.enabled;
    }
    if (flatLegacyKey && typeof shopSettings[flatLegacyKey] === "boolean") {
      return shopSettings[flatLegacyKey];
    }
    return defaultVal;
  };

  const advisoryNote =
    (typeof shopDocTemplates.prescriptionAdvisoryNote === "string" && shopDocTemplates.prescriptionAdvisoryNote.trim()) ||
    (typeof shopSettings.prescriptionTermsNotes === "string" && shopSettings.prescriptionTermsNotes.trim()) ||
    (typeof getShopCustomItem("print_rx_advisory_note")?.defaultValue === "string" &&
      getShopCustomItem("print_rx_advisory_note")?.defaultValue.trim()) ||
    (typeof getCustomItem("print_rx_advisory_note")?.defaultValue === "string" &&
      getCustomItem("print_rx_advisory_note")?.defaultValue.trim()) ||
    DEFAULT_PRESCRIPTION_ADVISORY_NOTE;

  return {
    showPrescriptionOnInvoice: resolveToggle(
      "showPrescriptionOnInvoice",
      "print_show_prescription_invoice",
      "showPrescriptionOnInvoice",
      false
    ),
    showPrescriptionOnBooking: resolveToggle(
      "showPrescriptionOnBooking",
      "print_show_prescription_booking",
      "showPrescriptionOnBooking",
      true
    ),
    printRxShowEyewearDetails: resolveToggle(
      "printRxShowEyewearDetails",
      "print_rx_show_eyewear_details",
      null,
      true
    ),
    printRxShowMedicalHistory: resolveToggle(
      "printRxShowMedicalHistory",
      "print_rx_show_medical_history",
      null,
      true
    ),
    printRxShowDoctorSignature: resolveToggle(
      "printRxShowDoctorSignature",
      "print_rx_show_doctor_signature",
      null,
      true
    ),
    printRxShowGstin: resolveToggle(
      "printRxShowGstin",
      "print_rx_show_gstin",
      null,
      false
    ),
    prescriptionAdvisoryNote: advisoryNote,
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
