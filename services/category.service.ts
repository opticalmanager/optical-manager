import { db } from "@/lib/drizzle";
import { productCategories, inventory } from "@/db/schema";
import { eq, and, sql, desc, asc, or } from "drizzle-orm";

export interface CategoryItem {
  id: string;
  organizationId: string;
  name: string;
  printName: string | null;
  code: string;
  hsnCode: string | null;
  cgstPercent: string;
  sgstPercent: string;
  igstPercent: string;
  isStockable: boolean;
  defaultSaleDiscount: string;
  defaultPurchaseDiscount: string;
  isSystem: boolean;
  isActive: boolean;
  allowNegativeStock: boolean;
  displayOrder: number;
}

export const DEFAULT_PRODUCT_CATEGORIES = [
  { name: "Frames", printName: "Frames", code: "FRAME", hsnCode: "90049000", cgstPercent: "6.00", sgstPercent: "6.00", igstPercent: "12.00", isStockable: true, defaultSaleDiscount: "0.00", defaultPurchaseDiscount: "0.00", allowNegativeStock: true, order: 1 },
  { name: "Lenses", printName: "Lenses", code: "LENS", hsnCode: "90015000", cgstPercent: "6.00", sgstPercent: "6.00", igstPercent: "12.00", isStockable: true, defaultSaleDiscount: "0.00", defaultPurchaseDiscount: "0.00", allowNegativeStock: true, order: 2 },
  { name: "Contact Lenses", printName: "Contact Lenses", code: "CONTACT_LENS", hsnCode: "90013000", cgstPercent: "6.00", sgstPercent: "6.00", igstPercent: "12.00", isStockable: true, defaultSaleDiscount: "0.00", defaultPurchaseDiscount: "0.00", allowNegativeStock: true, order: 3 },
  { name: "Accessories", printName: "Accessories", code: "ACCESSORY", hsnCode: "90049000", cgstPercent: "9.00", sgstPercent: "9.00", igstPercent: "18.00", isStockable: true, defaultSaleDiscount: "0.00", defaultPurchaseDiscount: "0.00", allowNegativeStock: true, order: 4 },
  { name: "Solutions", printName: "Solutions", code: "SOLUTION", hsnCode: "33079000", cgstPercent: "9.00", sgstPercent: "9.00", igstPercent: "18.00", isStockable: true, defaultSaleDiscount: "0.00", defaultPurchaseDiscount: "0.00", allowNegativeStock: true, order: 5 },
  { name: "Sunglasses", printName: "Sunglasses", code: "SUNGLASSES", hsnCode: "90041000", cgstPercent: "6.00", sgstPercent: "6.00", igstPercent: "12.00", isStockable: true, defaultSaleDiscount: "0.00", defaultPurchaseDiscount: "0.00", allowNegativeStock: true, order: 6 },
];

/**
 * Seed default standard categories for an organization if none exist.
 */
export async function seedDefaultCategoriesForOrg(organizationId: string) {
  for (const cat of DEFAULT_PRODUCT_CATEGORIES) {
    await db
      .insert(productCategories)
      .values({
        organizationId,
        name: cat.name,
        printName: cat.printName,
        code: cat.code,
        hsnCode: cat.hsnCode,
        cgstPercent: cat.cgstPercent,
        sgstPercent: cat.sgstPercent,
        igstPercent: cat.igstPercent,
        isStockable: cat.isStockable,
        defaultSaleDiscount: cat.defaultSaleDiscount,
        defaultPurchaseDiscount: cat.defaultPurchaseDiscount,
        isSystem: true,
        isActive: true,
        allowNegativeStock: cat.allowNegativeStock,
        displayOrder: cat.order,
      })
      .onConflictDoNothing();
  }
}

/**
 * Get all active categories for an organization.
 * Automatically seeds defaults if none exist.
 */
