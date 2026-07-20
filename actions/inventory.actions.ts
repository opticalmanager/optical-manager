"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/services/auth.service";
import {
  frameItemSchema,
  editFrameItemSchema,
  lensItemSchema,
  editLensItemSchema,
  contactLensItemSchema,
  editContactLensItemSchema,
  accessoryItemSchema,
  editAccessoryItemSchema,
  FormState
} from "@/utils/validators";
import { db } from "@/lib/drizzle";
import { inventory, frameDetails, lensDetails, contactLensDetails, accessoryDetails } from "@/db/schema";
import { getNextSkuSequence } from "@/services/sku.service";
import { generateSKU } from "@/lib/utils";
import { deleteProductImage } from "@/lib/supabase/storage";
import { eq, and, sql } from "drizzle-orm";
import { recordStockMovement } from "@/services/inventory.service";


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
          organizationId: user.organizationId!,
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
          purchaseInvoiceNo: data.purchaseInvoiceNo || null,
          inwardDate: data.inwardDate || null,
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

      // 3. Log initial stock movement
      await recordStockMovement({
        inventoryId: newInv.id,
        shopId: user.shopId!,
        organizationId: user.organizationId!,
        movementType: "INITIAL",
        quantityChange: data.quantity,
        balanceAfter: data.quantity,
        referenceType: "INITIAL_STOCK",
        referenceNumber: data.purchaseInvoiceNo || "Initial stock",
        vendorParty: data.vendorName || null,
        costPriceAtTime: data.costPrice ? data.costPrice.toString() : "0.00",
        notes: "Initial inventory setup.",
        performedBy: user.id,
      }, tx);
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
      const [updatedInv] = await tx
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
          purchaseInvoiceNo: data.purchaseInvoiceNo || null,
          inwardDate: data.inwardDate || null,
          updatedAt: new Date(),
        })
        .where(eq(inventory.id, itemId))
        .returning();

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

      // 3. Log stock movement if quantity was added
      if (data.addStockQuantity > 0 && updatedInv) {
        await recordStockMovement({
          inventoryId: updatedInv.id,
          shopId: updatedInv.shopId,
          organizationId: updatedInv.organizationId,
          movementType: "STOCK_IN",
          quantityChange: data.addStockQuantity,
          balanceAfter: updatedInv.quantity,
          referenceType: "PURCHASE_INVOICE",
          referenceNumber: data.purchaseInvoiceNo || null,
          vendorParty: data.vendorName || null,
          costPriceAtTime: data.costPrice ? data.costPrice.toString() : "0.00",
          notes: "Stock added via edit form.",
          performedBy: user.id,
        }, tx);
      }
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

/**
 * Creates a new Lens inventory item along with its specific lens details.
 */
