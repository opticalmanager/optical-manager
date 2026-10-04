"use server";

import { db } from "@/lib/drizzle";
import {
  inventory,
  frameDetails,
  lensDetails,
  contactLensDetails,
  accessoryDetails,
  sunglassDetails,
  stockMovements,
  profiles,
  productCategories,
  organizations,
} from "@/db/schema";
import { eq, and, lte, or, ilike, sql, desc, ne } from "drizzle-orm";
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
 * Check if a product code (or SKU) already exists within a shop or organization,
 * optionally scoped to a specific vendor.
 */
export async function checkProductCodeExists(
  scopeId: string,
  productCode: string,
  excludeItemId?: string,
  isShopScope = true,
  vendorName?: string
): Promise<boolean> {
  if (!scopeId || !productCode) return false;
  const cleanCode = productCode.trim();
  if (!cleanCode) return false;

  const conditions = [
    isShopScope ? eq(inventory.shopId, scopeId) : eq(inventory.organizationId, scopeId),
    or(
      ilike(inventory.productCode, cleanCode),
      ilike(inventory.sku, cleanCode)
    ),
  ];

  if (vendorName && vendorName.trim()) {
    conditions.push(ilike(inventory.vendorName, vendorName.trim()));
  }

  if (excludeItemId) {
    conditions.push(ne(inventory.id, excludeItemId));
  }

  const [existing] = await db
    .select({ id: inventory.id })
    .from(inventory)
    .where(and(...conditions))
    .limit(1);

  return Boolean(existing);
}

/**
 * Search inventory items for autocomplete based on code, name, brand, model or SKU,
 * optionally prioritizing / filtering by vendorName.
 */
export async function searchInventoryItems(
  shopId: string,
  query: string,
  vendorName?: string
): Promise<InventoryItem[]> {
  const baseCondition = and(
    eq(inventory.shopId, shopId),
    or(
      ilike(inventory.productCode, `%${query}%`),
      ilike(inventory.productName, `%${query}%`),
      ilike(inventory.name, `%${query}%`),
      ilike(inventory.brand, `%${query}%`),
      ilike(inventory.model, `%${query}%`),
      ilike(inventory.sku, `%${query}%`)
    )
  );

  if (vendorName && vendorName.trim()) {
    const cleanVendor = vendorName.trim();
    // Prioritize exact/matching vendor items at the top
    return db
      .select()
      .from(inventory)
      .where(baseCondition)
      .orderBy(
        sql`CASE WHEN LOWER(${inventory.vendorName}) = LOWER(${cleanVendor}) THEN 0 ELSE 1 END`,
        inventory.name
      )
      .limit(15);
  }

  return db
    .select()
    .from(inventory)
    .where(baseCondition)
    .limit(15);
}

/**
 * Decrement inventory stock atomically, supporting an optional transaction context.
 */
export async function decrementInventoryStock(
  inventoryId: string,
  organizationId: string,
  qty: number,
  tx?: any,
  referenceType?: string | null,
  referenceNumber?: string | null,
  vendorParty?: string | null,
  performedBy?: string | null,
  createdAt?: Date
): Promise<InventoryItem> {
  const client = tx || db;
  const [item] = await client
    .update(inventory)
    .set({
      quantity: sql`${inventory.quantity} - ${qty}`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(inventory.id, inventoryId),
        eq(inventory.organizationId, organizationId)
      )
    )
    .returning();

  if (item) {
    const isBackordered = item.quantity < 0;
    await recordStockMovement(
      {
        inventoryId: item.id,
        shopId: item.shopId,
        organizationId: item.organizationId,
        movementType: "SOLD",
        quantityChange: -qty,
        balanceAfter: item.quantity,
        referenceType: referenceType || "SALE_INVOICE",
        referenceNumber: referenceNumber || null,
        vendorParty: vendorParty || null,
        costPriceAtTime: item.costPrice || "0.00",
        notes: isBackordered
          ? "Stock debited via sale invoice (Backordered / Negative Stock)."
          : "Stock debited via sale invoice.",
        performedBy: performedBy || null,
        createdAt: createdAt || undefined,
      },
      client
    );
  }

  return item;
}

