"use server";

import { db } from "@/lib/drizzle";
import { shops } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import type { Shop, NewShop } from "@/types";

/**
 * Get all shops for an organization.
 */
export async function getShopsByOrganization(
  organizationId: string
): Promise<Shop[]> {
  return db
    .select()
    .from(shops)
    .where(eq(shops.organizationId, organizationId))
    .orderBy(shops.createdAt);
}

/**
 * Get a single shop by ID (scoped to organization).
 */
export async function getShopById(
  id: string,
  organizationId: string
): Promise<Shop | null> {
  const [shop] = await db
    .select()
    .from(shops)
    .where(and(eq(shops.id, id), eq(shops.organizationId, organizationId)))
    .limit(1);

  return shop ?? null;
}

/**
 * Create a new shop under an organization.
 */
export async function createShop(data: NewShop): Promise<Shop> {
  const [shop] = await db.insert(shops).values(data).returning();
  return shop;
}

/**
 * Update a shop.
 */
export async function updateShop(
  id: string,
  organizationId: string,
  data: Partial<NewShop>
): Promise<Shop> {
  const [shop] = await db
    .update(shops)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(shops.id, id), eq(shops.organizationId, organizationId)))
    .returning();

  return shop;
}

/**
 * Count shops for an organization.
 */
export async function countShops(organizationId: string): Promise<number> {
  const result = await db
    .select()
    .from(shops)
    .where(eq(shops.organizationId, organizationId));

  return result.length;
}
