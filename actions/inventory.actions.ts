"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/services/auth.service";
import { frameItemSchema, editFrameItemSchema, FormState } from "@/utils/validators";
import { db } from "@/lib/drizzle";
import { inventory, frameDetails } from "@/db/schema";
import { getNextSkuSequence } from "@/services/sku.service";
import { generateSKU } from "@/lib/utils";
import { deleteProductImage } from "@/lib/supabase/storage";
import { eq, and, sql } from "drizzle-orm";

/**
 * Creates a new Frame inventory item along with its specific frame details.
 * Performed within an atomic transaction.
 */
export async function createFrameItemAction(
  prevState: FormState,
  formData: FormData | any
): Promise<FormState> {
  try {
    const user = await getCurrentUser();
    if (!user || !user.shopId || !user.organizationId) {
      return { success: false, message: "Unauthorized or missing session details." };
    }

    // Support both direct object pass or standard FormData
    const rawData = formData instanceof FormData 
      ? Object.fromEntries(formData.entries())
      : formData;

    // Validate request fields
    const validatedFields = frameItemSchema.safeParse(rawData);
    if (!validatedFields.success) {
      const fieldErrors: Record<string, string[]> = {};
      validatedFields.error.errors.forEach((err) => {
        const path = err.path.join(".");
        if (!fieldErrors[path]) fieldErrors[path] = [];
        fieldErrors[path].push(err.message);
      });
      return {
        success: false,
        message: "Validation failed. Please check the inputs.",
        errors: fieldErrors,
      };
    }

    const data = validatedFields.data;

    // Get sequential index and generate smart SKU
    const seq = await getNextSkuSequence(user.shopId);
    const skuCode = generateSKU({
      category: "FRAME",
      brand: data.brand,
      modelNumber: data.modelNumber,
      colorCode: data.colorCode,
      sequentialNumber: seq,
    });

    // Execute atomic transaction
    await db.transaction(async (tx) => {
      // 1. Create base inventory item record
      const [newInv] = await tx
        .insert(inventory)
        .values({
          shopId: user.shopId!,
          organizationId: user.organizationId,
          name: data.name,
          category: "FRAME",
          brand: data.brand || null,
          model: data.modelNumber || null,
          sku: skuCode,
          price: data.price.toString(),
          costPrice: data.costPrice ? data.costPrice.toString() : "0.00",
          quantity: data.quantity,
          minQuantity: data.minQuantity,
          isActive: true,
          
          // Shared additions
          imageUrl: data.imageUrl || null,
          hsnCode: data.hsnCode || null,
          cgstPercent: data.cgstPercent.toString(),
          sgstPercent: data.sgstPercent.toString(),
          igstPercent: data.igstPercent.toString(),
          vendorName: data.vendorName || null,
          rackLocation: data.rackLocation || null,
          requiresExpiryTracking: data.requiresExpiryTracking,
          batchNumber: data.requiresExpiryTracking ? (data.batchNumber || null) : null,
          expiryDate: data.requiresExpiryTracking ? (data.expiryDate || null) : null,
        })
        .returning();

      // 2. Create detailed frame parameters mapping
      await tx.insert(frameDetails).values({
        inventoryId: newInv.id,
        modelNumber: data.modelNumber || null,
        colorCode: data.colorCode || null,
        size: data.size || null,
        material: data.material || null,
        frameShape: data.frameShape || null,
        targetDemographic: data.targetDemographic || null,
      });
    });

    revalidatePath("/shop/inventory");
    return { success: true, message: "Frame item record saved successfully." };
  } catch (error: any) {
    console.error("Error creating frame inventory item:", error);
    return {
      success: false,
      message: error.message || "An unexpected error occurred while saving.",
    };
  }
}

/**
 * Updates an existing Frame inventory item record.
 */