export async function createLensItemAction(
  prevState: FormState,
  formData: FormData | any
): Promise<FormState> {
  try {
    const user = await getCurrentUser();
    if (!user || !user.shopId || !user.organizationId) {
      return { success: false, message: "Unauthorized or missing session details." };
    }

    const rawData = formData instanceof FormData 
      ? Object.fromEntries(formData.entries())
      : formData;

    const booleanFields = [
      "requiresExpiryTracking",
      "isUncoated",
      "isAntiReflective",
      "isBlueControl",
      "isTinted",
      "isPolarized",
      "isHardCoat",
      "isPhotochromic"
    ];
    booleanFields.forEach((field) => {
      if (typeof rawData[field] === "string") {
        rawData[field] = rawData[field] === "true" || rawData[field] === "on";
      }
    });

    const validatedFields = lensItemSchema.safeParse(rawData);
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

    const seq = await getNextSkuSequence(user.shopId);
    const skuCode = generateSKU({
      category: "LENS",
      brand: data.brand,
      sequentialNumber: seq,
    });

    await db.transaction(async (tx) => {
      const [newInv] = await tx
        .insert(inventory)
        .values({
          shopId: user.shopId!,
          organizationId: user.organizationId!,
          name: data.name,
          category: "LENS",
          brand: data.brand || null,
          model: null,
          sku: skuCode,
          price: data.price.toString(),
          costPrice: data.costPrice ? data.costPrice.toString() : "0.00",
          quantity: data.quantity,
          minQuantity: data.minQuantity,
          isActive: true,
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
          purchaseInvoiceNo: data.purchaseInvoiceNo || null,
          inwardDate: data.inwardDate || null,
        })
        .returning();

      await tx.insert(lensDetails).values({
        inventoryId: newInv.id,
        design: data.design || null,
        refractiveIndex: data.refractiveIndex || null,
        material: data.material || null,
        blankDiameter: data.blankDiameter,
        stockPower: data.stockPower || null,
        isUncoated: data.isUncoated,
        isAntiReflective: data.isAntiReflective,
        isBlueControl: data.isBlueControl,
        isTinted: data.isTinted,
        isPolarized: data.isPolarized,
        isHardCoat: data.isHardCoat,
        isPhotochromic: data.isPhotochromic,
      });

      // Log initial stock movement
      await recordStockMovement({
        inventoryId: newInv.id,
        shopId: user.shopId!,
        organizationId: user.organizationId!,
        movementType: "INITIAL",
        quantityChange: data.quantity,
        balanceAfter: data.quantity,
        referenceType: "INITIAL_STOCK",
        referenceNumber: data.purchaseInvoiceNo || "Initial stock",
        vendorParty: data.vendorName || null,
        costPriceAtTime: data.costPrice ? data.costPrice.toString() : "0.00",
        notes: "Initial inventory setup.",
        performedBy: user.id,
      }, tx);
    });

    revalidatePath("/shop/inventory");
    return { success: true, message: "Lens item record saved successfully." };
  } catch (error: any) {
    console.error("Error creating lens inventory item:", error);
    return {
      success: false,
      message: error.message || "An unexpected error occurred while saving.",
    };
  }
}

/**
 * Updates an existing Lens inventory item record.
 */
export async function updateLensItemAction(
  itemId: string,
  prevState: FormState,
  formData: FormData | any
): Promise<FormState> {
  try {
    const user = await getCurrentUser();
    if (!user || !user.organizationId) {
      return { success: false, message: "Unauthorized or missing session details." };
    }

    const rawData = formData instanceof FormData 
      ? Object.fromEntries(formData.entries())
      : formData;

    const booleanFields = [
      "requiresExpiryTracking",
      "isUncoated",
      "isAntiReflective",
      "isBlueControl",
      "isTinted",
      "isPolarized",
      "isHardCoat",
      "isPhotochromic"
    ];
    booleanFields.forEach((field) => {
      if (typeof rawData[field] === "string") {
        rawData[field] = rawData[field] === "true" || rawData[field] === "on";
      }
    });

    const validatedFields = editLensItemSchema.safeParse(rawData);
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

    await db.transaction(async (tx) => {
      const [updatedInv] = await tx
        .update(inventory)
        .set({
          name: data.name,
          brand: data.brand || null,
          price: data.price.toString(),
          costPrice: data.costPrice ? data.costPrice.toString() : "0.00",
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
          purchaseInvoiceNo: data.purchaseInvoiceNo || null,
          inwardDate: data.inwardDate || null,
          updatedAt: new Date(),
        })
        .where(eq(inventory.id, itemId))
        .returning();

      await tx
        .update(lensDetails)
        .set({
          design: data.design || null,
          refractiveIndex: data.refractiveIndex || null,
          material: data.material || null,
          blankDiameter: data.blankDiameter,
          stockPower: data.stockPower || null,
          isUncoated: data.isUncoated,
          isAntiReflective: data.isAntiReflective,
          isBlueControl: data.isBlueControl,
          isTinted: data.isTinted,
          isPolarized: data.isPolarized,
          isHardCoat: data.isHardCoat,
          isPhotochromic: data.isPhotochromic,
          updatedAt: new Date(),
        })
        .where(eq(lensDetails.inventoryId, itemId));

      // Log stock movement if quantity was added
      if (data.addStockQuantity > 0 && updatedInv) {
        await recordStockMovement({
          inventoryId: updatedInv.id,
          shopId: updatedInv.shopId,
          organizationId: updatedInv.organizationId,
          movementType: "STOCK_IN",
          quantityChange: data.addStockQuantity,
          balanceAfter: updatedInv.quantity,
          referenceType: "PURCHASE_INVOICE",
          referenceNumber: data.purchaseInvoiceNo || null,
          vendorParty: data.vendorName || null,
          costPriceAtTime: data.costPrice ? data.costPrice.toString() : "0.00",
          notes: "Stock added via edit form.",
          performedBy: user.id,
        }, tx);
      }
    });

    revalidatePath("/shop/inventory");
    return { success: true, message: "Lens item record updated successfully." };
  } catch (error: any) {
    console.error("Error updating lens inventory item:", error);
    return {
      success: false,
      message: error.message || "An unexpected error occurred while saving updates.",
    };
  }
}

