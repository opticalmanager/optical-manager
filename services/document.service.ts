"use server";

import { db } from "@/lib/drizzle";
import { invoices, invoiceItems, inventory, orders, receipts } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getInvoiceById } from "./invoice.service";
import { getShopById } from "./shop.service";
import { getCustomerById } from "./customer.service";
import { getPrescriptionsByCustomer } from "./prescription.service";
import { getReceiptById } from "./receipt.service";
import { getCustomizationSettings, type CustomizationConfig } from "./customization.service";
import { getOrganizationCategories } from "./category.service";
import { resolveOpticalCategory } from "@/lib/optical-category-resolver";
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
  customizationConfig?: CustomizationConfig | null;
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
  const [shop, customer, rawLineItems, prescriptions, orderRecord, receiptsList, customizationConfig, orgCategories] = await Promise.all([
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
    getCustomizationSettings(organizationId, invoice.shopId).catch(() => null),
    getOrganizationCategories(organizationId).catch(() => []),
  ]);

  // Build authentic statutory category HSN lookup from the organization's database configuration
  const categoryHsnMap = new Map<string, string>();
  for (const cat of orgCategories || []) {
    if (cat.code && cat.hsnCode && cat.hsnCode.trim()) {
      categoryHsnMap.set(cat.code.trim().toUpperCase(), cat.hsnCode.trim());
    }
  }

  // Resolve authentic HSN codes with strict no-hardcoded fallback
  const lineItems: LineItemWithInventory[] = (rawLineItems || []).map((item) => {
    let resolvedHsn: string | null = null;

    // 1. Explicit item-level HSN code from inventory record
    if (item.hsnCode && item.hsnCode.trim()) {
      resolvedHsn = item.hsnCode.trim();
    }

    // 2. Organization category statutory HSN via explicit category
    if (!resolvedHsn && item.category) {
      const catCode = item.category.trim().toUpperCase();
      resolvedHsn = categoryHsnMap.get(catCode) || null;
    }

    // 3. Organization category statutory HSN via optical domain classification
    if (!resolvedHsn) {
      const opticalCat = resolveOpticalCategory(item.category, item.description);
      if (opticalCat?.code) {
        resolvedHsn = categoryHsnMap.get(opticalCat.code.toUpperCase()) || null;
      }
    }

    return {
      ...item,
      hsnCode: resolvedHsn,
    };
  });

  return {
    invoice,
    shop: shop || null,
    customer: customer || null,
    lineItems: lineItems || [],
    prescriptions: prescriptions || [],
    order: orderRecord || null,
    allReceipts: receiptsList || [],
    customizationConfig: customizationConfig || null,
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

/**
 * Fetches data for a Receipt / Order Booking Form without checking organization session (for public sharing).
 * Resilient multi-lookup: checks receipt ID/number, order ID/number, or invoice ID/number.
 */
export async function getPublicReceiptDocumentData(
  id: string
): Promise<DocumentData | null> {
  if (!id) return null;
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    // 1. Try finding by receipt ID or receiptNumber
    const rcptCondition = isUuid ? eq(receipts.id, id) : eq(receipts.receiptNumber, id);
    const [receipt] = await db
      .select()
      .from(receipts)
      .where(rcptCondition)
      .limit(1);

    if (receipt) {
      const invoiceData = await getInvoiceDocumentData(receipt.invoiceId, receipt.organizationId);
      if (invoiceData) {
        return {
          ...invoiceData,
          receipt,
        };
      }
    }

    // 2. Try finding by order ID or orderNumber
    const orderCondition = isUuid ? eq(orders.id, id) : eq(orders.orderNumber, id);
    const [order] = await db
      .select()
      .from(orders)
      .where(orderCondition)
      .limit(1);

    if (order && order.invoiceId) {
      const invoiceData = await getInvoiceDocumentData(order.invoiceId, order.organizationId);
      if (invoiceData) {
        const matchingReceipt =
          (order.receiptId ? invoiceData.allReceipts?.find((r) => r.id === order.receiptId) : null) ||
          invoiceData.allReceipts?.[0] ||
          null;

        const resolvedReceipt =
          matchingReceipt ||
          ({
            id: order.id,
            receiptNumber: order.orderNumber,
            invoiceId: order.invoiceId,
            amountPaid: invoiceData.invoice.amountPaid || "0.00",
            balanceDue: invoiceData.invoice.balanceDue || invoiceData.invoice.total,
            paymentMethod: (invoiceData.invoice.paymentMethod as any) || "CASH",
            transactionId: null,
            createdAt: order.createdAt,
            organizationId: order.organizationId,
            shopId: order.shopId,
            notes: null,
            updatedAt: order.updatedAt,
          } as Receipt);

        return {
          ...invoiceData,
          receipt: resolvedReceipt,
          order,
        };
      }
    }

    // 3. Fallback: try finding by invoice ID or invoiceNumber
    const invCondition = isUuid ? eq(invoices.id, id) : eq(invoices.invoiceNumber, id);
    const [invoice] = await db
      .select()
      .from(invoices)
      .where(invCondition)
      .limit(1);

    if (invoice) {
      const invoiceData = await getInvoiceDocumentData(invoice.id, invoice.organizationId);
      if (invoiceData) {
        const primaryReceipt =
          invoiceData.allReceipts?.[0] ||
          ({
            id: invoice.id,
            receiptNumber: invoiceData.order?.orderNumber || invoice.invoiceNumber,
            invoiceId: invoice.id,
            amountPaid: invoice.amountPaid || "0.00",
            balanceDue: invoice.balanceDue || invoice.total,
            paymentMethod: (invoice.paymentMethod as any) || "CASH",
            transactionId: null,
            createdAt: invoice.createdAt,
            organizationId: invoice.organizationId,
            shopId: invoice.shopId,
            notes: null,
            updatedAt: invoice.updatedAt,
          } as Receipt);

        return {
          ...invoiceData,
          receipt: primaryReceipt,
        };
      }
    }

    return null;
  } catch (error) {
    console.error("[getPublicReceiptDocumentData] error:", error);
    return null;
  }
}