export async function getOrganizationCategories(
  organizationId: string
): Promise<CategoryItem[]> {
  try {
    const categories = await db
      .select()
      .from(productCategories)
      .where(
        and(
          eq(productCategories.organizationId, organizationId),
          eq(productCategories.isActive, true)
        )
      )
      .orderBy(asc(productCategories.displayOrder), asc(productCategories.createdAt));

    if (categories.length === 0) {
      await seedDefaultCategoriesForOrg(organizationId);
      const seeded = await db
        .select()
        .from(productCategories)
        .where(
          and(
            eq(productCategories.organizationId, organizationId),
            eq(productCategories.isActive, true)
          )
        )
        .orderBy(asc(productCategories.displayOrder), asc(productCategories.createdAt));
      return seeded.map((c) => ({
        ...c,
        printName: c.printName || c.name,
        isStockable: c.isStockable ?? true,
        defaultSaleDiscount: String(c.defaultSaleDiscount ?? "0.00"),
        defaultPurchaseDiscount: String(c.defaultPurchaseDiscount ?? "0.00"),
        allowNegativeStock: c.allowNegativeStock ?? true,
      })) as CategoryItem[];
    }

    // Ensure any newly introduced standard categories (e.g. SUNGLASSES) exist
    const existingCodes = new Set(categories.map((c) => c.code.toUpperCase()));
    const missingDefaults = DEFAULT_PRODUCT_CATEGORIES.filter(
      (d) => !existingCodes.has(d.code.toUpperCase())
    );

    if (missingDefaults.length > 0) {
      for (const cat of missingDefaults) {
        await db
          .insert(productCategories)
          .values({
            organizationId,
            name: cat.name,
            printName: cat.printName,
            code: cat.code,
            hsnCode: cat.hsnCode,
            cgstPercent: cat.cgstPercent,
            sgstPercent: cat.sgstPercent,
            igstPercent: cat.igstPercent,
            isStockable: cat.isStockable,
            defaultSaleDiscount: cat.defaultSaleDiscount,
            defaultPurchaseDiscount: cat.defaultPurchaseDiscount,
            isSystem: true,
            isActive: true,
            allowNegativeStock: cat.allowNegativeStock,
            displayOrder: cat.order,
          })
          .onConflictDoNothing();
      }

      const refreshed = await db
        .select()
        .from(productCategories)
        .where(
          and(
            eq(productCategories.organizationId, organizationId),
            eq(productCategories.isActive, true)
          )
        )
        .orderBy(asc(productCategories.displayOrder), asc(productCategories.createdAt));

      return refreshed.map((c) => ({
        ...c,
        printName: c.printName || c.name,
        isStockable: c.isStockable ?? true,
        defaultSaleDiscount: String(c.defaultSaleDiscount ?? "0.00"),
        defaultPurchaseDiscount: String(c.defaultPurchaseDiscount ?? "0.00"),
        allowNegativeStock: c.allowNegativeStock ?? true,
      })) as CategoryItem[];
    }

    return categories.map((c) => ({
      ...c,
      printName: c.printName || c.name,
      isStockable: c.isStockable ?? true,
      defaultSaleDiscount: String(c.defaultSaleDiscount ?? "0.00"),
      defaultPurchaseDiscount: String(c.defaultPurchaseDiscount ?? "0.00"),
      allowNegativeStock: c.allowNegativeStock ?? true,
    })) as CategoryItem[];
  } catch (error) {
    console.error("[CategoryService] Failed to fetch organization categories:", error);
    // Fallback static categories
    return DEFAULT_PRODUCT_CATEGORIES.map((c, i) => ({
      id: `system-cat-${i}`,
      organizationId,
      name: c.name,
      printName: c.printName,
      code: c.code,
      hsnCode: c.hsnCode,
      cgstPercent: c.cgstPercent,
      sgstPercent: c.sgstPercent,
      igstPercent: c.igstPercent,
      isStockable: c.isStockable,
      defaultSaleDiscount: c.defaultSaleDiscount,
      defaultPurchaseDiscount: c.defaultPurchaseDiscount,
      allowNegativeStock: c.allowNegativeStock ?? true,
      isSystem: true,
      isActive: true,
      displayOrder: c.order,
    }));
  }
}

/**
 * Find a specific category by its code (e.g. "FRAME", "LENS", "SUNGLASSES").
 */
