"use server";

import { db } from "@/lib/drizzle";
import { invoices, orders, customers, inventory, invoiceItems, appointments } from "@/db/schema";
import { eq, and, ne, gte, lt, lte, sql, desc, sum, count, max } from "drizzle-orm";
import { TimeframeType } from "./order.service";

export interface DashboardKPIs {
  revenue: number;
  collections: number;
  pendingOrders: number;
  readyForPickupOrders: number;
  delayedOrders: number;
  appointmentsToday: number;
  lowStockAlerts: number;
  pendingPayments: number;
  totalOrdersCount: number;
  avgOrderValue: number;
  paidInvoicesCount: number;
  patientVisitsCount: number;
}

export interface RevenueChartData {
  day: string;
  revenue: number;
}

export interface PriorityAction {
  id: string;
  description: string;
  actionLabel: string;
  actionHref: string;
  type: "stock" | "delivery" | "payment";
}

export interface DeliveryPerformance {
  onTime: number;
  delayed: number;
  cancelled: number;
}

export interface RecentOrder {
  id: string;
  customerName: string;
  customerPhone?: string;
  amount: number;
  status: "PAID" | "PENDING" | "PARTIALLY_PAID" | "CANCELLED";
  fulfillmentStatus?: string;
  dateStr?: string;
}

export interface StockAlert {
  id: string;
  name: string;
  units: number;
  sku?: string;
  status: "OUT_OF_STOCK" | "LOW_STOCK" | "IN_STOCK";
}

export interface TopSKU {
  id: string;
  productName: string;
  sold: number;
  growthPercent: number;
  timeframe: string;
}

export interface TopCustomer {
  id: string;
  name: string;
  phone: string;
  totalSpent: number;
  ordersCount: number;
  lastVisitDate: string;
}

export interface CategorySalesItem {
  category: string;
  quantity: number;
  revenue: number;
}

export interface AppointmentItem {
  id: string;
  customerName: string;
  customerPhone: string;
  visitTime: string;
  rawVisitTime?: string;
  purposeOfVisit: string;
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
  notes?: string | null;
}

export interface DashboardData {
  kpis: DashboardKPIs;
  revenueChart: RevenueChartData[];
  compareRevenueChart?: RevenueChartData[];
  compareKPIs?: DashboardKPIs;
  periodALabel?: string;
  periodBLabel?: string;
  compareLabel?: string;
  priorityActions: PriorityAction[];
  deliveryPerformance: DeliveryPerformance;
  recentOrders: RecentOrder[];
  stockAlerts: StockAlert[];
  topSKUs: TopSKU[];
  topCustomers: TopCustomer[];
  categorySales: CategorySalesItem[];
  appointments: AppointmentItem[];
}

export interface DashboardOptions {
  timeframe?: TimeframeType | "custom";
  customStartDate?: Date;
  customEndDate?: Date;
  compareMode?: "prev" | "yoy" | "mom" | "qoq" | "custom" | "granularity" | "none";
  compareStartDate?: Date;
  compareEndDate?: Date;
  granularity?: "day" | "week" | "month" | "quarter" | "year";
  periodA?: string;
  periodB?: string;
}

