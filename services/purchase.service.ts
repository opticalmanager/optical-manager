"use server";

import { db } from "@/lib/drizzle";
import {
  purchaseOrders,
  purchaseOrderItems,
  inventory,
  stockMovements,
  vendors,
  profiles,
} from "@/db/schema";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import type {
  PurchaseOrder,
  NewPurchaseOrder,
  PurchaseOrderItem,
  NewPurchaseOrderItem,
} from "@/types";
import { recordStockMovement } from "./inventory.service";

export interface CreatePurchaseItemInput {
  inventoryId?: string | null;
  serialNumber: number;
  productName: string;
  productCode?: string | null;
  category?: string | null;
  details?: string | null;
  unitPrice: number;
  basePrice: number;
  hsnCode?: string | null;
  gstPercent: number;
  cgstPercent: number;
  cgstAmount: number;
  sgstPercent: number;
  sgstAmount: number;
  igstPercent: number;
  igstAmount: number;
  purchasePrice: number;
  quantity: number;
  totalPurchasePrice: number;
  retailPrice: number;
}

export interface CreatePurchaseOrderInput {
  shopId: string;
  organizationId: string;
  vendorId?: string | null;
  vendorName: string;
  purchaseNumber: string;
  purchaseDate: string; // YYYY-MM-DD
  status: "DRAFT" | "COMPLETED" | "CANCELLED";
  taxRule: string;
  taxType: string;
  roundOff: number;
  notes?: string | null;
  createdBy?: string | null;
  items: CreatePurchaseItemInput[];
}

/**
 * Create a new purchase order with line items and optional atomic stock increments.
 */
