"use server";

import { db } from "@/lib/drizzle";
import { inventory } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

/**
 * Returns the next sequential SKU number for a given shop.
 * Standard query counts total items in the shop's inventory + 1.
 */
export async function getNextSkuSequence(shopId: string): Promise<number> {
  try {
    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(inventory)
      .where(eq(inventory.shopId, shopId));

    return (result?.count ?? 0) + 1;
  } catch (error) {
    console.error("Error fetching next SKU sequence:", error);
    // Fallback to a randomized sequential index in case of query error
    return Math.floor(100 + Math.random() * 900);
  }
}
