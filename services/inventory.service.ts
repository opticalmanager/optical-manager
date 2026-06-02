"use server";

import { db } from "@/lib/drizzle";
import { inventory, frameDetails } from "@/db/schema";
import { eq, and, lte, or, ilike, sql } from "drizzle-orm";
import type { InventoryItem, NewInventoryItem } from "@/types";

/**
 * Get all inventory items for a shop.
 */
export async function getInventoryByShop(
  shopId: string
): Promise<InventoryItem[]> {
  return db
    .select()
    .from(inventory)
    .where(eq(inventory.shopId, shopId))
    .orderBy(inventory.name);
}

/**
 * Get a single inventory item by ID.
 */
export async function getInventoryItemById(
  id: string,
  organizationId: string
): Promise<InventoryItem | null> {
  const [item] = await db
    .select()
    .from(inventory)
    .where(
      and(eq(inventory.id, id), eq(inventory.organizationId, organizationId))
    )
    .limit(1);

  return item ?? null;
}

/**
 * Create a new inventory item.
 */
export async function createInventoryItem(
  data: NewInventoryItem
): Promise<InventoryItem> {
  const [item] = await db.insert(inventory).values(data).returning();
  return item;
}

/**
 * Update an inventory item.
 */
export async function updateInventoryItem(
  id: string,
  organizationId: string,
  data: Partial<NewInventoryItem>
): Promise<InventoryItem> {
  const [item] = await db
    .update(inventory)
    .set({ ...data, updatedAt: new Date() })
    .where(
      and(eq(inventory.id, id), eq(inventory.organizationId, organizationId))
    )
    .returning();

  return item;
}

/**
 * Get low-stock items (quantity <= minQuantity).
 */
export async function getLowStockItems(
  shopId: string
): Promise<InventoryItem[]> {
  return db
    .select()
    .from(inventory)
    .where(
      and(
        eq(inventory.shopId, shopId),
        lte(inventory.quantity, inventory.minQuantity)
      )
    );
}

/**
 * Search inventory items for autocomplete based on name, brand, model or SKU.
 */
export async function searchInventoryItems(
  shopId: string,
  query: string
): Promise<InventoryItem[]> {
  return db
    .select()
    .from(inventory)
    .where(
      and(
        eq(inventory.shopId, shopId),
        or(
          ilike(inventory.name, `%${query}%`),
          ilike(inventory.brand, `%${query}%`),
          ilike(inventory.model, `%${query}%`),
          ilike(inventory.sku, `%${query}%`)
        )
      )
    )
    .limit(15);
}

/**
 * Decrement inventory stock atomically, supporting an optional transaction context.
 */
export async function decrementInventoryStock(
  inventoryId: string,
  organizationId: string,
  qty: number,
  tx?: any
): Promise<InventoryItem> {
  const client = tx || db;
  const [item] = await client
    .update(inventory)
    .set({
      quantity: sql`GREATEST(0, ${inventory.quantity} - ${qty})`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(inventory.id, inventoryId),
        eq(inventory.organizationId, organizationId)
      )
    )
    .returning();

  return item;
}

/**
 * Get unified inventory item base details along with frame-specific details.
 */
export async function getFrameItemDetails(
  itemId: string,
  organizationId: string
): Promise<any | null> {
  const [item] = await db
    .select({
      id: inventory.id,
      name: inventory.name,
      category: inventory.category,
      brand: inventory.brand,
      model: inventory.model,
      sku: inventory.sku,
      price: inventory.price,
      costPrice: inventory.costPrice,
      quantity: inventory.quantity,
      minQuantity: inventory.minQuantity,
      isActive: inventory.isActive,
      imageUrl: inventory.imageUrl,
      hsnCode: inventory.hsnCode,
      cgstPercent: inventory.cgstPercent,
      sgstPercent: inventory.sgstPercent,
      igstPercent: inventory.igstPercent,
      vendorName: inventory.vendorName,
      rackLocation: inventory.rackLocation,
      requiresExpiryTracking: inventory.requiresExpiryTracking,
      batchNumber: inventory.batchNumber,
      expiryDate: inventory.expiryDate,
      createdAt: inventory.createdAt,
      updatedAt: inventory.updatedAt,
      modelNumber: frameDetails.modelNumber,
      colorCode: frameDetails.colorCode,
      size: frameDetails.size,
      material: frameDetails.material,
      frameShape: frameDetails.frameShape,
      targetDemographic: frameDetails.targetDemographic,
    })
    .from(inventory)
    .leftJoin(frameDetails, eq(inventory.id, frameDetails.inventoryId))
    .where(
      and(
        eq(inventory.id, itemId),
        eq(inventory.organizationId, organizationId)
      )
    )
    .limit(1);

  return item ?? null;
}
