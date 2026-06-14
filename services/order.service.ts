"use server";

import { db } from "@/lib/drizzle";
import { orders, invoices, customers, invoiceItems, inventory, shops } from "@/db/schema";
import { eq, ne, and, or, ilike, sql, desc, inArray, lte, gt, gte } from "drizzle-orm";

export interface OrderDashboardKPIs {
  totalOrders: number;
  totalOrdersMoM: string; // e.g. "+12%"
  deliveredOrders: number;
  completionRate: number; // e.g. 92
  pendingOrders: number;
  criticalPending: number;
  delayedOrders: number;
  criticalDelayed: number;
}

export interface SKUDetail {
  description: string;
  quantity: number;
  category: string | null;
  sku: string | null;
}

export interface OrderItem {
  id: string;
  orderNumber: string;
  invoiceId: string;
  invoiceNumber: string;
  createdAt: Date;
  total: string;
  amountPaid: string;
  balanceDue: string;
  paymentMethod: string | null;
  fulfillmentStatus: string;
  estimatedDelivery: string | null;
  isRescheduled: boolean;
  customerId: string;
  customerName: string;
  customerPhone?: string | null;
  customerEmail?: string | null;
  skus: SKUDetail[];
  categoryText?: string; // e.g. "Progressive Lens Fitting" or "Spectacles Order"
  receiptId?: string | null;
}

export interface PriorityReminder {
  id: string; // invoiceId
  type: "payment" | "delivery";
  title: string;
  subtext: string;
  amount?: string;
  customerName: string;
  orderNumber?: string;
  invoiceNumber?: string;
}

/**
 * Fetch all analytics and paginated orders for the dashboard.
 */
export type TimeframeType = "24h" | "yesterday" | "7d" | "30d" | "90d" | "12m" | "ytd" | "all";

export async function buildOrderFilters(params: {
  shopId: string;
  tab: "ALL" | "PAID" | "PARTIALLY_PAID";
  search: string;
  timeframe: TimeframeType;
  filter: "ALL" | "DELIVERED" | "PENDING" | "DELAYED";
}) {
  const { shopId, tab, search, timeframe, filter } = params;

  // Dynamic Date-Range calculations
  const nowTime = Date.now();
  const msInDay = 24 * 60 * 60 * 1000;

  let currentStart = 0;
  let currentEnd = nowTime;
  let previousStart = 0;
  let previousEnd = 0;

  if (timeframe === "24h") {
    // Today calendar day (from midnight today local/system time)
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);
    currentStart = todayMidnight.getTime();
    
    previousStart = todayMidnight.getTime() - msInDay;
    previousEnd = todayMidnight.getTime();
  } else if (timeframe === "yesterday") {
    // Yesterday calendar day
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);
    currentStart = todayMidnight.getTime() - msInDay;
    currentEnd = todayMidnight.getTime();

    previousStart = todayMidnight.getTime() - 2 * msInDay;
    previousEnd = todayMidnight.getTime() - msInDay;
  } else if (timeframe === "7d") {
    currentStart = nowTime - 7 * msInDay;
    previousStart = nowTime - 14 * msInDay;
    previousEnd = currentStart;
  } else if (timeframe === "30d") {
    currentStart = nowTime - 30 * msInDay;
    previousStart = nowTime - 60 * msInDay;
    previousEnd = currentStart;
  } else if (timeframe === "90d") {
    currentStart = nowTime - 90 * msInDay;
    previousStart = nowTime - 180 * msInDay;
    previousEnd = currentStart;
  } else if (timeframe === "12m") {
    currentStart = nowTime - 365 * msInDay;
    previousStart = nowTime - 730 * msInDay;
    previousEnd = currentStart;
  } else if (timeframe === "ytd") {
    const currentYear = new Date().getFullYear();
    currentStart = new Date(currentYear, 0, 1).getTime();
    
    previousStart = new Date(currentYear - 1, 0, 1).getTime();
    const lastYearSameTime = new Date();
    lastYearSameTime.setFullYear(currentYear - 1);
    previousEnd = lastYearSameTime.getTime();
  } else {
    // "all" - MoM trend (current calendar month vs previous calendar month)
    const today = new Date();
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1).getTime();
    const previousMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1).getTime();
    currentStart = 0;
    previousStart = previousMonthStart;
    previousEnd = currentMonthStart;
  }

  // 2. Build where clause filters for queries
  const filters = [eq(invoices.shopId, shopId)];

  if (currentStart > 0) {
    filters.push(gte(invoices.createdAt, new Date(currentStart)));
  }
  if (currentEnd < nowTime) {
    filters.push(lte(invoices.createdAt, new Date(currentEnd)));
  }

  if (tab === "PAID") {
    filters.push(eq(invoices.status, "PAID"));
  } else if (tab === "PARTIALLY_PAID") {
    filters.push(
      and(
        eq(invoices.status, "PENDING"),
        gt(sql`${invoices.amountPaid}::numeric`, 0)
      )!
    );
  }

  if (filter === "DELIVERED") {
    filters.push(eq(invoices.fulfillmentStatus, "DELIVERED"));
  } else if (filter === "PENDING") {
    filters.push(ne(invoices.fulfillmentStatus, "DELIVERED"));
  } else if (filter === "DELAYED") {
    const nowStr = new Date().toISOString().split("T")[0];
    filters.push(
      and(
        sql`${invoices.fulfillmentStatus} != 'DELIVERED'`,
        sql`${invoices.estimatedDelivery} IS NOT NULL`,
        sql`${invoices.estimatedDelivery} < ${nowStr}`
      )!
    );
  }

  if (search) {
    const searchPattern = `%${search}%`;
    filters.push(
      or(
        ilike(orders.orderNumber, searchPattern),
        ilike(invoices.invoiceNumber, searchPattern),
        ilike(customers.fullName, searchPattern)
      )!
    );
  }

  return {
    filters,
    currentStart,
    currentEnd,
    previousStart,
    previousEnd,
    nowTime,
  };
}

