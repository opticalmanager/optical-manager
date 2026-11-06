"use server";

import { sanitizeCSVValue } from "@/lib/csv-security";
import * as XLSX from "xlsx";

import { db } from "@/lib/drizzle";
import { 
  invoices, 
  invoiceItems, 
  inventory, 
  customers, 
  receipts, 
  appointments, 
  orders,
  stockMovements,
  shops,
  salesReturns,
  salesReturnItems
} from "@/db/schema";
import { eq, and, gte, lte, sql, desc, sum, count, inArray, isNull, ne } from "drizzle-orm";
import {
  isValidGSTIN,
  getPlaceOfSupply,
  getSupplyType,
  formatIndianDate,
  formatDateOfSale,
  HSN_DESCRIPTIONS,
  INSPECTION_REASON_LABELS
} from "@/lib/gst-utils";

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

// 3. GST Tax Filing Report Data (Statutory CA-Grade & GSTR-1/GSTR-3B Compliant)
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

export interface GSTInvoiceRow {
  invoiceId: string;
  invoiceNumber: string;
  invoiceDate: Date;
  invoiceValue: number;
  customerName: string;
  customerPhone: string | null;
  customerGstin: string | null;
  customerState: string | null;
  customerCity: string | null;
  supplierGstin: string | null;
  shopName: string;
  placeOfSupply: string;
  supplyType: "Intra-State" | "Inter-State";
  isB2B: boolean;
  isB2CLarge: boolean;
  reverseCharge: "Y" | "N";
  invoiceType: "Regular";
  taxableValue: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  cessAmount: number;
  totalTax: number;
  effectiveRate: number;
  paymentMethod: string;
  paymentStatus: "PAID" | "PARTIAL" | "PENDING";
  amountPaid: number;
  balanceDue: number;
  hsnCodes: string[];
  hasMissingHsn: boolean;
  isZeroTax: boolean;
  isInvalidGstin: boolean;
}

export interface GSTSummaryTotals {
  invoiceCount: number;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  totalTax: number;
  totalValue: number;
}

export interface HSNSummaryRow {
  hsnCode: string;
  description: string;
  uqc: string;
  totalQuantity: number;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
  totalValue: number;
}

export interface GSTRateSummaryRow {
  rate: number;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
}

export interface CreditNoteRow {
  noteType: "Credit Note";
  noteNumber: string;
  noteDate: Date;
  originalInvoiceNumber: string;
  originalInvoiceDate: Date;
  customerName: string;
  customerGstin: string | null;
  isRegistered: boolean;
  reason: string;
  noteValue: number;
  refundMethod: string;
}

export interface CreditNotesReportData {
  totalNotes: number;
  registeredCount: number;
  unregisteredCount: number;
  totalRefundValue: number;
  notes: CreditNoteRow[];
}

export interface DocumentSummaryRow {
  documentType: string;
  serialFrom: string;
  serialTo: string;
  totalNumber: number;
  cancelled: number;
  netIssued: number;
  missingNumbers: string[];
}

export interface DocumentSummaryData {
  rows: DocumentSummaryRow[];
  hasGaps: boolean;
}

export interface GSTReportData {
  totalTaxableValue: number;
  totalCGST: number;
  totalSGST: number;
  totalIGST: number;
  totalTaxCollected: number;
  overallSummary: GSTSummaryTotals;
  b2bSummary: GSTSummaryTotals;
  b2cSummary: GSTSummaryTotals;
  b2cLargeSummary: GSTSummaryTotals;
  b2cSmallSummary: GSTSummaryTotals;
  allInvoices: GSTInvoiceRow[];
  b2bInvoices: GSTInvoiceRow[];
  b2cInvoices: GSTInvoiceRow[];
  hsnSummary: HSNSummaryRow[];
  rateSummary: GSTRateSummaryRow[];
  dataQuality: {
    totalInvoicesAnalyzed: number;
    missingHsnCount: number;
    invalidGstinCount: number;
    zeroTaxCount: number;
  };
  items: GSTReportItem[]; // Legacy backwards compatibility
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

function getShopFilter(shopCol: any, orgCol: any, shopId: string, orgId?: string) {
  if (shopId === "all" && orgId) {
    return eq(orgCol, orgId);
  }
  return eq(shopCol, shopId);
}

/**
 * 1. Sales Summary Report
 */
export async function getSalesSummaryReport(
  shopId: string,
  startDate?: string,
  endDate?: string,
  organizationId?: string
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
        getShopFilter(invoices.shopId, invoices.organizationId, shopId, organizationId),
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
  endDate?: string,
  organizationId?: string
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
        getShopFilter(invoiceItems.shopId, invoiceItems.organizationId, shopId, organizationId),
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
 * 3. GST Tax Filing Report (Statutory CA-Grade B2B, B2C, HSN & Rate Slabs)
 */
export async function getGSTReport(
  shopId: string,
  startDate?: string,
  endDate?: string,
  organizationId?: string
): Promise<GSTReportData> {
  const { start, end } = getStartAndEndDates(startDate, endDate);

  // 1. Query all valid non-cancelled invoices in date range
  const rawInvoices = await db
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      createdAt: invoices.createdAt,
      total: invoices.total,
      subtotal: invoices.subtotal,
      discount: invoices.discount,
      tax: invoices.tax,
      status: invoices.status,
      paymentMethod: invoices.paymentMethod,
      amountPaid: invoices.amountPaid,
      balanceDue: invoices.balanceDue,
      customerId: invoices.customerId,
      customerName: customers.fullName,
      customerPhone: customers.phone,
      customerGstin: customers.gstin,
      customerState: customers.state,
      customerCity: customers.city,
      shopId: invoices.shopId,
      shopName: shops.name,
      shopGstin: shops.gstin,
    })
    .from(invoices)
    .innerJoin(customers, eq(invoices.customerId, customers.id))
    .innerJoin(shops, eq(invoices.shopId, shops.id))
    .where(
      and(
        getShopFilter(invoices.shopId, invoices.organizationId, shopId, organizationId),
        gte(invoices.createdAt, start),
        lte(invoices.createdAt, end),
        ne(invoices.status, "CANCELLED"),
        isNull(invoices.deletedAt)
      )
    )
    .orderBy(desc(invoices.createdAt));

  // 2. Query line items with HSN codes for these invoices
  const rawItems = await db
    .select({
      invoiceId: invoiceItems.invoiceId,
      description: invoiceItems.description,
      quantity: invoiceItems.quantity,
      subtotal: invoiceItems.subtotal,
      discountAmount: invoiceItems.discountAmount,
      cgstPercent: invoiceItems.cgstPercent,
      cgstAmount: invoiceItems.cgstAmount,
      sgstPercent: invoiceItems.sgstPercent,
      sgstAmount: invoiceItems.sgstAmount,
      igstPercent: invoiceItems.igstPercent,
      igstAmount: invoiceItems.igstAmount,
      hsnCode: inventory.hsnCode,
    })
    .from(invoiceItems)
    .innerJoin(invoices, eq(invoiceItems.invoiceId, invoices.id))
    .leftJoin(inventory, eq(invoiceItems.inventoryId, inventory.id))
    .where(
      and(
        getShopFilter(invoiceItems.shopId, invoiceItems.organizationId, shopId, organizationId),
        gte(invoices.createdAt, start),
        lte(invoices.createdAt, end),
        ne(invoices.status, "CANCELLED"),
        isNull(invoices.deletedAt)
      )
    );

  const itemsByInvoice = new Map<string, typeof rawItems>();
  for (const item of rawItems) {
    const existing = itemsByInvoice.get(item.invoiceId) || [];
    existing.push(item);
    itemsByInvoice.set(item.invoiceId, existing);
  }

  const b2bInvoices: GSTInvoiceRow[] = [];
  const b2cInvoices: GSTInvoiceRow[] = [];
  const legacyItems: GSTReportItem[] = [];

  let totalTaxableValue = 0;
  let totalCGST = 0;
  let totalSGST = 0;
  let totalIGST = 0;

  let missingHsnCount = 0;
  let invalidGstinCount = 0;
  let zeroTaxCount = 0;