export async function updateFrameItemAction(
  itemId: string,
  prevState: FormState,
  formData: FormData | any
): Promise<FormState> {
  try {
    const user = await getCurrentUser();
    if (!user || !user.organizationId) {
      return { success: false, message: "Unauthorized or missing session details." };
    }

    // Support both direct object pass or standard FormData
    const rawData = formData instanceof FormData 
      ? Object.fromEntries(formData.entries())
      : formData;

    const validatedFields = editFrameItemSchema.safeParse(rawData);
    if (!validatedFields.success) {
      const fieldErrors: Record<string, string[]> = {};
      validatedFields.error.errors.forEach((err) => {
        const path = err.path.join(".");
        if (!fieldErrors[path]) fieldErrors[path] = [];
        fieldErrors[path].push(err.message);
      });
      return {
        success: false,
        message: "Validation failed. Please check the inputs.",
        errors: fieldErrors,
      };
    }

    const data = validatedFields.data;

    // Check if item exists and belongs to the organization
    const [existing] = await db
      .select({ id: inventory.id })
      .from(inventory)
      .where(
        and(
          eq(inventory.id, itemId),
          eq(inventory.organizationId, user.organizationId)
        )
      )
      .limit(1);

    if (!existing) {
      return { success: false, message: "Item not found or unauthorized access." };
    }

    // Execute atomic transaction to update base and child tables
    await db.transaction(async (tx) => {
      // 1. Update base inventory
      await tx
        .update(inventory)
        .set({
          name: data.name,
          brand: data.brand || null,
          model: data.modelNumber || null,
          price: data.price.toString(),
          costPrice: data.costPrice ? data.costPrice.toString() : "0.00",
          // Increment stock atomically
          quantity: sql`${inventory.quantity} + ${data.addStockQuantity}`,
          minQuantity: data.minQuantity,
          imageUrl: data.imageUrl || null,
          hsnCode: data.hsnCode || null,
          cgstPercent: data.cgstPercent.toString(),
          sgstPercent: data.sgstPercent.toString(),
          igstPercent: data.igstPercent.toString(),
          vendorName: data.vendorName || null,
          rackLocation: data.rackLocation || null,
          requiresExpiryTracking: data.requiresExpiryTracking,
          batchNumber: data.requiresExpiryTracking ? (data.batchNumber || null) : null,
          expiryDate: data.requiresExpiryTracking ? (data.expiryDate || null) : null,
          updatedAt: new Date(),
        })
        .where(eq(inventory.id, itemId));

      // 2. Update frame specific details
      await tx
        .update(frameDetails)
        .set({
          modelNumber: data.modelNumber || null,
          colorCode: data.colorCode || null,
          size: data.size || null,
          material: data.material || null,
          frameShape: data.frameShape || null,
          targetDemographic: data.targetDemographic || null,
          updatedAt: new Date(),
        })
        .where(eq(frameDetails.inventoryId, itemId));
    });

    revalidatePath("/shop/inventory");
    return { success: true, message: "Frame item record updated successfully." };
  } catch (error: any) {
    console.error("Error updating frame inventory item:", error);
    return {
      success: false,
      message: error.message || "An unexpected error occurred while saving updates.",
    };
  }
}

/**
 * Deletes an inventory item and cleans up its assets from storage if present.
 */
export async function deleteInventoryItemAction(itemId: string): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const user = await getCurrentUser();
    if (!user || !user.organizationId) {
      return { success: false, message: "Unauthorized request." };
    }

    // Verify ownership and fetch image URL
    const [item] = await db
      .select({ imageUrl: inventory.imageUrl })
      .from(inventory)
      .where(
        and(
          eq(inventory.id, itemId),
          eq(inventory.organizationId, user.organizationId)
        )
      )
      .limit(1);

    if (!item) {
      return { success: false, message: "Item not found or unauthorized access." };
    }

    // Cleanup Supabase Storage file
    if (item.imageUrl) {
      await deleteProductImage(item.imageUrl);
    }

    // Delete base item (cascade triggers deletion on frame_details)
    await db.delete(inventory).where(eq(inventory.id, itemId));

    revalidatePath("/shop/inventory");
    return { success: true, message: "Item deleted successfully." };
  } catch (error: any) {
    console.error("Error deleting inventory item:", error);
    return {
      success: false,
      message: error.message || "Failed to delete item from inventory.",
    };
  }
}
