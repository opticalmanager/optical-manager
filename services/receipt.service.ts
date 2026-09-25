"use server";

import { db } from "@/lib/drizzle";
import { receipts, orders, shops } from "@/db/schema";
import { eq, and, ilike, sql, desc } from "drizzle-orm";
import {
  DEFAULT_DOCUMENT_SERIES,
  buildSeriesPrefix,
  formatDocumentNumber,
  extractTrailingSerial,
} from "@/utils/document-series";

/**
 * Generate a sequential receipt number in the format PPS-shopNum-YYYY-NNNN.
 */
export async function generateReceiptNumber(shopId: string, tx: any = db): Promise<string> {
  const [shop] = await tx
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
  const orgShops = await tx
    .select({ id: shops.id })
    .from(shops)
    .where(eq(shops.organizationId, shop.organizationId))
    .orderBy(shops.createdAt);

  const shopIndex = orgShops.findIndex((s: any) => s.id === shopId);
  const shopNum = shopIndex !== -1 ? shopIndex + 1 : 1;

  const currentYear = new Date().getFullYear().toString();
  const pattern = `PPS-${shopNum}-${currentYear}-%`;

  const [lastReceipt] = await tx
    .select({
      receiptNumber: receipts.receiptNumber,
    })
    .from(receipts)
    .where(
      and(
        eq(receipts.shopId, shopId),
        ilike(receipts.receiptNumber, pattern)
      )
    )
    .orderBy(sql`receipt_number DESC`)
    .limit(1);

  let nextSerial = 1;
  if (lastReceipt?.receiptNumber) {
    const parts = lastReceipt.receiptNumber.split("-");
    if (parts.length === 4) {
      const lastSerial = parseInt(parts[3], 10);
      if (!isNaN(lastSerial)) {
        nextSerial = lastSerial + 1;
      }
    }
  }

  const paddedSerial = nextSerial.toString().padStart(4, "0");
  return `PPS-${shopNum}-${currentYear}-${paddedSerial}`;
}

/**
 * Generate a sequential order number supporting custom series or standard ORD-shopNum-YYYY-NNNN.
 */
export async function generateOrderNumber(
  shopId: string,
  tx: any = db,
  invoiceNumber?: string
): Promise<string> {
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

  // Retrieve custom configuration or fall back to standard default
  const customConfig = (shop.settings as any)?.documentSeries?.order;

  // If configured to match invoice number and an invoice number is provided, return directly
  if (customConfig?.matchInvoice && invoiceNumber) {
    return invoiceNumber;
  }

  const config = customConfig
    ? { ...DEFAULT_DOCUMENT_SERIES.order, ...customConfig }
    : DEFAULT_DOCUMENT_SERIES.order;

  // Determine shop sequence number within the organization
  const orgShops = await tx
    .select({ id: shops.id })
    .from(shops)
    .where(eq(shops.organizationId, shop.organizationId))
    .orderBy(shops.createdAt);

  const shopIndex = orgShops.findIndex((s: any) => s.id === shopId);
  const shopNum = shopIndex !== -1 ? shopIndex + 1 : 1;

  const now = new Date();
  const seriesPrefix = buildSeriesPrefix(config, shopNum, now);

  const [lastOrder] = await tx
    .select({
      orderNumber: orders.orderNumber,
    })
    .from(orders)
    .where(
      and(
        eq(orders.shopId, shopId),
        ilike(orders.orderNumber, `${seriesPrefix}%`)
      )
    )
    .orderBy(desc(orders.createdAt), desc(orders.orderNumber))
    .limit(1);

  // Extract last serial from DB if exists
  let lastDbSerial: number | null = null;
  if (lastOrder?.orderNumber) {
    lastDbSerial = extractTrailingSerial(lastOrder.orderNumber, seriesPrefix);
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
 * Fetch a receipt by ID.
 */
export async function getReceiptById(id: string, organizationId: string) {
  if (!id || !organizationId) return null;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const condition = isUuid ? eq(receipts.id, id) : eq(receipts.receiptNumber, id);

  const [receipt] = await db
    .select()
    .from(receipts)
    .where(
      and(
        condition,
        eq(receipts.organizationId, organizationId)
      )
    )
    .limit(1);

  return receipt ?? null;
}