/**
 * Creates a new Contact Lens inventory item along with its specific details.
 */
export async function createContactLensItemAction(
  prevState: FormState,
  formData: FormData | any
): Promise<FormState> {
  try {
    const user = await getCurrentUser();
    if (!user || !user.shopId || !user.organizationId) {
      return { success: false, message: "Unauthorized or missing session details." };
    }

    const rawData = formData instanceof FormData 
      ? Object.fromEntries(formData.entries())
      : formData;

    if (typeof rawData.requiresExpiryTracking === "string") {
      rawData.requiresExpiryTracking = rawData.requiresExpiryTracking === "true" || rawData.requiresExpiryTracking === "on";
    }

    const validatedFields = contactLensItemSchema.safeParse(rawData);
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

    const seq = await getNextSkuSequence(user.shopId);
    const skuCode = generateSKU({
      category: "CONTACT_LENS",
      brand: data.brand,
      sequentialNumber: seq,
    });

    await db.transaction(async (tx) => {
      const [newInv] = await tx
        .insert(inventory)
        .values({
          shopId: user.shopId!,
          organizationId: user.organizationId!,
          name: data.name,
          category: "CONTACT_LENS",
          brand: data.brand || null,
          model: null,
          sku: skuCode,
          price: data.price.toString(),
          costPrice: data.costPrice ? data.costPrice.toString() : "0.00",
          quantity: data.quantity,
          minQuantity: data.minQuantity,
          isActive: true,
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
          purchaseInvoiceNo: data.purchaseInvoiceNo || null,
          inwardDate: data.inwardDate || null,
        })
        .returning();

      await tx.insert(contactLensDetails).values({
        inventoryId: newInv.id,
        modality: data.modality || null,
        boxQuantity: data.boxQuantity,
        baseCurve: data.baseCurve || null,
        diameter: data.diameter || null,
        color: data.color || null,
        sphere: data.sphere || null,
        cylinder: data.cylinder || null,
        axis: data.axis || null,
        addPower: data.addPower || null,
      });

      // Log initial stock movement
      await recordStockMovement({
        inventoryId: newInv.id,
        shopId: user.shopId!,
        organizationId: user.organizationId!,
        movementType: "INITIAL",
        quantityChange: data.quantity,
        balanceAfter: data.quantity,
        referenceType: "INITIAL_STOCK",
        referenceNumber: data.purchaseInvoiceNo || "Initial stock",
        vendorParty: data.vendorName || null,
        costPriceAtTime: data.costPrice ? data.costPrice.toString() : "0.00",
        notes: "Initial inventory setup.",
        performedBy: user.id,
      }, tx);
    });

    revalidatePath("/shop/inventory");
    return { success: true, message: "Contact lens item record saved successfully." };
  } catch (error: any) {
    console.error("Error creating contact lens inventory item:", error);
    return {
      success: false,
      message: error.message || "An unexpected error occurred while saving.",
    };
  }
}

/**
 * Updates an existing Contact Lens inventory item record.
 */
