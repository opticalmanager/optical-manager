"use server";

import { db } from "@/lib/drizzle";
import { invoices, shops } from "@/db/schema";
import { eq, and, ilike, desc, sql } from "drizzle-orm";
import type { Invoice, NewInvoice } from "@/types";
import {
  DEFAULT_DOCUMENT_SERIES,
  buildSeriesPrefix,
  formatDocumentNumber,
  extractTrailingSerial,
} from "@/utils/document-series";

/**
 * Generate a sequential invoice number supporting custom series or standard INV-shopNum-YYYY-NNNN.
 * Uses numerical length sorting and org-scoped anti-collision to prevent duplicate key violations.
 */
export async function generateInvoiceNumber(
  shopId: string,
  tx: any = db
): Promise<string> {
  // Fetch current shop organizationId and custom settings
  const [shop] = await (tx || db)
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
  const orgShops = await (tx || db)
    .select({ id: shops.id })
    .from(shops)
    .where(eq(shops.organizationId, shop.organizationId))
    .orderBy(shops.createdAt);

  const shopIndex = orgShops.findIndex((s: any) => s.id === shopId);
  const shopNum = shopIndex !== -1 ? shopIndex + 1 : 1;

  // Retrieve custom configuration or fall back to standard default
  const customConfig = (shop.settings as any)?.documentSeries?.invoice;
  const config = customConfig
    ? { ...DEFAULT_DOCUMENT_SERIES.invoice, ...customConfig }
    : DEFAULT_DOCUMENT_SERIES.invoice;

  const now = new Date();
  const seriesPrefix = buildSeriesPrefix(config, shopNum, now);

  // Robust maximum serial search:
  // Sort by string length DESC, then invoiceNumber DESC to guarantee highest numerical
  // values appear first regardless of any future-dated or back-dated createdAt timestamps.
  const candidateInvoices = await (tx || db)
    .select({
      invoiceNumber: invoices.invoiceNumber,
    })
    .from(invoices)
    .where(
      and(
        eq(invoices.organizationId, shop.organizationId),
        ilike(invoices.invoiceNumber, `${seriesPrefix}%`)
      )
    )
    .orderBy(
      sql`length(${invoices.invoiceNumber}) DESC`,
      desc(invoices.invoiceNumber)
    )
    .limit(50);

  // Extract the true maximum numerical serial from DB
  let maxDbSerial: number | null = null;
  for (const inv of candidateInvoices) {
    if (inv?.invoiceNumber) {
      const parsed = extractTrailingSerial(inv.invoiceNumber, seriesPrefix);
      if (parsed !== null) {
        if (maxDbSerial === null || parsed > maxDbSerial) {
          maxDbSerial = parsed;
        }
      }
    }
  }

  // Anti-collision safeguard: ensure next number is at least maxDbSerial + 1
  const configuredNext =
    typeof config.nextNumber === "number" && config.nextNumber > 0
      ? config.nextNumber
      : 1;

  let nextSerial =
    maxDbSerial !== null
      ? Math.max(configuredNext, maxDbSerial + 1)
      : configuredNext;

  let formattedNumber = formatDocumentNumber(config, nextSerial, shopNum, now);

  // Proactive anti-collision probe: verify that candidate number does NOT exist
  // anywhere in this organization. If it does (e.g. legacy/imported gaps),
  // increment serial until a guaranteed unique number is found.
  let collisionProbes = 0;
  while (collisionProbes < 100) {
    const [existing] = await (tx || db)
      .select({ id: invoices.id })
      .from(invoices)
      .where(
        and(
          eq(invoices.organizationId, shop.organizationId),
          eq(invoices.invoiceNumber, formattedNumber)
        )
      )
      .limit(1);

    if (!existing) {
      break;
    }

    nextSerial++;
    formattedNumber = formatDocumentNumber(config, nextSerial, shopNum, now);
    collisionProbes++;
  }

  return formattedNumber;
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

  const [shop] = await (tx || db)
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

  const orgShops = await (tx || db)
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

  const candidateInvoices = await (tx || db)
    .select({
      invoiceNumber: invoices.invoiceNumber,
    })
    .from(invoices)
    .where(
      and(
        eq(invoices.organizationId, shop.organizationId),
        ilike(invoices.invoiceNumber, `${seriesPrefix}%`)
      )
    )
    .orderBy(
      sql`length(${invoices.invoiceNumber}) DESC`,
      desc(invoices.invoiceNumber)
    )
    .limit(50);

  let maxDbSerial: number | null = null;
  for (const inv of candidateInvoices) {
    if (inv?.invoiceNumber) {
      const parsed = extractTrailingSerial(inv.invoiceNumber, seriesPrefix);
      if (parsed !== null) {
        if (maxDbSerial === null || parsed > maxDbSerial) {
          maxDbSerial = parsed;
        }
      }
    }
  }

  const configuredNext =
    typeof config.nextNumber === "number" && config.nextNumber > 0
      ? config.nextNumber
      : 1;

  let currentSerial =
    maxDbSerial !== null
      ? Math.max(configuredNext, maxDbSerial + 1)
      : configuredNext;

  const invoiceNumbers: string[] = [];
  for (let i = 0; i < count; i++) {
    let formattedNumber = formatDocumentNumber(config, currentSerial, shopNum, now);

    // Collision check per batch item
    let probes = 0;
    while (probes < 100) {
      const [existing] = await (tx || db)
        .select({ id: invoices.id })
        .from(invoices)
        .where(
          and(
            eq(invoices.organizationId, shop.organizationId),
            eq(invoices.invoiceNumber, formattedNumber)
          )
        )
        .limit(1);

      if (!existing && !invoiceNumbers.includes(formattedNumber)) {
        break;
      }

      currentSerial++;
      formattedNumber = formatDocumentNumber(config, currentSerial, shopNum, now);
      probes++;
    }

    invoiceNumbers.push(formattedNumber);
    currentSerial++;
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
export async function createInvoice(data: NewInvoice, tx: any = db): Promise<Invoice> {
  const [invoice] = await (tx || db).insert(invoices).values(data).returning();
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