export async function getOrdersDashboardData(params: {
  shopId: string;
  tab: "ALL" | "PAID" | "PARTIALLY_PAID";
  search: string;
  page: number;
  limit: number;
  timeframe?: TimeframeType;
  filter?: "ALL" | "DELIVERED" | "PENDING" | "DELAYED";
}) {
  const { shopId, tab, search, page, limit, timeframe = "30d", filter = "ALL" } = params;
  const offset = (page - 1) * limit;

  // 1. Fetch all Invoices for aggregate KPI metrics
  const allInvoices = await db
    .select({
      id: invoices.id,
      status: invoices.status,
      fulfillmentStatus: invoices.fulfillmentStatus,
      estimatedDelivery: invoices.estimatedDelivery,
      createdAt: invoices.createdAt,
      amountPaid: invoices.amountPaid,
      balanceDue: invoices.balanceDue,
      customerId: invoices.customerId,
      invoiceNumber: invoices.invoiceNumber,
      total: invoices.total,
    })
    .from(invoices)
    .where(eq(invoices.shopId, shopId));

  // Get active filters and date boundaries
  const {
    filters,
    currentStart,
    currentEnd,
    previousStart,
    previousEnd,
    nowTime,
  } = await buildOrderFilters({
    shopId,
    tab,
    search,
    timeframe,
    filter,
  });

  const calculatePercentChange = (current: number, previous: number): string => {
    if (previous === 0) {
      return current > 0 ? "+100%" : "0%";
    }
    const pct = ((current - previous) / previous) * 100;
    const sign = pct >= 0 ? "+" : "";
    return `${sign}${pct.toFixed(0)}%`;
  };

  // Filter subset of invoices that fall within selected timeframe
  let timeframeInvoices = allInvoices;
  if (currentStart > 0) {
    timeframeInvoices = allInvoices.filter((inv) => {
      const createdTime = new Date(inv.createdAt).getTime();
      return createdTime >= currentStart && createdTime <= currentEnd;
    });
  }

  let currentPeriodCount = 0;
  let previousPeriodCount = 0;

  allInvoices.forEach((inv) => {
    const createdTime = new Date(inv.createdAt).getTime();
    if (timeframe === "all") {
      if (createdTime >= previousEnd) {
        currentPeriodCount++;
      } else if (createdTime >= previousStart && createdTime < previousEnd) {
        previousPeriodCount++;
      }
    } else {
      if (createdTime >= currentStart && createdTime <= currentEnd) {
        currentPeriodCount++;
      } else if (createdTime >= previousStart && createdTime <= previousEnd) {
        previousPeriodCount++;
      }
    }
  });

  const totalOrdersMoM = calculatePercentChange(currentPeriodCount, previousPeriodCount);

  const totalOrders = timeframeInvoices.length;
  const deliveredOrders = timeframeInvoices.filter((i) => i.fulfillmentStatus === "DELIVERED").length;
  const completionRate = totalOrders > 0 ? Math.round((deliveredOrders / totalOrders) * 100) : 0;
  
  const pendingOrders = timeframeInvoices.filter(
    (i) => i.fulfillmentStatus !== "DELIVERED"
  ).length;

  const criticalPending = timeframeInvoices.filter((i) => {
    if (i.fulfillmentStatus === "DELIVERED") return false;
    const ageInDays = (Date.now() - new Date(i.createdAt).getTime()) / (1000 * 3600 * 24);
    return ageInDays > 7;
  }).length;

  const now = new Date().toISOString().split("T")[0];
  const delayedOrders = timeframeInvoices.filter((i) => {
    if (i.fulfillmentStatus === "DELIVERED") return false;
    if (!i.estimatedDelivery) return false;
    return i.estimatedDelivery < now;
  }).length;

  const criticalDelayed = timeframeInvoices.filter((i) => {
    if (i.fulfillmentStatus === "DELIVERED") return false;
    if (!i.estimatedDelivery) return false;
    const delayInDays = (Date.now() - new Date(i.estimatedDelivery).getTime()) / (1000 * 3600 * 24);
    return delayInDays > 3;
  }).length;

  const kpis: OrderDashboardKPIs = {
    totalOrders,
    totalOrdersMoM,
    deliveredOrders,
    completionRate,
    pendingOrders,
    criticalPending,
    delayedOrders,
    criticalDelayed,
  };


  // 3. Fetch count for pagination
  const [countRes] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(invoices)
    .innerJoin(customers, eq(invoices.customerId, customers.id))
    .leftJoin(orders, eq(orders.invoiceId, invoices.id))
    .where(and(...filters));

  const totalCount = countRes?.count || 0;

  // 4. Fetch the paginated orders
  const ordersListRaw = await db
    .select({
      id: invoices.id,
      orderNumber: sql<string>`COALESCE(${orders.orderNumber}, ${invoices.invoiceNumber})`,
      invoiceId: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      createdAt: invoices.createdAt,
      total: invoices.total,
      amountPaid: invoices.amountPaid,
      balanceDue: invoices.balanceDue,
      paymentMethod: invoices.paymentMethod,
      fulfillmentStatus: invoices.fulfillmentStatus,
      estimatedDelivery: invoices.estimatedDelivery,
      isRescheduled: invoices.isRescheduled,
      customerId: customers.id,
      customerName: customers.fullName,
      customerPhone: customers.phone,
      customerEmail: customers.email,
      receiptId: orders.receiptId,
    })
    .from(invoices)
    .innerJoin(customers, eq(invoices.customerId, customers.id))
    .leftJoin(orders, eq(orders.invoiceId, invoices.id))
    .where(and(...filters))
    .orderBy(desc(invoices.createdAt))
    .limit(limit)
    .offset(offset);

  // 5. Gather line items for SKU details (resolving N+1 query issue)
  let ordersList: OrderItem[] = [];
  if (ordersListRaw.length > 0) {
    const invoiceIds = ordersListRaw.map((o) => o.invoiceId);
    
    const itemsRaw = await db
      .select({
        invoiceId: invoiceItems.invoiceId,
        description: invoiceItems.description,
        quantity: invoiceItems.quantity,
        category: inventory.category,
        sku: inventory.sku,
      })
      .from(invoiceItems)
      .leftJoin(inventory, eq(invoiceItems.inventoryId, inventory.id))
      .where(inArray(invoiceItems.invoiceId, invoiceIds));

    // Map items to orders
    ordersList = ordersListRaw.map((o) => {
      const relatedItems = itemsRaw.filter((item) => item.invoiceId === o.invoiceId);
      const skus: SKUDetail[] = relatedItems.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        category: item.category,
        sku: item.sku,
      }));

      // Guess category description text
      let categoryText = "Optical Services";
      if (skus.length > 0) {
        const primaryCategory = skus[0].category;
        if (primaryCategory === "FRAME" || primaryCategory === "LENS") {
          categoryText = "Spectacles Order";
        } else if (primaryCategory === "CONTACT_LENS") {
          categoryText = "Contact Lens Consultation";
        } else if (primaryCategory === "ACCESSORY") {
          categoryText = "Accessories Purchase";
        }
      }

      return {
        ...o,
        skus,
        categoryText,
      };
    });
  }

  // 6. Generate Priority Reminders (limit to top 3 for dashboard space)
  const reminders: PriorityReminder[] = [];

  // Filter 1: Overdue partial payments (status is PENDING, amountPaid > 0, older than 3 days)
  const overduePartials = allInvoices
    .filter((i) => {
      if (i.status !== "PENDING") return false;
      if (parseFloat(i.amountPaid) <= 0) return false;
      const ageInDays = (Date.now() - new Date(i.createdAt).getTime()) / (1000 * 3600 * 24);
      return ageInDays > 3;
    })
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()); // oldest first

  for (const inv of overduePartials.slice(0, 2)) {
    // Fetch customer info
    const [c] = await db
      .select({ fullName: customers.fullName })
      .from(customers)
      .where(eq(customers.id, inv.customerId))
      .limit(1);

    const ageInDays = Math.floor((Date.now() - new Date(inv.createdAt).getTime()) / (1000 * 3600 * 24));

    reminders.push({
      id: inv.id,
      type: "payment",
      title: `Partial Payment: ${c?.fullName || "Patient"} (${inv.invoiceNumber})`,
      subtext: `${ageInDays} days delay • Total amount: ${formatCurrency(inv.total)}`,
      amount: inv.total,
      customerName: c?.fullName || "Patient",
      invoiceNumber: inv.invoiceNumber,
    });
  }

  // Filter 2: Delayed deliveries (status not DELIVERED, estimatedDelivery in the past)
  const delayedDeliveries = allInvoices
    .filter((i) => {
      if (i.fulfillmentStatus === "DELIVERED") return false;
      if (!i.estimatedDelivery) return false;
      return i.estimatedDelivery < now;
    })
    .sort((a, b) => new Date(a.estimatedDelivery!).getTime() - new Date(b.estimatedDelivery!).getTime());

  for (const inv of delayedDeliveries.slice(0, 2)) {
    const [c] = await db
      .select({ fullName: customers.fullName })
      .from(customers)
      .where(eq(customers.id, inv.customerId))
      .limit(1);

    const [ord] = await db
      .select({ orderNumber: orders.orderNumber })
      .from(orders)
      .where(eq(orders.invoiceId, inv.id))
      .limit(1);

    const formattedDeliveryDate = new Date(inv.estimatedDelivery!).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

    reminders.push({
      id: inv.id,
      type: "delivery",
      title: `Delayed Delivery: ${c?.fullName || "Patient"} (Order ${ord?.orderNumber || "N/A"})`,
      subtext: `Expected arrival was ${formattedDeliveryDate} • Supplier update requested`,
      customerName: c?.fullName || "Patient",
      orderNumber: ord?.orderNumber,
    });
  }

  return {
    kpis,
    orders: ordersList,
    reminders: reminders.slice(0, 3), // max 3 reminders shown
    totalCount,
  };
}