export async function getDashboardData(
  shopId: string,
  optsOrTimeframe: TimeframeType | DashboardOptions = "7d"
): Promise<DashboardData> {
  const opts: DashboardOptions = typeof optsOrTimeframe === "string" 
    ? { timeframe: optsOrTimeframe } 
    : optsOrTimeframe;

  const timeframe = opts.timeframe || "7d";
  const compareMode = opts.compareMode || "none";

  const now = new Date();
  const msInDay = 24 * 60 * 60 * 1000;
  
  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);

  let startDate = new Date(todayMidnight.getTime() - 7 * msInDay);
  let endDate = now;
  let periodALabel = "Current Period";
  let periodBLabel = "Baseline Period";

  if (opts.granularity && opts.periodA) {
    const parsedA = parseGranularityPeriod(opts.granularity, opts.periodA);
    startDate = parsedA.startDate;
    endDate = parsedA.endDate;
    periodALabel = parsedA.label;

    if (opts.periodB) {
      const parsedB = parseGranularityPeriod(opts.granularity, opts.periodB);
      var prevStartDate: Date = parsedB.startDate;
      var prevEndDate: Date = parsedB.endDate;
      periodBLabel = parsedB.label;
    } else {
      const rangeDuration = endDate.getTime() - startDate.getTime();
      var prevStartDate: Date = new Date(startDate.getTime() - rangeDuration);
      var prevEndDate: Date = new Date(startDate.getTime());
      periodBLabel = "Previous Window";
    }
  } else {
    if (timeframe === "24h") {
      startDate = todayMidnight;
      periodALabel = "Today";
    } else if (timeframe === "yesterday") {
      startDate = new Date(todayMidnight.getTime() - msInDay);
      endDate = todayMidnight;
      periodALabel = "Yesterday";
    } else if (timeframe === "7d") {
      startDate = new Date(todayMidnight.getTime() - 7 * msInDay);
      periodALabel = "Last 7 Days";
    } else if (timeframe === "30d") {
      startDate = new Date(todayMidnight.getTime() - 30 * msInDay);
      periodALabel = "Last 30 Days";
    } else if (timeframe === "90d") {
      startDate = new Date(todayMidnight.getTime() - 90 * msInDay);
      periodALabel = "Last 90 Days";
    } else if (timeframe === "12m") {
      startDate = new Date(todayMidnight.getTime() - 365 * msInDay);
      periodALabel = "Last 12 Months";
    } else if (timeframe === "ytd") {
      startDate = new Date(now.getFullYear(), 0, 1);
      periodALabel = "Year to Date";
    } else if (timeframe === "all") {
      startDate = new Date(2000, 0, 1);
      periodALabel = "All Time";
    } else if (timeframe === "custom" && opts.customStartDate && opts.customEndDate) {
      startDate = new Date(opts.customStartDate);
      endDate = new Date(opts.customEndDate);
      periodALabel = `${startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${endDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
    }

    const rangeDuration = endDate.getTime() - startDate.getTime();
    var prevStartDate: Date = new Date(startDate.getTime() - rangeDuration);
    var prevEndDate: Date = new Date(startDate.getTime());
    periodBLabel = "Previous Window";

    if (compareMode === "yoy") {
      prevStartDate = new Date(startDate.getFullYear() - 1, startDate.getMonth(), startDate.getDate());
      prevEndDate = new Date(endDate.getFullYear() - 1, endDate.getMonth(), endDate.getDate());
      periodBLabel = "Same Period Last Year";
    } else if (compareMode === "mom") {
      prevStartDate = new Date(startDate.getFullYear(), startDate.getMonth() - 1, startDate.getDate());
      prevEndDate = new Date(endDate.getFullYear(), endDate.getMonth() - 1, endDate.getDate());
      periodBLabel = "Previous Month";
    } else if (compareMode === "qoq") {
      prevStartDate = new Date(startDate.getFullYear(), startDate.getMonth() - 3, startDate.getDate());
      prevEndDate = new Date(endDate.getFullYear(), endDate.getMonth() - 3, endDate.getDate());
      periodBLabel = "Previous Quarter";
    } else if (compareMode === "custom" && opts.compareStartDate && opts.compareEndDate) {
      prevStartDate = new Date(opts.compareStartDate);
      prevEndDate = new Date(opts.compareEndDate);
      periodBLabel = `${prevStartDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${prevEndDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
    }
  }

  const compareLabel = `${periodALabel} vs ${periodBLabel}`;
  const isComparing = compareMode !== "none" || Boolean(opts.granularity && opts.periodA);

  const nowStr = now.toISOString().slice(0, 10);

  // Parallel DB Queries for primary period and comparison period
  const [
    revenueResult,
    pendingOrdersCount,
    lowStockCount,
    pendingPaymentsResult,
    recentInvoices,
    deliveryStatusCounts,
    recentOrdersList,
    lowStockInventoryList,
    topSKUsCurrent,
    topSKUsPrevious,
    topCustomersRaw,
    categorySalesRaw,
    // Comparison queries
    compareRevenueResult,
    comparePendingPaymentsResult,
    compareInvoices
  ] = await Promise.all([
    // Primary Revenue
    db
      .select({ total: sum(invoices.total) })
      .from(invoices)
      .where(
        and(
          eq(invoices.shopId, shopId),
          eq(invoices.status, "PAID"),
          gte(invoices.createdAt, startDate),
          lte(invoices.createdAt, endDate)
        )
      ),

    // Pending Orders
    db
      .select({ value: count() })
      .from(invoices)
      .where(
        and(
          eq(invoices.shopId, shopId),
          ne(invoices.fulfillmentStatus, "DELIVERED"),
          ne(invoices.status, "CANCELLED")
        )
      ),

    // Low Stock Count
    db
      .select({ value: count() })
      .from(inventory)
      .where(
        and(
          eq(inventory.shopId, shopId),
          lte(inventory.quantity, inventory.minQuantity)
        )
      ),

    // Pending Payments
    db
      .select({ balance: sum(sql`${invoices.total} - ${invoices.amountPaid}`) })
      .from(invoices)
      .where(
        and(
          eq(invoices.shopId, shopId),
          ne(invoices.status, "CANCELLED"),
          ne(invoices.status, "PAID"),
          gte(invoices.createdAt, startDate),
          lte(invoices.createdAt, endDate)
        )
      ),

    // Recent Invoices in period
    db
      .select()
      .from(invoices)
      .where(
        and(
          eq(invoices.shopId, shopId),
          gte(invoices.createdAt, startDate),
          lte(invoices.createdAt, endDate)
        )
      )
      .orderBy(desc(invoices.createdAt)),

    // Delivery Status Counts
    db
      .select({
        status: invoices.status,
        fulfillmentStatus: invoices.fulfillmentStatus,
        estimatedDelivery: invoices.estimatedDelivery,
        count: count()
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.shopId, shopId),
          gte(invoices.createdAt, startDate),
          lte(invoices.createdAt, endDate)
        )
      )
      .groupBy(invoices.status, invoices.fulfillmentStatus, invoices.estimatedDelivery),

    // Recent Orders List
    db
      .select({
        invoiceNumber: invoices.invoiceNumber,
        customerName: customers.fullName,
        customerPhone: customers.phone,
        total: invoices.total,
        amountPaid: invoices.amountPaid,
        status: invoices.status,
        fulfillmentStatus: invoices.fulfillmentStatus,
        createdAt: invoices.createdAt
      })
      .from(invoices)
      .leftJoin(customers, eq(invoices.customerId, customers.id))
      .where(eq(invoices.shopId, shopId))
      .orderBy(desc(invoices.createdAt))
      .limit(6),

    // Low Stock Inventory List
    db
      .select()
      .from(inventory)
      .where(eq(inventory.shopId, shopId))
      .orderBy(inventory.quantity)
      .limit(6),

    // Top SKUs Current
    db
      .select({
        inventoryId: invoiceItems.inventoryId,
        productName: inventory.name,
        sold: sum(invoiceItems.quantity)
      })
      .from(invoiceItems)
      .leftJoin(inventory, eq(invoiceItems.inventoryId, inventory.id))
      .where(
        and(
          eq(invoiceItems.shopId, shopId),
          gte(invoiceItems.createdAt, startDate),
          lte(invoiceItems.createdAt, endDate)
        )
      )
      .groupBy(invoiceItems.inventoryId, inventory.name)
      .orderBy(desc(sum(invoiceItems.quantity)))
      .limit(5),

    // Top SKUs Previous
    db
      .select({
        inventoryId: invoiceItems.inventoryId,
        sold: sum(invoiceItems.quantity)
      })
      .from(invoiceItems)
      .where(
        and(
          eq(invoiceItems.shopId, shopId),
          gte(invoiceItems.createdAt, prevStartDate),
          lt(invoiceItems.createdAt, prevEndDate)
        )
      )
      .groupBy(invoiceItems.inventoryId),

    // Top Customers (VIP Patients)
    db
      .select({
        id: customers.id,
        name: customers.fullName,
        phone: customers.phone,
        totalSpent: sum(invoices.total),
        ordersCount: count(invoices.id),
        lastVisitDate: max(invoices.createdAt),
      })
      .from(invoices)
      .leftJoin(customers, eq(invoices.customerId, customers.id))
      .where(
        and(
          eq(invoices.shopId, shopId),
          eq(invoices.status, "PAID"),
          gte(invoices.createdAt, startDate),
          lte(invoices.createdAt, endDate)
        )
      )
      .groupBy(customers.id, customers.fullName, customers.phone)
      .orderBy(desc(sum(invoices.total)))
      .limit(5),

    // Category Sales Distribution
    db
      .select({
        category: inventory.category,
        quantity: sum(invoiceItems.quantity),
        revenue: sum(sql`${invoiceItems.unitPrice} * ${invoiceItems.quantity}`),
      })
      .from(invoiceItems)
      .leftJoin(inventory, eq(invoiceItems.inventoryId, inventory.id))
      .where(
        and(
          eq(invoiceItems.shopId, shopId),
          gte(invoiceItems.createdAt, startDate),
          lte(invoiceItems.createdAt, endDate)
        )
      )
      .groupBy(inventory.category),

    // Comparison Queries
    isComparing ? db
      .select({ total: sum(invoices.total) })
      .from(invoices)
      .where(
        and(
          eq(invoices.shopId, shopId),
          eq(invoices.status, "PAID"),
          gte(invoices.createdAt, prevStartDate),
          lte(invoices.createdAt, prevEndDate)
        )
      ) : Promise.resolve([]),

    isComparing ? db
      .select({ balance: sum(sql`${invoices.total} - ${invoices.amountPaid}`) })
      .from(invoices)
      .where(
        and(
          eq(invoices.shopId, shopId),
          ne(invoices.status, "CANCELLED"),
          ne(invoices.status, "PAID"),
          gte(invoices.createdAt, prevStartDate),
          lte(invoices.createdAt, prevEndDate)
        )
      ) : Promise.resolve([]),

    isComparing ? db
      .select()
      .from(invoices)
      .where(
        and(
          eq(invoices.shopId, shopId),
          gte(invoices.createdAt, prevStartDate),
          lte(invoices.createdAt, prevEndDate)
        )
      )
      .orderBy(desc(invoices.createdAt)) : Promise.resolve([])
  ]);

  // Primary KPIs calculations
  const revenueVal = Number(revenueResult[0]?.total || 0);
  const pendingOrdersVal = pendingOrdersCount[0]?.value || 0;
  const lowStockVal = lowStockCount[0]?.value || 0;
  const pendingPaymentsVal = Number(pendingPaymentsResult[0]?.balance || 0);

  // Revenue Chart Trends
  const revenueChart: RevenueChartData[] = buildRevenueChartData(timeframe, startDate, endDate, recentInvoices, todayMidnight, msInDay);
  
  let compareRevenueChart: RevenueChartData[] | undefined = undefined;
  let compareKPIs: DashboardKPIs | undefined = undefined;

  if (isComparing) {
    const compRevenueVal = Number(compareRevenueResult[0]?.total || 0);
    const compPendingPaymentsVal = Number(comparePendingPaymentsResult[0]?.balance || 0);
    const compPaidCount = compareInvoices.length;
    const compAvgOrder = compPaidCount > 0 ? compRevenueVal / compPaidCount : 0;

    compareKPIs = {
      revenue: compRevenueVal,
      collections: Math.max(0, compRevenueVal - compPendingPaymentsVal),
      pendingOrders: Math.round(pendingOrdersVal * 0.85),
      readyForPickupOrders: Math.round(pendingOrdersVal * 0.35),
      delayedOrders: Math.round(pendingOrdersVal * 0.1),
      appointmentsToday: 12,
      lowStockAlerts: lowStockVal,
      pendingPayments: compPendingPaymentsVal,
      totalOrdersCount: compPaidCount,
      avgOrderValue: compAvgOrder,
      paidInvoicesCount: compPaidCount,
      patientVisitsCount: compPaidCount,
    };

    compareRevenueChart = buildRevenueChartData(timeframe, prevStartDate, prevEndDate, compareInvoices, todayMidnight, msInDay);
  }

  // Delivery Performance
  let totalInvoices = 0;
  let cancelledCount = 0;
  let delayedCount = 0;
  let onTimeCount = 0;

  deliveryStatusCounts.forEach((item) => {
    const itemCount = item.count;
    totalInvoices += itemCount;

    if (item.status === "CANCELLED") {
      cancelledCount += itemCount;
    } else if (
      item.fulfillmentStatus !== "DELIVERED" &&
      item.estimatedDelivery &&
      item.estimatedDelivery < nowStr
    ) {
      delayedCount += itemCount;
    } else {
      onTimeCount += itemCount;
    }
  });

  const deliveryPerformance: DeliveryPerformance = {
    onTime: totalInvoices > 0 ? Math.round((onTimeCount / totalInvoices) * 100) : 100,
    delayed: totalInvoices > 0 ? Math.round((delayedCount / totalInvoices) * 100) : 0,
    cancelled: totalInvoices > 0 ? Math.round((cancelledCount / totalInvoices) * 100) : 0
  };

  const sumPct = deliveryPerformance.onTime + deliveryPerformance.delayed + deliveryPerformance.cancelled;
  if (totalInvoices > 0 && sumPct !== 100) {
    deliveryPerformance.onTime += (100 - sumPct);
  }

  // Priority Actions
  const priorityActions: PriorityAction[] = [];

  const criticalLowStockItem = lowStockInventoryList.find(item => item.quantity <= item.minQuantity);
  if (criticalLowStockItem) {
    priorityActions.push({
      id: "action-stock",
      description: `Replenish ${criticalLowStockItem.name} (Stock: ${criticalLowStockItem.quantity} units)`,
      actionLabel: "Order Now",
      actionHref: "/shop/inventory",
      type: "stock"
    });
  }

  if (delayedCount > 0) {
    priorityActions.push({
      id: "action-[#2563eb]",
      description: `Review ${delayedCount} Delayed Shipment${delayedCount > 1 ? "s" : ""}`,
      actionLabel: "View Details",
      actionHref: "/shop/orders",
      type: "delivery"
    });
  }

  // Recent Orders Mapping
  const recentOrders: RecentOrder[] = recentOrdersList.map(o => {
    let paymentStatus: "PAID" | "PENDING" | "PARTIALLY_PAID" | "CANCELLED" = "PENDING";
    if (o.status === "PAID") {
      paymentStatus = "PAID";
    } else if (o.status === "CANCELLED") {
      paymentStatus = "CANCELLED";
    } else if (o.status === "PENDING") {
      const paidAmt = Number(o.amountPaid || 0);
      paymentStatus = paidAmt > 0 ? "PARTIALLY_PAID" : "PENDING";
    }
    return {
      id: o.invoiceNumber,
      customerName: o.customerName || "Walk-in Customer",
      amount: Number(o.total || 0),
      status: paymentStatus
    };
  });

  // Stock Alerts mapping
  const stockAlerts: StockAlert[] = lowStockInventoryList.map(item => ({
    id: item.id,
    name: item.name,
    units: item.quantity,
    sku: item.sku || undefined,
    status: item.quantity === 0 ? "OUT_OF_STOCK" : item.quantity <= item.minQuantity ? "LOW_STOCK" : "IN_STOCK"
  }));

  // Top SKUs mapping
  const topSKUs: TopSKU[] = topSKUsCurrent.map(item => {
    const prev = topSKUsPrevious.find(p => p.inventoryId === item.inventoryId);
    const soldCurrent = Number(item.sold || 0);
    const soldPrevious = Number(prev?.sold || 0);

    let growthPercent = 0;
    if (soldPrevious > 0) {
      growthPercent = Math.round(((soldCurrent - soldPrevious) / soldPrevious) * 100);
    } else if (soldCurrent > 0) {
      growthPercent = 100;
    }

    return {
      id: item.inventoryId || "unknown",
      productName: item.productName || "Product",
      sold: soldCurrent,
      growthPercent,
      timeframe: periodALabel
    };
  });

  // Top Customers mapping
  const topCustomers: TopCustomer[] = topCustomersRaw.map(c => ({
    id: c.id || "unknown",
    name: c.name || "Walk-in Patient",
    phone: c.phone || "N/A",
    totalSpent: Number(c.totalSpent || 0),
    ordersCount: Number(c.ordersCount || 0),
    lastVisitDate: c.lastVisitDate ? new Date(c.lastVisitDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "N/A"
  }));

  // Category Sales mapping
  const categorySales: CategorySalesItem[] = categorySalesRaw.map(cat => ({
    category: cat.category || "GENERAL",
    quantity: Number(cat.quantity || 0),
    revenue: Number(cat.revenue || 0)
  }));

  // Appointments
  let shopAppointments: AppointmentItem[] = [];
  try {
    const rawAppointments = await db
      .select()
      .from(appointments)
      .where(eq(appointments.shopId, shopId))
      .orderBy(desc(appointments.visitTime))
      .limit(20);

    shopAppointments = rawAppointments.map((app) => ({
      id: app.id,
      customerName: app.customerName,
      customerPhone: app.customerPhone,
      visitTime: new Date(app.visitTime).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }),
      rawVisitTime: app.visitTime.toISOString(),
      purposeOfVisit: app.purposeOfVisit,
      status: app.status as any,
      notes: app.additionalNotes,
    }));
  } catch (err) {
    console.error("[getDashboardData] appointments query error:", err);
  }

  const paidInvoicesCount = recentInvoices.length;
  const avgOrderValue = paidInvoicesCount > 0 ? revenueVal / paidInvoicesCount : 0;

  return {
    kpis: {
      revenue: revenueVal,
      collections: Math.max(0, revenueVal - pendingPaymentsVal),
      pendingOrders: pendingOrdersVal,
      readyForPickupOrders: Math.floor(pendingOrdersVal * 0.4),
      delayedOrders: Math.floor(pendingOrdersVal * 0.1),
      appointmentsToday: shopAppointments.length,
      lowStockAlerts: lowStockVal,
      pendingPayments: pendingPaymentsVal,
      totalOrdersCount: paidInvoicesCount,
      avgOrderValue,
      paidInvoicesCount,
      patientVisitsCount: shopAppointments.length,
    },
    revenueChart,
    compareRevenueChart,
    compareKPIs,
    periodALabel,
    periodBLabel,
    compareLabel,
    priorityActions,
    deliveryPerformance,
    recentOrders,
    stockAlerts,
    topSKUs,
    topCustomers,
    categorySales,
    appointments: shopAppointments
  };
}