/**
 * 3-Tier Cascade Resolution for Negative Inventory Permission:
 * 1. Item Level Override (inventory.allowNegativeStock: true | false)
 * 2. Category Level Setting (product_categories.allowNegativeStock: default true)
 * 3. Global Organization Customization (organizations.settings.customization.inventory.allow_negative_stock)
 */
export async function resolveNegativeStockPermission(
  inventoryId: string,
  organizationId: string
): Promise<boolean> {
  try {
    // Level 1: Check Item Override
    const [item] = await db
      .select({
        allowNegativeStock: inventory.allowNegativeStock,
        category: inventory.category,
      })
      .from(inventory)
      .where(and(eq(inventory.id, inventoryId), eq(inventory.organizationId, organizationId)))
      .limit(1);

    if (!item) return true;

    if (typeof item.allowNegativeStock === "boolean") {
      return item.allowNegativeStock;
    }

    // Level 2: Check Category Setting
    if (item.category) {
      const [cat] = await db
        .select({
          allowNegativeStock: productCategories.allowNegativeStock,
        })
        .from(productCategories)
        .where(
          and(
            eq(productCategories.organizationId, organizationId),
            or(
              eq(productCategories.name, item.category),
              eq(productCategories.code, item.category),
              sql`LOWER(${productCategories.name}) = LOWER(${item.category})`,
              sql`LOWER(${productCategories.code}) = LOWER(${item.category})`
            )
          )
        )
        .limit(1);

      if (cat && typeof cat.allowNegativeStock === "boolean") {
        return cat.allowNegativeStock;
      }
    }

    // Level 3: Check Global Organization Customization
    const [org] = await db
      .select({
        settings: organizations.settings,
      })
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);

    const globalItems = (org?.settings as any)?.customization?.inventory?.items;
    if (Array.isArray(globalItems)) {
      const globalToggle = globalItems.find((i: any) => i.id === "allow_negative_stock");
      if (globalToggle && typeof globalToggle.enabled === "boolean") {
        return globalToggle.enabled;
      }
    }

    // Default industry fallback: allow
    return true;
  } catch (err) {
    console.error("Error resolving negative stock permission:", err);
    return true;
  }
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
      productName: inventory.productName,
      productCode: inventory.productCode,
      category: inventory.category,
      brand: inventory.brand,
      model: inventory.model,
      sku: inventory.sku,
      price: inventory.price,
      costPrice: inventory.costPrice,
      quantity: inventory.quantity,
      minQuantity: inventory.minQuantity,
      allowNegativeStock: inventory.allowNegativeStock,
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
      purchaseInvoiceNo: inventory.purchaseInvoiceNo,
      inwardDate: inventory.inwardDate,
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

/**
 * Get unified inventory item base details along with lens-specific details.
 */
export async function getLensItemDetails(
  itemId: string,
  organizationId: string
): Promise<any | null> {
  const [item] = await db
    .select({
      id: inventory.id,
      name: inventory.name,
      productName: inventory.productName,
      productCode: inventory.productCode,
      category: inventory.category,
      brand: inventory.brand,
      model: inventory.model,
      sku: inventory.sku,
      price: inventory.price,
      costPrice: inventory.costPrice,
      quantity: inventory.quantity,
      minQuantity: inventory.minQuantity,
      allowNegativeStock: inventory.allowNegativeStock,
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
      purchaseInvoiceNo: inventory.purchaseInvoiceNo,
      inwardDate: inventory.inwardDate,
      createdAt: inventory.createdAt,
      updatedAt: inventory.updatedAt,
      design: lensDetails.design,
      refractiveIndex: lensDetails.refractiveIndex,
      material: lensDetails.material,
      blankDiameter: lensDetails.blankDiameter,
      stockPower: lensDetails.stockPower,
      isUncoated: lensDetails.isUncoated,
      isAntiReflective: lensDetails.isAntiReflective,
      isBlueControl: lensDetails.isBlueControl,
      isTinted: lensDetails.isTinted,
      isPolarized: lensDetails.isPolarized,
      isHardCoat: lensDetails.isHardCoat,
      isPhotochromic: lensDetails.isPhotochromic,
    })
    .from(inventory)
    .leftJoin(lensDetails, eq(inventory.id, lensDetails.inventoryId))
    .where(
      and(
        eq(inventory.id, itemId),
        eq(inventory.organizationId, organizationId)
      )
    )
    .limit(1);

  return item ?? null;
}

