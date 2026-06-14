"use server";

import { db } from "@/lib/drizzle";
import { receipts, orders, shops } from "@/db/schema";
import { eq, and, ilike, sql } from "drizzle-orm";

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
 * Generate a sequential order number in the format ORD-shopNum-YYYY-NNNN.
 */
export async function generateOrderNumber(shopId: string, tx: any = db): Promise<string> {
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
  const pattern = `ORD-${shopNum}-${currentYear}-%`;

  const [lastOrder] = await tx
    .select({
      orderNumber: orders.orderNumber,
    })
    .from(orders)
    .where(
      and(
        eq(orders.shopId, shopId),
        ilike(orders.orderNumber, pattern)
      )
    )
    .orderBy(sql`order_number DESC`)
    .limit(1);

  let nextSerial = 1;
  if (lastOrder?.orderNumber) {
    const parts = lastOrder.orderNumber.split("-");
    if (parts.length === 4) {
      const lastSerial = parseInt(parts[3], 10);
      if (!isNaN(lastSerial)) {
        nextSerial = lastSerial + 1;
      }
    }
  }

  const paddedSerial = nextSerial.toString().padStart(4, "0");
  return `ORD-${shopNum}-${currentYear}-${paddedSerial}`;
}

/**
 * Fetch a receipt by ID.
 */
export async function getReceiptById(id: string, organizationId: string) {
  const [receipt] = await db
    .select()
    .from(receipts)
    .where(
      and(
        eq(receipts.id, id),
        eq(receipts.organizationId, organizationId)
      )
    )
    .limit(1);

  return receipt ?? null;
}
