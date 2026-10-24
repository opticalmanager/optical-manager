"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/services/auth.service";
import {
  getVendorsWithStats,
  getVendorKPIs,
  getVendorById,
  getVendorDetailWithAnalytics,
  deleteVendorSafe,
  createVendor,
  updateVendor,
  toggleVendorActive,
  type GetVendorsOptions,
  type VendorWithStats,
  type VendorKPIs,
} from "@/services/vendor.service";
import { vendorCategories } from "@/db/schema";
import type { Vendor } from "@/types";

// Strict Indian GSTIN Regex: 2 digit state code + 10 char PAN + 1 entity num + 'Z' + 1 checksum char
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i;
// Strict Indian 10-digit mobile number
const PHONE_REGEX = /^[6-9]\d{9}$/;
// Indian 6-digit Pincode
const PINCODE_REGEX = /^\d{6}$/;

export const vendorInputSchema = z.object({
  name: z.string().trim().min(2, "Vendor name must be at least 2 characters").max(255),
  category: z.enum(vendorCategories).default("GENERAL"),
  contactPerson: z.string().trim().max(255).optional().nullable(),
  phone: z
    .string()
    .trim()
    .refine(
      (val) => !val || PHONE_REGEX.test(val.replace(/\D/g, "")),
      "Phone must be a valid 10-digit Indian mobile number"
    )
    .optional()
    .nullable(),
  email: z
    .string()
    .trim()
    .email("Please enter a valid email address")
    .optional()
    .nullable()
    .or(z.literal("")),
  gstin: z
    .string()
    .trim()
    .refine((val) => !val || val.length === 15, "GSTIN must be exactly 15 characters")
    .refine((val) => !val || GSTIN_REGEX.test(val), "Invalid GSTIN format (e.g. 07AAAAA0000A1Z5)")
    .optional()
    .nullable()
    .or(z.literal("")),
  panNumber: z.string().trim().max(20).optional().nullable(),
  address: z.string().trim().optional().nullable(),
  city: z.string().trim().max(100).optional().nullable(),
  state: z.string().trim().max(100).optional().nullable(),
  pincode: z
    .string()
    .trim()
    .refine((val) => !val || PINCODE_REGEX.test(val), "Pincode must be 6 digits")
    .optional()
    .nullable()
    .or(z.literal("")),
  creditPeriodDays: z.coerce
    .number()
    .min(0, "Credit days cannot be negative")
    .max(365)
    .optional()
    .nullable(),
  notes: z.string().trim().optional().nullable(),
  isActive: z.boolean().default(true),
});

export type VendorFormValues = z.infer<typeof vendorInputSchema>;

/**
 * Server action to fetch paginated/filtered vendors with purchase stats.
 */
export async function getVendorsAction(options?: GetVendorsOptions) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.shopId || !user.organizationId) {
      return { success: false, message: "Unauthorized or missing shop session.", vendors: [], totalCount: 0 };
    }

    if (user.permissions && user.permissions.purchases === false) {
      return { success: false, message: "Unauthorized access to vendors directory.", vendors: [], totalCount: 0 };
    }

    const result = await getVendorsWithStats(user.shopId, user.organizationId, options);
    return {
      success: true,
      vendors: result.vendors,
      totalCount: result.totalCount,
    };
  } catch (error: any) {
    console.error("Error fetching vendors:", error);
    return {
      success: false,
      message: error?.message || "Failed to load vendors.",
      vendors: [],
      totalCount: 0,
    };
  }
}

/**
 * Server action to create a new vendor with validation.
 */
export async function createVendorAction(data: VendorFormValues) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.shopId || !user.organizationId) {
      return { success: false, message: "Unauthorized or missing shop session." };
    }

    if (user.permissions && user.permissions.purchases === false) {
      return { success: false, message: "Unauthorized to add vendors." };
    }

    const validated = vendorInputSchema.safeParse(data);
    if (!validated.success) {
      const firstError = validated.error.issues[0]?.message || "Invalid vendor details";
      return { success: false, message: firstError };
    }

    // Auto-extract PAN from GSTIN if not manually entered
    let derivedPan = validated.data.panNumber;
    if (!derivedPan && validated.data.gstin && validated.data.gstin.length >= 12) {
      derivedPan = validated.data.gstin.substring(2, 12).toUpperCase();
    }

    // Format clean 10-digit phone
    const cleanPhone = validated.data.phone ? validated.data.phone.replace(/\D/g, "") : null;

    const vendor = await createVendor({
      shopId: user.shopId,
      organizationId: user.organizationId,
      name: validated.data.name.trim(),
      category: validated.data.category,
      contactPerson: validated.data.contactPerson?.trim() || null,
      phone: cleanPhone || null,
      email: validated.data.email?.trim() || null,
      gstin: validated.data.gstin?.toUpperCase().trim() || null,
      panNumber: derivedPan?.trim() || null,
      address: validated.data.address?.trim() || null,
      city: validated.data.city?.trim() || null,
      state: validated.data.state?.trim() || null,
      pincode: validated.data.pincode?.trim() || null,
      creditPeriodDays:
        validated.data.creditPeriodDays && validated.data.creditPeriodDays > 0
          ? validated.data.creditPeriodDays
          : null,
      notes: validated.data.notes?.trim() || null,
      isActive: validated.data.isActive ?? true,
    });

    revalidatePath("/shop/purchases/vendors");
    revalidatePath("/shop/purchases/new");
    revalidatePath("/shop/purchases");

    return {
      success: true,
      message: `Vendor "${vendor.name}" registered successfully.`,
      vendor,
    };
  } catch (error: any) {
    console.error("Error creating vendor:", error);
    if (error?.code === "23505") {
      return {
        success: false,
        message: "A vendor with this name already exists in your organization.",
      };
    }
    return {
      success: false,
      message: error?.message || "Failed to create vendor.",
    };
  }
}

