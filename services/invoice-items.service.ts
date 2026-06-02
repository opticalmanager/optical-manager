"use server";

import { db } from "@/lib/drizzle";
import { invoiceItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { InvoiceItem, NewInvoiceItem } from "@/types";

/**
 * Create multiple invoice items in a batch.
 */
export async function createInvoiceItems(
  data: NewInvoiceItem[]
): Promise<InvoiceItem[]> {
  if (data.length === 0) return [];
  return db.insert(invoiceItems).values(data).returning();
}

/**
 * Get all line items for a specific invoice.
 */
export async function getInvoiceItems(invoiceId: string): Promise<InvoiceItem[]> {
  return db
    .select()
    .from(invoiceItems)
    .where(eq(invoiceItems.invoiceId, invoiceId))
    .orderBy(invoiceItems.createdAt);
}

/**
 * Delete all line items for an invoice.
 */
export async function deleteInvoiceItemsByInvoiceId(
  invoiceId: string
): Promise<void> {
  await db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId));
}