export async function getCategoryByCode(
  organizationId: string,
  code: string
): Promise<CategoryItem | null> {
  const normalized = code.trim().toUpperCase();
  const [cat] = await db
    .select()
    .from(productCategories)
    .where(
      and(
        eq(productCategories.organizationId, organizationId),
        eq(productCategories.code, normalized)
      )
    )
    .limit(1);

  if (!cat) {
    const fallback = DEFAULT_PRODUCT_CATEGORIES.find((c) => c.code === normalized);
    if (fallback) {
      return {
        id: `system-cat-${normalized}`,
        organizationId,
        name: fallback.name,
        printName: fallback.printName,
        code: fallback.code,
        hsnCode: fallback.hsnCode,
        cgstPercent: fallback.cgstPercent,
        sgstPercent: fallback.sgstPercent,
        igstPercent: fallback.igstPercent,
        isStockable: fallback.isStockable,
        defaultSaleDiscount: fallback.defaultSaleDiscount,
        defaultPurchaseDiscount: fallback.defaultPurchaseDiscount,
        allowNegativeStock: fallback.allowNegativeStock ?? true,
        isSystem: true,
        isActive: true,
        displayOrder: fallback.order,
      };
    }
    return null;
  }

  return {
    ...cat,
    printName: cat.printName || cat.name,
    isStockable: cat.isStockable ?? true,
    defaultSaleDiscount: String(cat.defaultSaleDiscount ?? "0.00"),
    defaultPurchaseDiscount: String(cat.defaultPurchaseDiscount ?? "0.00"),
    allowNegativeStock: cat.allowNegativeStock ?? true,
  } as CategoryItem;
}

/**
 * Save updated GST rates and HSN codes for existing categories.
 */
export async function saveCategoryGstRates(
  organizationId: string,
  categoriesData: Array<{
    id: string;
    name?: string;
    printName?: string | null;
    hsnCode?: string | null;
    cgstPercent: number | string;
    sgstPercent: number | string;
    igstPercent: number | string;
    isStockable?: boolean;
    defaultSaleDiscount?: number | string;
    defaultPurchaseDiscount?: number | string;
    allowNegativeStock?: boolean;
  }>
) {
  return await db.transaction(async (tx) => {
    for (const item of categoriesData) {
      const cgst = Number(item.cgstPercent || 0).toFixed(2);
      const sgst = Number(item.sgstPercent || 0).toFixed(2);
      const igst = Number(item.igstPercent || 0).toFixed(2);

      await tx
        .update(productCategories)
        .set({
          name: item.name ? item.name.trim() : undefined,
          printName: item.printName !== undefined ? (item.printName ? item.printName.trim() : null) : undefined,
          hsnCode: item.hsnCode !== undefined ? (item.hsnCode ? item.hsnCode.trim() : null) : undefined,
          cgstPercent: cgst,
          sgstPercent: sgst,
          igstPercent: igst,
          isStockable: item.isStockable !== undefined ? item.isStockable : undefined,
          defaultSaleDiscount: item.defaultSaleDiscount !== undefined ? Number(item.defaultSaleDiscount || 0).toFixed(2) : undefined,
          defaultPurchaseDiscount: item.defaultPurchaseDiscount !== undefined ? Number(item.defaultPurchaseDiscount || 0).toFixed(2) : undefined,
          allowNegativeStock: item.allowNegativeStock !== undefined ? item.allowNegativeStock : undefined,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(productCategories.id, item.id),
            eq(productCategories.organizationId, organizationId)
          )
        );
    }
    return { success: true };
  });
}

/**
 * Create a new custom product category for an organization.
 */
