"use client";

import React, { useState, useMemo } from "react";
import { 
  BarChart3, 
  Download, 
  Search, 
  Calendar, 
  Package, 
  Receipt, 
  FileText, 
  CreditCard, 
  CalendarCheck, 
  Sparkles, 
  ArrowUpRight, 
  Filter,
  Layers,
  ShoppingBag,
  TrendingUp,
  FlaskConical,
  MoreHorizontal
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { 
  SalesSummaryReportData, 
  ItemWiseReportData, 
  GSTReportData, 
  InventoryReportData, 
  PaymentCollectionReportData, 
  AppointmentReportData 
} from "@/services/report.service";

interface ReportsClientProps {
  salesData: SalesSummaryReportData;
  itemData: ItemWiseReportData;
  gstData: GSTReportData;
  inventoryData: InventoryReportData;
  paymentData: PaymentCollectionReportData;
  appointmentData: AppointmentReportData;
  initialFrom?: string;
  initialTo?: string;
}

export default function ReportsClient({
  salesData,
  itemData,
  gstData,
  inventoryData,
  paymentData,
  appointmentData,
  initialFrom,
  initialTo,
}: ReportsClientProps) {
  // Navigation & Category states
  const [activeCategory, setActiveCategory] = useState<"item" | "sales" | "representative" | "invoices" | "misc" | "lab">("sales");
  const [activeSubReport, setActiveSubReport] = useState<string>("Summary Report");
  const [searchQuery, setSearchQuery] = useState("");

  // Date Range State
  const [datePreset, setDatePreset] = useState("30d");
  const [fromDate, setFromDate] = useState(initialFrom || "");
  const [toDate, setToDate] = useState(initialTo || "");
  const [isCustomRange, setIsCustomRange] = useState(false);

  const handlePresetChange = (preset: string) => {
    setDatePreset(preset);
    if (preset === "custom") {
      setIsCustomRange(true);
    } else {
      setIsCustomRange(false);
      const url = new URL(window.location.href);
      url.searchParams.set("preset", preset);
      url.searchParams.delete("from");
      url.searchParams.delete("to");
      window.location.href = url.toString();
    }
  };

  const handleApplyCustomDates = () => {
    if (!fromDate || !toDate) return;
    const url = new URL(window.location.href);
    url.searchParams.set("preset", "custom");
    url.searchParams.set("from", fromDate);
    url.searchParams.set("to", toDate);
    window.location.href = url.toString();
  };

  // CSV Export Trigger
  const handleExportCSV = () => {
    let reportType = "sales";
    if (activeCategory === "item") reportType = "items";
    else if (activeCategory === "sales") reportType = "sales";
    else if (activeCategory === "invoices") reportType = "gst";
    else if (activeCategory === "misc") reportType = "inventory";
    else if (activeCategory === "representative") reportType = "payments";
    else if (activeCategory === "lab") reportType = "appointments";

    let exportUrl = `/api/reports/export?type=${reportType}`;
    if (fromDate && toDate) {
      exportUrl += `&from=${fromDate}&to=${toDate}`;
    }
    window.open(exportUrl, "_blank");
  };

  // Categories & Sub-reports config matching the user's design screenshot
  const reportCategories = [
    {
      id: "item",
      title: "ITEM WISE",
      icon: Package,
      items: ["Frame", "Sunglasses", "Accessories", "Spectacle Lens", "Contact Lens"],
    },
    {
      id: "sales",
      title: "SALES REPORT",
      icon: Receipt,
      items: ["Orders", "Item Type Wise", "Pending Orders", "Summary Report", "Daily Collection"],
    },
    {
      id: "representative",
      title: "REPRESENTATIVE",
      icon: TrendingUp,
      items: ["Net Sales", "Sales Order", "Sales Return", "Avg Sales (Invoice)"],
    },
    {
      id: "invoices",
      title: "INVOICES",
      icon: FileText,
      items: ["GST Compliance", "Receipt Type Wise"],
    },
    {
      id: "misc",
      title: "MISCELLANEOUS",
      icon: MoreHorizontal,
      items: ["Detailed Breakdown", "Uncategorized Items"],
    },
    {
      id: "lab",
      title: "LAB ORDER",
      icon: FlaskConical,
      items: ["Tracking Status", "Turnaround Time", "Pending Labs"],
    },
  ];

  // Search Filtered Tables
  const query = searchQuery.trim().toLowerCase();

  const filteredSales = useMemo(() => {
    return salesData.items.filter(
      (item) =>
        !query ||
        item.invoiceNumber.toLowerCase().includes(query) ||
        item.customerName.toLowerCase().includes(query) ||
        item.status.toLowerCase().includes(query)
    );
  }, [salesData.items, query]);

  const filteredItems = useMemo(() => {
    return itemData.items.filter(
      (item) =>
        !query ||
        item.description.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query)
    );
  }, [itemData.items, query]);

  const filteredGST = useMemo(() => {
    return gstData.items.filter(
      (item) =>
        !query ||
        item.invoiceNumber.toLowerCase().includes(query) ||
        item.customerName.toLowerCase().includes(query) ||
        item.hsnCode.toLowerCase().includes(query)
    );
  }, [gstData.items, query]);

  const filteredInventory = useMemo(() => {
    return inventoryData.items.filter(
      (item) =>
        !query ||
        item.name.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query) ||
        (item.brand && item.brand.toLowerCase().includes(query)) ||
        (item.sku && item.sku.toLowerCase().includes(query))
    );
  }, [inventoryData.items, query]);

  const filteredPayments = useMemo(() => {
    return paymentData.items.filter(
      (item) =>
        !query ||
        item.receiptNumber.toLowerCase().includes(query) ||
        item.invoiceNumber.toLowerCase().includes(query) ||
        item.customerName.toLowerCase().includes(query) ||
        item.paymentMethod.toLowerCase().includes(query)
    );
  }, [paymentData.items, query]);

  const filteredAppointments = useMemo(() => {
    return appointmentData.items.filter(
      (item) =>
        !query ||
        item.customerName.toLowerCase().includes(query) ||
        item.customerPhone.toLowerCase().includes(query) ||
        item.purposeOfVisit.toLowerCase().includes(query) ||
        item.status.toLowerCase().includes(query)
    );
  }, [appointmentData.items, query]);

  return (
    <div className="space-y-5 select-none max-w-[1400px] mx-auto pb-12">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Analytics & Reports
          </h1>
          <p className="text-xs font-semibold text-slate-400 mt-0.5">
            Explore comprehensive business insights and performance metrics.
          </p>
        </div>

        {/* Global Controls & Export */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200/80">
            <Calendar className="h-4 w-4 text-slate-400 ml-1 shrink-0" />
            <select
              value={datePreset}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-800 bg-white border border-slate-200 focus:outline-none focus:border-[#2563eb] cursor-pointer shadow-2xs"
            >
              <option value="24h">Today</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">This Month</option>
              <option value="90d">This Quarter</option>
              <option value="ytd">Year to Date</option>
              <option value="custom">Custom Range...</option>
            </select>

            {isCustomRange && (
              <div className="flex items-center gap-1.5 animate-in fade-in duration-200">
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="px-2 py-1 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white"
                />
                <span className="text-xs font-bold text-slate-400">to</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="px-2 py-1 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white"
                />
                <Button
                  onClick={handleApplyCustomDates}
                  className="h-7 px-2.5 text-[11px] font-bold bg-[#2563eb] text-white rounded-lg cursor-pointer"
                >
                  Apply
                </Button>
              </div>
            )}
          </div>

          <Button
            onClick={handleExportCSV}
            className="h-9 px-3.5 text-xs font-bold bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-xl shadow-md shadow-blue-500/20 cursor-pointer flex items-center gap-2"
          >
            <Download className="h-3.5 w-3.5" /> Export Summary
          </Button>
        </div>
      </div>

      {/* 2. Top Report Category Cards Grid (Matching Screenshot UI) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
        {reportCategories.map((cat) => {
          const IconComp = cat.icon;
          const isActiveCategory = activeCategory === cat.id;

          return (
            <div
              key={cat.id}
              className={`bg-white rounded-2xl border transition-all duration-200 shadow-xs flex flex-col justify-between overflow-hidden ${
                isActiveCategory
                  ? "border-2 border-[#2563eb] shadow-md scale-[1.01]"
                  : "border-slate-200/80 hover:border-slate-300"
              }`}
            >
              {/* Header Chevron Banner */}
              <div
                onClick={() => {
                  setActiveCategory(cat.id as any);
                  setActiveSubReport(cat.items[0]);
                }}
                className="bg-[#2563eb] text-white p-2.5 text-center cursor-pointer relative font-black text-xs tracking-wider uppercase flex items-center justify-center gap-1.5"
                style={{
                  clipPath: "polygon(0 0, 100% 0, 100% 80%, 50% 100%, 0 80%)",
                  paddingBottom: "16px",
                }}
              >
                <IconComp className="h-3.5 w-3.5" />
                <span>{cat.title}</span>
              </div>

              {/* Sub-Items List */}
              <div className="p-3 space-y-1.5 flex-1">
                {cat.items.map((subItem) => {
                  const isSubActive = isActiveCategory && activeSubReport === subItem;
                  return (
                    <button
                      key={subItem}
                      type="button"
                      onClick={() => {
                        setActiveCategory(cat.id as any);
                        setActiveSubReport(subItem);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer block truncate ${
                        isSubActive
                          ? "bg-blue-50 text-[#2563eb] font-extrabold"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      {subItem}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Active Report Details & Data Workspace */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4.5 shadow-xs space-y-4">
        {/* Workspace Title & Search Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-[#2563eb] text-[10px] font-extrabold uppercase tracking-wider border border-blue-100">
                {activeCategory.toUpperCase()} REPORT
              </span>
              <h2 className="text-base font-extrabold text-slate-900">
                {activeSubReport}
              </h2>
            </div>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">
              Live database metrics for store performance analytics
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search report records..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2563eb] bg-slate-50/50"
            />
          </div>
        </div>

        {/* 4. Category Specific KPI Metric Cards */}
        {activeCategory === "sales" && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Revenue
              </span>
              <span className="text-xl font-extrabold text-slate-900 tracking-tight mt-1 block">
                {formatCurrency(salesData.totalRevenue)}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Invoices Count
              </span>
              <span className="text-xl font-extrabold text-[#2563eb] tracking-tight mt-1 block">
                {salesData.totalInvoices}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Discount
              </span>
              <span className="text-xl font-extrabold text-amber-600 tracking-tight mt-1 block">
                {formatCurrency(salesData.totalDiscount)}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Paid vs Pending
              </span>
              <span className="text-xl font-extrabold text-emerald-600 tracking-tight mt-1 block">
                {salesData.paidInvoices} / {salesData.pendingInvoices}
              </span>
            </div>
          </div>
        )}

        {activeCategory === "item" && (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Items Sold
              </span>
              <span className="text-xl font-extrabold text-slate-900 tracking-tight mt-1 block">
                {itemData.totalQuantitySold} Units
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Item Sales Revenue
              </span>
              <span className="text-xl font-extrabold text-[#2563eb] tracking-tight mt-1 block">
                {formatCurrency(itemData.totalRevenue)}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Unique Products
              </span>
              <span className="text-xl font-extrabold text-slate-900 tracking-tight mt-1 block">
                {itemData.items.length} SKUs
              </span>
            </div>
          </div>
        )}

        {activeCategory === "invoices" && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Taxable Value
              </span>
              <span className="text-xl font-extrabold text-slate-900 tracking-tight mt-1 block">
                {formatCurrency(gstData.totalTaxableValue)}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                CGST + SGST
              </span>
              <span className="text-xl font-extrabold text-[#2563eb] tracking-tight mt-1 block">
                {formatCurrency(gstData.totalCGST + gstData.totalSGST)}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                IGST Total
              </span>
              <span className="text-xl font-extrabold text-emerald-600 tracking-tight mt-1 block">
                {formatCurrency(gstData.totalIGST)}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Tax Collected
              </span>
              <span className="text-xl font-extrabold text-slate-900 tracking-tight mt-1 block">
                {formatCurrency(gstData.totalTaxCollected)}
              </span>
            </div>
          </div>
        )}

        {activeCategory === "misc" && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Stock Quantity
              </span>
              <span className="text-xl font-extrabold text-slate-900 tracking-tight mt-1 block">
                {inventoryData.totalStockQuantity} Units
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Cost Valuation
              </span>
              <span className="text-xl font-extrabold text-[#2563eb] tracking-tight mt-1 block">
                {formatCurrency(inventoryData.totalCostValuation)}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Retail Valuation
              </span>
              <span className="text-xl font-extrabold text-emerald-600 tracking-tight mt-1 block">
                {formatCurrency(inventoryData.totalRetailValuation)}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Low / Out Stock
              </span>
              <span className="text-xl font-extrabold text-rose-600 tracking-tight mt-1 block">
                {inventoryData.lowStockCount} / {inventoryData.outOfStockCount}
              </span>
            </div>
          </div>
        )}

        {activeCategory === "representative" && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Collected
              </span>
              <span className="text-xl font-extrabold text-slate-900 tracking-tight mt-1 block">
                {formatCurrency(paymentData.totalCollected)}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Cash Collection
              </span>
              <span className="text-xl font-extrabold text-emerald-600 tracking-tight mt-1 block">
                {formatCurrency(paymentData.cashTotal)}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                UPI / Digital
              </span>
              <span className="text-xl font-extrabold text-[#2563eb] tracking-tight mt-1 block">
                {formatCurrency(paymentData.upiTotal)}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Card / Bank
              </span>
              <span className="text-xl font-extrabold text-slate-900 tracking-tight mt-1 block">
                {formatCurrency(paymentData.cardTotal + paymentData.bankTotal)}
              </span>
            </div>
          </div>
        )}

        {activeCategory === "lab" && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Appointments
              </span>
              <span className="text-xl font-extrabold text-slate-900 tracking-tight mt-1 block">
                {appointmentData.totalAppointments}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Completed
              </span>
              <span className="text-xl font-extrabold text-emerald-600 tracking-tight mt-1 block">
                {appointmentData.completed}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Confirmed / Pending
              </span>
              <span className="text-xl font-extrabold text-[#2563eb] tracking-tight mt-1 block">
                {appointmentData.confirmed} / {appointmentData.pending}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Cancelled
              </span>
              <span className="text-xl font-extrabold text-rose-600 tracking-tight mt-1 block">
                {appointmentData.cancelled}
              </span>
            </div>
          </div>
        )}

        {/* 5. High-Density Data Tables */}
        <div className="overflow-x-auto">
          {activeCategory === "sales" && (
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="px-3.5 py-2.5 rounded-l-lg">Invoice No</th>
                  <th className="px-3.5 py-2.5">Date</th>
                  <th className="px-3.5 py-2.5">Customer Name</th>
                  <th className="px-3.5 py-2.5 text-right">Subtotal</th>
                  <th className="px-3.5 py-2.5 text-right">Tax</th>
                  <th className="px-3.5 py-2.5 text-right">Total Amount</th>
                  <th className="px-3.5 py-2.5 text-center rounded-r-lg">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-xs font-semibold text-slate-400">
                      No sales records found for selected period
                    </td>
                  </tr>
                ) : (
                  filteredSales.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100 last:border-b-0">
                      <td className="px-3.5 py-2.5 text-xs font-extrabold text-[#2563eb]">{item.invoiceNumber}</td>
                      <td className="px-3.5 py-2.5 text-xs font-semibold text-slate-500">{new Date(item.createdAt).toLocaleDateString()}</td>
                      <td className="px-3.5 py-2.5 text-xs font-bold text-slate-800">{item.customerName}</td>
                      <td className="px-3.5 py-2.5 text-xs font-semibold text-slate-600 text-right">{formatCurrency(item.subtotal)}</td>
                      <td className="px-3.5 py-2.5 text-xs font-semibold text-slate-600 text-right">{formatCurrency(item.tax)}</td>
                      <td className="px-3.5 py-2.5 text-xs font-extrabold text-slate-900 text-right">{formatCurrency(item.total)}</td>
                      <td className="px-3.5 py-2.5 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          item.status === "PAID"
                            ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                            : "bg-amber-50 text-amber-600 border-amber-100"
                        }`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {activeCategory === "item" && (
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="px-3.5 py-2.5 rounded-l-lg">Item Description</th>
                  <th className="px-3.5 py-2.5">Category</th>
                  <th className="px-3.5 py-2.5 text-center">Quantity Sold</th>
                  <th className="px-3.5 py-2.5 text-right">Avg Price</th>
                  <th className="px-3.5 py-2.5 text-right rounded-r-lg">Total Sales</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-xs font-semibold text-slate-400">
                      No item sales records found for selected period
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100 last:border-b-0">
                      <td className="px-3.5 py-2.5 text-xs font-bold text-slate-800">{item.description}</td>
                      <td className="px-3.5 py-2.5 text-xs font-semibold text-slate-500">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-extrabold">
                          {item.category}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 text-xs font-extrabold text-slate-900 text-center">{item.totalQuantity}</td>
                      <td className="px-3.5 py-2.5 text-xs font-semibold text-slate-600 text-right">{formatCurrency(item.avgPrice)}</td>
                      <td className="px-3.5 py-2.5 text-xs font-extrabold text-[#2563eb] text-right">{formatCurrency(item.totalSales)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {activeCategory === "invoices" && (
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="px-3.5 py-2.5 rounded-l-lg">Invoice No</th>
                  <th className="px-3.5 py-2.5">Date</th>
                  <th className="px-3.5 py-2.5">HSN Code</th>
                  <th className="px-3.5 py-2.5 text-right">Taxable Subtotal</th>
                  <th className="px-3.5 py-2.5 text-right">CGST</th>
                  <th className="px-3.5 py-2.5 text-right">SGST</th>
                  <th className="px-3.5 py-2.5 text-right rounded-r-lg">Total Tax</th>
                </tr>
              </thead>
              <tbody>
                {filteredGST.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-xs font-semibold text-slate-400">
                      No tax records found for selected period
                    </td>
                  </tr>
                ) : (
                  filteredGST.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100 last:border-b-0">
                      <td className="px-3.5 py-2.5 text-xs font-extrabold text-[#2563eb]">{item.invoiceNumber}</td>
                      <td className="px-3.5 py-2.5 text-xs font-semibold text-slate-500">{new Date(item.createdAt).toLocaleDateString()}</td>
                      <td className="px-3.5 py-2.5 text-xs font-bold text-slate-700">{item.hsnCode}</td>
                      <td className="px-3.5 py-2.5 text-xs font-semibold text-slate-600 text-right">{formatCurrency(item.subtotal)}</td>
                      <td className="px-3.5 py-2.5 text-xs font-semibold text-slate-600 text-right">{formatCurrency(item.cgstAmount)}</td>
                      <td className="px-3.5 py-2.5 text-xs font-semibold text-slate-600 text-right">{formatCurrency(item.sgstAmount)}</td>
                      <td className="px-3.5 py-2.5 text-xs font-extrabold text-emerald-600 text-right">{formatCurrency(item.totalTax)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {activeCategory === "misc" && (
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="px-3.5 py-2.5 rounded-l-lg">Item Name</th>
                  <th className="px-3.5 py-2.5">Category</th>
                  <th className="px-3.5 py-2.5 text-center">In Stock</th>
                  <th className="px-3.5 py-2.5 text-right">Cost Price</th>
                  <th className="px-3.5 py-2.5 text-right">Selling Price</th>
                  <th className="px-3.5 py-2.5 text-right">Total Cost Val</th>
                  <th className="px-3.5 py-2.5 text-center rounded-r-lg">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredInventory.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-xs font-semibold text-slate-400">
                      No inventory items found
                    </td>
                  </tr>
                ) : (
                  filteredInventory.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100 last:border-b-0">
                      <td className="px-3.5 py-2.5 text-xs font-bold text-slate-800">{item.name}</td>
                      <td className="px-3.5 py-2.5 text-xs font-semibold text-slate-500">{item.category}</td>
                      <td className="px-3.5 py-2.5 text-xs font-extrabold text-slate-900 text-center">{item.quantity}</td>
                      <td className="px-3.5 py-2.5 text-xs font-semibold text-slate-600 text-right">{formatCurrency(item.costPrice)}</td>
                      <td className="px-3.5 py-2.5 text-xs font-semibold text-slate-600 text-right">{formatCurrency(item.sellingPrice)}</td>
                      <td className="px-3.5 py-2.5 text-xs font-extrabold text-[#2563eb] text-right">{formatCurrency(item.totalCostValue)}</td>
                      <td className="px-3.5 py-2.5 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          item.status === "IN_STOCK"
                            ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                            : item.status === "LOW_STOCK"
                            ? "bg-amber-50 text-amber-600 border-amber-100"
                            : "bg-rose-50 text-rose-600 border-rose-100"
                        }`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {activeCategory === "representative" && (
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="px-3.5 py-2.5 rounded-l-lg">Receipt No</th>
                  <th className="px-3.5 py-2.5">Invoice No</th>
                  <th className="px-3.5 py-2.5">Date</th>
                  <th className="px-3.5 py-2.5">Customer Name</th>
                  <th className="px-3.5 py-2.5">Method</th>
                  <th className="px-3.5 py-2.5 text-right rounded-r-lg">Amount Paid</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-xs font-semibold text-slate-400">
                      No payment collection receipts found for selected period
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100 last:border-b-0">
                      <td className="px-3.5 py-2.5 text-xs font-extrabold text-[#2563eb]">{item.receiptNumber}</td>
                      <td className="px-3.5 py-2.5 text-xs font-bold text-slate-700">{item.invoiceNumber}</td>
                      <td className="px-3.5 py-2.5 text-xs font-semibold text-slate-500">{new Date(item.createdAt).toLocaleDateString()}</td>
                      <td className="px-3.5 py-2.5 text-xs font-bold text-slate-800">{item.customerName}</td>
                      <td className="px-3.5 py-2.5 text-xs font-semibold text-slate-600">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-extrabold">
                          {item.paymentMethod}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 text-xs font-extrabold text-emerald-600 text-right">{formatCurrency(item.amountPaid)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {activeCategory === "lab" && (
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="px-3.5 py-2.5 rounded-l-lg">Patient Name</th>
                  <th className="px-3.5 py-2.5">Phone</th>
                  <th className="px-3.5 py-2.5">Date</th>
                  <th className="px-3.5 py-2.5">Time</th>
                  <th className="px-3.5 py-2.5">Purpose</th>
                  <th className="px-3.5 py-2.5 text-center rounded-r-lg">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredAppointments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-xs font-semibold text-slate-400">
                      No appointment records found for selected period
                    </td>
                  </tr>
                ) : (
                  filteredAppointments.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100 last:border-b-0">
                      <td className="px-3.5 py-2.5 text-xs font-bold text-slate-800">{item.customerName}</td>
                      <td className="px-3.5 py-2.5 text-xs font-semibold text-slate-500">{item.customerPhone}</td>
                      <td className="px-3.5 py-2.5 text-xs font-semibold text-slate-600">{item.dateKey}</td>
                      <td className="px-3.5 py-2.5 text-xs font-semibold text-slate-600">{item.visitTime}</td>
                      <td className="px-3.5 py-2.5 text-xs font-bold text-[#2563eb]">{item.purposeOfVisit}</td>
                      <td className="px-3.5 py-2.5 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          item.status === "COMPLETED"
                            ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                            : item.status === "CONFIRMED"
                            ? "bg-blue-50 text-[#2563eb] border-blue-100"
                            : item.status === "PENDING"
                            ? "bg-amber-50 text-amber-600 border-amber-100"
                            : "bg-rose-50 text-rose-600 border-rose-100"
                        }`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
