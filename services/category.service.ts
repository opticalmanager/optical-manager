import { db } from "@/lib/drizzle";
import { productCategories } from "@/db/schema";
import { eq, and, sql, desc, asc } from "drizzle-orm";

export interface CategoryItem {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  hsnCode: string | null;
  cgstPercent: string;
  sgstPercent: string;
  igstPercent: string;
  isSystem: boolean;
  isActive: boolean;
  displayOrder: number;
}

export const DEFAULT_PRODUCT_CATEGORIES = [
  { name: "Frames", code: "FRAME", hsnCode: "90049000", cgstPercent: "6.00", sgstPercent: "6.00", igstPercent: "12.00", order: 1 },
  { name: "Lenses", code: "LENS", hsnCode: "90015000", cgstPercent: "6.00", sgstPercent: "6.00", igstPercent: "12.00", order: 2 },
  { name: "Contact Lenses", code: "CONTACT_LENS", hsnCode: "90013000", cgstPercent: "6.00", sgstPercent: "6.00", igstPercent: "12.00", order: 3 },
  { name: "Accessories", code: "ACCESSORY", hsnCode: "90049000", cgstPercent: "9.00", sgstPercent: "9.00", igstPercent: "18.00", order: 4 },
  { name: "Solutions", code: "SOLUTION", hsnCode: "33079000", cgstPercent: "9.00", sgstPercent: "9.00", igstPercent: "18.00", order: 5 },
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
        code: cat.code,
        hsnCode: cat.hsnCode,
        cgstPercent: cat.cgstPercent,
        sgstPercent: cat.sgstPercent,
        igstPercent: cat.igstPercent,
        isSystem: true,
        isActive: true,
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
      return db
        .select()
        .from(productCategories)
        .where(
          and(
            eq(productCategories.organizationId, organizationId),
            eq(productCategories.isActive, true)
          )
        )
        .orderBy(asc(productCategories.displayOrder), asc(productCategories.createdAt));
    }

    return categories as CategoryItem[];
  } catch (error) {
    console.error("[CategoryService] Failed to fetch organization categories:", error);
    // Fallback static categories
    return DEFAULT_PRODUCT_CATEGORIES.map((c, i) => ({
      id: `system-cat-${i}`,
      organizationId,
      name: c.name,
      code: c.code,
      hsnCode: c.hsnCode,
      cgstPercent: c.cgstPercent,
      sgstPercent: c.sgstPercent,
      igstPercent: c.igstPercent,
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
        code: fallback.code,
        hsnCode: fallback.hsnCode,
        cgstPercent: fallback.cgstPercent,
        sgstPercent: fallback.sgstPercent,
        igstPercent: fallback.igstPercent,
        isSystem: true,
        isActive: true,
        displayOrder: fallback.order,
      };
    }
    return null;
  }

  return cat as CategoryItem;
}

/**
 * Save updated GST rates and HSN codes for existing categories.
 */
export async function saveCategoryGstRates(
  organizationId: string,
  categoriesData: Array<{
    id: string;
    name?: string;
    hsnCode?: string | null;
    cgstPercent: number | string;
    sgstPercent: number | string;
    igstPercent: number | string;
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
          hsnCode: item.hsnCode !== undefined ? (item.hsnCode ? item.hsnCode.trim() : null) : undefined,
          cgstPercent: cgst,
          sgstPercent: sgst,
          igstPercent: igst,
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
    code?: string;
    hsnCode?: string;
    cgstPercent: number | string;
    sgstPercent: number | string;
    igstPercent: number | string;
  }
) {
  const trimmedName = data.name.trim();
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
      code: generatedCode,
      hsnCode: data.hsnCode ? data.hsnCode.trim() : null,
      cgstPercent: Number(data.cgstPercent || 0).toFixed(2),
      sgstPercent: Number(data.sgstPercent || 0).toFixed(2),
      igstPercent: Number(data.igstPercent || 0).toFixed(2),
      isSystem: false,
      isActive: true,
      displayOrder: nextOrder,
    })
    .returning();

  return newCategory;
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