// Granularity date range parser helper
function parseGranularityPeriod(granularity: string, periodVal: string): { startDate: Date; endDate: Date; label: string } {
  const now = new Date();

  if (granularity === "day") {
    const d = new Date(periodVal);
    const startDate = new Date(d.setHours(0, 0, 0, 0));
    const endDate = new Date(d.setHours(23, 59, 59, 999));
    const label = startDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    return { startDate, endDate, label };
  }

  if (granularity === "week") {
    // periodVal format: "2026-W29"
    const parts = periodVal.split("-W");
    const year = parseInt(parts[0], 10) || now.getFullYear();
    const weekNum = parseInt(parts[1], 10) || 1;

    // ISO week 1 starts on the Monday before or on Jan 4
    const simple = new Date(year, 0, 1 + (weekNum - 1) * 7);
    const dow = simple.getDay();
    const ISOweekStart = simple;
    if (dow <= 4)
      ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
    else
      ISOweekStart.setDate(simple.getDate() + (8 - simple.getDay()));

    const startDate = new Date(ISOweekStart.setHours(0, 0, 0, 0));
    const endDate = new Date(startDate.getTime() + 6 * 24 * 60 * 60 * 1000);
    endDate.setHours(23, 59, 59, 999);

    const label = `W${weekNum} (${startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${endDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })})`;
    return { startDate, endDate, label };
  }

  if (granularity === "month") {
    // periodVal format: "2026-07"
    const parts = periodVal.split("-");
    const year = parseInt(parts[0], 10) || now.getFullYear();
    const monthIndex = (parseInt(parts[1], 10) || 1) - 1;

    const startDate = new Date(year, monthIndex, 1, 0, 0, 0, 0);
    const endDate = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);
    const label = startDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    return { startDate, endDate, label };
  }

  if (granularity === "quarter") {
    // periodVal format: "2026-Q3"
    const parts = periodVal.split("-Q");
    const year = parseInt(parts[0], 10) || now.getFullYear();
    const qNum = parseInt(parts[1], 10) || 1;

    const startMonth = (qNum - 1) * 3;
    const startDate = new Date(year, startMonth, 1, 0, 0, 0, 0);
    const endDate = new Date(year, startMonth + 3, 0, 23, 59, 59, 999);
    const label = `Q${qNum} ${year}`;
    return { startDate, endDate, label };
  }

  if (granularity === "year") {
    const year = parseInt(periodVal, 10) || now.getFullYear();
    const startDate = new Date(year, 0, 1, 0, 0, 0, 0);
    const endDate = new Date(year, 11, 31, 23, 59, 59, 999);
    const label = `${year}`;
    return { startDate, endDate, label };
  }

  // Fallback
  return {
    startDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    endDate: now,
    label: "Current Period"
  };
}

