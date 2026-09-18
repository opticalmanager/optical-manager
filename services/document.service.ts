"use server";

import { db } from "@/lib/drizzle";
import { invoices, invoiceItems, inventory, orders, receipts } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getInvoiceById } from "./invoice.service";
import { getShopById } from "./shop.service";
import { getCustomerById } from "./customer.service";
import { getPrescriptionsByCustomer } from "./prescription.service";
import { getReceiptById } from "./receipt.service";
import type { Invoice, Shop, Customer, Prescription, Receipt, Order } from "@/types";

export interface LineItemWithInventory {
  id: string;
  description: string;
  quantity: number;
  unitPrice: string;
  subtotal: string;
  discountPercent: string;
  discountAmount: string;
  cgstPercent: string;
  cgstAmount: string;
  sgstPercent: string;
  sgstAmount: string;
  igstPercent: string;
  igstAmount: string;
  createdAt: Date;
  inventoryId: string | null;
  sku: string | null;
  brand: string | null;
  hsnCode: string | null;
  category: string | null;
}

export interface DocumentData {
  invoice: Invoice;
  shop: Shop | null;
  customer: Customer | null;
  lineItems: LineItemWithInventory[];
  prescriptions: Prescription[];
  receipt?: Receipt | null;
  allReceipts?: Receipt[];
  order?: Order | null;
}

/**
 * Fetches all data required to render an Invoice Document.
 * Compresses multiple queries using Promise.all.
 */
export async function getInvoiceDocumentData(
  invoiceId: string,
  organizationId: string
): Promise<DocumentData | null> {
  if (!invoiceId || !organizationId) return null;

  // 1. Fetch the primary Invoice record first
  const invoice = await getInvoiceById(invoiceId, organizationId);
  if (!invoice) return null;

  // 2. Fetch all related entities in parallel for optimal latency with strict null guards
  const [shop, customer, lineItems, prescriptions, orderRecord, receiptsList] = await Promise.all([
    invoice.shopId ? getShopById(invoice.shopId, organizationId) : Promise.resolve(null),
    invoice.customerId ? getCustomerById(invoice.customerId, organizationId) : Promise.resolve(null),
    db
      .select({
        id: invoiceItems.id,
        invoiceId: invoiceItems.invoiceId,
        inventoryId: invoiceItems.inventoryId,
        shopId: invoiceItems.shopId,
        organizationId: invoiceItems.organizationId,
        description: invoiceItems.description,
        quantity: invoiceItems.quantity,
        unitPrice: invoiceItems.unitPrice,
        subtotal: invoiceItems.subtotal,
        discountPercent: invoiceItems.discountPercent,
        discountAmount: invoiceItems.discountAmount,
        cgstPercent: invoiceItems.cgstPercent,
        cgstAmount: invoiceItems.cgstAmount,
        sgstPercent: invoiceItems.sgstPercent,
        sgstAmount: invoiceItems.sgstAmount,
        igstPercent: invoiceItems.igstPercent,
        igstAmount: invoiceItems.igstAmount,
        createdAt: invoiceItems.createdAt,
        sku: inventory.sku,
        brand: inventory.brand,
        hsnCode: inventory.hsnCode,
        category: inventory.category,
      })
      .from(invoiceItems)
      .leftJoin(inventory, eq(invoiceItems.inventoryId, inventory.id))
      .where(eq(invoiceItems.invoiceId, invoice.id))
      .orderBy(invoiceItems.createdAt),
    invoice.customerId
      ? getPrescriptionsByCustomer(invoice.customerId)
      : Promise.resolve([]),
    db
      .select()
      .from(orders)
      .where(and(eq(orders.invoiceId, invoice.id), eq(orders.organizationId, organizationId)))
      .limit(1)
      .then((rows) => rows[0] || null)
      .catch(() => null),
    db
      .select()
      .from(receipts)
      .where(and(eq(receipts.invoiceId, invoice.id), eq(receipts.organizationId, organizationId)))
      .orderBy(receipts.createdAt)
      .catch(() => []),
  ]);

  return {
    invoice,
    shop: shop || null,
    customer: customer || null,
    lineItems: lineItems || [],
    prescriptions: prescriptions || [],
    order: orderRecord || null,
    allReceipts: receiptsList || [],
  };
}

/**
 * Fetches all data required to render a Receipt Document.
 * Reuses getInvoiceDocumentData logic under the hood.
 */
export async function getReceiptDocumentData(
  receiptId: string,
  organizationId: string
): Promise<DocumentData | null> {
  if (!receiptId || !organizationId) return null;

  // 1. Fetch the primary Receipt record first
  const receipt = await getReceiptById(receiptId, organizationId);
  if (!receipt) return null;

  // 2. Fetch the corresponding invoice data
  const invoiceData = await getInvoiceDocumentData(receipt.invoiceId, organizationId);
  if (!invoiceData) return null;

  // 3. Attach the receipt details to the data payload
  return {
    ...invoiceData,
    receipt,
  };
}

/**
 * Fetches data for an Invoice without checking organization session (for public sharing).
 */
export async function getPublicInvoiceDocumentData(
  invoiceId: string
): Promise<DocumentData | null> {
  if (!invoiceId) return null;
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(invoiceId);
    const condition = isUuid ? eq(invoices.id, invoiceId) : eq(invoices.invoiceNumber, invoiceId);

    const [invoice] = await db
      .select()
      .from(invoices)
      .where(condition)
      .limit(1);

    if (!invoice) return null;

    // Delegate to standard query using the verified organizationId
    return getInvoiceDocumentData(invoice.id, invoice.organizationId);
  } catch (error) {
    console.error("[getPublicInvoiceDocumentData] error:", error);
    return null;
  }
}
