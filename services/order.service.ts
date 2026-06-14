"use server";

import { db } from "@/lib/drizzle";
import { orders, invoices, customers, invoiceItems, inventory, shops } from "@/db/schema";
import { eq, ne, and, or, ilike, sql, desc, inArray, lte, gt } from "drizzle-orm";

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
export async function getOrdersDashboardData(params: {
  shopId: string;
  tab: "ALL" | "PAID" | "PARTIALLY_PAID";
  search: string;
  page: number;
  limit: number;
  timeframe?: "7d" | "30d" | "90d" | "all";
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

  // Dynamic Date-Range & Trend calculations
  const nowTime = Date.now();
  const getPeriodCounts = (days: number) => {
    const msInDay = 24 * 60 * 60 * 1000;
    const currentStart = nowTime - (days * msInDay);
    const previousStart = nowTime - (2 * days * msInDay);

    let currentCount = 0;
    let previousCount = 0;

    allInvoices.forEach((inv) => {
      const createdTime = new Date(inv.createdAt).getTime();
      if (createdTime >= currentStart) {
        currentCount++;
      } else if (createdTime >= previousStart) {
        previousCount++;
      }
    });

    return { currentCount, previousCount };
  };

  const getMonthCounts = () => {
    const today = new Date();
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1).getTime();
    const previousMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1).getTime();

    let currentCount = 0;
    let previousCount = 0;

    allInvoices.forEach((inv) => {
      const createdTime = new Date(inv.createdAt).getTime();
      if (createdTime >= currentMonthStart) {
        currentCount++;
      } else if (createdTime >= previousMonthStart) {
        previousCount++;
      }
    });

    return { currentCount, previousCount };
  };

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
  let totalOrdersMoM = "+0%";

  if (timeframe === "7d") {
    const { currentCount, previousCount } = getPeriodCounts(7);
    timeframeInvoices = allInvoices.filter(
      (inv) => new Date(inv.createdAt).getTime() >= (nowTime - 7 * 24 * 60 * 60 * 1000)
    );
    totalOrdersMoM = calculatePercentChange(currentCount, previousCount);
  } else if (timeframe === "30d") {
    const { currentCount, previousCount } = getPeriodCounts(30);
    timeframeInvoices = allInvoices.filter(
      (inv) => new Date(inv.createdAt).getTime() >= (nowTime - 30 * 24 * 60 * 60 * 1000)
    );
    totalOrdersMoM = calculatePercentChange(currentCount, previousCount);
  } else if (timeframe === "90d") {
    const { currentCount, previousCount } = getPeriodCounts(90);
    timeframeInvoices = allInvoices.filter(
      (inv) => new Date(inv.createdAt).getTime() >= (nowTime - 90 * 24 * 60 * 60 * 1000)
    );
    totalOrdersMoM = calculatePercentChange(currentCount, previousCount);
  } else {
    // "all"
    const { currentCount, previousCount } = getMonthCounts();
    // Use all invoices
    timeframeInvoices = allInvoices;
    totalOrdersMoM = calculatePercentChange(currentCount, previousCount);
  }

  const totalOrders = timeframeInvoices.length;
  const deliveredOrders = timeframeInvoices.filter((i) => i.fulfillmentStatus === "DELIVERED").length;
  const completionRate = totalOrders > 0 ? Math.round((deliveredOrders / totalOrders) * 100) : 0;
  
  const pendingOrders = timeframeInvoices.filter(
    (i) => i.fulfillmentStatus !== "DELIVERED"
  ).length;

  // Critical pending: undelivered orders older than 7 days
  const criticalPending = timeframeInvoices.filter((i) => {
    if (i.fulfillmentStatus === "DELIVERED") return false;
    const ageInDays = (Date.now() - new Date(i.createdAt).getTime()) / (1000 * 3600 * 24);
    return ageInDays > 7;
  }).length;

  // Delayed: fulfillment status is not DELIVERED and estimatedDelivery is in the past
  const now = new Date().toISOString().split("T")[0];
  const delayedOrders = timeframeInvoices.filter((i) => {
    if (i.fulfillmentStatus === "DELIVERED") return false;
    if (!i.estimatedDelivery) return false;
    return i.estimatedDelivery < now;
  }).length;

  // Critical delayed: delayed expected arrival was > 3 days ago
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

  // 2. Build where clause filters for the paginated list
  const filters = [eq(orders.shopId, shopId)];

  if (tab === "PAID") {
    filters.push(eq(invoices.status, "PAID"));
  } else if (tab === "PARTIALLY_PAID") {
    filters.push(
      and(
        eq(invoices.status, "PENDING"),
        gt(sql`numeric(${invoices.amountPaid})`, 0)
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

  // 3. Fetch count for pagination
  const [countRes] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(orders)
    .innerJoin(invoices, eq(orders.invoiceId, invoices.id))
    .innerJoin(customers, eq(orders.customerId, customers.id))
    .where(and(...filters));

  const totalCount = countRes?.count || 0;

  // 4. Fetch the paginated orders
  const ordersListRaw = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      invoiceId: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      createdAt: orders.createdAt,
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
    })
    .from(orders)
    .innerJoin(invoices, eq(orders.invoiceId, invoices.id))
    .innerJoin(customers, eq(orders.customerId, customers.id))
    .where(and(...filters))
    .orderBy(desc(orders.createdAt))
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