  const hsnMap = new Map<string, HSNSummaryRow>();
  const rateMap = new Map<number, GSTRateSummaryRow>();

  for (const inv of rawInvoices) {
    const items = itemsByInvoice.get(inv.id) || [];
    let invTaxable = 0;
    let invCgst = 0;
    let invSgst = 0;
    let invIgst = 0;
    const hsnSet = new Set<string>();
    let invMissingHsn = false;

    if (items.length > 0) {
      for (const it of items) {
        const sub = parseFloat(it.subtotal) || 0;
        const disc = parseFloat(it.discountAmount) || 0;
        const taxable = Math.max(0, sub - disc);
        const cgst = parseFloat(it.cgstAmount) || 0;
        const sgst = parseFloat(it.sgstAmount) || 0;
        const igst = parseFloat(it.igstAmount) || 0;
        const itemTax = cgst + sgst + igst;
        const qty = it.quantity || 1;

        invTaxable += taxable;
        invCgst += cgst;
        invSgst += sgst;
        invIgst += igst;

        const hsn = (it.hsnCode || "").trim();
        if (!hsn || hsn === "N/A") {
          invMissingHsn = true;
        } else {
          hsnSet.add(hsn);
        }

        // HSN summary grouping
        const hsnKey = hsn || "N/A";
        const descText = HSN_DESCRIPTIONS[hsnKey] || (hsnKey === "N/A" ? "Unclassified Optical Goods" : "Optical Goods & Accessories");
        const existingHsn = hsnMap.get(hsnKey) || {
          hsnCode: hsnKey,
          description: descText,
          uqc: "NOS",
          totalQuantity: 0,
          taxableValue: 0,
          cgst: 0,
          sgst: 0,
          igst: 0,
          totalTax: 0,
          totalValue: 0,
        };
        existingHsn.totalQuantity += qty;
        existingHsn.taxableValue += taxable;
        existingHsn.cgst += cgst;
        existingHsn.sgst += sgst;
        existingHsn.igst += igst;
        existingHsn.totalTax += itemTax;
        existingHsn.totalValue += (taxable + itemTax);
        hsnMap.set(hsnKey, existingHsn);

        // Rate slab aggregation
        const itemRate = Math.round((parseFloat(it.cgstPercent) || 0) + (parseFloat(it.sgstPercent) || 0) + (parseFloat(it.igstPercent) || 0));
        const existingRate = rateMap.get(itemRate) || {
          rate: itemRate,
          taxableValue: 0,
          cgst: 0,
          sgst: 0,
          igst: 0,
          totalTax: 0,
        };
        existingRate.taxableValue += taxable;
        existingRate.cgst += cgst;
        existingRate.sgst += sgst;
        existingRate.igst += igst;
        existingRate.totalTax += itemTax;
        rateMap.set(itemRate, existingRate);

        // Legacy format item
        legacyItems.push({
          invoiceNumber: inv.invoiceNumber,
          createdAt: inv.createdAt,
          customerName: inv.customerName,
          hsnCode: hsn || "N/A",
          subtotal: taxable,
          cgstAmount: cgst,
          sgstAmount: sgst,
          igstAmount: igst,
          totalTax: itemTax,
          totalAmount: taxable + itemTax,
        });
      }
    } else {
      // Fallback if no item records found
      const sub = parseFloat(inv.subtotal) || 0;
      const disc = parseFloat(inv.discount) || 0;
      invTaxable = Math.max(0, sub - disc);
      const tax = parseFloat(inv.tax) || 0;
      invCgst = tax / 2;
      invSgst = tax / 2;
      invMissingHsn = true;

      legacyItems.push({
        invoiceNumber: inv.invoiceNumber,
        createdAt: inv.createdAt,
        customerName: inv.customerName,
        hsnCode: "N/A",
        subtotal: invTaxable,
        cgstAmount: invCgst,
        sgstAmount: invSgst,
        igstAmount: 0,
        totalTax: tax,
        totalAmount: invTaxable + tax,
      });
    }

    const invTotalTax = invCgst + invSgst + invIgst;
    const invTotalVal = parseFloat(inv.total) || (invTaxable + invTotalTax);

    totalTaxableValue += invTaxable;
    totalCGST += invCgst;
    totalSGST += invSgst;
    totalIGST += invIgst;

    if (invMissingHsn) missingHsnCount++;
    if (invTaxable > 0 && invTotalTax === 0) zeroTaxCount++;

    const rawGstin = (inv.customerGstin || "").trim();
    const hasGstin = rawGstin.length > 0 && rawGstin.toUpperCase() !== "URP" && rawGstin.toUpperCase() !== "UNREGISTERED";
    const isGstinValid = isValidGSTIN(rawGstin);
    if (hasGstin && !isGstinValid) {
      invalidGstinCount++;
    }

    const isB2B = isGstinValid;
    const placeOfSupply = getPlaceOfSupply(inv.customerState, inv.customerGstin, inv.shopGstin);
    const supplyType = getSupplyType(placeOfSupply, inv.shopGstin);
    const isB2CLarge = !isB2B && supplyType === "Inter-State" && invTotalVal > 250000;

    const effectiveRate = invTaxable > 0 ? Math.round((invTotalTax / invTaxable) * 100) : 0;
    const amountPaid = parseFloat(inv.amountPaid) || 0;
    const balanceDue = parseFloat(inv.balanceDue) || 0;
    let paymentStatus: "PAID" | "PARTIAL" | "PENDING" = "PENDING";
    if (balanceDue <= 0 && amountPaid > 0) {
      paymentStatus = "PAID";
    } else if (amountPaid > 0 && balanceDue > 0) {
      paymentStatus = "PARTIAL";
    }

    const invoiceRow: GSTInvoiceRow = {
      invoiceId: inv.id,
      invoiceNumber: inv.invoiceNumber,
      invoiceDate: inv.createdAt,
      invoiceValue: invTotalVal,
      customerName: inv.customerName,
      customerPhone: inv.customerPhone,
      customerGstin: hasGstin ? rawGstin : null,
      customerState: inv.customerState,
      customerCity: inv.customerCity,
      supplierGstin: inv.shopGstin,
      shopName: inv.shopName,
      placeOfSupply,
      supplyType,
      isB2B,
      isB2CLarge,
      reverseCharge: "N",
      invoiceType: "Regular",
      taxableValue: invTaxable,
      cgstAmount: invCgst,
      sgstAmount: invSgst,
      igstAmount: invIgst,
      cessAmount: 0,
      totalTax: invTotalTax,
      effectiveRate,
      paymentMethod: inv.paymentMethod || "CASH",
      paymentStatus,
      amountPaid,
      balanceDue,
      hsnCodes: Array.from(hsnSet),
      hasMissingHsn: invMissingHsn,
      isZeroTax: invTaxable > 0 && invTotalTax === 0,
      isInvalidGstin: hasGstin && !isGstinValid,
    };

    if (isB2B) {
      b2bInvoices.push(invoiceRow);
    } else {
      b2cInvoices.push(invoiceRow);
    }
  }

  function computeSummary(rows: GSTInvoiceRow[]): GSTSummaryTotals {
    let taxableValue = 0;
    let cgst = 0;
    let sgst = 0;
    let igst = 0;
    let totalTax = 0;
    let totalValue = 0;
    for (const r of rows) {
      taxableValue += r.taxableValue;
      cgst += r.cgstAmount;
      sgst += r.sgstAmount;
      igst += r.igstAmount;
      totalTax += r.totalTax;
      totalValue += r.invoiceValue;
    }
    return {
      invoiceCount: rows.length,
      taxableValue,
      cgst,
      sgst,
      igst,
      cess: 0,
      totalTax,
      totalValue,
    };
  }

  const b2bSummary = computeSummary(b2bInvoices);
  const b2cSummary = computeSummary(b2cInvoices);
  const b2cLargeSummary = computeSummary(b2cInvoices.filter((r) => r.isB2CLarge));
  const b2cSmallSummary = computeSummary(b2cInvoices.filter((r) => !r.isB2CLarge));
  const overallSummary = computeSummary([...b2bInvoices, ...b2cInvoices]);

