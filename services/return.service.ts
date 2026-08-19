import { db } from "@/lib/drizzle";
import {
  salesReturns,
  salesReturnItems,
  invoices,
  invoiceItems,
  customers,
  inventory,
  shops,
  profiles,
} from "@/db/schema";
import { eq, and, or, ilike, sql, desc, inArray, gte, lte } from "drizzle-orm";

export interface ReturnDashboardKPIs {
  totalReturns: number;
  totalReturnsMoM: string;
  completedReturns: number;
  draftReturns: number;
  totalRefundAmount: string;
}

export interface ReturnItemDetail {
  id: string;
  invoiceItemId: string;
  inventoryId: string | null;
  description: string;
  quantityReturned: number;
  unitPrice: string;
  refundAmount: string;
  inspectionReason: string;
  finalAction: string;
  category?: string | null;
  sku?: string | null;
  brand?: string | null;
  model?: string | null;
}

export interface SalesReturnListItem {
  id: string;
  returnNumber: string;
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string | null;
  returnType: string;
  status: string;
  totalRefundAmount: string;
  createdAt: Date;
  itemCount: number;
  items: ReturnItemDetail[];
  processedByName: string | null;
}

/**
 * Generate sequential return number: RET-shopNum-YYYY-NNNN
 */
export async function generateReturnNumber(shopId: string): Promise<string> {
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

  const orgShops = await db
    .select({ id: shops.id })
    .from(shops)
    .where(eq(shops.organizationId, shop.organizationId))
    .orderBy(shops.createdAt);

  const shopIndex = orgShops.findIndex((s) => s.id === shopId);
  const shopNum = shopIndex !== -1 ? shopIndex + 1 : 1;

  const currentYear = new Date().getFullYear().toString();
  const pattern = `RET-${shopNum}-${currentYear}-%`;

  const [lastReturn] = await db
    .select({
      returnNumber: salesReturns.returnNumber,
    })
    .from(salesReturns)
    .where(
      and(
        eq(salesReturns.shopId, shopId),
        ilike(salesReturns.returnNumber, pattern)
      )
    )
    .orderBy(sql`return_number DESC`)
    .limit(1);

  let nextSerial = 1;
  if (lastReturn?.returnNumber) {
    const parts = lastReturn.returnNumber.split("-");
    if (parts.length === 4) {
      const lastSerialStr = parts[3];
      const lastSerial = parseInt(lastSerialStr, 10);
      if (!isNaN(lastSerial)) {
        nextSerial = lastSerial + 1;
      }
    } else {
      const lastSerialStr = parts[parts.length - 1];
      const lastSerial = parseInt(lastSerialStr, 10);
      if (!isNaN(lastSerial)) {
        nextSerial = lastSerial + 1;
      }
    }
  }

  const paddedSerial = nextSerial.toString().padStart(4, "0");
  return `RET-${shopNum}-${currentYear}-${paddedSerial}`;
}

/**
 * Search invoices for live autocomplete in return form
 */
export async function searchInvoicesForReturn(
  shopId: string,
  query: string
) {
  if (!query || query.trim().length < 1) {
    return [];
  }

  const searchPattern = `%${query.trim()}%`;

  const results = await db
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      total: invoices.total,
      amountPaid: invoices.amountPaid,
      balanceDue: invoices.balanceDue,
      status: invoices.status,
      fulfillmentStatus: invoices.fulfillmentStatus,
      paymentMethod: invoices.paymentMethod,
      createdAt: invoices.createdAt,
      customerId: customers.id,
      customerName: customers.fullName,
      customerPhone: customers.phone,
    })
    .from(invoices)
    .innerJoin(customers, eq(invoices.customerId, customers.id))
    .where(
      and(
        eq(invoices.shopId, shopId),
        or(
          ilike(invoices.invoiceNumber, searchPattern),
          ilike(customers.phone, searchPattern),
          ilike(customers.fullName, searchPattern)
        )
      )
    )
    .orderBy(desc(invoices.createdAt))
    .limit(8);

  return results;
}

/**
 * Get full invoice details along with items and previous return counts
 */