/**
 * Get unified inventory item base details along with contact lens-specific details.
 */
export async function getContactLensItemDetails(
  itemId: string,
  organizationId: string
): Promise<any | null> {
  const [item] = await db
    .select({
      id: inventory.id,
      name: inventory.name,
      productName: inventory.productName,
      productCode: inventory.productCode,
      category: inventory.category,
      brand: inventory.brand,
      model: inventory.model,
      sku: inventory.sku,
      price: inventory.price,
      costPrice: inventory.costPrice,
      quantity: inventory.quantity,
      minQuantity: inventory.minQuantity,
      allowNegativeStock: inventory.allowNegativeStock,
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
      purchaseInvoiceNo: inventory.purchaseInvoiceNo,
      inwardDate: inventory.inwardDate,
      createdAt: inventory.createdAt,
      updatedAt: inventory.updatedAt,
      modality: contactLensDetails.modality,
      boxQuantity: contactLensDetails.boxQuantity,
      baseCurve: contactLensDetails.baseCurve,
      diameter: contactLensDetails.diameter,
      color: contactLensDetails.color,
      sphere: contactLensDetails.sphere,
      cylinder: contactLensDetails.cylinder,
      axis: contactLensDetails.axis,
      addPower: contactLensDetails.addPower,
    })
    .from(inventory)
    .leftJoin(contactLensDetails, eq(inventory.id, contactLensDetails.inventoryId))
    .where(
      and(
        eq(inventory.id, itemId),
        eq(inventory.organizationId, organizationId)
      )
    )
    .limit(1);

  return item ?? null;
}

/**
 * Get unified inventory item base details along with accessory-specific details.
 */
export async function getAccessoryItemDetails(
  itemId: string,
  organizationId: string
): Promise<any | null> {
  const [item] = await db
    .select({
      id: inventory.id,
      name: inventory.name,
      productName: inventory.productName,
      productCode: inventory.productCode,
      category: inventory.category,
      brand: inventory.brand,
      model: inventory.model,
      sku: inventory.sku,
      price: inventory.price,
      costPrice: inventory.costPrice,
      quantity: inventory.quantity,
      minQuantity: inventory.minQuantity,
      allowNegativeStock: inventory.allowNegativeStock,
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
      purchaseInvoiceNo: inventory.purchaseInvoiceNo,
      inwardDate: inventory.inwardDate,
      createdAt: inventory.createdAt,
      updatedAt: inventory.updatedAt,
      type: accessoryDetails.type,
      sizeVolume: accessoryDetails.sizeVolume,
      colorPattern: accessoryDetails.colorPattern,
    })
    .from(inventory)
    .leftJoin(accessoryDetails, eq(inventory.id, accessoryDetails.inventoryId))
    .where(
      and(
        eq(inventory.id, itemId),
        eq(inventory.organizationId, organizationId)
      )
    )
    .limit(1);

  return item ?? null;
}

/**
 * Get unified inventory item base details along with sunglasses-specific details.
 */
export async function getSunglassItemDetails(
  itemId: string,
  organizationId: string
): Promise<any | null> {
  const [item] = await db
    .select({
      id: inventory.id,
      name: inventory.name,
      productName: inventory.productName,
      productCode: inventory.productCode,
      category: inventory.category,
      brand: inventory.brand,
      model: inventory.model,
      sku: inventory.sku,
      price: inventory.price,
      costPrice: inventory.costPrice,
      quantity: inventory.quantity,
      minQuantity: inventory.minQuantity,
      allowNegativeStock: inventory.allowNegativeStock,
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
      purchaseInvoiceNo: inventory.purchaseInvoiceNo,
      inwardDate: inventory.inwardDate,
      createdAt: inventory.createdAt,
      updatedAt: inventory.updatedAt,
      modelNumber: sunglassDetails.modelNumber,
      frameShape: sunglassDetails.frameShape,
      frameColor: sunglassDetails.frameColor,
      lensColor: sunglassDetails.lensColor,
      size: sunglassDetails.size,
      gender: sunglassDetails.gender,
      isPolarized: sunglassDetails.isPolarized,
      uvProtection: sunglassDetails.uvProtection,
    })
    .from(inventory)
    .leftJoin(sunglassDetails, eq(inventory.id, sunglassDetails.inventoryId))
    .where(
      and(
        eq(inventory.id, itemId),
        eq(inventory.organizationId, organizationId)
      )
    )
    .limit(1);

  return item ?? null;
}

