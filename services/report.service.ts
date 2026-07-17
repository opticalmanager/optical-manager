"use server";

import { db } from "@/lib/drizzle";
import { 
  invoices, 
  invoiceItems, 
  inventory, 
  customers, 
  receipts, 
  appointments, 
  orders,
  stockMovements
} from "@/db/schema";
import { eq, and, gte, lte, sql, desc, sum, count } from "drizzle-orm";

export interface ReportDateRange {
  startDate?: string;
  endDate?: string;
}

// 1. Sales Summary Report Data
export interface SalesSummaryItem {
  id: string;
  invoiceNumber: string;
  customerName: string;
  createdAt: Date;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  amountPaid: number;
  balanceDue: number;
  paymentMethod: string | null;
  status: string;
}

export interface SalesSummaryReportData {
  totalRevenue: number;
  totalDiscount: number;
  totalTax: number;
  totalInvoices: number;
  paidInvoices: number;
  pendingInvoices: number;
  items: SalesSummaryItem[];
}

// 2. Item-Wise Sales Report Data
export interface ItemWiseReportItem {
  inventoryId: string | null;
  description: string;
  category: string;
  totalQuantity: number;
  totalSales: number;
  avgPrice: number;
}

export interface ItemWiseReportData {
  totalQuantitySold: number;
  totalRevenue: number;
  categoryBreakdown: { category: string; quantity: number; revenue: number }[];
  items: ItemWiseReportItem[];
}

// 3. GST Tax Filing Report Data
export interface GSTReportItem {
  invoiceNumber: string;
  createdAt: Date;
  customerName: string;
  hsnCode: string;
  subtotal: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalTax: number;
  totalAmount: number;
}

export interface GSTReportData {
  totalTaxableValue: number;
  totalCGST: number;
  totalSGST: number;
  totalIGST: number;
  totalTaxCollected: number;
  items: GSTReportItem[];
}

// 4. Inventory Valuation Report Data
export interface InventoryReportItem {
  id: string;
  name: string;
  category: string;
  brand: string | null;
  sku: string | null;
  quantity: number;
  costPrice: number;
  sellingPrice: number;
  totalCostValue: number;
  totalRetailValue: number;
  status: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
}

export interface InventoryReportData {
  totalItems: number;
  totalStockQuantity: number;
  totalCostValuation: number;
  totalRetailValuation: number;
  lowStockCount: number;
  outOfStockCount: number;
  items: InventoryReportItem[];
}

// 5. Payment Collection Report Data
export interface PaymentCollectionItem {
  id: string;
  receiptNumber: string;
  invoiceNumber: string;
  customerName: string;
  paymentMethod: string;
  amountPaid: number;
  balanceDue: number;
  transactionId: string | null;
  createdAt: Date;
}

export interface PaymentCollectionReportData {
  totalCollected: number;
  cashTotal: number;
  upiTotal: number;
  cardTotal: number;
  bankTotal: number;
  receiptCount: number;
  items: PaymentCollectionItem[];
}

// 6. Appointment Report Data
export interface AppointmentReportItem {
  id: string;
  customerName: string;
  customerPhone: string;
  visitTime: string;
  dateKey: string;
  purposeOfVisit: string;
  status: string;
  notes: string | null;
}

export interface AppointmentReportData {
  totalAppointments: number;
  completed: number;
  pending: number;
  confirmed: number;
  cancelled: number;
  items: AppointmentReportItem[];
}

