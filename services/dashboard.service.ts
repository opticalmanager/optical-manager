"use server";

import { db } from "@/lib/drizzle";
import { 
  invoices, 
  orders, 
  customers, 
  inventory, 
  invoiceItems, 
  appointments,
  purchaseOrders,
  salesReturns,
  salesReturnItems,
  stockMovements,
  whatsappDispatchQueue,
  shops,
  frameDetails,
  lensDetails
} from "@/db/schema";
import { eq, and, or, ne, gte, lt, lte, sql, desc, sum, count, max, inArray } from "drizzle-orm";
import { TimeframeType } from "./order.service";

export interface OpticalDashboardKPIs extends DashboardKPIs {
  revenueGrowth: number;
  salesInvoicesCount: number;
  salesInvoicesGrowth: number;
  accountsReceivable: number;
  accountsReceivableGrowth: number;
  activeCustomersCount: number;
  activeCustomersGrowth: number;
  totalStoresCount: number;
  totalStoresGrowth: number;
}

export interface CustomerBifurcation {
  onlyFrame: number;
  onlyFramePercent: number;
  onlyLens: number;
  onlyLensPercent: number;
  bothFrameAndLens: number;
  bothFrameAndLensPercent: number;
  totalCustomers: number;
}

export interface DeadStockData {
  count: number;
  percentageOfTotal: number;
  totalItems: number;
}

export interface StockCategoryValuation {
  category: string;
  label: string;
  value: number;
  count: number;
  percentage: number;
  color: string;
}

export interface StockValuationData {
  totalValue: number;
  totalUnits: number;
  categories: StockCategoryValuation[];
}

export interface ReturnRateData {
  totalSales: number;
  returnedItems: number;
  returnRatePercent: number;
}

export interface SalesBifurcationSlice {
  name: string;
  count: number;
  amount: number;
  percentage: number;
  color: string;
}

export interface SalesBifurcationData {
  totalSalesAmount: number;
  byLenses: { slices: SalesBifurcationSlice[]; total: number };
  byFrames: { slices: SalesBifurcationSlice[]; total: number };
  byBrands: { slices: SalesBifurcationSlice[]; total: number };
  byGender: { slices: SalesBifurcationSlice[]; total: number };
  byAge: { slices: SalesBifurcationSlice[]; total: number };
}

export interface RetentionRateData {
  totalCustomers: number;
  returningCustomers: number;
  retentionRatePercent: number;
}

export interface RecentTransactionItem {
  id: string;
  invoiceNumber: string;
  customerName: string;
  itemsSummary: string;
  amount: number;
  status: "PAID" | "PARTIALLY_PAID" | "PENDING" | "CANCELLED";
  dateFormatted: string;
  rawDate: string;
}

export interface LowStockAlertItem {
  id: string;
  name: string;
  quantity: number;
  minQuantity: number;
  category?: string;
  sku?: string;
}

export interface LowStockSummaryData {
  lowStockCount: number;
  items: LowStockAlertItem[];
}

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
  invoiceNumber?: string;
  customerName: string;
  customerPhone?: string;
  amount: number;
  status: "PAID" | "PENDING" | "PARTIALLY_PAID" | "CANCELLED";
  fulfillmentStatus?: string;
  dateStr?: string;
  estimatedDelivery?: string;
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

export interface RecentActivityItem {
  id: string;
  type: "INVOICE" | "PURCHASE" | "RETURN" | "STOCK" | "APPOINTMENT" | "COMMUNICATION";
  action: string;
  title: string;
  subtitle: string;
  timestamp: string;
  amount?: number;
  status: string;
  badgeVariant: "success" | "warning" | "danger" | "info" | "neutral";
  actionHref?: string;
  partyName?: string;
}