export async function createPurchaseOrder(
  input: CreatePurchaseOrderInput
): Promise<{ order: PurchaseOrder; items: PurchaseOrderItem[] }> {
  return await db.transaction(async (tx) => {
    // 1. Calculate summary totals
    let totalQuantity = 0;
    let totalUnitAmount = 0;
    let totalBasePrice = 0;
    let totalGstAmount = 0;
    let totalPurchase = 0;

    for (const item of input.items) {
      totalQuantity += item.quantity;
      totalUnitAmount += item.unitPrice;
      totalBasePrice += item.basePrice;
      totalGstAmount += item.cgstAmount + item.sgstAmount + item.igstAmount;
      totalPurchase += item.totalPurchasePrice;
    }

    const roundOff = input.roundOff || 0;
    const totalNetPurchase = Number((totalPurchase + roundOff).toFixed(2));

    // 2. Insert purchase_orders header
    const [order] = await tx
      .insert(purchaseOrders)
      .values({
        shopId: input.shopId,
        organizationId: input.organizationId,
        vendorId: input.vendorId || null,
        vendorName: input.vendorName,
        purchaseNumber: input.purchaseNumber,
        purchaseDate: input.purchaseDate as any,
        status: input.status,
        taxRule: input.taxRule || "EXCLUDE",
        taxType: input.taxType || "SGST_CGST",
        totalQuantity,
        totalUnitAmount: String(totalUnitAmount.toFixed(2)),
        totalBasePrice: String(totalBasePrice.toFixed(2)),
        totalGstAmount: String(totalGstAmount.toFixed(2)),
        totalPurchase: String(totalPurchase.toFixed(2)),
        roundOff: String(roundOff.toFixed(2)),
        totalNetPurchase: String(totalNetPurchase.toFixed(2)),
        notes: input.notes || null,
        createdBy: input.createdBy || null,
      })
      .returning();

    // 3. Process each line item
    const insertedItems: PurchaseOrderItem[] = [];

    for (const itemInput of input.items) {
      let linkedInventoryId = itemInput.inventoryId || null;

      // If status is COMPLETED, update or create inventory and log stock movements
      if (input.status === "COMPLETED") {
        if (linkedInventoryId) {
          // Increment stock on existing item
          const [updatedItem] = await tx
            .update(inventory)
            .set({
              quantity: sql`${inventory.quantity} + ${itemInput.quantity}`,
              costPrice: String(itemInput.unitPrice),
              price:
                itemInput.retailPrice > 0
                  ? String(itemInput.retailPrice)
                  : inventory.price,
              purchaseInvoiceNo: input.purchaseNumber,
              inwardDate: input.purchaseDate as any,
              vendorName: input.vendorName || inventory.vendorName,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(inventory.id, linkedInventoryId),
                eq(inventory.organizationId, input.organizationId)
              )
            )
            .returning();

          if (updatedItem) {
            await recordStockMovement(
              {
                inventoryId: updatedItem.id,
                shopId: input.shopId,
                organizationId: input.organizationId,
                movementType: "STOCK_IN",
                quantityChange: itemInput.quantity,
                balanceAfter: updatedItem.quantity,
                referenceType: "PURCHASE_INVOICE",
                referenceNumber: input.purchaseNumber,
                vendorParty: input.vendorName || null,
                costPriceAtTime: String(itemInput.unitPrice),
                notes: `Inward stock received via purchase invoice #${input.purchaseNumber}`,
                performedBy: input.createdBy || null,
              },
              tx
            );
          }
        } else {
          // Check if item exists by product code in shop
          const codeToMatch = itemInput.productCode?.trim();
          let existingItem: any = null;

          if (codeToMatch) {
            const [found] = await tx
              .select()
              .from(inventory)
              .where(
                and(
                  eq(inventory.shopId, input.shopId),
                  eq(inventory.productCode, codeToMatch)
                )
              )
              .limit(1);
            existingItem = found;
          }

          if (existingItem) {
            linkedInventoryId = existingItem.id;
            const [updatedItem] = await tx
              .update(inventory)
              .set({
                quantity: sql`${inventory.quantity} + ${itemInput.quantity}`,
                costPrice: String(itemInput.unitPrice),
                price:
                  itemInput.retailPrice > 0
                    ? String(itemInput.retailPrice)
                    : existingItem.price,
                purchaseInvoiceNo: input.purchaseNumber,
                inwardDate: input.purchaseDate as any,
                vendorName: input.vendorName || existingItem.vendorName,
                updatedAt: new Date(),
              })
              .where(eq(inventory.id, existingItem.id))
              .returning();

            await recordStockMovement(
              {
                inventoryId: updatedItem.id,
                shopId: input.shopId,
                organizationId: input.organizationId,
                movementType: "STOCK_IN",
                quantityChange: itemInput.quantity,
                balanceAfter: updatedItem.quantity,
                referenceType: "PURCHASE_INVOICE",
                referenceNumber: input.purchaseNumber,
                vendorParty: input.vendorName || null,
                costPriceAtTime: String(itemInput.unitPrice),
                notes: `Inward stock received via purchase invoice #${input.purchaseNumber}`,
                performedBy: input.createdBy || null,
              },
              tx
            );
          } else {
            // Create new inventory item directly
            const [newItem] = await tx
              .insert(inventory)
              .values({
                shopId: input.shopId,
                organizationId: input.organizationId,
                name: itemInput.productName,
                productName: itemInput.productName,
                productCode: itemInput.productCode || null,
                category: itemInput.category || "FRAME",
                price: String(itemInput.retailPrice || itemInput.unitPrice),
                costPrice: String(itemInput.unitPrice),
                quantity: itemInput.quantity,
                minQuantity: 5,
                isActive: true,
                hsnCode: itemInput.hsnCode || null,
                cgstPercent: String(itemInput.cgstPercent.toFixed(2)),
                sgstPercent: String(itemInput.sgstPercent.toFixed(2)),
                igstPercent: String(itemInput.igstPercent.toFixed(2)),
                vendorName: input.vendorName || null,
                purchaseInvoiceNo: input.purchaseNumber,
                inwardDate: input.purchaseDate as any,
              })
              .returning();

            linkedInventoryId = newItem.id;

            await recordStockMovement(
              {
                inventoryId: newItem.id,
                shopId: input.shopId,
                organizationId: input.organizationId,
                movementType: "INITIAL",
                quantityChange: itemInput.quantity,
                balanceAfter: itemInput.quantity,
                referenceType: "PURCHASE_INVOICE",
                referenceNumber: input.purchaseNumber,
                vendorParty: input.vendorName || null,
                costPriceAtTime: String(itemInput.unitPrice),
                notes: `Initial stock inward via purchase invoice #${input.purchaseNumber}`,
                performedBy: input.createdBy || null,
              },
              tx
            );
          }
        }
      }

      // Insert line item
      const [insertedItem] = await tx
        .insert(purchaseOrderItems)
        .values({
          purchaseOrderId: order.id,
          inventoryId: linkedInventoryId,
          shopId: input.shopId,
          organizationId: input.organizationId,
          serialNumber: itemInput.serialNumber,
          productName: itemInput.productName,
          productCode: itemInput.productCode || null,
          category: itemInput.category || null,
          details: itemInput.details || null,
          unitPrice: String(itemInput.unitPrice.toFixed(2)),
          basePrice: String(itemInput.basePrice.toFixed(2)),
          hsnCode: itemInput.hsnCode || null,
          gstPercent: String(itemInput.gstPercent.toFixed(2)),
          cgstPercent: String(itemInput.cgstPercent.toFixed(2)),
          cgstAmount: String(itemInput.cgstAmount.toFixed(2)),
          sgstPercent: String(itemInput.sgstPercent.toFixed(2)),
          sgstAmount: String(itemInput.sgstAmount.toFixed(2)),
          igstPercent: String(itemInput.igstPercent.toFixed(2)),
          igstAmount: String(itemInput.igstAmount.toFixed(2)),
          purchasePrice: String(itemInput.purchasePrice.toFixed(2)),
          quantity: itemInput.quantity,
          totalPurchasePrice: String(itemInput.totalPurchasePrice.toFixed(2)),
          retailPrice: String(itemInput.retailPrice.toFixed(2)),
        })
        .returning();

      insertedItems.push(insertedItem);
    }

    return { order, items: insertedItems };
  });
}