// Date parser helper
function getStartAndEndDates(startStr?: string, endStr?: string) {
  let start = startStr ? new Date(startStr) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  let end = endStr ? new Date(endStr) : new Date();

  // Set start to midnight and end to 23:59:59.999
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

/**
 * 1. Sales Summary Report
 */
export async function getSalesSummaryReport(
  shopId: string,
  startDate?: string,
  endDate?: string
): Promise<SalesSummaryReportData> {
  const { start, end } = getStartAndEndDates(startDate, endDate);

  const rawInvoices = await db
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      customerName: customers.fullName,
      createdAt: invoices.createdAt,
      subtotal: invoices.subtotal,
      discount: invoices.discount,
      tax: invoices.tax,
      total: invoices.total,
      amountPaid: invoices.amountPaid,
      balanceDue: invoices.balanceDue,
      paymentMethod: invoices.paymentMethod,
      status: invoices.status,
    })
    .from(invoices)
    .innerJoin(customers, eq(invoices.customerId, customers.id))
    .where(
      and(
        eq(invoices.shopId, shopId),
        gte(invoices.createdAt, start),
        lte(invoices.createdAt, end)
      )
    )
    .orderBy(desc(invoices.createdAt));

  let totalRevenue = 0;
  let totalDiscount = 0;
  let totalTax = 0;
  let paidInvoices = 0;
  let pendingInvoices = 0;

  const items: SalesSummaryItem[] = rawInvoices.map((inv) => {
    const sub = parseFloat(inv.subtotal) || 0;
    const disc = parseFloat(inv.discount) || 0;
    const tx = parseFloat(inv.tax) || 0;
    const tot = parseFloat(inv.total) || 0;
    const paid = parseFloat(inv.amountPaid) || 0;
    const bal = parseFloat(inv.balanceDue) || 0;

    totalRevenue += tot;
    totalDiscount += disc;
    totalTax += tx;

    if (inv.status === "PAID") paidInvoices++;
    else pendingInvoices++;

    return {
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      customerName: inv.customerName,
      createdAt: inv.createdAt,
      subtotal: sub,
      discount: disc,
      tax: tx,
      total: tot,
      amountPaid: paid,
      balanceDue: bal,
      paymentMethod: inv.paymentMethod,
      status: inv.status,
    };
  });

  return {
    totalRevenue,
    totalDiscount,
    totalTax,
    totalInvoices: rawInvoices.length,
    paidInvoices,
    pendingInvoices,
    items,
  };
}

/**
 * 2. Item-Wise Sales Report
 */
export async function getItemWiseReport(
  shopId: string,
  startDate?: string,
  endDate?: string
): Promise<ItemWiseReportData> {
  const { start, end } = getStartAndEndDates(startDate, endDate);

  const rawItems = await db
    .select({
      inventoryId: invoiceItems.inventoryId,
      description: invoiceItems.description,
      category: inventory.category,
      quantity: invoiceItems.quantity,
      subtotal: invoiceItems.subtotal,
      unitPrice: invoiceItems.unitPrice,
    })
    .from(invoiceItems)
    .innerJoin(invoices, eq(invoiceItems.invoiceId, invoices.id))
    .leftJoin(inventory, eq(invoiceItems.inventoryId, inventory.id))
    .where(
      and(
        eq(invoiceItems.shopId, shopId),
        gte(invoices.createdAt, start),
        lte(invoices.createdAt, end)
      )
    );

  const aggregated: Record<string, ItemWiseReportItem> = {};
  const categories: Record<string, { quantity: number; revenue: number }> = {};

  let totalQuantitySold = 0;
  let totalRevenue = 0;

  for (const item of rawItems) {
    const key = item.inventoryId || item.description;
    const qty = item.quantity || 0;
    const saleVal = parseFloat(item.subtotal) || 0;
    const cat = item.category || "UNASSIGNED";

    totalQuantitySold += qty;
    totalRevenue += saleVal;

    if (!categories[cat]) {
      categories[cat] = { quantity: 0, revenue: 0 };
    }
    categories[cat].quantity += qty;
    categories[cat].revenue += saleVal;

    if (!aggregated[key]) {
      aggregated[key] = {
        inventoryId: item.inventoryId,
        description: item.description,
        category: cat,
        totalQuantity: 0,
        totalSales: 0,
        avgPrice: parseFloat(item.unitPrice) || 0,
      };
    }

    aggregated[key].totalQuantity += qty;
    aggregated[key].totalSales += saleVal;
  }

  const items = Object.values(aggregated).sort((a, b) => b.totalSales - a.totalSales);
  const categoryBreakdown = Object.entries(categories).map(([category, vals]) => ({
    category,
    quantity: vals.quantity,
    revenue: vals.revenue,
  }));

  return {
    totalQuantitySold,
    totalRevenue,
    categoryBreakdown,
    items,
  };
}

/**
 * 3. GST Tax Filing Report
 */