  const allInvoices = [...b2bInvoices, ...b2cInvoices].sort(
    (a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime()
  );

  const hsnSummary = Array.from(hsnMap.values()).sort((a, b) => b.totalValue - a.totalValue);
  const rateSummary = Array.from(rateMap.values()).sort((a, b) => a.rate - b.rate);

  return {
    totalTaxableValue,
    totalCGST,
    totalSGST,
    totalIGST,
    totalTaxCollected: totalCGST + totalSGST + totalIGST,
    overallSummary,
    b2bSummary,
    b2cSummary,
    b2cLargeSummary,
    b2cSmallSummary,
    allInvoices,
    b2bInvoices,
    b2cInvoices,
    hsnSummary,
    rateSummary,
    dataQuality: {
      totalInvoicesAnalyzed: rawInvoices.length,
      missingHsnCount,
      invalidGstinCount,
      zeroTaxCount,
    },
    items: legacyItems,
  };
}

export const getGSTReportV2 = getGSTReport;

/**
 * 3b. Credit / Debit Notes Report (GSTR-1 Table 9A/9B)
 */
export async function getCreditNotesReport(
  shopId: string,
  startDate?: string,
  endDate?: string,
  organizationId?: string
): Promise<CreditNotesReportData> {
  const { start, end } = getStartAndEndDates(startDate, endDate);

  const rawReturns = await db
    .select({
      id: salesReturns.id,
      returnNumber: salesReturns.returnNumber,
      createdAt: salesReturns.createdAt,
      totalRefundAmount: salesReturns.totalRefundAmount,
      refundMethod: salesReturns.refundMethod,
      notes: salesReturns.notes,
      customerId: salesReturns.customerId,
      customerName: customers.fullName,
      customerGstin: customers.gstin,
      invoiceNumber: invoices.invoiceNumber,
      invoiceDate: invoices.createdAt,
    })
    .from(salesReturns)
    .innerJoin(invoices, eq(salesReturns.invoiceId, invoices.id))
    .innerJoin(customers, eq(salesReturns.customerId, customers.id))
    .where(
      and(
        getShopFilter(salesReturns.shopId, salesReturns.organizationId, shopId, organizationId),
        gte(salesReturns.createdAt, start),
        lte(salesReturns.createdAt, end),
        eq(salesReturns.status, "COMPLETED")
      )
    )
    .orderBy(desc(salesReturns.createdAt));

  let registeredCount = 0;
  let unregisteredCount = 0;
  let totalRefundValue = 0;

  const notes: CreditNoteRow[] = rawReturns.map((ret) => {
    const val = parseFloat(ret.totalRefundAmount) || 0;
    totalRefundValue += val;
    const isReg = isValidGSTIN(ret.customerGstin);
    if (isReg) registeredCount++;
    else unregisteredCount++;

    return {
      noteType: "Credit Note",
      noteNumber: ret.returnNumber,
      noteDate: ret.createdAt,
      originalInvoiceNumber: ret.invoiceNumber,
      originalInvoiceDate: ret.invoiceDate,
      customerName: ret.customerName,
      customerGstin: ret.customerGstin || null,
      isRegistered: isReg,
      reason: ret.notes || "Customer Return",
      noteValue: val,
      refundMethod: ret.refundMethod,
    };
  });

  return {
    totalNotes: rawReturns.length,
    registeredCount,
    unregisteredCount,
    totalRefundValue,
    notes,
  };
}

/**
 * 3c. Document Serial Summary (GSTR-1 Table 13)
 */
export async function getDocumentSummary(
  shopId: string,
  startDate?: string,
  endDate?: string,
  organizationId?: string
): Promise<DocumentSummaryData> {
  const { start, end } = getStartAndEndDates(startDate, endDate);

  const invList = await db
    .select({
      invoiceNumber: invoices.invoiceNumber,
      status: invoices.status,
      createdAt: invoices.createdAt,
    })
    .from(invoices)
    .where(
      and(
        getShopFilter(invoices.shopId, invoices.organizationId, shopId, organizationId),
        gte(invoices.createdAt, start),
        lte(invoices.createdAt, end),
        isNull(invoices.deletedAt)
      )
    )
    .orderBy(invoices.createdAt);

  const docRows: DocumentSummaryRow[] = [];
  let hasGaps = false;

  if (invList.length > 0) {
    const serialFrom = invList[0].invoiceNumber;
    const serialTo = invList[invList.length - 1].invoiceNumber;
    const cancelled = invList.filter((i) => i.status === "CANCELLED").length;
    const netIssued = invList.length - cancelled;

    // Detect numeric sequence gaps
    const numbers: number[] = [];
    for (const inv of invList) {
      const match = inv.invoiceNumber.match(/(\d+)$/);
      if (match) {
        numbers.push(parseInt(match[1], 10));
      }
    }

    const missing: string[] = [];
    if (numbers.length > 1) {
      const minNum = Math.min(...numbers);
      const maxNum = Math.max(...numbers);
      const numSet = new Set(numbers);
      for (let n = minNum; n <= maxNum; n++) {
        if (!numSet.has(n)) {
          missing.push(`Missing #${n}`);
          if (missing.length >= 8) {
            missing.push(`+ more gaps`);
            break;
          }
        }
      }
    }

    if (missing.length > 0) hasGaps = true;

    docRows.push({
      documentType: "Invoices for outward supply",
      serialFrom,
      serialTo,
      totalNumber: invList.length,
      cancelled,
      netIssued,
      missingNumbers: missing,
    });
  }

  // Also check Credit Notes
  const retList = await db
    .select({
      returnNumber: salesReturns.returnNumber,
      status: salesReturns.status,
      createdAt: salesReturns.createdAt,
    })
    .from(salesReturns)
    .where(
      and(
        getShopFilter(salesReturns.shopId, salesReturns.organizationId, shopId, organizationId),
        gte(salesReturns.createdAt, start),
        lte(salesReturns.createdAt, end)
      )
    )
    .orderBy(salesReturns.createdAt);

  if (retList.length > 0) {
    const serialFrom = retList[0].returnNumber;
    const serialTo = retList[retList.length - 1].returnNumber;
    const cancelled = retList.filter((r) => r.status === "CANCELLED").length;
    const netIssued = retList.length - cancelled;

    docRows.push({
      documentType: "Credit Notes for sales returns",
      serialFrom,
      serialTo,
      totalNumber: retList.length,
      cancelled,
      netIssued,
      missingNumbers: [],
    });
  }

  return {
    rows: docRows,
    hasGaps,
  };
}

/**
 * 4. Inventory Valuation Report
 */
export async function getInventoryReport(shopId: string, organizationId?: string): Promise<InventoryReportData> {
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
    .where(and(getShopFilter(inventory.shopId, inventory.organizationId, shopId, organizationId), eq(inventory.isActive, true)))
    .orderBy(inventory.name);

  let totalStockQuantity = 0;
  let totalCostValuation = 0;
  let totalRetailValuation = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;

  const items: InventoryReportItem[] = rawItems.map((item) => {
    const qty = item.quantity || 0;
    const cost = parseFloat(item.costPrice || "0") || 0;
    const price = parseFloat(item.price || "0") || 0;

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
  endDate?: string,
  organizationId?: string
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
        getShopFilter(receipts.shopId, receipts.organizationId, shopId, organizationId),
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
  endDate?: string,
  organizationId?: string
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
        getShopFilter(appointments.shopId, appointments.organizationId, shopId, organizationId),
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

// 7. Day-Wise Collection Ledger Data
export interface DayWiseCollectionItem {
  date: string;
  totalInvoices: number;
  subtotal: number;
  tax: number;
  totalRevenue: number; // Total invoiced sales
  totalCollected: number; // Total actual money collected (cash + upi + card + bank)
  cashTotal: number;
  upiTotal: number;
  cardTotal: number;
  bankTotal: number;
  balanceDue: number; // Remaining dues on invoices created this day
  customerCount: number;
}

export interface DayWiseCollectionReportData {
  grandTotal: number; // Total invoiced
  grandTotalCollected: number; // Total money collected across period
  grandCashTotal: number;
  grandUpiTotal: number;
  grandCardTotal: number;
  grandBankTotal: number;
  grandBalanceDue: number;
  totalInvoices: number;
  activeDaysCount: number;
  days: DayWiseCollectionItem[];
}

export async function getDayWiseCollectionReport(
  shopId: string,
  startDate?: string,
  endDate?: string,
  organizationId?: string
): Promise<DayWiseCollectionReportData> {
  const { start, end } = getStartAndEndDates(startDate, endDate);

  // 1. Fetch Invoices created in this date range
  const rawInvoices = await db
    .select({
      id: invoices.id,
      customerId: invoices.customerId,
      createdAt: invoices.createdAt,
      subtotal: invoices.subtotal,
      tax: invoices.tax,
      total: invoices.total,
      amountPaid: invoices.amountPaid,
      balanceDue: invoices.balanceDue,
      paymentMethod: invoices.paymentMethod,
    })
    .from(invoices)
    .where(
      and(
        getShopFilter(invoices.shopId, invoices.organizationId, shopId, organizationId),
        gte(invoices.createdAt, start),
        lte(invoices.createdAt, end)
      )
    )
    .orderBy(desc(invoices.createdAt));

  // 2. Fetch Receipts created in this date range (actual payments received)
  const rawReceipts = await db
    .select({
      id: receipts.id,
      invoiceId: receipts.invoiceId,
      receiptNumber: receipts.receiptNumber,
      amountPaid: receipts.amountPaid,
      balanceDue: receipts.balanceDue,
      paymentMethod: receipts.paymentMethod,
      transactionId: receipts.transactionId,
      createdAt: receipts.createdAt,
      customerId: invoices.customerId,
    })
    .from(receipts)
    .innerJoin(invoices, eq(receipts.invoiceId, invoices.id))
    .where(
      and(
        getShopFilter(receipts.shopId, receipts.organizationId, shopId, organizationId),
        gte(receipts.createdAt, start),
        lte(receipts.createdAt, end)
      )
    )
    .orderBy(desc(receipts.createdAt));

  const dayMap: Record<string, DayWiseCollectionItem> = {};
  const dayCustomerSets: Record<string, Set<string>> = {};

  let grandTotal = 0;
  let grandBalanceDue = 0;

  for (const inv of rawInvoices) {
    const dStr = new Date(inv.createdAt).toISOString().split("T")[0];
    const sub = parseFloat(inv.subtotal) || 0;
    const tx = parseFloat(inv.tax) || 0;
    const tot = parseFloat(inv.total) || 0;
    const bal = parseFloat(inv.balanceDue) || 0;

    grandTotal += tot;
    grandBalanceDue += bal;

    if (!dayMap[dStr]) {
      dayMap[dStr] = {
        date: dStr,
        totalInvoices: 0,
        subtotal: 0,
        tax: 0,
        totalRevenue: 0,
        totalCollected: 0,
        cashTotal: 0,
        upiTotal: 0,
        cardTotal: 0,
        bankTotal: 0,
        balanceDue: 0,
        customerCount: 0,
      };
      dayCustomerSets[dStr] = new Set();
    }

    dayMap[dStr].totalInvoices += 1;
    dayMap[dStr].subtotal += sub;
    dayMap[dStr].tax += tx;
    dayMap[dStr].totalRevenue += tot;
    dayMap[dStr].balanceDue += bal;
    if (inv.customerId) {
      dayCustomerSets[dStr].add(inv.customerId);
    }
  }

  // Track invoices that had their receipt recorded to handle legacy invoices without receipts
  const receiptInvoiceIds = new Set<string>();

  for (const rcpt of rawReceipts) {
    receiptInvoiceIds.add(rcpt.invoiceId);
    const dStr = new Date(rcpt.createdAt).toISOString().split("T")[0];
    const paid = parseFloat(rcpt.amountPaid) || 0;

    if (!dayMap[dStr]) {
      dayMap[dStr] = {
        date: dStr,
        totalInvoices: 0,
        subtotal: 0,
        tax: 0,
        totalRevenue: 0,
        totalCollected: 0,
        cashTotal: 0,
        upiTotal: 0,
        cardTotal: 0,
        bankTotal: 0,
        balanceDue: 0,
        customerCount: 0,
      };
      dayCustomerSets[dStr] = new Set();
    }

    dayMap[dStr].totalCollected += paid;
    if (rcpt.paymentMethod === "CASH") dayMap[dStr].cashTotal += paid;
    else if (rcpt.paymentMethod === "UPI") dayMap[dStr].upiTotal += paid;
    else if (rcpt.paymentMethod === "CARD") dayMap[dStr].cardTotal += paid;
    else if (rcpt.paymentMethod === "BANK_TRANSFER") dayMap[dStr].bankTotal += paid;

    if (rcpt.customerId) {
      dayCustomerSets[dStr].add(rcpt.customerId);
    }
  }

  // Fallback for any invoice created in this period that has amountPaid > 0 but NO receipt record
  for (const inv of rawInvoices) {
    if (!receiptInvoiceIds.has(inv.id)) {
      const paid = parseFloat(inv.amountPaid) || 0;
      if (paid > 0) {
        const dStr = new Date(inv.createdAt).toISOString().split("T")[0];
        if (dayMap[dStr]) {
          dayMap[dStr].totalCollected += paid;
          if (inv.paymentMethod === "CASH") dayMap[dStr].cashTotal += paid;
          else if (inv.paymentMethod === "UPI") dayMap[dStr].upiTotal += paid;
          else if (inv.paymentMethod === "CARD") dayMap[dStr].cardTotal += paid;
          else if (inv.paymentMethod === "BANK_TRANSFER") dayMap[dStr].bankTotal += paid;
        }
      }
    }
  }

  // Populate distinct customer counts
  for (const dStr in dayMap) {
    dayMap[dStr].customerCount = dayCustomerSets[dStr]?.size || 0;
  }

  const days = Object.values(dayMap).sort((a, b) => b.date.localeCompare(a.date));

  let grandTotalCollected = 0;
  let grandCashTotal = 0;
  let grandUpiTotal = 0;
  let grandCardTotal = 0;
  let grandBankTotal = 0;

  for (const d of days) {
    grandTotalCollected += d.totalCollected;
    grandCashTotal += d.cashTotal;
    grandUpiTotal += d.upiTotal;
    grandCardTotal += d.cardTotal;
    grandBankTotal += d.bankTotal;
  }

  return {
    grandTotal,
    grandTotalCollected,
    grandCashTotal,
    grandUpiTotal,
    grandCardTotal,
    grandBankTotal,
    grandBalanceDue,
    totalInvoices: rawInvoices.length,
    activeDaysCount: days.length,
    days,
  };
}

// 7b. Single Day Dedicated Collection Report
export interface SingleDayCustomerCollectionItem {
  id: string;
  time: string;
  timestamp: Date;
  customerId: string;
  customerName: string;
  customerPhone: string | null;
  invoiceId: string;
  invoiceNumber: string;
  receiptNumber?: string | null;
  orderNumber?: string | null;
  collectionType: "FULL_PAYMENT" | "ADVANCE_PAYMENT" | "DUES_SETTLEMENT" | "NEW_SALE";
  paymentMethod: "CASH" | "UPI" | "CARD" | "BANK_TRANSFER";
  transactionId?: string | null;
  totalBillAmount: number;
  amountCollectedToday: number;
  balanceRemaining: number;
  itemsSummary: string;
  notes?: string | null;
}

export interface SingleDayCollectionReportData {
  date: string;
  formattedDate: string;
  totalCollected: number;
  cashTotal: number;
  upiTotal: number;
  cardTotal: number;
  bankTotal: number;
  totalInvoiced: number;
  totalInvoicesCount: number;
  advancesCollected: number;
  duesSettled: number;
  totalBalanceRemaining: number;
  uniqueCustomersCount: number;
  collections: SingleDayCustomerCollectionItem[];
}

export async function getSingleDayCollectionReport(
  shopId: string,
  dateStr: string,
  organizationId?: string
): Promise<SingleDayCollectionReportData> {
  const [y, m, d] = dateStr.split("-").map(Number);
  const start = new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0);
  const end = new Date(y, (m || 1) - 1, d || 1, 23, 59, 59, 999);

  // 1. Fetch receipts created on this day
  const rawReceipts = await db
    .select({
      id: receipts.id,
      receiptNumber: receipts.receiptNumber,
      amountPaid: receipts.amountPaid,
      balanceDue: receipts.balanceDue,
      paymentMethod: receipts.paymentMethod,
      transactionId: receipts.transactionId,
      createdAt: receipts.createdAt,
      invoiceId: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      invoiceTotal: invoices.total,
      invoiceBalanceDue: invoices.balanceDue,
      invoiceCreatedAt: invoices.createdAt,
      customerId: customers.id,
      customerName: customers.fullName,
      customerPhone: customers.phone,
    })
    .from(receipts)
    .innerJoin(invoices, eq(receipts.invoiceId, invoices.id))
    .innerJoin(customers, eq(invoices.customerId, customers.id))
    .where(
      and(
        getShopFilter(receipts.shopId, receipts.organizationId, shopId, organizationId),
        gte(receipts.createdAt, start),
        lte(receipts.createdAt, end)
      )
    )
    .orderBy(desc(receipts.createdAt));

  // 2. Fetch invoices created on this day
  const rawInvoices = await db
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      subtotal: invoices.subtotal,
      tax: invoices.tax,
      total: invoices.total,
      amountPaid: invoices.amountPaid,
      balanceDue: invoices.balanceDue,
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
        getShopFilter(invoices.shopId, invoices.organizationId, shopId, organizationId),
        gte(invoices.createdAt, start),
        lte(invoices.createdAt, end)
      )
    )
    .orderBy(desc(invoices.createdAt));

  const allInvoiceIds = Array.from(new Set([
    ...rawReceipts.map((r) => r.invoiceId),
    ...rawInvoices.map((i) => i.id),
  ]));

  const itemsMap: Record<string, string[]> = {};
  if (allInvoiceIds.length > 0) {
    const rawItems = await db
      .select({
        invoiceId: invoiceItems.invoiceId,
        description: invoiceItems.description,
        quantity: invoiceItems.quantity,
      })
      .from(invoiceItems)
      .where(inArray(invoiceItems.invoiceId, allInvoiceIds));

    for (const item of rawItems) {
      if (!itemsMap[item.invoiceId]) {
        itemsMap[item.invoiceId] = [];
      }
      itemsMap[item.invoiceId].push(
        item.quantity > 1 ? `${item.description} (x${item.quantity})` : item.description
      );
    }
  }

  const orderMap: Record<string, string> = {};
  if (allInvoiceIds.length > 0) {
    const rawOrders = await db
      .select({
        invoiceId: orders.invoiceId,
        orderNumber: orders.orderNumber,
      })
      .from(orders)
      .where(inArray(orders.invoiceId, allInvoiceIds));

    for (const ord of rawOrders) {
      if (ord.invoiceId && ord.orderNumber) {
        orderMap[ord.invoiceId] = ord.orderNumber;
      }
    }
  }

  const collections: SingleDayCustomerCollectionItem[] = [];
  const processedReceiptInvoiceIds = new Set<string>();

  let totalCollected = 0;
  let cashTotal = 0;
  let upiTotal = 0;
  let cardTotal = 0;
  let bankTotal = 0;
  let advancesCollected = 0;
  let duesSettled = 0;

  const uniqueCustomerSet = new Set<string>();

  for (const rcpt of rawReceipts) {
    processedReceiptInvoiceIds.add(rcpt.invoiceId);
    if (rcpt.customerId) uniqueCustomerSet.add(rcpt.customerId);

    const paid = parseFloat(rcpt.amountPaid) || 0;
    const invTotal = parseFloat(rcpt.invoiceTotal) || 0;
    const balRemaining = parseFloat(rcpt.balanceDue) || 0;

    totalCollected += paid;
    if (rcpt.paymentMethod === "CASH") cashTotal += paid;
    else if (rcpt.paymentMethod === "UPI") upiTotal += paid;
    else if (rcpt.paymentMethod === "CARD") cardTotal += paid;
    else if (rcpt.paymentMethod === "BANK_TRANSFER") bankTotal += paid;

    const invDateStr = new Date(rcpt.invoiceCreatedAt).toISOString().split("T")[0];
    const isSameDayInvoice = invDateStr === dateStr;

    let collectionType: "FULL_PAYMENT" | "ADVANCE_PAYMENT" | "DUES_SETTLEMENT" | "NEW_SALE";

    if (!isSameDayInvoice) {
      collectionType = "DUES_SETTLEMENT";
      duesSettled += paid;
    } else if (balRemaining <= 0) {
      collectionType = "FULL_PAYMENT";
    } else {
      collectionType = "ADVANCE_PAYMENT";
      advancesCollected += paid;
    }

    const timeStr = new Date(rcpt.createdAt).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    collections.push({
      id: rcpt.id,
      time: timeStr,
      timestamp: rcpt.createdAt,
      customerId: rcpt.customerId,
      customerName: rcpt.customerName,
      customerPhone: rcpt.customerPhone,
      invoiceId: rcpt.invoiceId,
      invoiceNumber: rcpt.invoiceNumber,
      receiptNumber: rcpt.receiptNumber,
      orderNumber: orderMap[rcpt.invoiceId] || null,
      collectionType,
      paymentMethod: rcpt.paymentMethod as any,
      transactionId: rcpt.transactionId,
      totalBillAmount: invTotal,
      amountCollectedToday: paid,
      balanceRemaining: balRemaining,
      itemsSummary: (itemsMap[rcpt.invoiceId] || []).join(", ") || "Eyewear Products",
    });
  }

  for (const inv of rawInvoices) {
    if (inv.customerId) uniqueCustomerSet.add(inv.customerId);

    if (!processedReceiptInvoiceIds.has(inv.id)) {
      const paid = parseFloat(inv.amountPaid) || 0;
      const invTotal = parseFloat(inv.total) || 0;
      const balRemaining = parseFloat(inv.balanceDue) || 0;

      if (paid > 0) {
        totalCollected += paid;
        if (inv.paymentMethod === "CASH") cashTotal += paid;
        else if (inv.paymentMethod === "UPI") upiTotal += paid;
        else if (inv.paymentMethod === "CARD") cardTotal += paid;
        else if (inv.paymentMethod === "BANK_TRANSFER") bankTotal += paid;

        let collectionType: "FULL_PAYMENT" | "ADVANCE_PAYMENT" | "NEW_SALE" = "NEW_SALE";
        if (balRemaining <= 0) collectionType = "FULL_PAYMENT";
        else {
          collectionType = "ADVANCE_PAYMENT";
          advancesCollected += paid;
        }

        const timeStr = new Date(inv.createdAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });

        collections.push({
          id: inv.id,
          time: timeStr,
          timestamp: inv.createdAt,
          customerId: inv.customerId,
          customerName: inv.customerName,
          customerPhone: inv.customerPhone,
          invoiceId: inv.id,
          invoiceNumber: inv.invoiceNumber,
          orderNumber: orderMap[inv.id] || null,
          collectionType,
          paymentMethod: (inv.paymentMethod as any) || "CASH",
          totalBillAmount: invTotal,
          amountCollectedToday: paid,
          balanceRemaining: balRemaining,
          itemsSummary: (itemsMap[inv.id] || []).join(", ") || "Eyewear Products",
        });
      }
    }
  }