export async function updateContactLensItemAction(
  itemId: string,
  prevState: FormState,
  formData: FormData | any
): Promise<FormState> {
  try {
    const user = await getCurrentUser();
    if (!user || !user.organizationId) {
      return { success: false, message: "Unauthorized or missing session details." };
    }

    const rawData = formData instanceof FormData 
      ? Object.fromEntries(formData.entries())
      : formData;

    if (typeof rawData.requiresExpiryTracking === "string") {
      rawData.requiresExpiryTracking = rawData.requiresExpiryTracking === "true" || rawData.requiresExpiryTracking === "on";
    }

    const validatedFields = editContactLensItemSchema.safeParse(rawData);
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

    await db.transaction(async (tx) => {
      const [updatedInv] = await tx
        .update(inventory)
        .set({
          name: data.name,
          brand: data.brand || null,
          price: data.price.toString(),
          costPrice: data.costPrice ? data.costPrice.toString() : "0.00",
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
          purchaseInvoiceNo: data.purchaseInvoiceNo || null,
          inwardDate: data.inwardDate || null,
          updatedAt: new Date(),
        })
        .where(eq(inventory.id, itemId))
        .returning();

      await tx
        .update(contactLensDetails)
        .set({
          modality: data.modality || null,
          boxQuantity: data.boxQuantity,
          baseCurve: data.baseCurve || null,
          diameter: data.diameter || null,
          color: data.color || null,
          sphere: data.sphere || null,
          cylinder: data.cylinder || null,
          axis: data.axis || null,
          addPower: data.addPower || null,
          updatedAt: new Date(),
        })
        .where(eq(contactLensDetails.inventoryId, itemId));

      // Log stock movement if quantity was added
      if (data.addStockQuantity > 0 && updatedInv) {
        await recordStockMovement({
          inventoryId: updatedInv.id,
          shopId: updatedInv.shopId,
          organizationId: updatedInv.organizationId,
          movementType: "STOCK_IN",
          quantityChange: data.addStockQuantity,
          balanceAfter: updatedInv.quantity,
          referenceType: "PURCHASE_INVOICE",
          referenceNumber: data.purchaseInvoiceNo || null,
          vendorParty: data.vendorName || null,
          costPriceAtTime: data.costPrice ? data.costPrice.toString() : "0.00",
          notes: "Stock added via edit form.",
          performedBy: user.id,
        }, tx);
      }
    });

    revalidatePath("/shop/inventory");
    return { success: true, message: "Contact lens item record updated successfully." };
  } catch (error: any) {
    console.error("Error updating contact lens inventory item:", error);
    return {
      success: false,
      message: error.message || "An unexpected error occurred while saving updates.",
    };
  }
}

/**
 * Creates a new Accessory inventory item along with its specific details.
 */
