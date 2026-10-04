"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/services/auth.service";
import {
  getCustomizationSettings,
  updateCustomizationSettings,
  type CustomizationConfig,
} from "@/services/customization.service";

/**
 * Server Action: Save Customization settings for Organization or specific Shop.
 */
export async function saveCustomizationSettingsAction(data: {
  shopId?: string | null;
  config: Partial<CustomizationConfig>;
}): Promise<{ success: boolean; message: string }> {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "OWNER" || !user.organizationId) {
      return { success: false, message: "Unauthorized. Only store owners can configure customization settings." };
    }

    const result = await updateCustomizationSettings(
      user.organizationId,
      data.shopId || null,
      data.config
    );

    if (result.success) {
      revalidatePath("/owner/settings");
      revalidatePath("/owner/settings/customization");
      revalidatePath("/shop/dashboard");
      revalidatePath("/shop/invoices");
      revalidatePath("/shop/inventory");
    }

    return result;
  } catch (error: any) {
    console.error("saveCustomizationSettingsAction error:", error);
    return { success: false, message: error?.message || "Failed to save customization settings." };
  }
}

/**
 * Server Action: Fetch Customization settings for Organization or specific Shop.
 */
export async function getCustomizationSettingsAction(
  shopId?: string | null
): Promise<{ success: boolean; data?: CustomizationConfig; message?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user || !user.organizationId) {
      return { success: false, message: "Unauthorized." };
    }

    const config = await getCustomizationSettings(user.organizationId, shopId);
    return { success: true, data: config };
  } catch (error: any) {
    console.error("getCustomizationSettingsAction error:", error);
    return { success: false, message: error?.message || "Failed to fetch customization settings." };
  }
}