  collections.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  let totalInvoiced = 0;
  let totalBalanceRemaining = 0;
  for (const inv of rawInvoices) {
    totalInvoiced += parseFloat(inv.total) || 0;
    totalBalanceRemaining += parseFloat(inv.balanceDue) || 0;
  }

  const formattedDate = new Date(y, (m || 1) - 1, d || 1).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return {
    date: dateStr,
    formattedDate,
    totalCollected,
    cashTotal,
    upiTotal,
    cardTotal,
    bankTotal,
    totalInvoiced,
    totalInvoicesCount: rawInvoices.length,
    advancesCollected,
    duesSettled,
    totalBalanceRemaining,
    uniqueCustomersCount: uniqueCustomerSet.size,
    collections,
  };
}

// 8. Outstanding Dues & Receivables Ageing Data
export interface OutstandingDueItem {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerPhone: string | null;
  createdAt: Date;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  ageDays: number;
  agingBucket: "0-30" | "31-60" | "60+";
}

export interface OutstandingDuesReportData {
  totalOutstanding: number;
  count0to30: number;
  count31to60: number;
  count60Plus: number;
  total0to30: number;
  total31to60: number;
  total60Plus: number;
  items: OutstandingDueItem[];
}

export async function getOutstandingDuesReport(shopId: string, organizationId?: string): Promise<OutstandingDuesReportData> {
  const rawInvoices = await db
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      customerName: customers.fullName,
      customerPhone: customers.phone,
      createdAt: invoices.createdAt,
      total: invoices.total,
      amountPaid: invoices.amountPaid,
      balanceDue: invoices.balanceDue,
    })
    .from(invoices)
    .innerJoin(customers, eq(invoices.customerId, customers.id))
    .where(
      and(
        getShopFilter(invoices.shopId, invoices.organizationId, shopId, organizationId),
        sql`CAST(${invoices.balanceDue} AS NUMERIC) > 0`
      )
    )
    .orderBy(desc(invoices.createdAt));

  const nowTime = Date.now();
  let totalOutstanding = 0;
  let count0to30 = 0;
  let count31to60 = 0;
  let count60Plus = 0;
  let total0to30 = 0;
  let total31to60 = 0;
  let total60Plus = 0;

  const items: OutstandingDueItem[] = rawInvoices.map((inv) => {
    const tot = parseFloat(inv.total) || 0;
    const paid = parseFloat(inv.amountPaid) || 0;
    const bal = parseFloat(inv.balanceDue) || 0;

    totalOutstanding += bal;

    const diffDays = Math.floor((nowTime - new Date(inv.createdAt).getTime()) / (1000 * 60 * 60 * 24));
    let agingBucket: "0-30" | "31-60" | "60+" = "0-30";

    if (diffDays <= 30) {
      agingBucket = "0-30";
      count0to30++;
      total0to30 += bal;
    } else if (diffDays <= 60) {
      agingBucket = "31-60";
      count31to60++;
      total31to60 += bal;
    } else {
      agingBucket = "60+";
      count60Plus++;
      total60Plus += bal;
    }

    return {
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      customerName: inv.customerName,
      customerPhone: inv.customerPhone,
      createdAt: inv.createdAt,
      totalAmount: tot,
      amountPaid: paid,
      balanceDue: bal,
      ageDays: diffDays,
      agingBucket,
    };
  });

  return {
    totalOutstanding,
    count0to30,
    count31to60,
    count60Plus,
    total0to30,
    total31to60,
    total60Plus,
    items,
  };
}