/**
 * Get all stock movements for a specific inventory item, ordered by date.
 */
export async function getStockMovements(
  inventoryId: string,
  organizationId: string
): Promise<any[]> {
  return db
    .select({
      id: stockMovements.id,
      inventoryId: stockMovements.inventoryId,
      shopId: stockMovements.shopId,
      organizationId: stockMovements.organizationId,
      movementType: stockMovements.movementType,
      quantityChange: stockMovements.quantityChange,
      balanceAfter: stockMovements.balanceAfter,
      referenceType: stockMovements.referenceType,
      referenceNumber: stockMovements.referenceNumber,
      vendorParty: stockMovements.vendorParty,
      costPriceAtTime: stockMovements.costPriceAtTime,
      notes: stockMovements.notes,
      performedBy: stockMovements.performedBy,
      performedByName: profiles.fullName,
      createdAt: stockMovements.createdAt,
    })
    .from(stockMovements)
    .leftJoin(profiles, eq(stockMovements.performedBy, profiles.id))
    .where(
      and(
        eq(stockMovements.inventoryId, inventoryId),
        eq(stockMovements.organizationId, organizationId)
      )
    )
    .orderBy(desc(stockMovements.createdAt));
}

/**
 * Record a new stock movement. Can run within an optional transaction.
 */
export async function recordStockMovement(
  data: {
    inventoryId: string;
    shopId: string;
    organizationId: string;
    movementType: "STOCK_IN" | "SOLD" | "ADJUSTMENT" | "RETURN" | "INITIAL";
    quantityChange: number;
    balanceAfter: number;
    referenceType?: string | null;
    referenceNumber?: string | null;
    vendorParty?: string | null;
    costPriceAtTime: string;
    notes?: string | null;
    performedBy?: string | null;
    createdAt?: Date;
  },
  tx?: any
): Promise<void> {
  const client = tx || db;
  await client.insert(stockMovements).values(data);
}

export interface CustomProductIngestInput {
  shopId: string;
  organizationId: string;
  description: string;
  category?: string | null;
  quantity: number;
  unitPrice: number;
  cgstPercent?: number;
  sgstPercent?: number;
  igstPercent?: number;
  barcode?: string | null;
  productCode?: string | null;
  sku?: string | null;
  invoiceNumber: string;
  customerName?: string | null;
  userId?: string | null;
  createdAt?: Date;
}

/**
 * Ingest an on-demand custom invoice item into the inventory catalog.
 * If an active item with the same name & category exists in the shop, reuses it and decrements stock.
 * Otherwise creates a new inventory product with initial stock = -quantity, allowNegativeStock = true,
 * and logs an authentic audit trail in stock_movements.
 */