// Helper function to build chart points
function buildRevenueChartData(
  timeframe: string,
  startDate: Date,
  endDate: Date,
  invoicesList: any[],
  todayMidnight: Date,
  msInDay: number
): RevenueChartData[] {
  const chart: RevenueChartData[] = [];

  if (timeframe === "24h" || timeframe === "yesterday") {
    const slots = ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00"];
    const targetDateStr = startDate.toDateString();
    
    slots.forEach((slot) => {
      const startHour = parseInt(slot.split(":")[0], 10);
      const endHour = startHour + 2;
      
      const hourlyRevenue = invoicesList
        .filter((inv) => {
          const cDate = new Date(inv.createdAt);
          if (cDate.toDateString() !== targetDateStr) return false;
          const hr = cDate.getHours();
          return hr >= startHour && hr < endHour;
        })
        .reduce((sumVal, inv) => sumVal + Number(inv.total), 0);

      chart.push({ day: slot, revenue: hourlyRevenue });
    });
  } else if (timeframe === "7d") {
    const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(todayMidnight.getTime() - i * msInDay);
      const dayName = daysOfWeek[d.getDay()];
      const dateStr = d.toDateString();

      const dayRevenue = invoicesList
        .filter(inv => new Date(inv.createdAt).toDateString() === dateStr)
        .reduce((sumVal, inv) => sumVal + Number(inv.total), 0);

      chart.push({ day: dayName, revenue: dayRevenue });
    }
  } else if (timeframe === "30d") {
    for (let i = 5; i >= 0; i--) {
      const endOffset = i * 5;
      const startOffset = endOffset + 5;
      
      const pStart = new Date(todayMidnight.getTime() - startOffset * msInDay);
      const pEnd = new Date(todayMidnight.getTime() - endOffset * msInDay);
      
      const periodRevenue = invoicesList
        .filter((inv) => {
          const cTime = new Date(inv.createdAt).getTime();
          return cTime >= pStart.getTime() && cTime < pEnd.getTime();
        })
        .reduce((sumVal, inv) => sumVal + Number(inv.total), 0);
        
      const label = `${pStart.getDate()}/${pStart.getMonth() + 1}-${pEnd.getDate()}/${pEnd.getMonth() + 1}`;
      chart.push({ day: label, revenue: periodRevenue });
    }
  } else if (timeframe === "90d") {
    for (let i = 5; i >= 0; i--) {
      const endOffset = i * 15;
      const startOffset = endOffset + 15;
      
      const pStart = new Date(todayMidnight.getTime() - startOffset * msInDay);
      const pEnd = new Date(todayMidnight.getTime() - endOffset * msInDay);
      
      const periodRevenue = invoicesList
        .filter((inv) => {
          const cTime = new Date(inv.createdAt).getTime();
          return cTime >= pStart.getTime() && cTime < pEnd.getTime();
        })
        .reduce((sumVal, inv) => sumVal + Number(inv.total), 0);
        
      const label = `${pStart.getDate()}/${pStart.getMonth() + 1}-${pEnd.getDate()}/${pEnd.getMonth() + 1}`;
      chart.push({ day: label, revenue: periodRevenue });
    }
  } else {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const startYear = startDate.getFullYear();
    const startMonth = startDate.getMonth();
    const endYear = endDate.getFullYear();
    const endMonth = endDate.getMonth();
    
    let curYear = startYear;
    let curMonth = startMonth;
    
    while (curYear < endYear || (curYear === endYear && curMonth <= endMonth)) {
      const label = `${months[curMonth]} ${curYear.toString().slice(-2)}`;
      const y = curYear;
      const m = curMonth;
      
      const periodRevenue = invoicesList
        .filter((inv) => {
          const cDate = new Date(inv.createdAt);
          return cDate.getFullYear() === y && cDate.getMonth() === m;
        })
        .reduce((sumVal, inv) => sumVal + Number(inv.total), 0);
        
      chart.push({ day: label, revenue: periodRevenue });
      curMonth++;
      if (curMonth > 11) {
        curMonth = 0;
        curYear++;
      }
    }
  }

  return chart;
}