// 9. Dead Stock Audit Data
export interface DeadStockItem {
  id: string;
  name: string;
  category: string;
  brand: string | null;
  sku: string | null;
  quantity: number;
  costPrice: number;
  sellingPrice: number;
  deadCostValuation: number;
  daysInStock: number;
}

export interface DeadStockReportData {
  totalDeadItems: number;
  totalDeadQuantity: number;
  totalDeadCostValuation: number;
  items: DeadStockItem[];
}

export async function getDeadStockReport(shopId: string, organizationId?: string): Promise<DeadStockReportData> {
  // Items active with quantity > 0 created more than 60 days ago
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

  const rawItems = await db
    .select({
      id: inventory.id,
      name: inventory.name,
      category: inventory.category,
      brand: inventory.brand,
      sku: inventory.sku,
      quantity: inventory.quantity,
      costPrice: inventory.costPrice,
      price: inventory.price,
      createdAt: inventory.createdAt,
    })
    .from(inventory)
    .where(
      and(
        getShopFilter(inventory.shopId, inventory.organizationId, shopId, organizationId),
        eq(inventory.isActive, true),
        gte(inventory.quantity, 1),
        lte(inventory.createdAt, sixtyDaysAgo)
      )
    )
    .orderBy(inventory.createdAt);

  let totalDeadQuantity = 0;
  let totalDeadCostValuation = 0;
  const nowTime = Date.now();

  const items: DeadStockItem[] = rawItems.map((item) => {
    const qty = item.quantity || 0;
    const cost = parseFloat(item.costPrice || "0") || 0;
    const price = parseFloat(item.price || "0") || 0;
    const val = qty * cost;

    totalDeadQuantity += qty;
    totalDeadCostValuation += val;

    const daysInStock = Math.floor((nowTime - new Date(item.createdAt).getTime()) / (1000 * 60 * 60 * 24));

    return {
      id: item.id,
      name: item.name,
      category: item.category,
      brand: item.brand,
      sku: item.sku,
      quantity: qty,
      costPrice: cost,
      sellingPrice: price,
      deadCostValuation: val,
      daysInStock,
    };
  });

  return {
    totalDeadItems: rawItems.length,
    totalDeadQuantity,
    totalDeadCostValuation,
    items,
  };
}