export async function getGSTReport(
  shopId: string,
  startDate?: string,
  endDate?: string
): Promise<GSTReportData> {
  const { start, end } = getStartAndEndDates(startDate, endDate);

  const rawRows = await db
    .select({
      invoiceNumber: invoices.invoiceNumber,
      createdAt: invoices.createdAt,
      customerName: customers.fullName,
      hsnCode: inventory.hsnCode,
      subtotal: invoiceItems.subtotal,
      cgstAmount: invoiceItems.cgstAmount,
      sgstAmount: invoiceItems.sgstAmount,
      igstAmount: invoiceItems.igstAmount,
    })
    .from(invoiceItems)
    .innerJoin(invoices, eq(invoiceItems.invoiceId, invoices.id))
    .innerJoin(customers, eq(invoices.customerId, customers.id))
    .leftJoin(inventory, eq(invoiceItems.inventoryId, inventory.id))
    .where(
      and(
        eq(invoiceItems.shopId, shopId),
        gte(invoices.createdAt, start),
        lte(invoices.createdAt, end)
      )
    )
    .orderBy(desc(invoices.createdAt));

  let totalTaxableValue = 0;
  let totalCGST = 0;
  let totalSGST = 0;
  let totalIGST = 0;

  const items: GSTReportItem[] = rawRows.map((row) => {
    const sub = parseFloat(row.subtotal) || 0;
    const cgst = parseFloat(row.cgstAmount) || 0;
    const sgst = parseFloat(row.sgstAmount) || 0;
    const igst = parseFloat(row.igstAmount) || 0;
    const tx = cgst + sgst + igst;

    totalTaxableValue += sub;
    totalCGST += cgst;
    totalSGST += sgst;
    totalIGST += igst;

    return {
      invoiceNumber: row.invoiceNumber,
      createdAt: row.createdAt,
      customerName: row.customerName,
      hsnCode: row.hsnCode || "N/A",
      subtotal: sub,
      cgstAmount: cgst,
      sgstAmount: sgst,
      igstAmount: igst,
      totalTax: tx,
      totalAmount: sub + tx,
    };
  });

  return {
    totalTaxableValue,
    totalCGST,
    totalSGST,
    totalIGST,
    totalTaxCollected: totalCGST + totalSGST + totalIGST,
    items,
  };
}

/**
 * 4. Inventory Valuation Report
 */
export async function getInventoryReport(shopId: string): Promise<InventoryReportData> {
  const rawItems = await db
    .select({
      id: inventory.id,
      name: inventory.name,
      category: inventory.category,
      brand: inventory.brand,
      sku: inventory.sku,
      quantity: inventory.quantity,
      minQuantity: inventory.minQuantity,
      costPrice: inventory.costPrice,
      price: inventory.price,
    })
    .from(inventory)
    .where(and(eq(inventory.shopId, shopId), eq(inventory.isActive, true)))
    .orderBy(inventory.name);

  let totalStockQuantity = 0;
  let totalCostValuation = 0;
  let totalRetailValuation = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;

  const items: InventoryReportItem[] = rawItems.map((item) => {
    const qty = item.quantity || 0;
    const cost = parseFloat(item.costPrice || "0") || 0;
    const price = parseFloat(item.price) || 0;

    const costVal = qty * cost;
    const retailVal = qty * price;

    totalStockQuantity += qty;
    totalCostValuation += costVal;
    totalRetailValuation += retailVal;

    let status: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" = "IN_STOCK";
    if (qty <= 0) {
      outOfStockCount++;
      status = "OUT_OF_STOCK";
    } else if (qty <= (item.minQuantity || 5)) {
      lowStockCount++;
      status = "LOW_STOCK";
    }

    return {
      id: item.id,
      name: item.name,
      category: item.category,
      brand: item.brand,
      sku: item.sku,
      quantity: qty,
      costPrice: cost,
      sellingPrice: price,
      totalCostValue: costVal,
      totalRetailValue: retailVal,
      status,
    };
  });

  return {
    totalItems: rawItems.length,
    totalStockQuantity,
    totalCostValuation,
    totalRetailValuation,
    lowStockCount,
    outOfStockCount,
    items,
  };
}

/**
 * 5. Payment Collection Report
 */