export async function getInvoiceForReturnForm(
  invoiceId: string,
  organizationId: string
) {
  const [invoice] = await db
    .select({
      id: invoices.id,
      shopId: invoices.shopId,
      organizationId: invoices.organizationId,
      invoiceNumber: invoices.invoiceNumber,
      subtotal: invoices.subtotal,
      discount: invoices.discount,
      tax: invoices.tax,
      total: invoices.total,
      status: invoices.status,
      paymentMethod: invoices.paymentMethod,
      fulfillmentStatus: invoices.fulfillmentStatus,
      amountPaid: invoices.amountPaid,
      balanceDue: invoices.balanceDue,
      createdAt: invoices.createdAt,
      customerId: customers.id,
      customerName: customers.fullName,
      customerPhone: customers.phone,
      customerEmail: customers.email,
      customerAddress: customers.address,
      shopName: shops.name,
      shopAddress: shops.address,
    })
    .from(invoices)
    .innerJoin(customers, eq(invoices.customerId, customers.id))
    .innerJoin(shops, eq(invoices.shopId, shops.id))
    .where(
      and(
        eq(invoices.id, invoiceId),
        eq(invoices.organizationId, organizationId)
      )
    )
    .limit(1);

  if (!invoice) return null;

  // Fetch invoice items with product details
  const items = await db
    .select({
      id: invoiceItems.id,
      invoiceId: invoiceItems.invoiceId,
      inventoryId: invoiceItems.inventoryId,
      description: invoiceItems.description,
      quantity: invoiceItems.quantity,
      unitPrice: invoiceItems.unitPrice,
      subtotal: invoiceItems.subtotal,
      cgstPercent: invoiceItems.cgstPercent,
      sgstPercent: invoiceItems.sgstPercent,
      igstPercent: invoiceItems.igstPercent,
      category: inventory.category,
      brand: inventory.brand,
      model: inventory.model,
      sku: inventory.sku,
      imageUrl: inventory.imageUrl,
    })
    .from(invoiceItems)
    .leftJoin(inventory, eq(invoiceItems.inventoryId, inventory.id))
    .where(eq(invoiceItems.invoiceId, invoiceId));

  // Check how many of each item have already been returned
  const previousReturns = await db
    .select({
      invoiceItemId: salesReturnItems.invoiceItemId,
      quantityReturned: salesReturnItems.quantityReturned,
      returnStatus: salesReturns.status,
    })
    .from(salesReturnItems)
    .innerJoin(salesReturns, eq(salesReturnItems.returnId, salesReturns.id))
    .where(
      and(
        eq(salesReturns.invoiceId, invoiceId),
        eq(salesReturns.status, "COMPLETED")
      )
    );

  const returnedQuantitiesMap: Record<string, number> = {};
  previousReturns.forEach((ret) => {
    returnedQuantitiesMap[ret.invoiceItemId] =
      (returnedQuantitiesMap[ret.invoiceItemId] || 0) + ret.quantityReturned;
  });

  const enrichedItems = items.map((item) => {
    const alreadyReturned = returnedQuantitiesMap[item.id] || 0;
    const remainingReturnable = Math.max(0, item.quantity - alreadyReturned);

    return {
      ...item,
      alreadyReturned,
      remainingReturnable,
      isFullyReturned: remainingReturnable === 0,
    };
  });

  return {
    ...invoice,
    items: enrichedItems,
  };
}

/**
 * Fetch all analytics and paginated sales returns list for the shop dashboard.
 */
export async function getReturnsDashboardData(params: {
  shopId: string;
  tab?: "ALL" | "COMPLETED" | "DRAFT";
  search?: string;
  page?: number;
  limit?: number;
}) {
  const { shopId, tab = "ALL", search = "", page = 1, limit = 8 } = params;
  const offset = (page - 1) * limit;

  // Build filter conditions
  const filters = [eq(salesReturns.shopId, shopId)];

  if (tab === "COMPLETED") {
    filters.push(eq(salesReturns.status, "COMPLETED"));
  } else if (tab === "DRAFT") {
    filters.push(eq(salesReturns.status, "DRAFT"));
  }

  if (search && search.trim().length > 0) {
    const searchPattern = `%${search.trim()}%`;
    filters.push(
      or(
        ilike(salesReturns.returnNumber, searchPattern),
        ilike(invoices.invoiceNumber, searchPattern),
        ilike(customers.fullName, searchPattern),
        ilike(customers.phone, searchPattern)
      )!
    );
  }

  // Aggregate KPI metrics
  const allShopReturns = await db
    .select({
      id: salesReturns.id,
      status: salesReturns.status,
      totalRefundAmount: salesReturns.totalRefundAmount,
      createdAt: salesReturns.createdAt,
    })
    .from(salesReturns)
    .where(eq(salesReturns.shopId, shopId));

  const totalReturns = allShopReturns.length;
  const completedReturns = allShopReturns.filter((r) => r.status === "COMPLETED").length;
  const draftReturns = allShopReturns.filter((r) => r.status === "DRAFT").length;
  const totalRefundValueNum = allShopReturns
    .filter((r) => r.status === "COMPLETED")
    .reduce((sum, r) => sum + parseFloat(r.totalRefundAmount || "0"), 0);

  // Calculate MoM trend
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();

  let curCount = 0;
  let prevCount = 0;
  allShopReturns.forEach((r) => {
    const t = new Date(r.createdAt).getTime();
    if (t >= currentMonthStart) curCount++;
    else if (t >= prevMonthStart && t < currentMonthStart) prevCount++;
  });

  const totalReturnsMoM =
    prevCount === 0
      ? curCount > 0
        ? "+100%"
        : "0%"
      : `${curCount >= prevCount ? "+" : ""}${Math.round(
          ((curCount - prevCount) / prevCount) * 100
        )}%`;

  const kpis: ReturnDashboardKPIs = {
    totalReturns,
    totalReturnsMoM,
    completedReturns,
    draftReturns,
    totalRefundAmount: new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(totalRefundValueNum),
  };

  // Count total for pagination
  const [countRes] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(salesReturns)
    .innerJoin(invoices, eq(salesReturns.invoiceId, invoices.id))
    .innerJoin(customers, eq(salesReturns.customerId, customers.id))
    .where(and(...filters));

  const totalCount = countRes?.count || 0;

  // Fetch paginated returns list
  const returnsListRaw = await db
    .select({
      id: salesReturns.id,
      returnNumber: salesReturns.returnNumber,
      invoiceId: salesReturns.invoiceId,
      invoiceNumber: invoices.invoiceNumber,
      customerId: customers.id,
      customerName: customers.fullName,
      customerPhone: customers.phone,
      returnType: salesReturns.returnType,
      status: salesReturns.status,
      totalRefundAmount: salesReturns.totalRefundAmount,
      createdAt: salesReturns.createdAt,
      processedByName: profiles.fullName,
    })
    .from(salesReturns)
    .innerJoin(invoices, eq(salesReturns.invoiceId, invoices.id))
    .innerJoin(customers, eq(salesReturns.customerId, customers.id))
    .leftJoin(profiles, eq(salesReturns.processedBy, profiles.id))
    .where(and(...filters))
    .orderBy(desc(salesReturns.createdAt))
    .limit(limit)
    .offset(offset);

  // Fetch items for each return
  let returnsList: SalesReturnListItem[] = [];
  if (returnsListRaw.length > 0) {
    const returnIds = returnsListRaw.map((r) => r.id);

    const itemsRaw = await db
      .select({
        id: salesReturnItems.id,
        returnId: salesReturnItems.returnId,
        invoiceItemId: salesReturnItems.invoiceItemId,
        inventoryId: salesReturnItems.inventoryId,
        description: salesReturnItems.description,
        quantityReturned: salesReturnItems.quantityReturned,
        unitPrice: salesReturnItems.unitPrice,
        refundAmount: salesReturnItems.refundAmount,
        inspectionReason: salesReturnItems.inspectionReason,
        finalAction: salesReturnItems.finalAction,
        category: inventory.category,
        sku: inventory.sku,
        brand: inventory.brand,
        model: inventory.model,
      })
      .from(salesReturnItems)
      .leftJoin(inventory, eq(salesReturnItems.inventoryId, inventory.id))
      .where(inArray(salesReturnItems.returnId, returnIds));

    returnsList = returnsListRaw.map((r) => {
      const relatedItems = itemsRaw.filter((item) => item.returnId === r.id);
      return {
        ...r,
        itemCount: relatedItems.reduce((acc, it) => acc + it.quantityReturned, 0),
        items: relatedItems,
      };
    });
  }

  return {
    kpis,
    returns: returnsList,
    totalCount,
  };
}