/**
 * Resolves the canonical public invoice URL.
 * Falls back to live production domain (https://www.opticalmanager.in)
 * when origin is localhost or missing.
 */
export function getLivePublicInvoiceUrl(invoiceId: string, origin?: string): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl && !envUrl.includes("localhost") && !envUrl.includes("127.0.0.1")) {
    return `${envUrl.replace(/\/$/, "")}/share/invoice/${invoiceId}`;
  }
  if (origin && !origin.includes("localhost") && !origin.includes("127.0.0.1")) {
    return `${origin.replace(/\/$/, "")}/share/invoice/${invoiceId}`;
  }
  return `https://www.opticalmanager.in/share/invoice/${invoiceId}`;
}

export interface ReportExportPayload {
  sheetName: string;
  headers: string[];
  rows: (string | number)[][];
}

/**
 * Single source of truth payload builder for both CSV and Excel exports.
 */
export async function getReportExportPayload(
  shopId: string,
  reportType: string,
  startDate?: string,
  endDate?: string,
  organizationId?: string,
  origin: string = ""
): Promise<ReportExportPayload> {
  const normType = reportType.toLowerCase();

  if (normType === "all" || normType === "gst-all" || normType === "invoices") {
    const data = await getGSTReport(shopId, startDate, endDate, organizationId);
    const headers = [
      "Tax Category",
      "GSTIN / UIN",
      "Party / Customer Name",
      "Contact Phone",
      "Invoice No",
      "Date of Sale",
      "Place of Supply",
      "Supply Type",
      "Reverse Charge",
      "Invoice Type",
      "Rate (%)",
      "Taxable Value (₹)",
      "CGST Amount (₹)",
      "SGST Amount (₹)",
      "IGST Amount (₹)",
      "Cess Amount (₹)",
      "Total Invoice Value (₹)",
      "Payment Mode",
      "Payment Status",
      "Public Invoice Link"
    ];
    const rows = data.allInvoices.map((inv) => [
      inv.isB2B ? "B2B" : (inv.isB2CLarge ? "B2C-Large" : "B2C-Small"),
      inv.customerGstin || "Unregistered",
      inv.customerName,
      inv.customerPhone || "N/A",
      inv.invoiceNumber,
      formatDateOfSale(inv.invoiceDate),
      inv.placeOfSupply,
      inv.supplyType,
      inv.reverseCharge,
      inv.invoiceType,
      inv.effectiveRate,
      parseFloat(inv.taxableValue.toFixed(2)),
      parseFloat(inv.cgstAmount.toFixed(2)),
      parseFloat(inv.sgstAmount.toFixed(2)),
      parseFloat(inv.igstAmount.toFixed(2)),
      parseFloat(inv.cessAmount.toFixed(2)),
      parseFloat(inv.invoiceValue.toFixed(2)),
      inv.paymentMethod,
      inv.paymentStatus,
      getLivePublicInvoiceUrl(inv.invoiceId, origin),
    ]);
    return { sheetName: "GST All Invoices", headers, rows };
  } else if (normType === "b2b") {
    const data = await getGSTReport(shopId, startDate, endDate, organizationId);
    const headers = [
      "GSTIN / UIN",
      "Receiver Name",
      "Invoice No",
      "Date of Sale",
      "Invoice Value (₹)",
      "Place of Supply",
      "Supply Type",
      "Reverse Charge",
      "Invoice Type",
      "Rate (%)",
      "Taxable Value (₹)",
      "Cess Amount (₹)",
      "CGST Amount (₹)",
      "SGST Amount (₹)",
      "IGST Amount (₹)",
      "Payment Mode",
      "Payment Status",
      "Public Invoice Link"
    ];
    const rows = data.b2bInvoices.map((inv) => [
      inv.customerGstin || "N/A",
      inv.customerName,
      inv.invoiceNumber,
      formatDateOfSale(inv.invoiceDate),
      parseFloat(inv.invoiceValue.toFixed(2)),
      inv.placeOfSupply,
      inv.supplyType,
      inv.reverseCharge,
      inv.invoiceType,
      inv.effectiveRate,
      parseFloat(inv.taxableValue.toFixed(2)),
      parseFloat(inv.cessAmount.toFixed(2)),
      parseFloat(inv.cgstAmount.toFixed(2)),
      parseFloat(inv.sgstAmount.toFixed(2)),
      parseFloat(inv.igstAmount.toFixed(2)),
      inv.paymentMethod,
      inv.paymentStatus,
      getLivePublicInvoiceUrl(inv.invoiceId, origin),
    ]);
    return { sheetName: "B2B Invoices", headers, rows };
  } else if (normType === "b2c") {
    const data = await getGSTReport(shopId, startDate, endDate, organizationId);
    const headers = [
      "Tax Category",
      "Customer Name",
      "Contact Phone",
      "Invoice No",
      "Date of Sale",
      "Place of Supply",
      "Supply Type",
      "Rate (%)",
      "Taxable Value (₹)",
      "CGST Amount (₹)",
      "SGST Amount (₹)",
      "IGST Amount (₹)",
      "Invoice Value (₹)",
      "Payment Mode",
      "Payment Status",
      "Public Invoice Link"
    ];
    const rows = data.b2cInvoices.map((inv) => [
      inv.isB2CLarge ? "B2C-Large" : "B2C-Small",
      inv.customerName,
      inv.customerPhone || "N/A",
      inv.invoiceNumber,
      formatDateOfSale(inv.invoiceDate),
      inv.placeOfSupply,
      inv.supplyType,
      inv.effectiveRate,
      parseFloat(inv.taxableValue.toFixed(2)),
      parseFloat(inv.cgstAmount.toFixed(2)),
      parseFloat(inv.sgstAmount.toFixed(2)),
      parseFloat(inv.igstAmount.toFixed(2)),
      parseFloat(inv.invoiceValue.toFixed(2)),
      inv.paymentMethod,
      inv.paymentStatus,
      getLivePublicInvoiceUrl(inv.invoiceId, origin),
    ]);
    return { sheetName: "B2C Invoices", headers, rows };
  } else if (normType === "gstr1" || normType === "gstr1-portal") {
    const data = await getGSTReport(shopId, startDate, endDate, organizationId);
    const headers = [
      "GSTIN/UIN of Recipient",
      "Receiver Name",
      "Invoice Number",
      "Date of Sale",
      "Invoice Value",
      "Place Of Supply",
      "Reverse Charge",
      "Applicable % of Tax Rate",
      "Invoice Type",
      "Rate",
      "Taxable Value",
      "Cess Amount"
    ];
    const rows = data.b2bInvoices.map((inv) => [
      inv.customerGstin || "",
      inv.customerName,
      inv.invoiceNumber,
      formatDateOfSale(inv.invoiceDate),
      parseFloat(inv.invoiceValue.toFixed(2)),
      inv.placeOfSupply,
      inv.reverseCharge,
      "",
      inv.invoiceType,
      inv.effectiveRate,
      parseFloat(inv.taxableValue.toFixed(2)),
      parseFloat(inv.cessAmount.toFixed(2)),
    ]);
    return { sheetName: "GSTR-1 Portal", headers, rows };
  } else if (normType === "hsn") {
    const data = await getGSTReport(shopId, startDate, endDate, organizationId);
    const headers = [
      "HSN Code",
      "Description",
      "UQC",
      "Total Quantity",
      "Total Value (₹)",
      "Taxable Value (₹)",
      "Integrated Tax Amount (₹)",
      "Central Tax Amount (₹)",
      "State/UT Tax Amount (₹)",
      "Cess Amount (₹)"
    ];
    const rows = data.hsnSummary.map((h) => [
      h.hsnCode,
      h.description,
      h.uqc,
      h.totalQuantity,
      parseFloat(h.totalValue.toFixed(2)),
      parseFloat(h.taxableValue.toFixed(2)),
      parseFloat(h.igst.toFixed(2)),
      parseFloat(h.cgst.toFixed(2)),
      parseFloat(h.sgst.toFixed(2)),
      0.00,
    ]);
    return { sheetName: "HSN Summary", headers, rows };
  } else if (normType === "creditnotes") {
    const data = await getCreditNotesReport(shopId, startDate, endDate, organizationId);
    const headers = [
      "Note Type",
      "Note Number",
      "Date of Sale / Issue",
      "Original Invoice No",
      "Original Invoice Date",
      "Customer Name",
      "GSTIN",
      "Supply Category",
      "Reason",
      "Refund Amount (₹)",
      "Refund Method"
    ];
    const rows = data.notes.map((n) => [
      n.noteType,
      n.noteNumber,
      formatDateOfSale(n.noteDate),
      n.originalInvoiceNumber,
      formatDateOfSale(n.originalInvoiceDate),
      n.customerName,
      n.customerGstin || "URP",
      n.isRegistered ? "Table 9A (Registered)" : "Table 9B (Unregistered)",
      n.reason,
      parseFloat(n.noteValue.toFixed(2)),
      n.refundMethod,
    ]);
    return { sheetName: "Credit Notes", headers, rows };
  } else if (normType === "docsummary") {
    const data = await getDocumentSummary(shopId, startDate, endDate, organizationId);
    const headers = [
      "Nature of Document",
      "Sr. No. From",
      "Sr. No. To",
      "Total Number",
      "Cancelled",
      "Net Issued",
      "Missing Serial Numbers"
    ];
    const rows = data.rows.map((d) => [
      d.documentType,
      d.serialFrom,
      d.serialTo,
      d.totalNumber,
      d.cancelled,
      d.netIssued,
      d.missingNumbers.join("; ") || "None (Continuous)",
    ]);
    return { sheetName: "Document Summary", headers, rows };
  } else if (normType === "sales") {
    const data = await getSalesSummaryReport(shopId, startDate, endDate);
    const headers = ["Invoice No", "Date of Sale", "Customer Name", "Subtotal (₹)", "Discount (₹)", "Tax (₹)", "Total Amount (₹)", "Amount Paid (₹)", "Balance Due (₹)", "Payment Method", "Status"];
    const rows = data.items.map((i) => [
      i.invoiceNumber,
      formatDateOfSale(i.createdAt),
      i.customerName,
      parseFloat(i.subtotal.toFixed(2)),
      parseFloat(i.discount.toFixed(2)),
      parseFloat(i.tax.toFixed(2)),
      parseFloat(i.total.toFixed(2)),
      parseFloat(i.amountPaid.toFixed(2)),
      parseFloat(i.balanceDue.toFixed(2)),
      i.paymentMethod || "N/A",
      i.status,
    ]);
    return { sheetName: "Sales Summary", headers, rows };
  } else if (normType === "items") {
    const data = await getItemWiseReport(shopId, startDate, endDate);
    const headers = ["Item Description", "Category", "Quantity Sold", "Avg Unit Price (₹)", "Total Revenue (₹)"];
    const rows = data.items.map((i) => [
      i.description,
      i.category,
      i.totalQuantity,
      parseFloat(i.avgPrice.toFixed(2)),
      parseFloat(i.totalSales.toFixed(2)),
    ]);
    return { sheetName: "Item Wise Report", headers, rows };
  } else if (normType === "gst") {
    const data = await getGSTReport(shopId, startDate, endDate);
    const headers = ["Invoice No", "Date of Sale", "Customer Name", "HSN Code", "Taxable Subtotal (₹)", "CGST (₹)", "SGST (₹)", "IGST (₹)", "Total Tax (₹)", "Total Amount (₹)"];
    const rows = data.items.map((i) => [
      i.invoiceNumber,
      formatDateOfSale(i.createdAt),
      i.customerName,
      i.hsnCode,
      parseFloat(i.subtotal.toFixed(2)),
      parseFloat(i.cgstAmount.toFixed(2)),
      parseFloat(i.sgstAmount.toFixed(2)),
      parseFloat(i.igstAmount.toFixed(2)),
      parseFloat(i.totalTax.toFixed(2)),
      parseFloat(i.totalAmount.toFixed(2)),
    ]);
    return { sheetName: "GST Summary", headers, rows };
  } else if (normType === "inventory") {
    const data = await getInventoryReport(shopId);
    const headers = ["Item Name", "Category", "Brand", "SKU", "In Stock Quantity", "Unit Cost Price (₹)", "Selling Price (₹)", "Total Cost Valuation (₹)", "Total Retail Valuation (₹)", "Stock Status"];
    const rows = data.items.map((i) => [
      i.name,
      i.category,
      i.brand || "N/A",
      i.sku || "N/A",
      i.quantity,
      parseFloat(i.costPrice.toFixed(2)),
      parseFloat(i.sellingPrice.toFixed(2)),
      parseFloat(i.totalCostValue.toFixed(2)),
      parseFloat(i.totalRetailValue.toFixed(2)),
      i.status,
    ]);
    return { sheetName: "Inventory Valuation", headers, rows };
  } else if (normType === "payments") {
    const data = await getPaymentCollectionReport(shopId, startDate, endDate);
    const headers = ["Receipt No", "Invoice No", "Date of Payment", "Customer Name", "Payment Method", "Amount Paid (₹)", "Balance Remaining (₹)", "Transaction ID"];
    const rows = data.items.map((i) => [
      i.receiptNumber,
      i.invoiceNumber,
      formatDateOfSale(i.createdAt),
      i.customerName,
      i.paymentMethod,
      parseFloat(i.amountPaid.toFixed(2)),
      parseFloat(i.balanceDue.toFixed(2)),
      i.transactionId || "N/A",
    ]);
    return { sheetName: "Payment Collections", headers, rows };
  } else if (normType === "appointments") {
    const data = await getAppointmentReport(shopId, startDate, endDate);
    const headers = ["Patient Name", "Phone", "Date", "Time", "Purpose of Visit", "Status", "Notes"];
    const rows = data.items.map((i) => [
      i.customerName,
      i.customerPhone,
      i.dateKey,
      i.visitTime,
      i.purposeOfVisit,
      i.status,
      i.notes || "",
    ]);
    return { sheetName: "Appointments", headers, rows };
  } else if (normType === "daywise") {
    const data = await getDayWiseCollectionReport(shopId, startDate, endDate);
    const headers = ["Date", "Total Invoices", "Subtotal (₹)", "Tax Amount (₹)", "Total Revenue (₹)", "Total Collected (₹)", "Cash (₹)", "UPI (₹)", "Card (₹)", "Balance Outstanding (₹)"];
    const rows = data.days.map((d) => [
      d.date,
      d.totalInvoices,
      parseFloat(d.subtotal.toFixed(2)),
      parseFloat(d.tax.toFixed(2)),
      parseFloat(d.totalRevenue.toFixed(2)),
      parseFloat(d.totalCollected.toFixed(2)),
      parseFloat(d.cashTotal.toFixed(2)),
      parseFloat(d.upiTotal.toFixed(2)),
      parseFloat(d.cardTotal.toFixed(2)),
      parseFloat(d.balanceDue.toFixed(2)),
    ]);
    return { sheetName: "Day-Wise Collection", headers, rows };
  } else if (normType === "daily" || normType === "singleday") {
    const dateStr = startDate || new Date().toISOString().split("T")[0];
    const data = await getSingleDayCollectionReport(shopId, dateStr);
    const headers = ["Time", "Customer Name", "Phone", "Invoice No", "Receipt No", "Collection Type", "Items Summary", "Payment Mode", "Bill Amount (₹)", "Amount Paid Today (₹)", "Balance Due (₹)"];
    const rows = data.collections.map((c) => [
      c.time,
      c.customerName,
      c.customerPhone || "N/A",
      c.invoiceNumber,
      c.receiptNumber || "N/A",
      c.collectionType,
      c.itemsSummary,
      c.paymentMethod,
      parseFloat(c.totalBillAmount.toFixed(2)),
      parseFloat(c.amountCollectedToday.toFixed(2)),
      parseFloat(c.balanceRemaining.toFixed(2)),
    ]);
    return { sheetName: "Daily Collections", headers, rows };
  } else if (normType === "dues") {
    const data = await getOutstandingDuesReport(shopId);
    const headers = ["Invoice No", "Date of Sale", "Patient Name", "Phone", "Total Invoice (₹)", "Amount Paid (₹)", "Balance Overdue (₹)", "Overdue Days", "Aging Bucket"];
    const rows = data.items.map((i) => [
      i.invoiceNumber,
      formatDateOfSale(i.createdAt),
      i.customerName,
      i.customerPhone || "N/A",
      parseFloat(i.totalAmount.toFixed(2)),
      parseFloat(i.amountPaid.toFixed(2)),
      parseFloat(i.balanceDue.toFixed(2)),
      i.ageDays,
      i.agingBucket,
    ]);
    return { sheetName: "Outstanding Dues", headers, rows };
  } else if (normType === "deadstock") {
    const data = await getDeadStockReport(shopId);
    const headers = ["Product Name", "Category", "Brand", "SKU", "Units Unsold", "Unit Cost Price (₹)", "Selling Price (₹)", "Dead Cost Value (₹)", "Days in Inventory"];
    const rows = data.items.map((i) => [
      i.name,
      i.category,
      i.brand || "N/A",
      i.sku || "N/A",
      i.quantity,
      parseFloat(i.costPrice.toFixed(2)),
      parseFloat(i.sellingPrice.toFixed(2)),
      parseFloat(i.deadCostValuation.toFixed(2)),
      i.daysInStock,
    ]);
    return { sheetName: "Dead Stock Audit", headers, rows };
  }

  return { sheetName: "Report", headers: ["Status"], rows: [["No data available"]] };
}