// Simple currency utility matching formatting needs
function formatCurrency(amount: string | number) {
  const val = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(val);
}

export async function exportOrdersToCSVData(params: {
  shopId: string;
  tab: "ALL" | "PAID" | "PARTIALLY_PAID";
  search: string;
  timeframe: TimeframeType;
  filter: "ALL" | "DELIVERED" | "PENDING" | "DELAYED";
}) {
  const { shopId, tab, search, timeframe, filter } = params;

  // 1. Compile identical filters
  const { filters } = await buildOrderFilters({
    shopId,
    tab,
    search,
    timeframe,
    filter,
  });

  // 2. Fetch ALL matching records (no limit, no offset)
  const ordersListRaw = await db
    .select({
      id: invoices.id,
      orderNumber: sql<string>`COALESCE(${orders.orderNumber}, ${invoices.invoiceNumber})`,
      invoiceId: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      createdAt: invoices.createdAt,
      subtotal: invoices.subtotal,
      discount: invoices.discount,
      tax: invoices.tax,
      total: invoices.total,
      amountPaid: invoices.amountPaid,
      balanceDue: invoices.balanceDue,
      paymentMethod: invoices.paymentMethod,
      status: invoices.status,
      fulfillmentStatus: invoices.fulfillmentStatus,
      estimatedDelivery: invoices.estimatedDelivery,
      notes: invoices.notes,
      customerId: customers.id,
      customerName: customers.fullName,
      customerPhone: customers.phone,
      customerEmail: customers.email,
    })
    .from(invoices)
    .innerJoin(customers, eq(invoices.customerId, customers.id))
    .leftJoin(orders, eq(orders.invoiceId, invoices.id))
    .where(and(...filters))
    .orderBy(desc(invoices.createdAt));

  // 3. Fetch linked items to serialize SKUs/purchased goods in a single query
  let itemsRaw: { invoiceId: string; description: string; quantity: number; category: string | null; sku: string | null }[] = [];
  if (ordersListRaw.length > 0) {
    const invoiceIds = ordersListRaw.map((o) => o.invoiceId);
    
    itemsRaw = await db
      .select({
        invoiceId: invoiceItems.invoiceId,
        description: invoiceItems.description,
        quantity: invoiceItems.quantity,
        category: inventory.category,
        sku: inventory.sku,
      })
      .from(invoiceItems)
      .leftJoin(inventory, eq(invoiceItems.inventoryId, inventory.id))
      .where(inArray(invoiceItems.invoiceId, invoiceIds));
  }

  // 4. Construct CSV rows with double-quote escaping (RFC 4180)
  const escapeCSV = (val: string | null | undefined): string => {
    if (val === null || val === undefined) return "";
    let str = String(val);
    if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
      str = str.replace(/"/g, '""');
      return `"${str}"`;
    }
    return str;
  };

  const headers = [
    "Order Number",
    "Invoice Number",
    "Order Date",
    "Customer Name",
    "Customer Phone",
    "Customer Email",
    "Items Purchased",
    "Subtotal (INR)",
    "Discount (INR)",
    "Tax (INR)",
    "Total Amount (INR)",
    "Amount Paid (INR)",
    "Balance Due (INR)",
    "Payment Status",
    "Payment Method",
    "Fulfillment Status",
    "Estimated Delivery",
    "Notes"
  ];

  const csvRows = [headers.join(",")];

  for (const row of ordersListRaw) {
    // Collect related items
    const relatedItems = itemsRaw.filter((item) => item.invoiceId === row.invoiceId);
    const itemStrings = relatedItems.map(
      (item) => `${item.quantity}x ${item.description}${item.sku ? ` (${item.sku})` : ""}`
    );
    const itemsPurchasedText = itemStrings.join(" | ");

    // Determine clean payment status text
    const balanceVal = parseFloat(row.balanceDue);
    const paidVal = parseFloat(row.amountPaid);
    let paymentStatus = "UNPAID";
    if (balanceVal === 0) {
      paymentStatus = "PAID";
    } else if (paidVal > 0) {
      paymentStatus = "PARTIALLY PAID";
    }

    const csvRow = [
      escapeCSV(row.orderNumber),
      escapeCSV(row.invoiceNumber),
      escapeCSV(new Date(row.createdAt).toISOString().replace("T", " ").slice(0, 16)),
      escapeCSV(row.customerName),
      escapeCSV(row.customerPhone),
      escapeCSV(row.customerEmail),
      escapeCSV(itemsPurchasedText),
      escapeCSV(row.subtotal),
      escapeCSV(row.discount),
      escapeCSV(row.tax),
      escapeCSV(row.total),
      escapeCSV(row.amountPaid),
      escapeCSV(row.balanceDue),
      escapeCSV(paymentStatus),
      escapeCSV(row.paymentMethod),
      escapeCSV(row.fulfillmentStatus),
      escapeCSV(row.estimatedDelivery),
      escapeCSV(row.notes)
    ];

    csvRows.push(csvRow.join(","));
  }

  return csvRows.join("\n");
}