export interface DashboardData {
  kpis: DashboardKPIs;
  opticalKPIs?: OpticalDashboardKPIs;
  customerBifurcation?: CustomerBifurcation;
  deadStock?: DeadStockData;
  stockValuation?: StockValuationData;
  returnRate?: ReturnRateData;
  salesBifurcation?: SalesBifurcationData;
  retentionRate?: RetentionRateData;
  recentTransactions?: RecentTransactionItem[];
  lowStockSummary?: LowStockSummaryData;
  revenueChart: RevenueChartData[];
  compareRevenueChart?: RevenueChartData[];
  compareKPIs?: DashboardKPIs;
  periodALabel?: string;
  periodBLabel?: string;
  compareLabel?: string;
  priorityActions: PriorityAction[];
  deliveryPerformance: DeliveryPerformance;
  recentOrders: RecentOrder[];
  pendingOrders: RecentOrder[];
  pickupOrders: RecentOrder[];
  delayedOrders: RecentOrder[];
  stockAlerts: StockAlert[];
  topSKUs: TopSKU[];
  topCustomers: TopCustomer[];
  categorySales: CategorySalesItem[];
  appointments: AppointmentItem[];
  todayAppointments: AppointmentItem[];
  recentActivities: RecentActivityItem[];
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
  optsOrTimeframe: TimeframeType | DashboardOptions = "7d",
  organizationId?: string
): Promise<DashboardData> {
  const opts: DashboardOptions = typeof optsOrTimeframe === "string" 
    ? { timeframe: optsOrTimeframe } 
    : optsOrTimeframe;

  const timeframe = opts.timeframe || "7d";
  const compareMode = opts.compareMode || "none";

  // Helper for multi-shop vs single shop query matching
  const shopCond = (shopCol: any, orgCol: any) => {
    if (shopId === "all" && organizationId) {
      return eq(orgCol, organizationId);
    }
    return eq(shopCol, shopId);
  };

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
      prevStartDate = new Date(startDate.getTime());
      prevStartDate.setFullYear(prevStartDate.getFullYear() - 1);
      prevEndDate = new Date(endDate.getTime());
      prevEndDate.setFullYear(prevEndDate.getFullYear() - 1);
      periodBLabel = "Same Period Last Year";
    } else if (compareMode === "mom") {
      prevStartDate = new Date(startDate.getTime());
      prevStartDate.setMonth(prevStartDate.getMonth() - 1);
      prevEndDate = new Date(endDate.getTime());
      prevEndDate.setMonth(prevEndDate.getMonth() - 1);
      periodBLabel = "Previous Month";
    } else if (compareMode === "qoq") {
      prevStartDate = new Date(startDate.getTime());
      prevStartDate.setMonth(prevStartDate.getMonth() - 3);
      prevEndDate = new Date(endDate.getTime());
      prevEndDate.setMonth(prevEndDate.getMonth() - 3);
      periodBLabel = "Previous Quarter";
    }
  }

  const compareLabel = `${periodALabel} vs ${periodBLabel}`;
  const isComparing = compareMode !== "none" || Boolean(opts.granularity && opts.periodA);
  const nowStr = now.toISOString().slice(0, 10);
  const tomorrowMidnight = new Date(todayMidnight.getTime() + msInDay);

  const [
    revenueResult,
    pendingOrdersCount,
    readyForPickupOrdersCount,
    delayedOrdersCount,
    todayAppointmentsCount,
    lowStockCount,
    pendingPaymentsResult,
    recentInvoices,
    deliveryStatusCounts,
    recentOrdersList,
    pendingOrdersListRaw,
    pickupOrdersListRaw,
    delayedOrdersListRaw,
    lowStockInventoryList,
    topSKUsCurrent,
    topSKUsPrevious,
    topCustomersList,
    categorySalesList,
    todayAppointmentsRaw,
    recentActivitiesList,
    compareRevenueResult,
    comparePendingPaymentsResult,
    compareInvoices,
    storesCountResult,
    detailedInvoiceItems,
    allActiveInventory,
    salesReturnsList,
    salesReturnItemsList,
    customerLifetimeCounts,
    recent90DayMovements,
    prevPeriodInvoicesList,
    recent10InvoicesWithItems
  ] = await Promise.all([
    // 1. Primary Revenue
    db
      .select({ total: sum(invoices.total) })
      .from(invoices)
      .where(
        and(
          shopCond(invoices.shopId, invoices.organizationId),
          eq(invoices.status, "PAID"),
          gte(invoices.createdAt, startDate),
          lte(invoices.createdAt, endDate)
        )
      ),

    // 2. Pending Orders Count (Not delivered and not cancelled)
    db
      .select({ value: count() })
      .from(invoices)
      .where(
        and(
          shopCond(invoices.shopId, invoices.organizationId),
          ne(invoices.fulfillmentStatus, "DELIVERED"),
          ne(invoices.status, "CANCELLED")
        )
      ),

    // 3. Ready for Pickup Orders Count (Marked READY or PROCESSING)
    db
      .select({ value: count() })
      .from(invoices)
      .where(
        and(
          shopCond(invoices.shopId, invoices.organizationId),
          or(eq(invoices.fulfillmentStatus, "READY"), eq(invoices.fulfillmentStatus, "PROCESSING")),
          ne(invoices.status, "CANCELLED")
        )
      ),

    // 4. Delayed Orders Count (Estimated delivery < today and not delivered)
    db
      .select({ value: count() })
      .from(invoices)
      .where(
        and(
          shopCond(invoices.shopId, invoices.organizationId),
          ne(invoices.fulfillmentStatus, "DELIVERED"),
          ne(invoices.status, "CANCELLED"),
          sql`${invoices.estimatedDelivery} is not null`,
          lt(invoices.estimatedDelivery, nowStr)
        )
      ),

    // 5. Today's Appointments Count
    db
      .select({ value: count() })
      .from(appointments)
      .where(
        and(
          shopCond(appointments.shopId, appointments.organizationId),
          gte(appointments.visitTime, todayMidnight),
          lt(appointments.visitTime, tomorrowMidnight),
          ne(appointments.status, "CANCELLED")
        )
      ),

    // 6. Low Stock Count
    db
      .select({ value: count() })
      .from(inventory)
      .where(
        and(
          shopCond(inventory.shopId, inventory.organizationId),
          lte(inventory.quantity, inventory.minQuantity)
        )
      ),

    // 7. Pending Payments
    db
      .select({ balance: sum(sql`${invoices.total} - ${invoices.amountPaid}`) })
      .from(invoices)
      .where(
        and(
          shopCond(invoices.shopId, invoices.organizationId),
          ne(invoices.status, "CANCELLED"),
          ne(invoices.status, "PAID"),
          gte(invoices.createdAt, startDate),
          lte(invoices.createdAt, endDate)
        )
      ),

    // 8. Recent Invoices in period
    db
      .select()
      .from(invoices)
      .where(
        and(
          shopCond(invoices.shopId, invoices.organizationId),
          gte(invoices.createdAt, startDate),
          lte(invoices.createdAt, endDate)
        )
      )
      .orderBy(desc(invoices.createdAt)),

    // 9. Delivery Status Counts
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
          shopCond(invoices.shopId, invoices.organizationId),
          gte(invoices.createdAt, startDate),
          lte(invoices.createdAt, endDate)
        )
      )
      .groupBy(invoices.status, invoices.fulfillmentStatus, invoices.estimatedDelivery),

    // 10. Recent Orders List
    db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        customerName: customers.fullName,
        customerPhone: customers.phone,
        total: invoices.total,
        amountPaid: invoices.amountPaid,
        status: invoices.status,
        fulfillmentStatus: invoices.fulfillmentStatus,
        estimatedDelivery: invoices.estimatedDelivery,
        createdAt: invoices.createdAt
      })
      .from(invoices)
      .leftJoin(customers, eq(invoices.customerId, customers.id))
      .where(shopCond(invoices.shopId, invoices.organizationId))
      .orderBy(desc(invoices.createdAt))
      .limit(8),

    // 11. Pending Orders Specific List
    db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        customerName: customers.fullName,
        customerPhone: customers.phone,
        total: invoices.total,
        amountPaid: invoices.amountPaid,
        status: invoices.status,
        fulfillmentStatus: invoices.fulfillmentStatus,
        estimatedDelivery: invoices.estimatedDelivery,
        createdAt: invoices.createdAt
      })
      .from(invoices)
      .leftJoin(customers, eq(invoices.customerId, customers.id))
      .where(
        and(
          shopCond(invoices.shopId, invoices.organizationId),
          ne(invoices.fulfillmentStatus, "DELIVERED"),
          ne(invoices.status, "CANCELLED")
        )
      )
      .orderBy(desc(invoices.createdAt))
      .limit(15),

    // 12. Pickup Ready Orders Specific List
    db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        customerName: customers.fullName,
        customerPhone: customers.phone,
        total: invoices.total,
        amountPaid: invoices.amountPaid,
        status: invoices.status,
        fulfillmentStatus: invoices.fulfillmentStatus,
        estimatedDelivery: invoices.estimatedDelivery,
        createdAt: invoices.createdAt
      })
      .from(invoices)
      .leftJoin(customers, eq(invoices.customerId, customers.id))
      .where(
        and(
          shopCond(invoices.shopId, invoices.organizationId),
          or(eq(invoices.fulfillmentStatus, "READY"), eq(invoices.fulfillmentStatus, "PROCESSING")),
          ne(invoices.status, "CANCELLED")
        )
      )
      .orderBy(desc(invoices.createdAt))
      .limit(15),

    // 13. Delayed Orders Specific List
    db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        customerName: customers.fullName,
        customerPhone: customers.phone,
        total: invoices.total,
        amountPaid: invoices.amountPaid,
        status: invoices.status,
        fulfillmentStatus: invoices.fulfillmentStatus,
        estimatedDelivery: invoices.estimatedDelivery,
        createdAt: invoices.createdAt
      })
      .from(invoices)
      .leftJoin(customers, eq(invoices.customerId, customers.id))
      .where(
        and(
          shopCond(invoices.shopId, invoices.organizationId),
          ne(invoices.fulfillmentStatus, "DELIVERED"),
          ne(invoices.status, "CANCELLED"),
          sql`${invoices.estimatedDelivery} is not null`,
          lt(invoices.estimatedDelivery, nowStr)
        )
      )
      .orderBy(invoices.estimatedDelivery)
      .limit(15),

    // 14. Low Stock Inventory List
    db
      .select()
      .from(inventory)
      .where(shopCond(inventory.shopId, inventory.organizationId))
      .orderBy(inventory.quantity)
      .limit(8),

    // 15. Top SKUs Current
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
          shopCond(invoiceItems.shopId, invoiceItems.organizationId),
          gte(invoiceItems.createdAt, startDate),
          lte(invoiceItems.createdAt, endDate)
        )
      )
      .groupBy(invoiceItems.inventoryId, inventory.name)
      .orderBy(desc(sum(invoiceItems.quantity)))
      .limit(5),

    // 16. Top SKUs Previous
    db
      .select({
        inventoryId: invoiceItems.inventoryId,
        sold: sum(invoiceItems.quantity)
      })
      .from(invoiceItems)
      .where(
        and(
          shopCond(invoiceItems.shopId, invoiceItems.organizationId),
          gte(invoiceItems.createdAt, prevStartDate),
          lt(invoiceItems.createdAt, prevEndDate)
        )
      )
      .groupBy(invoiceItems.inventoryId),

    // 17. Top Customers (VIP Patients)
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
          shopCond(invoices.shopId, invoices.organizationId),
          eq(invoices.status, "PAID"),
          gte(invoices.createdAt, startDate),
          lte(invoices.createdAt, endDate)
        )
      )
      .groupBy(customers.id, customers.fullName, customers.phone)
      .orderBy(desc(sum(invoices.total)))
      .limit(5),

    // 18. Category Sales Distribution
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
          shopCond(invoiceItems.shopId, invoiceItems.organizationId),
          gte(invoiceItems.createdAt, startDate),
          lte(invoiceItems.createdAt, endDate)
        )
      )
      .groupBy(inventory.category),

    // 19. Today's Appointments List
    db
      .select()
      .from(appointments)
      .where(
        and(
          shopCond(appointments.shopId, appointments.organizationId),
          gte(appointments.visitTime, todayMidnight),
          lt(appointments.visitTime, tomorrowMidnight)
        )
      )
      .orderBy(appointments.visitTime)
      .limit(20),

    // 20. Recent Activities Feed
    getShopRecentActivities(shopId, organizationId, 25),

    // 21. Comparison: Revenue
    isComparing ? db
      .select({ total: sum(invoices.total) })
      .from(invoices)
      .where(
        and(
          shopCond(invoices.shopId, invoices.organizationId),
          eq(invoices.status, "PAID"),
          gte(invoices.createdAt, prevStartDate),
          lte(invoices.createdAt, prevEndDate)
        )
      ) : Promise.resolve([]),

    // 22. Comparison: Pending Payments
    isComparing ? db
      .select({ balance: sum(sql`${invoices.total} - ${invoices.amountPaid}`) })
      .from(invoices)
      .where(
        and(
          shopCond(invoices.shopId, invoices.organizationId),
          ne(invoices.status, "CANCELLED"),
          ne(invoices.status, "PAID"),
          gte(invoices.createdAt, prevStartDate),
          lte(invoices.createdAt, prevEndDate)
        )
      ) : Promise.resolve([]),

    // 23. Comparison: Invoices
    isComparing ? db
      .select()
      .from(invoices)
      .where(
        and(
          shopCond(invoices.shopId, invoices.organizationId),
          gte(invoices.createdAt, prevStartDate),
          lte(invoices.createdAt, prevEndDate)
        )
      )
      .orderBy(desc(invoices.createdAt)) : Promise.resolve([]),

    // 24. Stores count in organization
    organizationId
      ? db
          .select({ val: count() })
          .from(shops)
          .where(and(eq(shops.organizationId, organizationId), eq(shops.isActive, true)))
      : Promise.resolve([{ val: 1 }]),

    // 25. Detailed invoice items in period (for customer & sales bifurcation)
    db
      .select({
        itemId: invoiceItems.id,
        invoiceId: invoiceItems.invoiceId,
        inventoryId: invoiceItems.inventoryId,
        description: invoiceItems.description,
        quantity: invoiceItems.quantity,
        unitPrice: invoiceItems.unitPrice,
        subtotal: invoiceItems.subtotal,
        customerId: invoices.customerId,
        customerGender: customers.gender,
        customerDob: customers.dateOfBirth,
        inventoryCategory: inventory.category,
        inventoryBrand: inventory.brand,
        inventoryName: inventory.name,
        lensDesign: lensDetails.design,
        frameShape: frameDetails.frameShape,
        frameDemographic: frameDetails.targetDemographic,
      })
      .from(invoiceItems)
      .innerJoin(invoices, eq(invoiceItems.invoiceId, invoices.id))
      .leftJoin(customers, eq(invoices.customerId, customers.id))
      .leftJoin(inventory, eq(invoiceItems.inventoryId, inventory.id))
      .leftJoin(lensDetails, eq(inventory.id, lensDetails.inventoryId))
      .leftJoin(frameDetails, eq(inventory.id, frameDetails.inventoryId))
      .where(
        and(
          shopCond(invoices.shopId, invoices.organizationId),
          gte(invoices.createdAt, startDate),
          lte(invoices.createdAt, endDate),
          ne(invoices.status, "CANCELLED")
        )
      ),

    // 26. All active inventory (for stock valuation, dead stock, and low stock)
    db
      .select({
        id: inventory.id,
        name: inventory.name,
        category: inventory.category,
        brand: inventory.brand,
        quantity: inventory.quantity,
        minQuantity: inventory.minQuantity,
        costPrice: inventory.costPrice,
        price: inventory.price,
        createdAt: inventory.createdAt,
        sku: inventory.sku,
      })
      .from(inventory)
      .where(
        and(
          shopCond(inventory.shopId, inventory.organizationId),
          eq(inventory.isActive, true)
        )
      ),

    // 27. Sales Returns in period
    db
      .select({
        id: salesReturns.id,
        totalRefundAmount: salesReturns.totalRefundAmount,
        returnType: salesReturns.returnType,
        status: salesReturns.status,
      })
      .from(salesReturns)
      .where(
        and(
          shopCond(salesReturns.shopId, salesReturns.organizationId),
          gte(salesReturns.createdAt, startDate),
          lte(salesReturns.createdAt, endDate),
          ne(salesReturns.status, "CANCELLED")
        )
      ),

    // 28. Sales Return Items in period
    db
      .select({
        id: salesReturnItems.id,
        quantityReturned: salesReturnItems.quantityReturned,
      })
      .from(salesReturnItems)
      .where(
        and(
          shopCond(salesReturnItems.shopId, salesReturnItems.organizationId),
          gte(salesReturnItems.createdAt, startDate),
          lte(salesReturnItems.createdAt, endDate)
        )
      ),

    // 29. Customer lifetime invoice counts (for retention rate)
    db
      .select({
        customerId: invoices.customerId,
        totalInvoices: count(invoices.id),
      })
      .from(invoices)
      .where(
        and(
          shopCond(invoices.shopId, invoices.organizationId),
          ne(invoices.status, "CANCELLED")
        )
      )
      .groupBy(invoices.customerId),

    // 30. Recent 90-day stock movements (for dead stock)
    db
      .select({
        inventoryId: stockMovements.inventoryId,
      })
      .from(stockMovements)
      .where(
        and(
          shopCond(stockMovements.shopId, stockMovements.organizationId),
          gte(stockMovements.createdAt, new Date(now.getTime() - 90 * msInDay))
        )
      )
      .groupBy(stockMovements.inventoryId),

    // 31. Previous period invoices (for growth comparisons)
    db
      .select({
        id: invoices.id,
        total: invoices.total,
        amountPaid: invoices.amountPaid,
        customerId: invoices.customerId,
        status: invoices.status,
      })
      .from(invoices)
      .where(
        and(
          shopCond(invoices.shopId, invoices.organizationId),
          gte(invoices.createdAt, prevStartDate),
          lte(invoices.createdAt, prevEndDate),
          ne(invoices.status, "CANCELLED")
        )
      ),

    // 32. Recent Invoices with items (for Recent Transactions high-density table)
    db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        total: invoices.total,
        amountPaid: invoices.amountPaid,
        status: invoices.status,
        createdAt: invoices.createdAt,
        customerName: customers.fullName,
        itemDescription: invoiceItems.description,
        itemQuantity: invoiceItems.quantity,
      })
      .from(invoices)
      .leftJoin(customers, eq(invoices.customerId, customers.id))
      .leftJoin(invoiceItems, eq(invoices.id, invoiceItems.invoiceId))
      .where(
        and(
          shopCond(invoices.shopId, invoices.organizationId),
          ne(invoices.status, "CANCELLED")
        )
      )
      .orderBy(desc(invoices.createdAt))
      .limit(30)
  ]);

  // Primary KPIs calculations (Exact live numbers)
  const revenueVal = Number(revenueResult[0]?.total || 0);
  const pendingOrdersVal = pendingOrdersCount[0]?.value || 0;
  const readyForPickupOrdersVal = readyForPickupOrdersCount[0]?.value || 0;
  const delayedOrdersVal = delayedOrdersCount[0]?.value || 0;
  const appointmentsTodayVal = todayAppointmentsCount[0]?.value || 0;
  const lowStockVal = lowStockCount[0]?.value || 0;
  const pendingPaymentsVal = Number(pendingPaymentsResult[0]?.balance || 0);

  // Helper for growth calculation
  const calcGrowth = (curr: number, prev: number) => {
    if (prev <= 0) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 100);
  };

  // Optical KPI calculations & growth rates
  const prevRevenueVal = prevPeriodInvoicesList
    .filter((inv) => inv.status === "PAID")
    .reduce((acc, inv) => acc + Number(inv.total || 0), 0);
  const revenueGrowth = calcGrowth(revenueVal, prevRevenueVal);

  const salesInvoicesCount = recentInvoices.length;
  const prevSalesInvoicesCount = prevPeriodInvoicesList.length;
  const salesInvoicesGrowth = calcGrowth(salesInvoicesCount, prevSalesInvoicesCount);

  const accountsReceivableVal = pendingPaymentsVal;
  const prevAccountsReceivable = prevPeriodInvoicesList
    .filter((inv) => inv.status !== "PAID")
    .reduce((acc, inv) => acc + Math.max(0, Number(inv.total || 0) - Number(inv.amountPaid || 0)), 0);
  const accountsReceivableGrowth = calcGrowth(accountsReceivableVal, prevAccountsReceivable);

  const activeCustomersSet = new Set(recentInvoices.map((inv) => inv.customerId).filter(Boolean));
  const activeCustomersCount = activeCustomersSet.size;
  const prevCustomersSet = new Set(prevPeriodInvoicesList.map((inv) => inv.customerId).filter(Boolean));
  const activeCustomersGrowth = calcGrowth(activeCustomersCount, prevCustomersSet.size);

  const totalStoresCount = Number(storesCountResult[0]?.val || 1);
  const totalStoresGrowth = 0;

  const opticalKPIs: OpticalDashboardKPIs = {
    revenue: revenueVal,
    collections: Math.max(0, revenueVal - pendingPaymentsVal),
    pendingOrders: pendingOrdersVal,
    readyForPickupOrders: readyForPickupOrdersVal,
    delayedOrders: delayedOrdersVal,
    appointmentsToday: appointmentsTodayVal,
    lowStockAlerts: lowStockVal,
    pendingPayments: pendingPaymentsVal,
    totalOrdersCount: salesInvoicesCount,
    avgOrderValue: salesInvoicesCount > 0 ? revenueVal / salesInvoicesCount : 0,
    paidInvoicesCount: recentInvoices.filter((i) => i.status === "PAID").length,
    patientVisitsCount: appointmentsTodayVal,
    revenueGrowth,
    salesInvoicesCount,
    salesInvoicesGrowth,
    accountsReceivable: accountsReceivableVal,
    accountsReceivableGrowth,
    activeCustomersCount,
    activeCustomersGrowth,
    totalStoresCount,
    totalStoresGrowth,
  };

  // 1. Customer Bifurcation (Only Frame, Only Lens, Both Frame & Lens)
  const customerItemCategoryMap = new Map<string, { hasFrame: boolean; hasLens: boolean }>();
  detailedInvoiceItems.forEach((item) => {
    const cid = item.customerId || "walk-in";
    const cat = (item.inventoryCategory || "").toUpperCase();
    const desc = (item.description || "").toUpperCase();
    const isFrame =
      cat.includes("FRAME") ||
      desc.includes("FRAME") ||
      Boolean(item.frameShape) ||
      Boolean(item.frameDemographic);
    const isLens =
      cat.includes("LENS") ||
      cat.includes("CONTACT") ||
      desc.includes("LENS") ||
      desc.includes("VISION") ||
      desc.includes("BIFOCAL") ||
      desc.includes("PROGRESSIVE") ||
      Boolean(item.lensDesign);

    const existing = customerItemCategoryMap.get(cid) || { hasFrame: false, hasLens: false };
    if (isFrame) existing.hasFrame = true;
    if (isLens) existing.hasLens = true;
    customerItemCategoryMap.set(cid, existing);
  });

  let onlyFrame = 0;
  let onlyLens = 0;
  let bothFrameAndLens = 0;

  customerItemCategoryMap.forEach((flags) => {
    if (flags.hasFrame && !flags.hasLens) onlyFrame++;
    else if (!flags.hasFrame && flags.hasLens) onlyLens++;
    else if (flags.hasFrame && flags.hasLens) bothFrameAndLens++;
    else onlyFrame++; // fallback for items categorized under general accessories
  });

  const totalBifurcationCustomers = onlyFrame + onlyLens + bothFrameAndLens;
  const customerBifurcation: CustomerBifurcation = {
    onlyFrame,
    onlyFramePercent: totalBifurcationCustomers > 0 ? Math.round((onlyFrame / totalBifurcationCustomers) * 100) : 0,
    onlyLens,
    onlyLensPercent: totalBifurcationCustomers > 0 ? Math.round((onlyLens / totalBifurcationCustomers) * 100) : 0,
    bothFrameAndLens,
    bothFrameAndLensPercent: totalBifurcationCustomers > 0 ? Math.round((bothFrameAndLens / totalBifurcationCustomers) * 100) : 0,
    totalCustomers: totalBifurcationCustomers,
  };

  // 2. Dead Stock (Items not moved in last 90 days)
  const movedInventoryIds = new Set(recent90DayMovements.map((m) => m.inventoryId).filter(Boolean));
  const ninetyDaysCutoff = new Date(now.getTime() - 90 * msInDay);
  const deadStockItems = allActiveInventory.filter((item) => {
    const qty = Number(item.quantity || 0);
    const isOlderThan90 = item.createdAt ? new Date(item.createdAt).getTime() < ninetyDaysCutoff.getTime() : false;
    return qty > 0 && isOlderThan90 && !movedInventoryIds.has(item.id);
  });
  const deadStockCount = deadStockItems.length;
  const totalInventoryCount = allActiveInventory.length;
  const deadStock: DeadStockData = {
    count: deadStockCount,
    percentageOfTotal: totalInventoryCount > 0 ? Math.round((deadStockCount / totalInventoryCount) * 100) : 0,
    totalItems: totalInventoryCount,
  };

  // 3. Stock Valuation (Asset distribution by category)
  const valuationMap: Record<string, { value: number; count: number }> = {
    FRAME: { value: 0, count: 0 },
    LENS: { value: 0, count: 0 },
    CONTACT_LENS: { value: 0, count: 0 },
    ACCESSORY: { value: 0, count: 0 },
    SOLUTION: { value: 0, count: 0 },
    OTHER: { value: 0, count: 0 },
  };

  let totalValuationSum = 0;
  let totalUnitsSum = 0;

  allActiveInventory.forEach((item) => {
    const qty = Number(item.quantity || 0);
    const cost = Number(item.costPrice || 0) > 0 ? Number(item.costPrice) : Number(item.price || 0);
    const itemTotalValue = qty * cost;

    let catKey = (item.category || "OTHER").toUpperCase();
    if (!valuationMap[catKey]) {
      catKey = "OTHER";
    }

    valuationMap[catKey].value += itemTotalValue;
    valuationMap[catKey].count += qty;
    totalValuationSum += itemTotalValue;
    totalUnitsSum += qty;
  });

  const categoryColorMap: Record<string, { label: string; color: string }> = {
    FRAME: { label: "Frames", color: "#3B82F6" },
    LENS: { label: "Lenses", color: "#8B5CF6" },
    CONTACT_LENS: { label: "Contact Lenses", color: "#06B6D4" },
    ACCESSORY: { label: "Accessories", color: "#10B981" },
    SOLUTION: { label: "Solutions", color: "#EC4899" },
    OTHER: { label: "Other", color: "#64748B" },
  };

  const stockCategories: StockCategoryValuation[] = Object.entries(valuationMap)
    .filter(([_, v]) => v.value > 0 || v.count > 0)
    .map(([k, v]) => ({
      category: k,
      label: categoryColorMap[k]?.label || k,
      value: v.value,
      count: v.count,
      percentage: totalValuationSum > 0 ? Math.round((v.value / totalValuationSum) * 100) : 0,
      color: categoryColorMap[k]?.color || "#94A3B8",
    }));

  const stockValuation: StockValuationData = {
    totalValue: totalValuationSum,
    totalUnits: totalUnitsSum,
    categories: stockCategories.length > 0 ? stockCategories : [
      { category: "FRAME", label: "Frames", value: 0, count: 0, percentage: 0, color: "#3B82F6" },
      { category: "LENS", label: "Lenses", value: 0, count: 0, percentage: 0, color: "#8B5CF6" }
    ],
  };

  // 4. Return Rate
  const totalSalesCount = salesInvoicesCount;
  const returnedItemsCount = salesReturnItemsList.reduce((acc, it) => acc + (it.quantityReturned || 1), 0) || salesReturnsList.length;
  const returnRatePercent = totalSalesCount > 0 ? Math.round((returnedItemsCount / totalSalesCount) * 100) : 0;
  const returnRate: ReturnRateData = {
    totalSales: totalSalesCount,
    returnedItems: returnedItemsCount,
    returnRatePercent,
  };

  // 5. Sales Bifurcation (5 Dynamic Dimensions)
  const totalPeriodSalesAmount = recentInvoices.reduce((acc, inv) => acc + Number(inv.total || 0), 0);

  // By Lenses
  const lensDesignMap: Record<string, { count: number; amount: number }> = {
    "Single Vision": { count: 0, amount: 0 },
    "Bifocal": { count: 0, amount: 0 },
    "Progressive": { count: 0, amount: 0 },
    "Other": { count: 0, amount: 0 },
  };

  // By Frames
  const frameShapeMap: Record<string, { count: number; amount: number }> = {
    "Full Rim": { count: 0, amount: 0 },
    "Half Rim": { count: 0, amount: 0 },
    "Rimless": { count: 0, amount: 0 },
    "Sunglasses": { count: 0, amount: 0 },
    "Other": { count: 0, amount: 0 },
  };

  // By Brands
  const brandMap: Record<string, { count: number; amount: number }> = {};

  // By Gender
  const genderMap: Record<string, { count: number; amount: number }> = {
    "Male": { count: 0, amount: 0 },
    "Female": { count: 0, amount: 0 },
    "Unisex": { count: 0, amount: 0 },
    "Other": { count: 0, amount: 0 },
  };

  // By Age
  const ageMap: Record<string, { count: number; amount: number }> = {
    "Kids (<18)": { count: 0, amount: 0 },
    "Young Adults (18-35)": { count: 0, amount: 0 },
    "Middle Age (36-55)": { count: 0, amount: 0 },
    "Seniors (55+)": { count: 0, amount: 0 },
    "Unspecified": { count: 0, amount: 0 },
  };

  detailedInvoiceItems.forEach((item) => {
    const qty = Number(item.quantity || 1);
    const amt = Number(item.subtotal || (item.unitPrice ? Number(item.unitPrice) * qty : 0));
    const cat = (item.inventoryCategory || "").toUpperCase();
    const desc = (item.description || "").toUpperCase();

    // 1. Lens classification
    if (cat.includes("LENS") || desc.includes("LENS") || desc.includes("VISION") || desc.includes("BIFOCAL") || desc.includes("PROGRESSIVE") || item.lensDesign) {
      const design = (item.lensDesign || desc).toUpperCase();
      if (design.includes("SINGLE") || design.includes("SV")) {
        lensDesignMap["Single Vision"].count += qty;
        lensDesignMap["Single Vision"].amount += amt;
      } else if (design.includes("BIFOCAL") || design.includes("D-BIFOCAL") || design.includes("KRYPTOK")) {
        lensDesignMap["Bifocal"].count += qty;
        lensDesignMap["Bifocal"].amount += amt;
      } else if (design.includes("PROGRESSIVE") || design.includes("PAL") || design.includes("MULTIFOCAL")) {
        lensDesignMap["Progressive"].count += qty;
        lensDesignMap["Progressive"].amount += amt;
      } else {
        lensDesignMap["Other"].count += qty;
        lensDesignMap["Other"].amount += amt;
      }
    }

    // 2. Frame classification
    if (cat.includes("FRAME") || desc.includes("FRAME") || Boolean(item.frameShape) || Boolean(item.frameDemographic)) {
      const shape = (item.frameShape || desc).toUpperCase();
      if (shape.includes("FULL") || shape.includes("FULL RIM")) {
        frameShapeMap["Full Rim"].count += qty;
        frameShapeMap["Full Rim"].amount += amt;
      } else if (shape.includes("HALF") || shape.includes("SUPRA") || shape.includes("SEMI")) {
        frameShapeMap["Half Rim"].count += qty;
        frameShapeMap["Half Rim"].amount += amt;
      } else if (shape.includes("RIMLESS") || shape.includes("FRAMELESS")) {
        frameShapeMap["Rimless"].count += qty;
        frameShapeMap["Rimless"].amount += amt;
      } else if (shape.includes("SUN") || cat.includes("SUNGLASS")) {
        frameShapeMap["Sunglasses"].count += qty;
        frameShapeMap["Sunglasses"].amount += amt;
      } else {
        frameShapeMap["Other"].count += qty;
        frameShapeMap["Other"].amount += amt;
      }
    }

    // 3. Brand classification
    const brandName = item.inventoryBrand || (desc.includes("RAY-BAN") ? "Ray-Ban" : desc.includes("OAKLEY") ? "Oakley" : desc.includes("GUCCI") ? "Gucci" : desc.includes("TITAN") ? "Titan" : "Generic");
    if (!brandMap[brandName]) {
      brandMap[brandName] = { count: 0, amount: 0 };
    }
    brandMap[brandName].count += qty;
    brandMap[brandName].amount += amt;

    // 4. Gender classification
    const gender = (item.customerGender || item.frameDemographic || "UNSPECIFIED").toUpperCase();
    if (gender === "MALE" || gender === "MEN") {
      genderMap["Male"].count += qty;
      genderMap["Male"].amount += amt;
    } else if (gender === "FEMALE" || gender === "WOMEN") {
      genderMap["Female"].count += qty;
      genderMap["Female"].amount += amt;
    } else if (gender === "UNISEX") {
      genderMap["Unisex"].count += qty;
      genderMap["Unisex"].amount += amt;
    } else {
      genderMap["Other"].count += qty;
      genderMap["Other"].amount += amt;
    }

    // 5. Age classification
    if (item.customerDob) {
      const dob = new Date(item.customerDob);
      const ageDiff = now.getFullYear() - dob.getFullYear();
      if (ageDiff < 18) {
        ageMap["Kids (<18)"].count += qty;
        ageMap["Kids (<18)"].amount += amt;
      } else if (ageDiff <= 35) {
        ageMap["Young Adults (18-35)"].count += qty;
        ageMap["Young Adults (18-35)"].amount += amt;
      } else if (ageDiff <= 55) {
        ageMap["Middle Age (36-55)"].count += qty;
        ageMap["Middle Age (36-55)"].amount += amt;
      } else {
        ageMap["Seniors (55+)"].count += qty;
        ageMap["Seniors (55+)"].amount += amt;
      }
    } else {
      ageMap["Unspecified"].count += qty;
      ageMap["Unspecified"].amount += amt;
    }
  });

  const buildSlices = (map: Record<string, { count: number; amount: number }>, colors: string[]): { slices: SalesBifurcationSlice[]; total: number } => {
    const totalCount = Object.values(map).reduce((acc, v) => acc + v.count, 0);
    const totalAmt = Object.values(map).reduce((acc, v) => acc + v.amount, 0);
    const entries = Object.entries(map);

    const slices: SalesBifurcationSlice[] = entries.map(([name, data], idx) => ({
      name,
      count: data.count,
      amount: data.amount,
      percentage: totalCount > 0 ? Math.round((data.count / totalCount) * 100) : 0,
      color: colors[idx % colors.length],
    }));

    return { slices, total: totalAmt || totalCount };
  };

  const salesBifurcation: SalesBifurcationData = {
    totalSalesAmount: totalPeriodSalesAmount,
    byLenses: buildSlices(lensDesignMap, ["#3B82F6", "#8B5CF6", "#10B981", "#F59E0B"]),
    byFrames: buildSlices(frameShapeMap, ["#3B82F6", "#8B5CF6", "#06B6D4", "#F59E0B", "#64748B"]),
    byBrands: buildSlices(brandMap, ["#3B82F6", "#8B5CF6", "#06B6D4", "#10B981", "#F59E0B", "#EC4899", "#64748B"]),
    byGender: buildSlices(genderMap, ["#3B82F6", "#EC4899", "#8B5CF6", "#64748B"]),
    byAge: buildSlices(ageMap, ["#06B6D4", "#3B82F6", "#8B5CF6", "#F59E0B", "#94A3B8"]),
  };

  // 6. Retention Rate
  const lifetimeCountsMap = new Map<string, number>();
  customerLifetimeCounts.forEach((c) => {
    if (c.customerId) {
      lifetimeCountsMap.set(c.customerId, Number(c.totalInvoices || 0));
    }
  });

  const periodCustomerIds = Array.from(activeCustomersSet);
  let returningCustomersCount = 0;
  periodCustomerIds.forEach((cid) => {
    if ((lifetimeCountsMap.get(cid) || 0) >= 2) {
      returningCustomersCount++;
    }
  });

  const retentionRatePercent = periodCustomerIds.length > 0 ? Math.round((returningCustomersCount / periodCustomerIds.length) * 100) : 0;
  const retentionRate: RetentionRateData = {
    totalCustomers: periodCustomerIds.length,
    returningCustomers: returningCustomersCount,
    retentionRatePercent,
  };

  // 7. Low Stock Alerts Summary
  const lowStockAlertItems: LowStockAlertItem[] = allActiveInventory
    .filter((i) => i.quantity <= i.minQuantity)
    .slice(0, 5)
    .map((i) => ({
      id: i.id,
      name: i.name,
      quantity: i.quantity,
      minQuantity: i.minQuantity,
      category: i.category || undefined,
      sku: i.sku || undefined,
    }));

  const lowStockSummary: LowStockSummaryData = {
    lowStockCount: lowStockVal,
    items: lowStockAlertItems,
  };

  // 8. Recent Transactions
  const invoiceItemsSummaryMap = new Map<string, string[]>();
  const invoiceRowMap = new Map<string, any>();

  recent10InvoicesWithItems.forEach((row) => {
    if (!invoiceRowMap.has(row.id)) {
      invoiceRowMap.set(row.id, row);
    }
    if (row.itemDescription) {
      const list = invoiceItemsSummaryMap.get(row.id) || [];
      const itemText = `${row.itemQuantity || 1} × ${row.itemDescription}`;
      if (!list.includes(itemText)) {
        list.push(itemText);
      }
      invoiceItemsSummaryMap.set(row.id, list);
    }
  });

  const recentTransactions: RecentTransactionItem[] = Array.from(invoiceRowMap.values())
    .slice(0, 6)
    .map((inv) => {
      const items = invoiceItemsSummaryMap.get(inv.id) || ["1 × Optical Purchase"];
      const itemsSummary = items.slice(0, 2).join(", ") + (items.length > 2 ? ` (+${items.length - 2} more)` : "");
      const d = inv.createdAt ? new Date(inv.createdAt) : new Date();

      return {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber || inv.id,
        customerName: inv.customerName || "Walk-in Customer",
        itemsSummary,
        amount: Number(inv.total || 0),
        status: inv.status as any,
        dateFormatted: d.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }),
        rawDate: d.toISOString(),
      };
    });

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
      pendingOrders: pendingOrdersVal,
      readyForPickupOrders: readyForPickupOrdersVal,
      delayedOrders: delayedOrdersVal,
      appointmentsToday: appointmentsTodayVal,
      lowStockAlerts: lowStockVal,
      pendingPayments: compPendingPaymentsVal,
      totalOrdersCount: compPaidCount,
      avgOrderValue: compAvgOrder,
      paidInvoicesCount: compPaidCount,
      patientVisitsCount: appointmentsTodayVal,
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

  if (delayedOrdersVal > 0) {
    priorityActions.push({
      id: "action-delayed",
      description: `Review ${delayedOrdersVal} Delayed Order${delayedOrdersVal > 1 ? "s" : ""}`,
      actionLabel: "View Details",
      actionHref: "/shop/orders",
      type: "delivery"
    });
  }

  // Order Mapper Helper
  const mapOrderRow = (o: any): RecentOrder => {
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
      id: o.invoiceNumber || o.id,
      invoiceNumber: o.invoiceNumber,
      customerName: o.customerName || "Walk-in Patient",
      customerPhone: o.customerPhone || undefined,
      amount: Number(o.total || 0),
      status: paymentStatus,
      fulfillmentStatus: o.fulfillmentStatus || undefined,
      dateStr: o.createdAt ? new Date(o.createdAt).toLocaleDateString() : undefined,
      estimatedDelivery: o.estimatedDelivery || undefined,
    };
  };

  const recentOrders: RecentOrder[] = recentOrdersList.map(mapOrderRow);
  const pendingOrders: RecentOrder[] = pendingOrdersListRaw.map(mapOrderRow);
  const pickupOrders: RecentOrder[] = pickupOrdersListRaw.map(mapOrderRow);
  const delayedOrders: RecentOrder[] = delayedOrdersListRaw.map(mapOrderRow);

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
  const topCustomers: TopCustomer[] = topCustomersList.map((c: any) => ({
    id: c.id || "unknown",
    name: c.name || "Walk-in Patient",
    phone: c.phone || "N/A",
    totalSpent: Number(c.totalSpent || 0),
    ordersCount: Number(c.ordersCount || 0),
    lastVisitDate: c.lastVisitDate ? new Date(c.lastVisitDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "N/A"
  }));

  // Category Sales mapping
  const categorySales: CategorySalesItem[] = categorySalesList.map((cat: any) => ({
    category: cat.category || "GENERAL",
    quantity: Number(cat.quantity || 0),
    revenue: Number(cat.revenue || 0)
  }));

  // Appointments mapping
  const todayAppointments: AppointmentItem[] = todayAppointmentsRaw.map((app) => ({
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

  const paidInvoicesCount = recentInvoices.length;
  const avgOrderValue = paidInvoicesCount > 0 ? revenueVal / paidInvoicesCount : 0;

  return {
    kpis: opticalKPIs,
    opticalKPIs,
    customerBifurcation,
    deadStock,
    stockValuation,
    returnRate,
    salesBifurcation,
    retentionRate,
    recentTransactions,
    lowStockSummary,
    revenueChart,
    compareRevenueChart,
    compareKPIs,
    periodALabel,
    periodBLabel,
    compareLabel,
    priorityActions,
    deliveryPerformance,
    recentOrders,
    pendingOrders,
    pickupOrders,
    delayedOrders,
    stockAlerts,
    topSKUs,
    topCustomers,
    categorySales,
    appointments: todayAppointments,
    todayAppointments,
    recentActivities: recentActivitiesList,
  };
}

/**
 * Aggregates store-wide recent activity across Invoices, Purchases, Returns, Stock, Appointments, and Communications
 */
export async function getShopRecentActivities(
  shopId: string,
  organizationId?: string,
  limit = 25
): Promise<RecentActivityItem[]> {
  const shopCond = (shopCol: any, orgCol: any) => {
    if (shopId === "all" && organizationId) {
      return eq(orgCol, organizationId);
    }
    return eq(shopCol, shopId);
  };

  const activities: RecentActivityItem[] = [];

  try {
    const [recentInvoices, recentPurchases, recentReturns, recentMovements, recentAppointments, recentWhatsApp] =
      await Promise.allSettled([
        // 1. Invoices
        db
          .select({
            id: invoices.id,
            invoiceNumber: invoices.invoiceNumber,
            total: invoices.total,
            status: invoices.status,
            fulfillmentStatus: invoices.fulfillmentStatus,
            createdAt: invoices.createdAt,
            customerName: customers.fullName,
          })
          .from(invoices)
          .leftJoin(customers, eq(invoices.customerId, customers.id))
          .where(shopCond(invoices.shopId, invoices.organizationId))
          .orderBy(desc(invoices.createdAt))
          .limit(10),

        // 2. Purchases
        db
          .select({
            id: purchaseOrders.id,
            purchaseNumber: purchaseOrders.purchaseNumber,
            vendorName: purchaseOrders.vendorName,
            totalNetPurchase: purchaseOrders.totalNetPurchase,
            totalQuantity: purchaseOrders.totalQuantity,
            status: purchaseOrders.status,
            createdAt: purchaseOrders.createdAt,
          })
          .from(purchaseOrders)
          .where(shopCond(purchaseOrders.shopId, purchaseOrders.organizationId))
          .orderBy(desc(purchaseOrders.createdAt))
          .limit(10),

        // 3. Sales Returns
        db
          .select({
            id: salesReturns.id,
            returnNumber: salesReturns.returnNumber,
            totalRefundAmount: salesReturns.totalRefundAmount,
            refundMethod: salesReturns.refundMethod,
            returnType: salesReturns.returnType,
            status: salesReturns.status,
            createdAt: salesReturns.createdAt,
          })
          .from(salesReturns)
          .where(shopCond(salesReturns.shopId, salesReturns.organizationId))
          .orderBy(desc(salesReturns.createdAt))
          .limit(10),

        // 4. Stock Movements
        db
          .select({
            id: stockMovements.id,
            movementType: stockMovements.movementType,
            quantityChange: stockMovements.quantityChange,
            balanceAfter: stockMovements.balanceAfter,
            referenceNumber: stockMovements.referenceNumber,
            vendorParty: stockMovements.vendorParty,
            createdAt: stockMovements.createdAt,
            inventoryName: inventory.name,
            brand: inventory.brand,
          })
          .from(stockMovements)
          .leftJoin(inventory, eq(stockMovements.inventoryId, inventory.id))
          .where(shopCond(stockMovements.shopId, stockMovements.organizationId))
          .orderBy(desc(stockMovements.createdAt))
          .limit(10),

        // 5. Appointments
        db
          .select({
            id: appointments.id,
            customerName: appointments.customerName,
            customerPhone: appointments.customerPhone,
            visitTime: appointments.visitTime,
            purposeOfVisit: appointments.purposeOfVisit,
            status: appointments.status,
            createdAt: appointments.createdAt,
          })
          .from(appointments)
          .where(shopCond(appointments.shopId, appointments.organizationId))
          .orderBy(desc(appointments.createdAt))
          .limit(10),

        // 6. WhatsApp Dispatches
        db
          .select({
            id: whatsappDispatchQueue.id,
            recipientPhone: whatsappDispatchQueue.recipientPhone,
            recipientName: whatsappDispatchQueue.recipientName,
            templateKey: whatsappDispatchQueue.templateKey,
            status: whatsappDispatchQueue.status,
            createdAt: whatsappDispatchQueue.createdAt,
          })
          .from(whatsappDispatchQueue)
          .where(shopCond(whatsappDispatchQueue.shopId, whatsappDispatchQueue.organizationId))
          .orderBy(desc(whatsappDispatchQueue.createdAt))
          .limit(10),
      ]);

    // Map Invoices
    if (recentInvoices.status === "fulfilled" && recentInvoices.value) {
      for (const inv of recentInvoices.value) {
        const isPaid = inv.status === "PAID";
        const isCancelled = inv.status === "CANCELLED";
        activities.push({
          id: `inv-${inv.id}`,
          type: "INVOICE",
          action: isCancelled ? "Invoice Cancelled" : isPaid ? "Invoice Generated & Paid" : "Invoice Created",
          title: `Invoice #${inv.invoiceNumber}`,
          subtitle: `Patient: ${inv.customerName || "Walk-in"} • ₹${parseFloat(inv.total || "0").toLocaleString("en-IN")}`,
          timestamp: inv.createdAt.toISOString(),
          amount: parseFloat(inv.total || "0"),
          status: inv.status,
          badgeVariant: isCancelled ? "danger" : isPaid ? "success" : "info",
          actionHref: `/shop/orders`,
          partyName: inv.customerName || "Walk-in Patient",
        });
      }
    }

    // Map Purchases
    if (recentPurchases.status === "fulfilled" && recentPurchases.value) {
      for (const po of recentPurchases.value) {
        activities.push({
          id: `po-${po.id}`,
          type: "PURCHASE",
          action: po.status === "COMPLETED" ? "Inward Stock Received" : "Purchase Draft Created",
          title: `Purchase #${po.purchaseNumber}`,
          subtitle: `Vendor: ${po.vendorName || "Supplier"} • ${po.totalQuantity || 0} items (₹${parseFloat(po.totalNetPurchase || "0").toLocaleString("en-IN")})`,
          timestamp: po.createdAt.toISOString(),
          amount: parseFloat(po.totalNetPurchase || "0"),
          status: po.status,
          badgeVariant: po.status === "COMPLETED" ? "success" : "neutral",
          actionHref: `/shop/purchases`,
          partyName: po.vendorName || "Vendor",
        });
      }
    }

    // Map Returns
    if (recentReturns.status === "fulfilled" && recentReturns.value) {
      for (const ret of recentReturns.value) {
        activities.push({
          id: `ret-${ret.id}`,
          type: "RETURN",
          action: "Sales Return Processed",
          title: `Return #${ret.returnNumber}`,
          subtitle: `Refund: ₹${parseFloat(ret.totalRefundAmount || "0").toLocaleString("en-IN")} • ${ret.refundMethod || ret.returnType || "Store Credit"}`,
          timestamp: ret.createdAt.toISOString(),
          amount: parseFloat(ret.totalRefundAmount || "0"),
          status: ret.status,
          badgeVariant: "warning",
          actionHref: `/shop/returns`,
        });
      }
    }

    // Map Stock Movements
    if (recentMovements.status === "fulfilled" && recentMovements.value) {
      for (const m of recentMovements.value) {
        const isPositive = m.quantityChange > 0;
        activities.push({
          id: `sm-${m.id}`,
          type: "STOCK",
          action:
            m.movementType === "STOCK_IN"
              ? "Stock Inward Added"
              : m.movementType === "RETURN"
              ? "Restocked From Return"
              : m.movementType === "ADJUSTMENT"
              ? "Inventory Adjusted"
              : "Stock Dispatched",
          title: `${m.inventoryName || "Inventory Item"}`,
          subtitle: `Qty: ${isPositive ? `+${m.quantityChange}` : m.quantityChange} • Balance: ${m.balanceAfter}${m.vendorParty ? ` • Ref: ${m.vendorParty}` : ""}`,
          timestamp: m.createdAt.toISOString(),
          status: m.movementType,
          badgeVariant: isPositive ? "success" : "neutral",
          actionHref: `/shop/inventory`,
        });
      }
    }

    // Map Appointments
    if (recentAppointments.status === "fulfilled" && recentAppointments.value) {
      for (const app of recentAppointments.value) {
        const isCompleted = app.status === "COMPLETED";
        const isCancelled = app.status === "CANCELLED";
        activities.push({
          id: `app-${app.id}`,
          type: "APPOINTMENT",
          action:
            isCompleted
              ? "Patient Visit Completed"
              : isCancelled
              ? "Appointment Cancelled"
              : "Appointment Scheduled",
          title: app.customerName,
          subtitle: `${app.purposeOfVisit || "Consultation"} • ${new Date(app.visitTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
          timestamp: app.createdAt.toISOString(),
          status: app.status,
          badgeVariant: isCompleted ? "success" : isCancelled ? "danger" : "info",
          actionHref: `/shop/appointments`,
          partyName: app.customerName,
        });
      }
    }

    // Map WhatsApp Dispatches
    if (recentWhatsApp.status === "fulfilled" && recentWhatsApp.value) {
      for (const wa of recentWhatsApp.value) {
        activities.push({
          id: `wa-${wa.id}`,
          type: "COMMUNICATION",
          action:
            wa.status === "DELIVERED" || wa.status === "SENT"
              ? "WhatsApp Alert Delivered"
              : "WhatsApp Notification Queued",
          title: `WhatsApp: ${wa.recipientName || wa.recipientPhone}`,
          subtitle: `Template: ${wa.templateKey || "Invoice Alert"} • ${wa.status}`,
          timestamp: wa.createdAt.toISOString(),
          status: wa.status,
          badgeVariant: wa.status === "DELIVERED" || wa.status === "SENT" ? "success" : "info",
          actionHref: `/shop/settings?tab=whatsapp`,
          partyName: wa.recipientName || wa.recipientPhone,
        });
      }
    }
  } catch (err) {
    console.error("[getShopRecentActivities] Error aggregating activities:", err);
  }

  // Sort newest first
  activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return activities.slice(0, limit);
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