/**
 * Server action to update an existing vendor.
 */
export async function updateVendorAction(id: string, data: Partial<VendorFormValues>) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.shopId || !user.organizationId) {
      return { success: false, message: "Unauthorized or missing shop session." };
    }

    if (user.permissions && user.permissions.purchases === false) {
      return { success: false, message: "Unauthorized to update vendors." };
    }

    // Auto-extract PAN from GSTIN if applicable
    let derivedPan = data.panNumber;
    if (!derivedPan && data.gstin && data.gstin.length >= 12) {
      derivedPan = data.gstin.substring(2, 12).toUpperCase();
    }

    const cleanPhone = data.phone ? data.phone.replace(/\D/g, "") : data.phone;

    const vendor = await updateVendor(id, user.organizationId, {
      ...data,
      name: data.name ? data.name.trim() : undefined,
      contactPerson: data.contactPerson !== undefined ? (data.contactPerson?.trim() || null) : undefined,
      phone: cleanPhone !== undefined ? (cleanPhone || null) : undefined,
      email: data.email !== undefined ? (data.email?.trim() || null) : undefined,
      gstin: data.gstin !== undefined ? (data.gstin?.toUpperCase().trim() || null) : undefined,
      panNumber: derivedPan !== undefined ? (derivedPan?.trim() || null) : undefined,
      address: data.address !== undefined ? (data.address?.trim() || null) : undefined,
      city: data.city !== undefined ? (data.city?.trim() || null) : undefined,
      state: data.state !== undefined ? (data.state?.trim() || null) : undefined,
      pincode: data.pincode !== undefined ? (data.pincode?.trim() || null) : undefined,
      creditPeriodDays:
        data.creditPeriodDays !== undefined
          ? data.creditPeriodDays && data.creditPeriodDays > 0
            ? data.creditPeriodDays
            : null
          : undefined,
      notes: data.notes !== undefined ? (data.notes?.trim() || null) : undefined,
    });

    if (!vendor) {
      return { success: false, message: "Vendor not found or not in your organization." };
    }

    revalidatePath("/shop/purchases/vendors");
    revalidatePath(`/shop/purchases/vendors/${id}`);
    revalidatePath("/shop/purchases/new");
    revalidatePath("/shop/purchases");

    return {
      success: true,
      message: `Vendor "${vendor.name}" updated successfully.`,
      vendor,
    };
  } catch (error: any) {
    console.error("Error updating vendor:", error);
    if (error?.code === "23505") {
      return {
        success: false,
        message: "Another vendor with this name already exists.",
      };
    }
    return {
      success: false,
      message: error?.message || "Failed to update vendor.",
    };
  }
}

/**
 * Server action to toggle vendor active/inactive status.
 */
export async function toggleVendorStatusAction(id: string, isActive: boolean) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.shopId || !user.organizationId) {
      return { success: false, message: "Unauthorized or missing shop session." };
    }

    if (user.permissions && user.permissions.purchases === false) {
      return { success: false, message: "Unauthorized to modify vendor status." };
    }

    const vendor = await toggleVendorActive(id, user.organizationId, isActive);

    revalidatePath("/shop/purchases/vendors");
    revalidatePath("/shop/purchases/new");

    return {
      success: true,
      message: `Vendor is now ${isActive ? "Active" : "Archived / Inactive"}.`,
      vendor,
    };
  } catch (error: any) {
    console.error("Error toggling vendor status:", error);
    return {
      success: false,
      message: error?.message || "Failed to update vendor status.",
    };
  }
}

/**
 * Server action to safely delete or archive a vendor.
 * If vendor has purchase orders, deletion is prevented to protect inventory and tax records.
 */
export async function deleteVendorAction(vendorId: string) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.shopId || !user.organizationId) {
      return { success: false, canDelete: false, message: "Unauthorized or missing shop session." };
    }

    if (user.permissions && user.permissions.purchases === false) {
      return { success: false, canDelete: false, message: "Unauthorized to delete vendors." };
    }

    const result = await deleteVendorSafe(vendorId, user.organizationId);

    if (result.success) {
      revalidatePath("/shop/purchases/vendors");
      revalidatePath("/shop/purchases/new");
      revalidatePath("/shop/purchases");
    }

    return result;
  } catch (error: any) {
    console.error("Error deleting vendor:", error);
    return {
      success: false,
      canDelete: false,
      orderCount: 0,
      message: error?.message || "Failed to delete vendor.",
    };
  }
}

/**
 * Server action to fetch comprehensive vendor details, analytics, and full purchase history.
 */
export async function getVendorDetailAction(vendorId: string) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.shopId || !user.organizationId) {
      return { success: false, message: "Unauthorized or missing session." };
    }

    if (user.permissions && user.permissions.purchases === false) {
      return { success: false, message: "Unauthorized to view vendor details." };
    }

    const data = await getVendorDetailWithAnalytics(vendorId, user.organizationId);
    if (!data) {
      return { success: false, message: "Vendor not found." };
    }

    return {
      success: true,
      data,
    };
  } catch (error: any) {
    console.error("Error fetching vendor detail:", error);
    return {
      success: false,
      message: error?.message || "Failed to fetch vendor detail.",
    };
  }
}