/**
 * Get a single sales return by ID with complete details
 */
export async function getReturnById(id: string, organizationId: string) {
  const [ret] = await db
    .select({
      id: salesReturns.id,
      shopId: salesReturns.shopId,
      organizationId: salesReturns.organizationId,
      returnNumber: salesReturns.returnNumber,
      returnType: salesReturns.returnType,
      status: salesReturns.status,
      totalRefundAmount: salesReturns.totalRefundAmount,
      notes: salesReturns.notes,
      createdAt: salesReturns.createdAt,
      updatedAt: salesReturns.updatedAt,
      invoiceId: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      invoiceTotal: invoices.total,
      invoiceDate: invoices.createdAt,
      paymentMethod: invoices.paymentMethod,
      customerId: customers.id,
      customerName: customers.fullName,
      customerPhone: customers.phone,
      customerEmail: customers.email,
      customerAddress: customers.address,
      shopName: shops.name,
      shopAddress: shops.address,
      shopPhone: shops.phone,
      shopEmail: shops.email,
      shopGst: shops.gstin,
      processedByName: profiles.fullName,

    })
    .from(salesReturns)
    .innerJoin(invoices, eq(salesReturns.invoiceId, invoices.id))
    .innerJoin(customers, eq(salesReturns.customerId, customers.id))
    .innerJoin(shops, eq(salesReturns.shopId, shops.id))
    .leftJoin(profiles, eq(salesReturns.processedBy, profiles.id))
    .where(
      and(
        eq(salesReturns.id, id),
        eq(salesReturns.organizationId, organizationId)
      )
    )
    .limit(1);

  if (!ret) return null;

  const items = await db
    .select({
      id: salesReturnItems.id,
      invoiceItemId: salesReturnItems.invoiceItemId,
      inventoryId: salesReturnItems.inventoryId,
      description: salesReturnItems.description,
      quantityReturned: salesReturnItems.quantityReturned,
      unitPrice: salesReturnItems.unitPrice,
      refundAmount: salesReturnItems.refundAmount,
      inspectionReason: salesReturnItems.inspectionReason,
      finalAction: salesReturnItems.finalAction,
      category: inventory.category,
      sku: inventory.sku,
      brand: inventory.brand,
      model: inventory.model,
    })
    .from(salesReturnItems)
    .leftJoin(inventory, eq(salesReturnItems.inventoryId, inventory.id))
    .where(eq(salesReturnItems.returnId, id));

  return {
    ...ret,
    items,
  };
}