export async function createCustomCategory(
  organizationId: string,
  data: {
    name: string;
    printName?: string;
    code?: string;
    hsnCode?: string;
    cgstPercent: number | string;
    sgstPercent: number | string;
    igstPercent: number | string;
    isStockable?: boolean;
    defaultSaleDiscount?: number | string;
    defaultPurchaseDiscount?: number | string;
    allowNegativeStock?: boolean;
    applyToExistingProducts?: boolean;
  }
) {
  const trimmedName = data.name.trim();
  const printName = data.printName?.trim() || trimmedName;
  const generatedCode = (data.code || trimmedName)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 50);

  // Check uniqueness within organization
  const [existing] = await db
    .select({ id: productCategories.id })
    .from(productCategories)
    .where(
      and(
        eq(productCategories.organizationId, organizationId),
        eq(productCategories.code, generatedCode)
      )
    )
    .limit(1);

  if (existing) {
    throw new Error(`Category code "${generatedCode}" already exists.`);
  }

  // Determine next display order
  const [maxOrder] = await db
    .select({ order: productCategories.displayOrder })
    .from(productCategories)
    .where(eq(productCategories.organizationId, organizationId))
    .orderBy(desc(productCategories.displayOrder))
    .limit(1);

  const nextOrder = (maxOrder?.order ?? 5) + 1;

  const [newCategory] = await db
    .insert(productCategories)
    .values({
      organizationId,
      name: trimmedName,
      printName,
      code: generatedCode,
      hsnCode: data.hsnCode ? data.hsnCode.trim() : null,
      cgstPercent: Number(data.cgstPercent || 0).toFixed(2),
      sgstPercent: Number(data.sgstPercent || 0).toFixed(2),
      igstPercent: Number(data.igstPercent || 0).toFixed(2),
      isStockable: data.isStockable !== undefined ? data.isStockable : true,
      defaultSaleDiscount: Number(data.defaultSaleDiscount || 0).toFixed(2),
      defaultPurchaseDiscount: Number(data.defaultPurchaseDiscount || 0).toFixed(2),
      allowNegativeStock: data.allowNegativeStock !== undefined ? data.allowNegativeStock : true,
      isSystem: false,
      isActive: true,
      displayOrder: nextOrder,
    })
    .returning();

  // Retroactively sync to existing inventory if requested
  if (data.applyToExistingProducts) {
    const categoryIdentifiers = [generatedCode, trimmedName];
    const inventoryUpdates: Record<string, any> = {};
    if (data.hsnCode) inventoryUpdates.hsnCode = data.hsnCode.trim();
    if (data.cgstPercent !== undefined) inventoryUpdates.cgstPercent = Number(data.cgstPercent || 0).toFixed(2);
    if (data.sgstPercent !== undefined) inventoryUpdates.sgstPercent = Number(data.sgstPercent || 0).toFixed(2);
    if (data.igstPercent !== undefined) inventoryUpdates.igstPercent = Number(data.igstPercent || 0).toFixed(2);
    if (data.allowNegativeStock !== undefined) inventoryUpdates.allowNegativeStock = data.allowNegativeStock;

    if (Object.keys(inventoryUpdates).length > 0) {
      await db
        .update(inventory)
        .set(inventoryUpdates)
        .where(
          and(
            eq(inventory.organizationId, organizationId),
            or(
              ...categoryIdentifiers.map((id) =>
                sql`LOWER(${inventory.category}) = LOWER(${id})`
              )
            )
          )
        );
    }
  }

  return newCategory;
}

/**
 * Update an existing category's details (Name, Print Name, Code, HSN, Tax, Discounts, Stockable, Allow Negative Stock).
 */