/**
 * CSV Exporter for Reports
 * Includes UTF-8 BOM (\uFEFF) for immediate Excel compatibility and clean text encoding.
 */
export async function exportReportToCSV(
  shopId: string,
  reportType: string,
  startDate?: string,
  endDate?: string,
  organizationId?: string,
  origin: string = ""
): Promise<string> {
  const { headers, rows } = await getReportExportPayload(
    shopId,
    reportType,
    startDate,
    endDate,
    organizationId,
    origin
  );

  const escapeCSV = (str: any) => sanitizeCSVValue(str);

  const csvRows = [
    headers.map(escapeCSV).join(","),
    ...rows.map((row) => row.map(escapeCSV).join(","))
  ];

  return "\uFEFF" + csvRows.join("\n");
}

/**
 * Industrial-Grade Excel (.xlsx) Exporter with Auto-Calculated Column Widths.
 * Opens seamlessly in Microsoft Excel, Apple Numbers, and Google Sheets without '########' or truncated columns.
 */
export async function exportReportToExcel(
  shopId: string,
  reportType: string,
  startDate?: string,
  endDate?: string,
  organizationId?: string,
  origin: string = ""
): Promise<Buffer> {
  const { sheetName, headers, rows } = await getReportExportPayload(
    shopId,
    reportType,
    startDate,
    endDate,
    organizationId,
    origin
  );

  // Build sheet
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // Compute responsive, generous column widths with minimum padding
  const colWidths = headers.map((header, colIdx) => {
    let maxLen = header.length;
    for (const r of rows) {
      const valStr = String(r[colIdx] ?? "");
      if (valStr.length > maxLen) {
        maxLen = valStr.length;
      }
    }
    // Generous column width: minimum 14 chars, maximum 60 chars for URLs
    return { wch: Math.min(Math.max(maxLen + 4, 14), 60) };
  });

  worksheet["!cols"] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  return buffer as Buffer;
}
