"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/services/auth.service";
import { createShop, updateShop } from "@/services/shop.service";
import { createShopSchema, type FormState } from "@/utils/validators";

/**
 * Server Action: Create a new shop.
 */
export async function createShopAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user || user.role !== "OWNER" || !user.organizationId) {
    return { success: false, message: "Unauthorized." };
  }

  const validatedFields = createShopSchema.safeParse({
    name: formData.get("name"),
    address: formData.get("address"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    gstNumber: formData.get("gstNumber"),
  });

  if (!validatedFields.success) {
    return {
      success: false,
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    await createShop({
      ...validatedFields.data,
      organizationId: user.organizationId,
    });

    revalidatePath("/owner/shops");
    return { success: true, message: "Shop created successfully." };
  } catch (error) {
    return { success: false, message: "Failed to create shop." };
  }
}

/**
 * Server Action: Update an existing shop.
 */
export async function updateShopAction(
  shopId: string,
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user || user.role !== "OWNER" || !user.organizationId) {
    return { success: false, message: "Unauthorized." };
  }

  const validatedFields = createShopSchema.safeParse({
    name: formData.get("name"),
    address: formData.get("address"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    gstNumber: formData.get("gstNumber"),
  });

  if (!validatedFields.success) {
    return {
      success: false,
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    await updateShop(shopId, user.organizationId, validatedFields.data);
    revalidatePath("/owner/shops");
    return { success: true, message: "Shop updated successfully." };
  } catch (error) {
    return { success: false, message: "Failed to update shop." };
  }
}

/**
 * Server Action: Update invoice & billing settings for a shop.
 * Saves compliance identifiers, bank details, and toggle preferences.
 */
export async function updateShopInvoiceSettingsAction(
  shopId: string,
  data: {
    gstin?: string;
    cin?: string;
    msmeUdyam?: string;
    bankName?: string;
    bankBranch?: string;
    bankAccountNumber?: string;
    bankIfsc?: string;
    enableBankDetails?: boolean;
    enableTerms?: boolean;
    invoiceTermsNotes?: string;
  }
): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user || user.role !== "OWNER" || !user.organizationId) {
    return { success: false, message: "Unauthorized." };
  }

  try {
    // Separate top-level columns from JSONB settings
    const { enableBankDetails, enableTerms, invoiceTermsNotes, ...columnFields } = data;

    // Build the partial update payload with direct columns
    const updatePayload: Record<string, any> = {};
    if (columnFields.gstin !== undefined) updatePayload.gstin = columnFields.gstin.trim() || null;
    if (columnFields.cin !== undefined) updatePayload.cin = columnFields.cin.trim() || null;
    if (columnFields.msmeUdyam !== undefined) updatePayload.msmeUdyam = columnFields.msmeUdyam.trim() || null;
    if (columnFields.bankName !== undefined) updatePayload.bankName = columnFields.bankName.trim() || null;
    if (columnFields.bankBranch !== undefined) updatePayload.bankBranch = columnFields.bankBranch.trim() || null;
    if (columnFields.bankAccountNumber !== undefined) updatePayload.bankAccountNumber = columnFields.bankAccountNumber.trim() || null;
    if (columnFields.bankIfsc !== undefined) updatePayload.bankIfsc = columnFields.bankIfsc.trim().toUpperCase() || null;

    // Fetch existing shop to merge JSONB settings
    const { getShopById } = await import("@/services/shop.service");
    const existingShop = await getShopById(shopId, user.organizationId);
    if (!existingShop) {
      return { success: false, message: "Shop not found." };
    }

    const existingSettings = (existingShop.settings as Record<string, any>) || {};
    const updatedSettings = {
      ...existingSettings,
      enableBankDetails: enableBankDetails ?? existingSettings.enableBankDetails ?? false,
      enableTerms: enableTerms ?? existingSettings.enableTerms ?? true,
      invoiceTermsNotes: invoiceTermsNotes ?? existingSettings.invoiceTermsNotes ?? "",
    };

    updatePayload.settings = updatedSettings;

    await updateShop(shopId, user.organizationId, updatePayload);
    revalidatePath("/owner/settings");
    revalidatePath("/owner/shops");
    return { success: true, message: "Invoice & billing settings saved successfully." };
  } catch (error) {
    console.error("[updateShopInvoiceSettingsAction] error:", error);
    return { success: false, message: "Failed to save invoice settings." };
  }
}