export async function updateCategoryDetails(
  organizationId: string,
  categoryId: string,
  data: {
    name?: string;
    printName?: string;
    code?: string;
    hsnCode?: string | null;
    cgstPercent?: number | string;
    sgstPercent?: number | string;
    igstPercent?: number | string;
    isStockable?: boolean;
    defaultSaleDiscount?: number | string;
    defaultPurchaseDiscount?: number | string;
    allowNegativeStock?: boolean;
    applyToExistingProducts?: boolean;
  }
) {
  const [target] = await db
    .select()
    .from(productCategories)
    .where(
      and(
        eq(productCategories.id, categoryId),
        eq(productCategories.organizationId, organizationId)
      )
    )
    .limit(1);

  if (!target) {
    throw new Error("Category not found.");
  }

  const updates: Record<string, any> = {
    updatedAt: new Date(),
  };

  if (data.name !== undefined) updates.name = data.name.trim();
  if (data.printName !== undefined) updates.printName = data.printName.trim() || data.name?.trim() || null;
  if (data.hsnCode !== undefined) updates.hsnCode = data.hsnCode ? data.hsnCode.trim() : null;
  if (data.cgstPercent !== undefined) updates.cgstPercent = Number(data.cgstPercent || 0).toFixed(2);
  if (data.sgstPercent !== undefined) updates.sgstPercent = Number(data.sgstPercent || 0).toFixed(2);
  if (data.igstPercent !== undefined) updates.igstPercent = Number(data.igstPercent || 0).toFixed(2);
  if (data.isStockable !== undefined) updates.isStockable = data.isStockable;
  if (data.defaultSaleDiscount !== undefined) updates.defaultSaleDiscount = Number(data.defaultSaleDiscount || 0).toFixed(2);
  if (data.defaultPurchaseDiscount !== undefined) updates.defaultPurchaseDiscount = Number(data.defaultPurchaseDiscount || 0).toFixed(2);
  if (data.allowNegativeStock !== undefined) updates.allowNegativeStock = data.allowNegativeStock;

  // Only allow updating code if not system category
  if (!target.isSystem && data.code !== undefined && data.code.trim()) {
    const newCode = data.code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "_").slice(0, 50);
    if (newCode !== target.code) {
      const [existing] = await db
        .select({ id: productCategories.id })
        .from(productCategories)
        .where(
          and(
            eq(productCategories.organizationId, organizationId),
            eq(productCategories.code, newCode)
          )
        )
        .limit(1);
      if (existing) {
        throw new Error(`Category code "${newCode}" is already in use.`);
      }
      updates.code = newCode;
    }
  }

  const [updatedCategory] = await db
    .update(productCategories)
    .set(updates)
    .where(
      and(
        eq(productCategories.id, categoryId),
        eq(productCategories.organizationId, organizationId)
      )
    )
    .returning();

  // Retroactive sync if requested
  if (data.applyToExistingProducts) {
    const categoryIdentifiers = [target.code, target.name];
    if (updatedCategory.code && !categoryIdentifiers.includes(updatedCategory.code)) {
      categoryIdentifiers.push(updatedCategory.code);
    }
    if (updatedCategory.name && !categoryIdentifiers.includes(updatedCategory.name)) {
      categoryIdentifiers.push(updatedCategory.name);
    }

    const inventoryUpdates: Record<string, any> = {};
    if (data.hsnCode !== undefined) inventoryUpdates.hsnCode = data.hsnCode ? data.hsnCode.trim() : null;
    if (data.cgstPercent !== undefined) inventoryUpdates.cgstPercent = Number(data.cgstPercent || 0).toFixed(2);
    if (data.sgstPercent !== undefined) inventoryUpdates.sgstPercent = Number(data.sgstPercent || 0).toFixed(2);
    if (data.igstPercent !== undefined) inventoryUpdates.igstPercent = Number(data.igstPercent || 0).toFixed(2);
    if (data.allowNegativeStock !== undefined) inventoryUpdates.allowNegativeStock = data.allowNegativeStock;

    if (Object.keys(inventoryUpdates).length > 0) {
      await db
        .update(inventory)
        .set(inventoryUpdates)
        .where(
          and(
            eq(inventory.organizationId, organizationId),
            or(
              ...categoryIdentifiers.map((id) =>
                sql`LOWER(${inventory.category}) = LOWER(${id})`
              )
            )
          )
        );
    }
  }

  return updatedCategory;
}

/**
 * Delete a custom category (system categories cannot be deleted).
 */
export async function deleteCustomCategory(
  organizationId: string,
  categoryId: string
) {
  const [target] = await db
    .select()
    .from(productCategories)
    .where(
      and(
        eq(productCategories.id, categoryId),
        eq(productCategories.organizationId, organizationId)
      )
    )
    .limit(1);

  if (!target) {
    throw new Error("Category not found.");
  }

  if (target.isSystem) {
    throw new Error("Default system categories cannot be deleted.");
  }

  await db
    .delete(productCategories)
    .where(
      and(
        eq(productCategories.id, categoryId),
        eq(productCategories.organizationId, organizationId)
      )
    );

  return { success: true };
}
