"use server";

import { db } from "@/lib/drizzle";
import { invoices } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import type { Invoice, NewInvoice } from "@/types";

/**
 * Get all invoices for a shop.
 */
export async function getInvoicesByShop(shopId: string): Promise<Invoice[]> {
  return db
    .select()
    .from(invoices)
    .where(eq(invoices.shopId, shopId))
    .orderBy(invoices.createdAt);
}

/**
 * Get all invoices for an organization (OWNER access).
 */
export async function getInvoicesByOrganization(
  organizationId: string
): Promise<Invoice[]> {
  return db
    .select()
    .from(invoices)
    .where(eq(invoices.organizationId, organizationId))
    .orderBy(invoices.createdAt);
}

/**
 * Get a single invoice by ID.
 */
export async function getInvoiceById(
  id: string,
  organizationId: string
): Promise<Invoice | null> {
  const [invoice] = await db
    .select()
    .from(invoices)
    .where(
      and(eq(invoices.id, id), eq(invoices.organizationId, organizationId))
    )
    .limit(1);

  return invoice ?? null;
}

/**
 * Create a new invoice.
 */
export async function createInvoice(data: NewInvoice): Promise<Invoice> {
  const [invoice] = await db.insert(invoices).values(data).returning();
  return invoice;
}

/**
 * Update an invoice.
 */
export async function updateInvoice(
  id: string,
  organizationId: string,
  data: Partial<NewInvoice>
): Promise<Invoice> {
  const [invoice] = await db
    .update(invoices)
    .set({ ...data, updatedAt: new Date() })
    .where(
      and(eq(invoices.id, id), eq(invoices.organizationId, organizationId))
    )
    .returning();

  return invoice;
}