export async function createAccessoryItemAction(
  prevState: FormState,
  formData: FormData | any
): Promise<FormState> {
  try {
    const user = await getCurrentUser();
    if (!user || !user.shopId || !user.organizationId) {
      return { success: false, message: "Unauthorized or missing session details." };
    }

    const rawData = formData instanceof FormData 
      ? Object.fromEntries(formData.entries())
      : formData;

    if (typeof rawData.requiresExpiryTracking === "string") {
      rawData.requiresExpiryTracking = rawData.requiresExpiryTracking === "true" || rawData.requiresExpiryTracking === "on";
    }

    const validatedFields = accessoryItemSchema.safeParse(rawData);
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

    const seq = await getNextSkuSequence(user.shopId);
    const skuCode = generateSKU({
      category: "ACCESSORY",
      brand: data.brand,
      sequentialNumber: seq,
    });

    await db.transaction(async (tx) => {
      const [newInv] = await tx
        .insert(inventory)
        .values({
          shopId: user.shopId!,
          organizationId: user.organizationId!,
          name: data.name,
          category: "ACCESSORY",
          brand: data.brand || null,
          model: null,
          sku: skuCode,
          price: data.price.toString(),
          costPrice: data.costPrice ? data.costPrice.toString() : "0.00",
          quantity: data.quantity,
          minQuantity: data.minQuantity,
          isActive: true,
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
          purchaseInvoiceNo: data.purchaseInvoiceNo || null,
          inwardDate: data.inwardDate || null,
        })
        .returning();

      await tx.insert(accessoryDetails).values({
        inventoryId: newInv.id,
        type: data.type,
        sizeVolume: data.sizeVolume || null,
        colorPattern: data.colorPattern || null,
      });

      // Log initial stock movement
      await recordStockMovement({
        inventoryId: newInv.id,
        shopId: user.shopId!,
        organizationId: user.organizationId!,
        movementType: "INITIAL",
        quantityChange: data.quantity,
        balanceAfter: data.quantity,
        referenceType: "INITIAL_STOCK",
        referenceNumber: data.purchaseInvoiceNo || "Initial stock",
        vendorParty: data.vendorName || null,
        costPriceAtTime: data.costPrice ? data.costPrice.toString() : "0.00",
        notes: "Initial inventory setup.",
        performedBy: user.id,
      }, tx);
    });

    revalidatePath("/shop/inventory");
    return { success: true, message: "Accessory item record saved successfully." };
  } catch (error: any) {
    console.error("Error creating accessory inventory item:", error);
    return {
      success: false,
      message: error.message || "An unexpected error occurred while saving.",
    };
  }
}

/**
 * Updates an existing Accessory inventory item record.
 */
export async function updateAccessoryItemAction(
  itemId: string,
  prevState: FormState,
  formData: FormData | any
): Promise<FormState> {
  try {
    const user = await getCurrentUser();
    if (!user || !user.organizationId) {
      return { success: false, message: "Unauthorized or missing session details." };
    }

    const rawData = formData instanceof FormData 
      ? Object.fromEntries(formData.entries())
      : formData;

    if (typeof rawData.requiresExpiryTracking === "string") {
      rawData.requiresExpiryTracking = rawData.requiresExpiryTracking === "true" || rawData.requiresExpiryTracking === "on";
    }

    const validatedFields = editAccessoryItemSchema.safeParse(rawData);
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

    await db.transaction(async (tx) => {
      const [updatedInv] = await tx
        .update(inventory)
        .set({
          name: data.name,
          brand: data.brand || null,
          price: data.price.toString(),
          costPrice: data.costPrice ? data.costPrice.toString() : "0.00",
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
          purchaseInvoiceNo: data.purchaseInvoiceNo || null,
          inwardDate: data.inwardDate || null,
          updatedAt: new Date(),
        })
        .where(eq(inventory.id, itemId))
        .returning();

      await tx
        .update(accessoryDetails)
        .set({
          type: data.type,
          sizeVolume: data.sizeVolume || null,
          colorPattern: data.colorPattern || null,
          updatedAt: new Date(),
        })
        .where(eq(accessoryDetails.inventoryId, itemId));

      // Log stock movement if quantity was added
      if (data.addStockQuantity > 0 && updatedInv) {
        await recordStockMovement({
          inventoryId: updatedInv.id,
          shopId: updatedInv.shopId,
          organizationId: updatedInv.organizationId,
          movementType: "STOCK_IN",
          quantityChange: data.addStockQuantity,
          balanceAfter: updatedInv.quantity,
          referenceType: "PURCHASE_INVOICE",
          referenceNumber: data.purchaseInvoiceNo || null,
          vendorParty: data.vendorName || null,
          costPriceAtTime: data.costPrice ? data.costPrice.toString() : "0.00",
          notes: "Stock added via edit form.",
          performedBy: user.id,
        }, tx);
      }
    });

    revalidatePath("/shop/inventory");
    return { success: true, message: "Accessory item record updated successfully." };
  } catch (error: any) {
    console.error("Error updating accessory inventory item:", error);
    return {
      success: false,
      message: error.message || "An unexpected error occurred while saving updates.",
    };
  }
}
