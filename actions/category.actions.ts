"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/services/auth.service";
import {
  getOrganizationCategories,
  saveCategoryGstRates,
  createCustomCategory,
  deleteCustomCategory,
  CategoryItem,
} from "@/services/category.service";

export interface CategoryActionResult {
  success: boolean;
  message?: string;
  data?: any;
  errors?: Record<string, string[]>;
}

/**
 * Fetch all categories for the authenticated user's organization.
 */
export async function getOrganizationCategoriesAction(): Promise<{
  success: boolean;
  categories: CategoryItem[];
  error?: string;
}> {
  try {
    const user = await getCurrentUser();
    if (!user || !user.organizationId) {
      return { success: false, categories: [], error: "Unauthorized session." };
    }

    const categories = await getOrganizationCategories(user.organizationId);
    return { success: true, categories };
  } catch (err: any) {
    console.error("[getOrganizationCategoriesAction] Error:", err);
    return { success: false, categories: [], error: err.message || "Failed to load categories." };
  }
}

/**
 * Save GST rates and HSN codes for all categories.
 */
export async function saveCategoryGstRatesAction(
  categoriesData: Array<{
    id: string;
    name?: string;
    hsnCode?: string | null;
    cgstPercent: number | string;
    sgstPercent: number | string;
    igstPercent: number | string;
  }>
): Promise<CategoryActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user || !user.organizationId) {
      return { success: false, message: "Unauthorized or missing organization context." };
    }

    if (!Array.isArray(categoriesData) || categoriesData.length === 0) {
      return { success: false, message: "No category rate data provided." };
    }

    await saveCategoryGstRates(user.organizationId, categoriesData);

    revalidatePath("/shop/settings");
    revalidatePath("/owner/settings");
    revalidatePath("/shop/inventory/add");
    revalidatePath("/shop/inventory");

    return {
      success: true,
      message: "Category GST rates updated successfully.",
    };
  } catch (err: any) {
    console.error("[saveCategoryGstRatesAction] Error:", err);
    return {
      success: false,
      message: err.message || "Failed to save category GST rates.",
    };
  }
}

/**
 * Create a new custom product category.
 */
export async function createCategoryAction(
  prevState: any,
  formData: FormData | {
    name: string;
    code?: string;
    hsnCode?: string;
    cgstPercent: number | string;
    sgstPercent: number | string;
    igstPercent: number | string;
  }
): Promise<CategoryActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user || !user.organizationId) {
      return { success: false, message: "Unauthorized or missing organization context." };
    }

    const raw = formData instanceof FormData
      ? Object.fromEntries(formData.entries())
      : formData;

    const name = String(raw.name || "").trim();
    if (!name) {
      return {
        success: false,
        message: "Category name is required.",
        errors: { name: ["Category name is required."] },
      };
    }

    const hsnCode = raw.hsnCode ? String(raw.hsnCode).trim() : undefined;
    const cgstPercent = raw.cgstPercent !== undefined && raw.cgstPercent !== "" ? Number(raw.cgstPercent) : 6.0;
    const sgstPercent = raw.sgstPercent !== undefined && raw.sgstPercent !== "" ? Number(raw.sgstPercent) : 6.0;
    const igstPercent = raw.igstPercent !== undefined && raw.igstPercent !== "" ? Number(raw.igstPercent) : 12.0;

    const newCategory = await createCustomCategory(user.organizationId, {
      name,
      code: raw.code ? String(raw.code).trim() : undefined,
      hsnCode,
      cgstPercent,
      sgstPercent,
      igstPercent,
    });

    revalidatePath("/shop/settings");
    revalidatePath("/owner/settings");
    revalidatePath("/shop/inventory/add");
    revalidatePath("/shop/inventory");

    return {
      success: true,
      message: `Category "${newCategory.name}" created successfully.`,
      data: newCategory,
    };
  } catch (err: any) {
    console.error("[createCategoryAction] Error:", err);
    return {
      success: false,
      message: err.message || "Failed to create category.",
    };
  }
}

/**
 * Delete a custom product category.
 */
export async function deleteCategoryAction(
  categoryId: string
): Promise<CategoryActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user || !user.organizationId) {
      return { success: false, message: "Unauthorized session." };
    }

    await deleteCustomCategory(user.organizationId, categoryId);

    revalidatePath("/shop/settings");
    revalidatePath("/owner/settings");
    revalidatePath("/shop/inventory/add");
    revalidatePath("/shop/inventory");

    return {
      success: true,
      message: "Custom category removed successfully.",
    };
  } catch (err: any) {
    console.error("[deleteCategoryAction] Error:", err);
    return {
      success: false,
      message: err.message || "Failed to delete category.",
    };
  }
}
