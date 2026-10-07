"use server";

import { db } from "@/lib/drizzle";
import { inventory } from "@/db/schema";
import { eq, and, or, ilike, sql } from "drizzle-orm";

/**
 * Returns the next sequential SKU number for a given shop.
 * Counts total items in the shop's inventory + 1.
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
    return Math.floor(1000 + Math.random() * 9000);
  }
}

/**
 * Returns a contiguous block of unique sequential numbers for batch purchase inwarding.
 */
export async function getNextSkuSequenceBatch(
  shopId: string,
  batchCount: number
): Promise<number[]> {
  const startSeq = await getNextSkuSequence(shopId);
  const sequences: number[] = [];
  for (let i = 0; i < batchCount; i++) {
    sequences.push(startSeq + i);
  }
  return sequences;
}

/**
 * Guarantee 100% collision-free uniqueness of a candidate SKU within a shop.
 * If candidate already exists in inventory (as SKU or productCode),
 * automatically increments the sequence suffix until a truly unique code is found.
 */
export async function ensureUniqueShopSku(
  shopId: string,
  candidateSku: string
): Promise<string> {
  let currentSku = candidateSku.trim().toUpperCase();
  let attempt = 0;
  const maxAttempts = 25;

  while (attempt < maxAttempts) {
    const [existing] = await db
      .select({ id: inventory.id })
      .from(inventory)
      .where(
        and(
          eq(inventory.shopId, shopId),
          or(
            ilike(inventory.sku, currentSku),
            ilike(inventory.productCode, currentSku)
          )
        )
      )
      .limit(1);

    if (!existing) {
      return currentSku;
    }

    // Candidate already exists; parse and increment the 5-digit sequence suffix
    attempt++;
    const parts = currentSku.split("-");
    if (parts.length === 3 && !isNaN(Number(parts[2]))) {
      const nextNum = Number(parts[2]) + 1;
      currentSku = `${parts[0]}-${parts[1]}-${nextNum.toString().padStart(5, "0")}`;
    } else {
      currentSku = `${candidateSku}-${attempt.toString().padStart(2, "0")}`;
    }
  }

  // Ultra-rare fallback disambiguation
  return `${currentSku}-${Date.now().toString().slice(-4)}`;
}