export async function ingestCustomProductToInventory(
  input: CustomProductIngestInput,
  tx?: any
): Promise<string> {
  const client = tx || db;
  const cleanDescription = (input.description || "Custom Item").trim();
  const cleanCategory = (input.category || "General").trim();
  const qty = Math.max(1, Math.floor(input.quantity || 1));
  const unitPriceStr = Number(input.unitPrice || 0).toFixed(2);
  const cgstStr = Number(input.cgstPercent || 0).toFixed(2);
  const sgstStr = Number(input.sgstPercent || 0).toFixed(2);
  const igstStr = Number(input.igstPercent || 0).toFixed(2);
  const eventDate = input.createdAt || new Date();
  const validUserId =
    input.userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.userId)
      ? input.userId
      : null;

  // 1. Deduplication check: Check by explicit code/SKU or case-insensitive name & category
  let existingItem: { id: string; quantity: number; costPrice: string | null } | null = null;

  if (input.productCode && input.productCode.trim()) {
    const [foundByCode] = await client
      .select({
        id: inventory.id,
        quantity: inventory.quantity,
        costPrice: inventory.costPrice,
      })
      .from(inventory)
      .where(
        and(
          eq(inventory.shopId, input.shopId),
          eq(inventory.organizationId, input.organizationId),
          or(
            ilike(inventory.productCode, input.productCode.trim()),
            ilike(inventory.sku, input.productCode.trim())
          )
        )
      )
      .limit(1);
    if (foundByCode) existingItem = foundByCode;
  }

  if (!existingItem) {
    const [foundByName] = await client
      .select({
        id: inventory.id,
        quantity: inventory.quantity,
        costPrice: inventory.costPrice,
      })
      .from(inventory)
      .where(
        and(
          eq(inventory.shopId, input.shopId),
          eq(inventory.organizationId, input.organizationId),
          ilike(inventory.name, cleanDescription),
          ilike(inventory.category, cleanCategory)
        )
      )
      .limit(1);
    if (foundByName) existingItem = foundByName;
  }

  // 2. If item already exists in shop catalog, decrement its stock and record movement
  if (existingItem) {
    const [updatedItem] = await client
      .update(inventory)
      .set({
        quantity: sql`${inventory.quantity} - ${qty}`,
        allowNegativeStock: true,
        updatedAt: eventDate,
      })
      .where(eq(inventory.id, existingItem.id))
      .returning({ id: inventory.id, quantity: inventory.quantity, costPrice: inventory.costPrice });

    const newBalance = updatedItem ? updatedItem.quantity : existingItem.quantity - qty;

    await recordStockMovement(
      {
        inventoryId: existingItem.id,
        shopId: input.shopId,
        organizationId: input.organizationId,
        movementType: "SOLD",
        quantityChange: -qty,
        balanceAfter: newBalance,
        referenceType: "SALE_INVOICE",
        referenceNumber: input.invoiceNumber,
        vendorParty: input.customerName || null,
        costPriceAtTime: existingItem.costPrice || "0.00",
        notes: `On-demand custom product billed on invoice #${input.invoiceNumber} (Stock updated to ${newBalance}).`,
        performedBy: validUserId,
        createdAt: eventDate,
      },
      client
    );

    return existingItem.id;
  }

  // 3. Otherwise generate collision-free unique product code
  let codeCandidate = (input.productCode || input.sku || input.barcode || "").trim();
  if (codeCandidate) {
    const [collision] = await client
      .select({ id: inventory.id })
      .from(inventory)
      .where(and(eq(inventory.shopId, input.shopId), eq(inventory.productCode, codeCandidate)))
      .limit(1);
    if (collision) {
      codeCandidate = "";
    }
  }

  if (!codeCandidate) {
    const tsCode = Date.now().toString(36).toUpperCase();
    const randPart = Math.floor(100 + Math.random() * 899);
    codeCandidate = `CUST-${tsCode}-${randPart}`;
  }

  // 4. Create new inventory item with negative stock = -qty and allowNegativeStock = true
  const initialStock = -qty;
  const [newItem] = await client
    .insert(inventory)
    .values({
      shopId: input.shopId,
      organizationId: input.organizationId,
      name: cleanDescription,
      productName: cleanDescription,
      productCode: codeCandidate,
      category: cleanCategory,
      sku: input.sku?.trim() || codeCandidate,
      price: unitPriceStr,
      costPrice: "0.00",
      quantity: initialStock,
      minQuantity: 0,
      isActive: true,
      allowNegativeStock: true,
      cgstPercent: cgstStr,
      sgstPercent: sgstStr,
      igstPercent: igstStr,
      createdAt: eventDate,
      updatedAt: eventDate,
    })
    .returning({ id: inventory.id });

  // 5. Record movement in stock_movements
  await recordStockMovement(
    {
      inventoryId: newItem.id,
      shopId: input.shopId,
      organizationId: input.organizationId,
      movementType: "SOLD",
      quantityChange: -qty,
      balanceAfter: initialStock,
      referenceType: "SALE_INVOICE",
      referenceNumber: input.invoiceNumber,
      vendorParty: input.customerName || null,
      costPriceAtTime: "0.00",
      notes: `On-demand custom product auto-created and billed on invoice #${input.invoiceNumber} (Stock initialized as ${initialStock}).`,
      performedBy: validUserId,
      createdAt: eventDate,
    },
    client
  );

  return newItem.id;
}

