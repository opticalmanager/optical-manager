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
/**
 * Generate a sequential receipt number in the format PPS-shopNum-YYYY-NNNN.
 * Uses numerical length sorting and org-scoped anti-collision to prevent duplicate key violations.
 */
export async function generateReceiptNumber(shopId: string, tx: any = db): Promise<string> {
  const [shop] = await (tx || db)
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
  const orgShops = await (tx || db)
    .select({ id: shops.id })
    .from(shops)
    .where(eq(shops.organizationId, shop.organizationId))
    .orderBy(shops.createdAt);

  const shopIndex = orgShops.findIndex((s: any) => s.id === shopId);
  const shopNum = shopIndex !== -1 ? shopIndex + 1 : 1;

  const currentYear = new Date().getFullYear().toString();
  const seriesPrefix = `PPS-${shopNum}-${currentYear}-`;

  // Sort by string length DESC, then receiptNumber DESC to guarantee highest numerical serials first
  const candidateReceipts = await (tx || db)
    .select({
      receiptNumber: receipts.receiptNumber,
    })
    .from(receipts)
    .where(
      and(
        eq(receipts.organizationId, shop.organizationId),
        ilike(receipts.receiptNumber, `${seriesPrefix}%`)
      )
    )
    .orderBy(
      sql`length(${receipts.receiptNumber}) DESC`,
      desc(receipts.receiptNumber)
    )
    .limit(50);

  let maxDbSerial: number | null = null;
  for (const rcpt of candidateReceipts) {
    if (rcpt?.receiptNumber) {
      const parts = rcpt.receiptNumber.split("-");
      if (parts.length >= 4) {
        const lastSerial = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastSerial)) {
          if (maxDbSerial === null || lastSerial > maxDbSerial) {
            maxDbSerial = lastSerial;
          }
        }
      }
    }
  }

  let nextSerial = maxDbSerial !== null ? maxDbSerial + 1 : 1;
  let candidateNumber = `PPS-${shopNum}-${currentYear}-${nextSerial.toString().padStart(4, "0")}`;

  // Collision probe against database
  let probes = 0;
  while (probes < 100) {
    const [existing] = await (tx || db)
      .select({ id: receipts.id })
      .from(receipts)
      .where(
        and(
          eq(receipts.organizationId, shop.organizationId),
          eq(receipts.receiptNumber, candidateNumber)
        )
      )
      .limit(1);

    if (!existing) {
      break;
    }

    nextSerial++;
    candidateNumber = `PPS-${shopNum}-${currentYear}-${nextSerial.toString().padStart(4, "0")}`;
    probes++;
  }

  return candidateNumber;
}

/**
 * Generate a sequential order number supporting custom series or standard ORD-shopNum-YYYY-NNNN.
 * Uses numerical length sorting and org-scoped anti-collision to prevent duplicate key violations.
 */
export async function generateOrderNumber(
  shopId: string,
  tx: any = db,
  invoiceNumber?: string
): Promise<string> {
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
  const orgShops = await (tx || db)
    .select({ id: shops.id })
    .from(shops)
    .where(eq(shops.organizationId, shop.organizationId))
    .orderBy(shops.createdAt);

  const shopIndex = orgShops.findIndex((s: any) => s.id === shopId);
  const shopNum = shopIndex !== -1 ? shopIndex + 1 : 1;

  const now = new Date();
  const seriesPrefix = buildSeriesPrefix(config, shopNum, now);

  // Sort by string length DESC, then orderNumber DESC to guarantee highest numerical values first
  const candidateOrders = await (tx || db)
    .select({
      orderNumber: orders.orderNumber,
    })
    .from(orders)
    .where(
      and(
        eq(orders.organizationId, shop.organizationId),
        ilike(orders.orderNumber, `${seriesPrefix}%`)
      )
    )
    .orderBy(
      sql`length(${orders.orderNumber}) DESC`,
      desc(orders.orderNumber)
    )
    .limit(50);

  // Extract true maximum serial from DB
  let maxDbSerial: number | null = null;
  for (const ord of candidateOrders) {
    if (ord?.orderNumber) {
      const parsed = extractTrailingSerial(ord.orderNumber, seriesPrefix);
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

  // Proactive anti-collision probe: verify that candidate orderNumber does NOT exist
  // anywhere in this organization. If it does, increment serial until a guaranteed unique number is found.
  let collisionProbes = 0;
  while (collisionProbes < 100) {
    const [existing] = await (tx || db)
      .select({ id: orders.id })
      .from(orders)
      .where(
        and(
          eq(orders.organizationId, shop.organizationId),
          eq(orders.orderNumber, formattedNumber)
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
