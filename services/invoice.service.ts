"use server";

import { db } from "@/lib/drizzle";
import { invoices, shops } from "@/db/schema";
import { eq, and, ilike, desc } from "drizzle-orm";
import type { Invoice, NewInvoice } from "@/types";
import {
  DEFAULT_DOCUMENT_SERIES,
  buildSeriesPrefix,
  formatDocumentNumber,
  extractTrailingSerial,
} from "@/utils/document-series";

/**
 * Generate a sequential invoice number supporting custom series or standard INV-shopNum-YYYY-NNNN.
 */
export async function generateInvoiceNumber(shopId: string): Promise<string> {
  // Fetch current shop organizationId and custom settings
  const [shop] = await db
    .select({
      organizationId: shops.organizationId,
      settings: shops.settings,
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

  // Retrieve custom configuration or fall back to standard default
  const customConfig = (shop.settings as any)?.documentSeries?.invoice;
  const config = customConfig
    ? { ...DEFAULT_DOCUMENT_SERIES.invoice, ...customConfig }
    : DEFAULT_DOCUMENT_SERIES.invoice;

  const now = new Date();
  const seriesPrefix = buildSeriesPrefix(config, shopNum, now);

  // Query most recent invoice matching this series prefix
  const [lastInvoice] = await db
    .select({
      invoiceNumber: invoices.invoiceNumber,
    })
    .from(invoices)
    .where(
      and(
        eq(invoices.shopId, shopId),
        ilike(invoices.invoiceNumber, `${seriesPrefix}%`)
      )
    )
    .orderBy(desc(invoices.createdAt), desc(invoices.invoiceNumber))
    .limit(1);

  // Extract last serial from DB if exists
  let lastDbSerial: number | null = null;
  if (lastInvoice?.invoiceNumber) {
    lastDbSerial = extractTrailingSerial(lastInvoice.invoiceNumber, seriesPrefix);
  }

  // Anti-collision safeguard: ensure next number is at least lastDbSerial + 1
  const configuredNext =
    typeof config.nextNumber === "number" && config.nextNumber > 0
      ? config.nextNumber
      : 1;

  const nextSerial =
    lastDbSerial !== null
      ? Math.max(configuredNext, lastDbSerial + 1)
      : configuredNext;

  return formatDocumentNumber(config, nextSerial, shopNum, now);
}

/**
 * Generate sequential invoice numbers in batch for a shop.
 */
export async function generateBatchInvoiceNumbers(
  shopId: string,
  count: number,
  tx: any = db
): Promise<string[]> {
  if (count <= 0) return [];

  const [shop] = await tx
    .select({
      organizationId: shops.organizationId,
      settings: shops.settings,
    })
    .from(shops)
    .where(eq(shops.id, shopId))
    .limit(1);

  if (!shop) {
    throw new Error(`Shop with ID ${shopId} not found.`);
  }

  const orgShops = await tx
    .select({ id: shops.id })
    .from(shops)
    .where(eq(shops.organizationId, shop.organizationId))
    .orderBy(shops.createdAt);

  const shopIndex = orgShops.findIndex((s: any) => s.id === shopId);
  const shopNum = shopIndex !== -1 ? shopIndex + 1 : 1;

  const customConfig = (shop.settings as any)?.documentSeries?.invoice;
  const config = customConfig
    ? { ...DEFAULT_DOCUMENT_SERIES.invoice, ...customConfig }
    : DEFAULT_DOCUMENT_SERIES.invoice;

  const now = new Date();
  const seriesPrefix = buildSeriesPrefix(config, shopNum, now);

  const [lastInvoice] = await tx
    .select({
      invoiceNumber: invoices.invoiceNumber,
    })
    .from(invoices)
    .where(
      and(
        eq(invoices.shopId, shopId),
        ilike(invoices.invoiceNumber, `${seriesPrefix}%`)
      )
    )
    .orderBy(desc(invoices.createdAt), desc(invoices.invoiceNumber))
    .limit(1);

  let lastDbSerial: number | null = null;
  if (lastInvoice?.invoiceNumber) {
    lastDbSerial = extractTrailingSerial(lastInvoice.invoiceNumber, seriesPrefix);
  }

  const configuredNext =
    typeof config.nextNumber === "number" && config.nextNumber > 0
      ? config.nextNumber
      : 1;

  let startSerial =
    lastDbSerial !== null
      ? Math.max(configuredNext, lastDbSerial + 1)
      : configuredNext;

  const invoiceNumbers: string[] = [];
  for (let i = 0; i < count; i++) {
    invoiceNumbers.push(
      formatDocumentNumber(config, startSerial + i, shopNum, now)
    );
  }

  return invoiceNumbers;
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
  if (!id || !organizationId) return null;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const condition = isUuid ? eq(invoices.id, id) : eq(invoices.invoiceNumber, id);

  const [invoice] = await db
    .select()
    .from(invoices)
    .where(and(condition, eq(invoices.organizationId, organizationId)))
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