/**
 * Get a purchase order by ID with its items and vendor details.
 */
export async function getPurchaseOrderById(
  id: string,
  organizationId: string
): Promise<{
  order: PurchaseOrder;
  items: PurchaseOrderItem[];
  vendor: typeof vendors.$inferSelect | null;
} | null> {
  const [order] = await db
    .select()
    .from(purchaseOrders)
    .where(
      and(
        eq(purchaseOrders.id, id),
        eq(purchaseOrders.organizationId, organizationId)
      )
    )
    .limit(1);

  if (!order) return null;

  const items = await db
    .select()
    .from(purchaseOrderItems)
    .where(eq(purchaseOrderItems.purchaseOrderId, id))
    .orderBy(purchaseOrderItems.serialNumber);

  let vendor = null;
  if (order.vendorId) {
    const [v] = await db
      .select()
      .from(vendors)
      .where(eq(vendors.id, order.vendorId))
      .limit(1);
    vendor = v ?? null;
  }

  return { order, items, vendor };
}

/**
 * Get all purchase orders for a shop, with pagination and optional status filter.
 */
export async function getPurchaseOrders(
  shopId: string,
  options?: {
    status?: "DRAFT" | "COMPLETED" | "CANCELLED";
    limit?: number;
    offset?: number;
  }
): Promise<PurchaseOrder[]> {
  const conditions = [eq(purchaseOrders.shopId, shopId)];

  if (options?.status) {
    conditions.push(eq(purchaseOrders.status, options.status));
  }

  return db
    .select()
    .from(purchaseOrders)
    .where(and(...conditions))
    .orderBy(desc(purchaseOrders.purchaseDate), desc(purchaseOrders.createdAt))
    .limit(options?.limit || 50)
    .offset(options?.offset || 0);
}
