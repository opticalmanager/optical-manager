"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/services/auth.service";
import { updateShop, getShopById } from "@/services/shop.service";
import { db } from "@/lib/drizzle";
import { profiles } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import type { FormState } from "@/utils/validators";
import * as z from "zod";

// Zod schema for Shop Profile & Compliance
const shopProfileSchema = z.object({
  name: z.string().min(2, "Shop name must be at least 2 characters.").trim(),
  phone: z.string().optional().or(z.literal("")),
  email: z.string().email("Please enter a valid email.").optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  
  // Compliance
  gstin: z.string().optional().or(z.literal("")),
  cin: z.string().optional().or(z.literal("")),
  msmeUdyam: z.string().optional().or(z.literal("")),
  
  // Banking
  bankName: z.string().optional().or(z.literal("")),
  bankBranch: z.string().optional().or(z.literal("")),
  bankAccountNumber: z.string().optional().or(z.literal("")),
  bankIfsc: z.string().optional().or(z.literal("")),
});

/**
 * Server Action: Update Shop Profile, Compliance, and Bank coordinates.
 */
export async function updateShopProfileAction(
  shopId: string,
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) {
    return { success: false, message: "Unauthorized." };
  }

  // Ensure user has access to this shop
  if (user.role === "SHOP_MANAGER" && user.shopId !== shopId) {
    return { success: false, message: "Access denied." };
  }

  const validatedFields = shopProfileSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    address: formData.get("address"),
    gstin: formData.get("gstin"),
    cin: formData.get("cin"),
    msmeUdyam: formData.get("msmeUdyam"),
    bankName: formData.get("bankName"),
    bankBranch: formData.get("bankBranch"),
    bankAccountNumber: formData.get("bankAccountNumber"),
    bankIfsc: formData.get("bankIfsc"),
  });

  if (!validatedFields.success) {
    return {
      success: false,
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    await updateShop(shopId, user.organizationId, validatedFields.data);
    revalidatePath("/shop/settings");
    return { success: true, message: "Store profile updated successfully." };
  } catch (error: any) {
    console.error("[updateShopProfileAction] error:", error);
    return { success: false, message: "Failed to update store profile." };
  }
}

/**
 * Server Action: Update flexible JSONB settings config.
 */
export async function updateShopSettingsConfigAction(
  shopId: string,
  newSettings: any
): Promise<{ success: boolean; message: string }> {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) {
    return { success: false, message: "Unauthorized." };
  }

  // Ensure user has access
  if (user.role === "SHOP_MANAGER" && user.shopId !== shopId) {
    return { success: false, message: "Access denied." };
  }

  try {
    const shop = await getShopById(shopId, user.organizationId);
    if (!shop) {
      return { success: false, message: "Shop not found." };
    }

    const currentSettings = shop.settings || {};
    const mergedSettings = { ...currentSettings, ...newSettings };

    await updateShop(shopId, user.organizationId, {
      settings: mergedSettings,
    });

    revalidatePath("/shop/settings");
    return { success: true, message: "Settings updated successfully." };
  } catch (error: any) {
    console.error("[updateShopSettingsConfigAction] error:", error);
    return { success: false, message: "Failed to save settings." };
  }
}

/**
 * Server Action: Add a new staff member or update their role.
 */
export async function toggleStaffActiveAction(
  profileId: string,
  isActive: boolean
): Promise<{ success: boolean; message: string }> {
  const user = await getCurrentUser();
  if (!user || user.role !== "OWNER" || !user.organizationId) {
    return { success: false, message: "Only owners can manage staff status." };
  }

  try {
    await db
      .update(profiles)
      .set({ isActive, updatedAt: new Date() })
      .where(
        and(
          eq(profiles.id, profileId),
          eq(profiles.organizationId, user.organizationId)
        )
      );

    revalidatePath("/shop/settings");
    return { success: true, message: `Staff status updated successfully.` };
  } catch (error: any) {
    console.error("[toggleStaffActiveAction] error:", error);
    return { success: false, message: "Failed to update staff status." };
  }
}

/**
 * Server Action: Get Shop settings config (for client components).
 */
export async function getShopSettingsAction(): Promise<{ success: boolean; data?: any; message?: string }> {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) {
    return { success: false, message: "Unauthorized." };
  }
  if (!user.shopId) {
    return { success: false, message: "No active shop assigned." };
  }

  try {
    const shop = await getShopById(user.shopId, user.organizationId);
    if (!shop) {
      return { success: false, message: "Shop not found." };
    }
    return { success: true, data: { name: shop.name, phone: shop.phone, settings: shop.settings } };
  } catch (error: any) {
    console.error("[getShopSettingsAction] error:", error);
    return { success: false, message: "Failed to retrieve settings." };
  }
}