export async function getPaymentCollectionReport(
  shopId: string,
  startDate?: string,
  endDate?: string
): Promise<PaymentCollectionReportData> {
  const { start, end } = getStartAndEndDates(startDate, endDate);

  const rawReceipts = await db
    .select({
      id: receipts.id,
      receiptNumber: receipts.receiptNumber,
      invoiceNumber: invoices.invoiceNumber,
      customerName: customers.fullName,
      paymentMethod: receipts.paymentMethod,
      amountPaid: receipts.amountPaid,
      balanceDue: receipts.balanceDue,
      transactionId: receipts.transactionId,
      createdAt: receipts.createdAt,
    })
    .from(receipts)
    .innerJoin(invoices, eq(receipts.invoiceId, invoices.id))
    .innerJoin(customers, eq(invoices.customerId, customers.id))
    .where(
      and(
        eq(receipts.shopId, shopId),
        gte(receipts.createdAt, start),
        lte(receipts.createdAt, end)
      )
    )
    .orderBy(desc(receipts.createdAt));

  let totalCollected = 0;
  let cashTotal = 0;
  let upiTotal = 0;
  let cardTotal = 0;
  let bankTotal = 0;

  const items: PaymentCollectionItem[] = rawReceipts.map((rcpt) => {
    const paid = parseFloat(rcpt.amountPaid) || 0;
    const bal = parseFloat(rcpt.balanceDue) || 0;

    totalCollected += paid;

    if (rcpt.paymentMethod === "CASH") cashTotal += paid;
    else if (rcpt.paymentMethod === "UPI") upiTotal += paid;
    else if (rcpt.paymentMethod === "CARD") cardTotal += paid;
    else if (rcpt.paymentMethod === "BANK_TRANSFER") bankTotal += paid;

    return {
      id: rcpt.id,
      receiptNumber: rcpt.receiptNumber,
      invoiceNumber: rcpt.invoiceNumber,
      customerName: rcpt.customerName,
      paymentMethod: rcpt.paymentMethod,
      amountPaid: paid,
      balanceDue: bal,
      transactionId: rcpt.transactionId,
      createdAt: rcpt.createdAt,
    };
  });

  return {
    totalCollected,
    cashTotal,
    upiTotal,
    cardTotal,
    bankTotal,
    receiptCount: rawReceipts.length,
    items,
  };
}

/**
 * 6. Appointment Report
 */
export async function getAppointmentReport(
  shopId: string,
  startDate?: string,
  endDate?: string
): Promise<AppointmentReportData> {
  const { start, end } = getStartAndEndDates(startDate, endDate);

  const rawApps = await db
    .select({
      id: appointments.id,
      customerName: appointments.customerName,
      customerPhone: appointments.customerPhone,
      visitTime: appointments.visitTime,
      purposeOfVisit: appointments.purposeOfVisit,
      status: appointments.status,
      additionalNotes: appointments.additionalNotes,
    })
    .from(appointments)
    .where(
      and(
        eq(appointments.shopId, shopId),
        gte(appointments.visitTime, start),
        lte(appointments.visitTime, end)
      )
    )
    .orderBy(desc(appointments.visitTime));

  let completed = 0;
  let pending = 0;
  let confirmed = 0;
  let cancelled = 0;

  const items: AppointmentReportItem[] = rawApps.map((app) => {
    if (app.status === "COMPLETED") completed++;
    else if (app.status === "PENDING") pending++;
    else if (app.status === "CONFIRMED") confirmed++;
    else if (app.status === "CANCELLED") cancelled++;

    const dateObj = new Date(app.visitTime);
    const dateKey = !isNaN(dateObj.getTime()) ? dateObj.toISOString().split("T")[0] : "";
    const timeStr = !isNaN(dateObj.getTime())
      ? dateObj.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
      : "";

    return {
      id: app.id,
      customerName: app.customerName,
      customerPhone: app.customerPhone,
      visitTime: timeStr,
      dateKey,
      purposeOfVisit: app.purposeOfVisit,
      status: app.status,
      notes: app.additionalNotes,
    };
  });

  return {
    totalAppointments: rawApps.length,
    completed,
    pending,
    confirmed,
    cancelled,
    items,
  };
}

/**
 * CSV Exporter for Reports
 */
