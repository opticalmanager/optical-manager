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
import { eq, and, desc, sql, inArray, gte, lte, or, ilike } from "drizzle-orm";
import type {
  PurchaseOrder,
  NewPurchaseOrder,
  PurchaseOrderItem,
  NewPurchaseOrderItem,
} from "@/types";
import { recordStockMovement } from "./inventory.service";
import { generateSKU } from "@/lib/utils";
import { getNextSkuSequenceBatch, ensureUniqueShopSku } from "./sku.service";

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

    // 3. Prepare contiguous batch sequences for deterministic SKU generation
    const batchSequences = await getNextSkuSequenceBatch(input.shopId, input.items.length);

    // 4. Process each line item
    const insertedItems: PurchaseOrderItem[] = [];

    for (let i = 0; i < input.items.length; i++) {
      const itemInput = input.items[i];
      let linkedInventoryId = itemInput.inventoryId || null;

      // Determine canonical SKU/barcode for this item
      let canonicalCode = itemInput.productCode?.trim() || "";
      if (!canonicalCode) {
        const rawCandidate = generateSKU({
          category: itemInput.category || "FRAME",
          vendorName: input.vendorName || null,
          modelNumber: itemInput.productName || null,
          sequentialNumber: batchSequences[i] || (i + 1),
        });
        canonicalCode = await ensureUniqueShopSku(input.shopId, rawCandidate);
      }

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
            // Ensure existing item's SKU is synchronized if empty
            if (!updatedItem.sku) {
              await tx
                .update(inventory)
                .set({ sku: updatedItem.productCode || canonicalCode })
                .where(eq(inventory.id, updatedItem.id));
            }

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
          // Check if item exists by product code or sku in shop
          let existingItem: any = null;

          const [found] = await tx
            .select()
            .from(inventory)
            .where(
              and(
                eq(inventory.shopId, input.shopId),
                or(
                  eq(inventory.productCode, canonicalCode),
                  eq(inventory.sku, canonicalCode)
                )
              )
            )
            .limit(1);
          existingItem = found;

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
            // Ensure canonical code is 100% collision-free in this shop
            canonicalCode = await ensureUniqueShopSku(input.shopId, canonicalCode);

            // Create new inventory item directly with both sku and productCode populated
            const [newItem] = await tx
              .insert(inventory)
              .values({
                shopId: input.shopId,
                organizationId: input.organizationId,
                name: itemInput.productName,
                productName: itemInput.productName,
                productCode: canonicalCode,
                sku: canonicalCode,
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

      // Insert line item with guaranteed canonicalCode
      const [insertedItem] = await tx
        .insert(purchaseOrderItems)
        .values({
          purchaseOrderId: order.id,
          inventoryId: linkedInventoryId,
          shopId: input.shopId,
          organizationId: input.organizationId,
          serialNumber: itemInput.serialNumber,
          productName: itemInput.productName,
          productCode: canonicalCode,
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

export interface GetPurchaseOrdersOptions {
  status?: "DRAFT" | "COMPLETED" | "CANCELLED";
  vendorId?: string;
  dateFrom?: string;
  dateTo?: string;
  taxRule?: "INCLUDE" | "EXCLUDE";
  search?: string;
  limit?: number;
  offset?: number;
}

export interface PurchaseOrderWithVendor extends PurchaseOrder {
  vendorGstin?: string | null;
  vendorPhone?: string | null;
}

/**
 * Get all purchase orders for a shop with full multi-condition filtering, pagination, and total count.
 */
export async function getPurchaseOrders(
  shopId: string,
  options?: GetPurchaseOrdersOptions
): Promise<{
  orders: PurchaseOrderWithVendor[];
  totalCount: number;
}> {
  const conditions = [eq(purchaseOrders.shopId, shopId)];

  if (options?.status) {
    conditions.push(eq(purchaseOrders.status, options.status));
  }

  if (options?.vendorId && options.vendorId !== "ALL") {
    conditions.push(eq(purchaseOrders.vendorId, options.vendorId));
  }

  if (options?.dateFrom) {
    conditions.push(gte(purchaseOrders.purchaseDate, options.dateFrom as any));
  }

  if (options?.dateTo) {
    conditions.push(lte(purchaseOrders.purchaseDate, options.dateTo as any));
  }

  if (options?.taxRule) {
    conditions.push(eq(purchaseOrders.taxRule, options.taxRule));
  }

  if (options?.search && options.search.trim()) {
    const term = `%${options.search.trim()}%`;
    conditions.push(
      or(
        ilike(purchaseOrders.purchaseNumber, term),
        ilike(purchaseOrders.vendorName, term)
      )!
    );
  }

  // Count total matching records for pagination
  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(purchaseOrders)
    .where(and(...conditions));

  const totalCount = countResult?.count ?? 0;

  // Retrieve matching purchase orders with joined vendor GSTIN
  const rows = await db
    .select({
      order: purchaseOrders,
      vendorGstin: vendors.gstin,
      vendorPhone: vendors.phone,
    })
    .from(purchaseOrders)
    .leftJoin(vendors, eq(purchaseOrders.vendorId, vendors.id))
    .where(and(...conditions))
    .orderBy(desc(purchaseOrders.purchaseDate), desc(purchaseOrders.createdAt))
    .limit(options?.limit ?? 20)
    .offset(options?.offset ?? 0);

  const orders: PurchaseOrderWithVendor[] = rows.map((r) => ({
    ...r.order,
    vendorGstin: r.vendorGstin ?? null,
    vendorPhone: r.vendorPhone ?? null,
  }));

  return { orders, totalCount };
}

/**
 * Aggregates high-density KPI metrics for the Purchase Ledger dashboard in 1 query.
 */
export async function getPurchaseLedgerKPIs(shopId: string): Promise<{
  totalPurchases: number;
  totalAmount: number;
  thisMonthPurchases: number;
  topVendorName: string | null;
}> {
  const now = new Date();
  const firstDayOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

  const [stats] = await db
    .select({
      totalPurchases: sql<number>`count(*)::int`,
      totalAmount: sql<number>`coalesce(sum(${purchaseOrders.totalNetPurchase}::numeric), 0)::float`,
      thisMonthPurchases: sql<number>`count(*) filter (where ${purchaseOrders.purchaseDate} >= ${firstDayOfMonth}::date)::int`,
    })
    .from(purchaseOrders)
    .where(eq(purchaseOrders.shopId, shopId));

  const [topVendor] = await db
    .select({
      vendorName: purchaseOrders.vendorName,
      count: sql<number>`count(*)::int`,
    })
    .from(purchaseOrders)
    .where(
      and(
        eq(purchaseOrders.shopId, shopId),
        sql`${purchaseOrders.vendorName} is not null and ${purchaseOrders.vendorName} != ''`
      )
    )
    .groupBy(purchaseOrders.vendorName)
    .orderBy(desc(sql`count(*)`))
    .limit(1);

  return {
    totalPurchases: stats?.totalPurchases ?? 0,
    totalAmount: stats?.totalAmount ?? 0,
    thisMonthPurchases: stats?.thisMonthPurchases ?? 0,
    topVendorName: topVendor?.vendorName ?? null,
  };
}

export interface UpdatePurchaseOrderInput extends CreatePurchaseOrderInput {
  id: string;
}

/**
 * Atomically updates a purchase order, rolling back previous inventory increments
 * if previously COMPLETED, and re-applying new inventory stock levels cleanly.
 */
export async function updatePurchaseOrder(
  input: UpdatePurchaseOrderInput
): Promise<{ order: PurchaseOrder; items: PurchaseOrderItem[] }> {
  return await db.transaction(async (tx) => {
    // 1. Fetch existing order and verify organization
    const [existingOrder] = await tx
      .select()
      .from(purchaseOrders)
      .where(
        and(
          eq(purchaseOrders.id, input.id),
          eq(purchaseOrders.organizationId, input.organizationId)
        )
      )
      .limit(1);

    if (!existingOrder) {
      throw new Error("Purchase order not found or unauthorized.");
    }

    const existingItems = await tx
      .select()
      .from(purchaseOrderItems)
      .where(eq(purchaseOrderItems.purchaseOrderId, input.id));

    // 2. If existing order was COMPLETED, rollback previous inventory additions
    if (existingOrder.status === "COMPLETED") {
      for (const oldItem of existingItems) {
        if (oldItem.inventoryId) {
          const [inv] = await tx
            .select()
            .from(inventory)
            .where(eq(inventory.id, oldItem.inventoryId))
            .limit(1);

          if (inv) {
            const revertedQty = Math.max(0, inv.quantity - oldItem.quantity);
            await tx
              .update(inventory)
              .set({
                quantity: revertedQty,
                updatedAt: new Date(),
              })
              .where(eq(inventory.id, inv.id));

            await recordStockMovement(
              {
                inventoryId: inv.id,
                shopId: existingOrder.shopId,
                organizationId: existingOrder.organizationId,
                movementType: "RETURN",
                quantityChange: -oldItem.quantity,
                balanceAfter: revertedQty,
                referenceType: "PURCHASE_RETURN",
                referenceNumber: existingOrder.purchaseNumber,
                vendorParty: existingOrder.vendorName || null,
                costPriceAtTime: inv.costPrice || String(oldItem.unitPrice),
                notes: `Stock rollback for purchase edit #${existingOrder.purchaseNumber}`,
                performedBy: input.createdBy || null,
              },
              tx
            );
          }
        }
      }
    }

    // 3. Recalculate summary totals
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

    // 4. Update purchaseOrders header
    const [updatedOrder] = await tx
      .update(purchaseOrders)
      .set({
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
        updatedAt: new Date(),
      })
      .where(eq(purchaseOrders.id, input.id))
      .returning();

    // 5. Delete existing line items
    await tx
      .delete(purchaseOrderItems)
      .where(eq(purchaseOrderItems.purchaseOrderId, input.id));

    // 6. Insert new items and apply stock if status is COMPLETED
    const insertedItems: PurchaseOrderItem[] = [];

    for (const itemInput of input.items) {
      let linkedInventoryId = itemInput.inventoryId || null;

      if (input.status === "COMPLETED") {
        if (linkedInventoryId) {
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
                notes: `Inward stock updated via purchase invoice #${input.purchaseNumber}`,
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
                notes: `Inward stock updated via purchase invoice #${input.purchaseNumber}`,
                performedBy: input.createdBy || null,
              },
              tx
            );
          } else {
            // Create new inventory item
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

      const [insertedItem] = await tx
        .insert(purchaseOrderItems)
        .values({
          purchaseOrderId: updatedOrder.id,
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

    return { order: updatedOrder, items: insertedItems };
  });
}

/**
 * Atomically deletes a purchase order and reverses inventory additions if COMPLETED.
 */
export async function deletePurchaseOrder(
  id: string,
  organizationId: string
): Promise<{ success: boolean; message: string }> {
  return await db.transaction(async (tx) => {
    const [order] = await tx
      .select()
      .from(purchaseOrders)
      .where(
        and(
          eq(purchaseOrders.id, id),
          eq(purchaseOrders.organizationId, organizationId)
        )
      )
      .limit(1);

    if (!order) {
      throw new Error("Purchase order not found or unauthorized.");
    }

    // If order was COMPLETED, reverse the inward stock
    if (order.status === "COMPLETED") {
      const items = await tx
        .select()
        .from(purchaseOrderItems)
        .where(eq(purchaseOrderItems.purchaseOrderId, id));

      for (const item of items) {
        if (item.inventoryId) {
          const [inv] = await tx
            .select()
            .from(inventory)
            .where(eq(inventory.id, item.inventoryId))
            .limit(1);

          if (inv) {
            const revertedQty = Math.max(0, inv.quantity - item.quantity);
            await tx
              .update(inventory)
              .set({
                quantity: revertedQty,
                updatedAt: new Date(),
              })
              .where(eq(inventory.id, inv.id));

            await recordStockMovement(
              {
                inventoryId: inv.id,
                shopId: order.shopId,
                organizationId: order.organizationId,
                movementType: "RETURN",
                quantityChange: -item.quantity,
                balanceAfter: revertedQty,
                referenceType: "PURCHASE_RETURN",
                referenceNumber: order.purchaseNumber,
                vendorParty: order.vendorName || null,
                costPriceAtTime: inv.costPrice || String(item.unitPrice),
                notes: `Reversed inward stock due to deleted purchase #${order.purchaseNumber}`,
                performedBy: null,
              },
              tx
            );
          }
        }
      }
    }

    // Delete items first for explicit safety
    await tx
      .delete(purchaseOrderItems)
      .where(eq(purchaseOrderItems.purchaseOrderId, id));

    // Delete purchase order
    await tx
      .delete(purchaseOrders)
      .where(eq(purchaseOrders.id, id));

    return {
      success: true,
      message: `Purchase bill #${order.purchaseNumber} deleted and stock levels adjusted.`,
    };
  });
}

