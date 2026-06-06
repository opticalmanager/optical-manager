"use server";

import { db } from "@/lib/drizzle";
import { invoices, shops } from "@/db/schema";
import { eq, and, ilike, sql } from "drizzle-orm";
import type { Invoice, NewInvoice } from "@/types";

/**
 * Generate a sequential invoice number in the format INV-shopNum-YYYY-NNNN.
 */
export async function generateInvoiceNumber(shopId: string): Promise<string> {
  // Fetch current shop organizationId
  const [shop] = await db
    .select({
      organizationId: shops.organizationId,
    })
    .from(shops)
    .where(eq(shops.id, shopId))
    .limit(1);

  if (!shop) {
    throw new Error(`Shop with ID ${shopId} not found.`);
  }

  // Determine shop sequence number within the organization
  const orgShops = await db
    .select({ id: shops.id })
    .from(shops)
    .where(eq(shops.organizationId, shop.organizationId))
    .orderBy(shops.createdAt);

  const shopIndex = orgShops.findIndex((s) => s.id === shopId);
  const shopNum = shopIndex !== -1 ? shopIndex + 1 : 1;

  const currentYear = new Date().getFullYear().toString();
  const pattern = `INV-${shopNum}-${currentYear}-%`;

  const [lastInvoice] = await db
    .select({
      invoiceNumber: invoices.invoiceNumber,
    })
    .from(invoices)
    .where(
      and(
        eq(invoices.shopId, shopId),
        ilike(invoices.invoiceNumber, pattern)
      )
    )
    .orderBy(sql`invoice_number DESC`)
    .limit(1);

  let nextSerial = 1;
  if (lastInvoice?.invoiceNumber) {
    const parts = lastInvoice.invoiceNumber.split("-");
    // Format: INV-shopNum-year-serial (length 4)
    if (parts.length === 4) {
      const lastSerialStr = parts[3];
      const lastSerial = parseInt(lastSerialStr, 10);
      if (!isNaN(lastSerial)) {
        nextSerial = lastSerial + 1;
      }
    } else {
      // Fallback for old format or custom strings
      const lastSerialStr = parts[parts.length - 1];
      const lastSerial = parseInt(lastSerialStr, 10);
      if (!isNaN(lastSerial)) {
        nextSerial = lastSerial + 1;
      }
    }
  }

  const paddedSerial = nextSerial.toString().padStart(4, "0");
  return `INV-${shopNum}-${currentYear}-${paddedSerial}`;
}

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