export async function exportReportToCSV(
  shopId: string,
  reportType: string,
  startDate?: string,
  endDate?: string
): Promise<string> {
  const escapeCSV = (str: any) => {
    if (str === null || str === undefined) return '""';
    const val = String(str).replace(/"/g, '""');
    return `"${val}"`;
  };

  if (reportType === "sales") {
    const data = await getSalesSummaryReport(shopId, startDate, endDate);
    const headers = ["Invoice No", "Date", "Customer Name", "Subtotal", "Discount", "Tax", "Total Amount", "Amount Paid", "Balance Due", "Payment Method", "Status"];
    const rows = data.items.map((i) => [
      escapeCSV(i.invoiceNumber),
      escapeCSV(new Date(i.createdAt).toLocaleDateString()),
      escapeCSV(i.customerName),
      escapeCSV(i.subtotal.toFixed(2)),
      escapeCSV(i.discount.toFixed(2)),
      escapeCSV(i.tax.toFixed(2)),
      escapeCSV(i.total.toFixed(2)),
      escapeCSV(i.amountPaid.toFixed(2)),
      escapeCSV(i.balanceDue.toFixed(2)),
      escapeCSV(i.paymentMethod || "N/A"),
      escapeCSV(i.status),
    ]);
    return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  } else if (reportType === "items") {
    const data = await getItemWiseReport(shopId, startDate, endDate);
    const headers = ["Item Description", "Category", "Quantity Sold", "Avg Unit Price", "Total Revenue"];
    const rows = data.items.map((i) => [
      escapeCSV(i.description),
      escapeCSV(i.category),
      escapeCSV(i.totalQuantity),
      escapeCSV(i.avgPrice.toFixed(2)),
      escapeCSV(i.totalSales.toFixed(2)),
    ]);
    return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  } else if (reportType === "gst") {
    const data = await getGSTReport(shopId, startDate, endDate);
    const headers = ["Invoice No", "Date", "Customer Name", "HSN Code", "Taxable Subtotal", "CGST Amount", "SGST Amount", "IGST Amount", "Total Tax", "Total Amount"];
    const rows = data.items.map((i) => [
      escapeCSV(i.invoiceNumber),
      escapeCSV(new Date(i.createdAt).toLocaleDateString()),
      escapeCSV(i.customerName),
      escapeCSV(i.hsnCode),
      escapeCSV(i.subtotal.toFixed(2)),
      escapeCSV(i.cgstAmount.toFixed(2)),
      escapeCSV(i.sgstAmount.toFixed(2)),
      escapeCSV(i.igstAmount.toFixed(2)),
      escapeCSV(i.totalTax.toFixed(2)),
      escapeCSV(i.totalAmount.toFixed(2)),
    ]);
    return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  } else if (reportType === "inventory") {
    const data = await getInventoryReport(shopId);
    const headers = ["Item Name", "Category", "Brand", "SKU", "In Stock Quantity", "Unit Cost Price", "Selling Price", "Total Cost Valuation", "Total Retail Valuation", "Stock Status"];
    const rows = data.items.map((i) => [
      escapeCSV(i.name),
      escapeCSV(i.category),
      escapeCSV(i.brand || "N/A"),
      escapeCSV(i.sku || "N/A"),
      escapeCSV(i.quantity),
      escapeCSV(i.costPrice.toFixed(2)),
      escapeCSV(i.sellingPrice.toFixed(2)),
      escapeCSV(i.totalCostValue.toFixed(2)),
      escapeCSV(i.totalRetailValue.toFixed(2)),
      escapeCSV(i.status),
    ]);
    return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  } else if (reportType === "payments") {
    const data = await getPaymentCollectionReport(shopId, startDate, endDate);
    const headers = ["Receipt No", "Invoice No", "Date", "Customer Name", "Payment Method", "Amount Paid", "Balance Remaining", "Transaction ID"];
    const rows = data.items.map((i) => [
      escapeCSV(i.receiptNumber),
      escapeCSV(i.invoiceNumber),
      escapeCSV(new Date(i.createdAt).toLocaleDateString()),
      escapeCSV(i.customerName),
      escapeCSV(i.paymentMethod),
      escapeCSV(i.amountPaid.toFixed(2)),
      escapeCSV(i.balanceDue.toFixed(2)),
      escapeCSV(i.transactionId || "N/A"),
    ]);
    return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  } else if (reportType === "appointments") {
    const data = await getAppointmentReport(shopId, startDate, endDate);
    const headers = ["Patient Name", "Phone", "Date", "Time", "Purpose of Visit", "Status", "Notes"];
    const rows = data.items.map((i) => [
      escapeCSV(i.customerName),
      escapeCSV(i.customerPhone),
      escapeCSV(i.dateKey),
      escapeCSV(i.visitTime),
      escapeCSV(i.purposeOfVisit),
      escapeCSV(i.status),
      escapeCSV(i.notes || ""),
    ]);
    return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  }

  return "No data";
}
