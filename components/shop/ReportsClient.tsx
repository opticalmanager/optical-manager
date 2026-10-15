"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  MoreHorizontal,
  Printer,
  Mail,
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import ScheduleReportModal from "./ScheduleReportModal";
import { 
  SalesSummaryReportData, 
  ItemWiseReportData, 
  GSTReportData, 
  InventoryReportData, 
  PaymentCollectionReportData, 
  AppointmentReportData,
  DayWiseCollectionReportData,
  OutstandingDuesReportData,
  DeadStockReportData
} from "@/services/report.service";

interface ReportsClientProps {
  shopId: string;
  salesData: SalesSummaryReportData;
  itemData: ItemWiseReportData;
  gstData: GSTReportData;
  inventoryData: InventoryReportData;
  paymentData: PaymentCollectionReportData;
  appointmentData: AppointmentReportData;
  dayWiseData: DayWiseCollectionReportData;
  duesData: OutstandingDuesReportData;
  deadStockData: DeadStockReportData;
  autoReportSchedule?: { type: "daily" | "weekly" | "off"; email?: string };
  initialFrom?: string;
  initialTo?: string;
}

export default function ReportsClient({
  shopId,
  salesData,
  itemData,
  gstData,
  inventoryData,
  paymentData,
  appointmentData,
  dayWiseData,
  duesData,
  deadStockData,
  autoReportSchedule,
  initialFrom,
  initialTo,
}: ReportsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const workspaceRef = useRef<HTMLDivElement>(null);

  // Navigation & Category states
  const [activeCategory, setActiveCategory] = useState<"item" | "sales" | "representative" | "invoices" | "misc" | "lab">("sales");
  const [activeSubReport, setActiveSubReport] = useState<string>("Summary Report");
  const [searchQuery, setSearchQuery] = useState("");
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

  // Date Range State
  const [datePreset, setDatePreset] = useState("30d");
  const [fromDate, setFromDate] = useState(initialFrom || "");
  const [toDate, setToDate] = useState(initialTo || "");
  const [isCustomRange, setIsCustomRange] = useState(false);

  // Month & Year state for Day-Wise Collection header
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [isDayWiseCustomRange, setIsDayWiseCustomRange] = useState<boolean>(false);
  const [dayWiseFrom, setDayWiseFrom] = useState<string>(initialFrom || "");
  const [dayWiseTo, setDayWiseTo] = useState<string>(initialTo || "");

  // Detect ?sub=daywise on mount or navigation
  useEffect(() => {
    const sub = searchParams.get("sub");
    if (sub === "daywise" || sub === "day-wise") {
      setActiveCategory("sales");
      setActiveSubReport("Day-Wise Collection");
      setTimeout(() => {
        workspaceRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 150);
    }
  }, [searchParams]);

  const handleSelectSubReport = (catId: any, subItem: string) => {
    setActiveCategory(catId);
    setActiveSubReport(subItem);
    if (subItem === "Day-Wise Collection") {
      setTimeout(() => {
        workspaceRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  };

  const handleApplyMonthYear = (m: number, y: number) => {
    const startStr = `${y}-${String(m).padStart(2, "0")}-01`;
    const lastDayDate = new Date(y, m, 0);
    const endStr = `${y}-${String(m).padStart(2, "0")}-${String(lastDayDate.getDate()).padStart(2, "0")}`;
    const url = new URL(window.location.href);
    url.searchParams.set("preset", "custom");
    url.searchParams.set("from", startStr);
    url.searchParams.set("to", endStr);
    url.searchParams.set("sub", "daywise");
    window.location.href = url.toString();
  };

  const handleApplyDayWiseCustom = () => {
    if (!dayWiseFrom || !dayWiseTo) return;
    const url = new URL(window.location.href);
    url.searchParams.set("preset", "custom");
    url.searchParams.set("from", dayWiseFrom);
    url.searchParams.set("to", dayWiseTo);
    url.searchParams.set("sub", "daywise");
    window.location.href = url.toString();
  };

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

  // Trigger browser print layout
  const handlePrint = () => {
    window.print();
  };

  // CSV Export Trigger
  const handleExportCSV = () => {
    let reportType = "sales";
    if (activeSubReport === "Day-Wise Collection") reportType = "daywise";
    else if (activeSubReport === "Outstanding Dues") reportType = "dues";
    else if (activeSubReport === "Dead Stock Audit") reportType = "deadstock";
    else if (activeCategory === "item") reportType = "items";
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

  // Categories & Sub-reports config matching user design specifications
  const reportCategories = [
    {
      id: "item",
      title: "ITEM WISE",
      icon: Package,
      items: ["Frame", "Sunglasses", "Accessories", "Spectacle Lens", "Contact Lens", "Top Sellers"],
    },
    {
      id: "sales",
      title: "SALES REPORT",
      icon: Receipt,
      items: ["Summary Report", "Day-Wise Collection", "Orders", "Item Type Wise", "Pending Orders"],
    },
    {
      id: "representative",
      title: "REPRESENTATIVE",
      icon: TrendingUp,
      items: ["Net Sales", "Outstanding Dues", "Sales Order", "Sales Return", "Avg Sales (Invoice)"],
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
      items: ["Inventory Valuation", "Dead Stock Audit", "Detailed Breakdown", "Uncategorized Items"],
    },
    {
      id: "lab",
      title: "LAB ORDER",
      icon: FlaskConical,
      items: ["Tracking Status", "Patient Recall", "Turnaround Time", "Pending Labs"],
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

  const filteredDayWise = useMemo(() => {
    return dayWiseData.days.filter((d) => !query || d.date.includes(query));
  }, [dayWiseData.days, query]);

  const filteredDues = useMemo(() => {
    return duesData.items.filter(
      (d) =>
        !query ||
        d.invoiceNumber.toLowerCase().includes(query) ||
        d.customerName.toLowerCase().includes(query) ||
        d.customerPhone?.includes(query)
    );
  }, [duesData.items, query]);

  const filteredDeadStock = useMemo(() => {
    return deadStockData.items.filter(
      (item) =>
        !query ||
        item.name.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query) ||
        (item.brand && item.brand.toLowerCase().includes(query)) ||
        (item.sku && item.sku.toLowerCase().includes(query))
    );
  }, [deadStockData.items, query]);

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
    <div className="space-y-5 select-none max-w-[1400px] mx-auto pb-12 print:p-0 print:max-w-none">
      {/* Schedule EOD Report Modal */}
      <ScheduleReportModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        shopId={shopId}
        initialConfig={autoReportSchedule}
      />

      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs print:hidden">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Analytics & Reports
          </h1>
          <p className="text-xs font-semibold text-slate-400 mt-0.5">
            Explore comprehensive business insights, day-wise ledgers, and audit reports.
          </p>
        </div>

        {/* Global Controls & Actions */}
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
            onClick={() => setIsScheduleModalOpen(true)}
            variant="outline"
            className="h-9 px-3 text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl cursor-pointer flex items-center gap-1.5"
          >
            <Mail className="h-3.5 w-3.5 text-[#2563eb]" /> Schedule EOD
          </Button>

          <Button
            onClick={handleExportCSV}
            className="h-9 px-3.5 text-xs font-bold bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-xl shadow-md shadow-blue-500/20 cursor-pointer flex items-center gap-2"
          >
            <Download className="h-3.5 w-3.5" /> Export Summary
          </Button>
        </div>
      </div>

      {/* 2. Top Report Category Cards Grid (Matching Screenshot UI) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5 print:hidden">
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
                onClick={() => handleSelectSubReport(cat.id, cat.items[0])}
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
                      onClick={() => handleSelectSubReport(cat.id, subItem)}
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

      {/* 4. Active Report Details & Data Workspace */}
      <div 
        ref={workspaceRef}
        id="report-workspace-table"
        className="bg-white border border-slate-200/80 rounded-2xl p-4.5 shadow-xs space-y-4 print:border-none print:shadow-none print:p-0 scroll-mt-6"
      >
        {/* Workspace Title & Search Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 print:pb-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-[#2563eb] text-[10px] font-extrabold uppercase tracking-wider border border-blue-100 print:hidden">
                {activeCategory.toUpperCase()} REPORT
              </span>
              <h2 className="text-base font-extrabold text-slate-900">
                {activeSubReport}
              </h2>
            </div>
            <p className="text-xs text-slate-400 font-semibold mt-0.5 print:hidden">
              Live database metrics for store performance analytics
            </p>
          </div>

          <div className="relative w-full sm:w-64 print:hidden">
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

        {/* 5. Special Sub-Report: Day-Wise Collection Ledger */}
        {activeSubReport === "Day-Wise Collection" && (
          <div className="space-y-4">
            {/* Table Header: Month, Year, and Date Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50/90 border border-slate-200/80 rounded-xl print:hidden">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-[#2563eb]" />
                  Period:
                </span>

                {/* Quick Shortcuts */}
                <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => {
                      const m = now.getMonth() + 1;
                      const y = now.getFullYear();
                      setSelectedMonth(m);
                      setSelectedYear(y);
                      setIsDayWiseCustomRange(false);
                      handleApplyMonthYear(m, y);
                    }}
                    className="px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:text-[#2563eb] hover:bg-blue-50/60 rounded-md transition-all cursor-pointer"
                  >
                    This Month
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                      const m = prev.getMonth() + 1;
                      const y = prev.getFullYear();
                      setSelectedMonth(m);
                      setSelectedYear(y);
                      setIsDayWiseCustomRange(false);
                      handleApplyMonthYear(m, y);
                    }}
                    className="px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:text-[#2563eb] hover:bg-blue-50/60 rounded-md transition-all cursor-pointer"
                  >
                    Last Month
                  </button>
                </div>

                {/* Month Dropdown */}
                <select
                  value={selectedMonth}
                  onChange={(e) => {
                    const m = parseInt(e.target.value, 10);
                    setSelectedMonth(m);
                    setIsDayWiseCustomRange(false);
                    handleApplyMonthYear(m, selectedYear);
                  }}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:border-[#2563eb] shadow-2xs cursor-pointer"
                >
                  <option value={1}>January</option>
                  <option value={2}>February</option>
                  <option value={3}>March</option>
                  <option value={4}>April</option>
                  <option value={5}>May</option>
                  <option value={6}>June</option>
                  <option value={7}>July</option>
                  <option value={8}>August</option>
                  <option value={9}>September</option>
                  <option value={10}>October</option>
                  <option value={11}>November</option>
                  <option value={12}>December</option>
                </select>

                {/* Year Dropdown */}
                <select
                  value={selectedYear}
                  onChange={(e) => {
                    const y = parseInt(e.target.value, 10);
                    setSelectedYear(y);
                    setIsDayWiseCustomRange(false);
                    handleApplyMonthYear(selectedMonth, y);
                  }}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:border-[#2563eb] shadow-2xs cursor-pointer"
                >
                  {[2024, 2025, 2026, 2027].map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>

                {/* Custom Date Range Toggle */}
                <button
                  type="button"
                  onClick={() => setIsDayWiseCustomRange(!isDayWiseCustomRange)}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                    isDayWiseCustomRange
                      ? "bg-[#2563eb] text-white border-[#2563eb] shadow-xs"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 shadow-2xs"
                  }`}
                >
                  Custom Dates
                </button>
              </div>

              {isDayWiseCustomRange && (
                <div className="flex items-center gap-1.5 animate-in fade-in duration-200 w-full sm:w-auto">
                  <input
                    type="date"
                    value={dayWiseFrom}
                    onChange={(e) => setDayWiseFrom(e.target.value)}
                    className="px-2 py-1 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white shadow-2xs"
                  />
                  <span className="text-xs font-bold text-slate-400">to</span>
                  <input
                    type="date"
                    value={dayWiseTo}
                    onChange={(e) => setDayWiseTo(e.target.value)}
                    className="px-2 py-1 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white shadow-2xs"
                  />
                  <Button
                    type="button"
                    onClick={handleApplyDayWiseCustom}
                    className="h-7 px-3 text-[11px] font-bold bg-[#2563eb] text-white rounded-lg cursor-pointer shadow-xs"
                  >
                    Apply
                  </Button>
                </div>
              )}
            </div>

            {/* 5 High-Density KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 print:hidden">
              <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-100/90">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                  Total Collected
                </span>
                <span className="text-xl font-extrabold text-emerald-700 tracking-tight mt-1 block">
                  {formatCurrency(dayWiseData.grandTotalCollected || 0)}
                </span>
                <span className="text-[10px] font-semibold text-emerald-600 mt-0.5 block truncate">
                  Cash: {formatCurrency(dayWiseData.grandCashTotal || 0)} • UPI: {formatCurrency(dayWiseData.grandUpiTotal || 0)}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Total Sales Billed
                </span>
                <span className="text-xl font-extrabold text-slate-900 tracking-tight mt-1 block">
                  {formatCurrency(dayWiseData.grandTotal)}
                </span>
                <span className="text-[10px] font-semibold text-slate-400 mt-0.5 block">
                  Net Subtotal + Taxes
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-100/90">
                <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider block">
                  Invoices Issued
                </span>
                <span className="text-xl font-extrabold text-[#2563eb] tracking-tight mt-1 block">
                  {dayWiseData.totalInvoices} Invoices
                </span>
                <span className="text-[10px] font-semibold text-blue-600 mt-0.5 block">
                  Across {dayWiseData.activeDaysCount || dayWiseData.days.length} active days
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-rose-50/70 border border-rose-100/90">
                <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider block">
                  Balance Dues Pending
                </span>
                <span className="text-xl font-extrabold text-rose-600 tracking-tight mt-1 block">
                  {formatCurrency(dayWiseData.grandBalanceDue || 0)}
                </span>
                <span className="text-[10px] font-semibold text-rose-500 mt-0.5 block">
                  Outstanding on period orders
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-violet-50/70 border border-violet-100/90 col-span-2 lg:col-span-1">
                <span className="text-[10px] font-bold text-violet-800 uppercase tracking-wider block">
                  Avg Daily Inflow
                </span>
                <span className="text-xl font-extrabold text-violet-700 tracking-tight mt-1 block">
                  {formatCurrency(
                    dayWiseData.days.length > 0
                      ? (dayWiseData.grandTotalCollected || 0) / dayWiseData.days.length
                      : 0
                  )}
                </span>
                <span className="text-[10px] font-semibold text-violet-600 mt-0.5 block">
                  Per active business day
                </span>
              </div>
            </div>

            {/* Day-Wise Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-3.5 py-2.5 rounded-l-lg">Date</th>
                    <th className="px-3.5 py-2.5 text-center">Invoices</th>
                    <th className="px-3.5 py-2.5 text-right">Total Billed</th>
                    <th className="px-3.5 py-2.5 text-right font-extrabold text-emerald-700">Total Collected</th>
                    <th className="px-3.5 py-2.5 text-right">Cash</th>
                    <th className="px-3.5 py-2.5 text-right">UPI / Digital</th>
                    <th className="px-3.5 py-2.5 text-right">Card / Bank</th>
                    <th className="px-3.5 py-2.5 text-right">Balance Due</th>
                    <th className="px-3.5 py-2.5 text-right rounded-r-lg">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDayWise.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-8 text-xs font-semibold text-slate-400">
                        No day-wise collection records found for the selected period
                      </td>
                    </tr>
                  ) : (
                    filteredDayWise.map((d, idx) => {
                      const dateParts = d.date.split("-").map(Number);
                      const formattedDate = new Date(dateParts[0], (dateParts[1] || 1) - 1, dateParts[2] || 1).toLocaleDateString("en-US", {
                        weekday: "short",
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      });

                      return (
                        <tr
                          key={idx}
                          onClick={() => router.push(`/shop/reports/daily?date=${d.date}`)}
                          className="hover:bg-blue-50/60 transition-colors border-b border-slate-100 last:border-b-0 cursor-pointer group"
                        >
                          <td className="px-3.5 py-2.5 text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                            <span className="font-mono text-slate-900 group-hover:text-[#2563eb] transition-colors">{formattedDate}</span>
                          </td>
                          <td className="px-3.5 py-2.5 text-xs font-bold text-[#2563eb] text-center">
                            <span className="px-2 py-0.5 rounded-md bg-blue-50 border border-blue-100/60">
                              {d.totalInvoices}
                            </span>
                          </td>
                          <td className="px-3.5 py-2.5 text-xs font-semibold text-slate-600 text-right">
                            {formatCurrency(d.totalRevenue)}
                          </td>
                          <td className="px-3.5 py-2.5 text-xs font-extrabold text-emerald-600 text-right">
                            {formatCurrency(d.totalCollected || 0)}
                          </td>
                          <td className="px-3.5 py-2.5 text-xs font-semibold text-slate-700 text-right">
                            {formatCurrency(d.cashTotal)}
                          </td>
                          <td className="px-3.5 py-2.5 text-xs font-semibold text-[#2563eb] text-right">
                            {formatCurrency(d.upiTotal)}
                          </td>
                          <td className="px-3.5 py-2.5 text-xs font-semibold text-slate-700 text-right">
                            {formatCurrency(d.cardTotal + (d.bankTotal || 0))}
                          </td>
                          <td className="px-3.5 py-2.5 text-xs font-semibold text-rose-600 text-right">
                            {formatCurrency(d.balanceDue)}
                          </td>
                          <td className="px-3.5 py-2.5 text-right">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-[#2563eb] group-hover:bg-[#2563eb] group-hover:text-white text-[11px] font-bold transition-all shadow-2xs">
                              Day Report
                              <ArrowUpRight className="h-3 w-3" />
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 6. Special Sub-Report: Outstanding Dues & Ageing */}
        {activeSubReport === "Outstanding Dues" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 print:hidden">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Total Receivables Overdue
                </span>
                <span className="text-xl font-extrabold text-rose-600 tracking-tight mt-1 block">
                  {formatCurrency(duesData.totalOutstanding)}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  0 – 30 Days Current
                </span>
                <span className="text-xl font-extrabold text-emerald-600 tracking-tight mt-1 block">
                  {formatCurrency(duesData.total0to30)} ({duesData.count0to30})
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  31 – 60 Days Overdue
                </span>
                <span className="text-xl font-extrabold text-amber-600 tracking-tight mt-1 block">
                  {formatCurrency(duesData.total31to60)} ({duesData.count31to60})
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  60+ Days Critical
                </span>
                <span className="text-xl font-extrabold text-rose-600 tracking-tight mt-1 block">
                  {formatCurrency(duesData.total60Plus)} ({duesData.count60Plus})
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-3.5 py-2.5 rounded-l-lg">Invoice No</th>
                    <th className="px-3.5 py-2.5">Date</th>
                    <th className="px-3.5 py-2.5">Patient Name</th>
                    <th className="px-3.5 py-2.5">Phone</th>
                    <th className="px-3.5 py-2.5 text-right">Invoice Total</th>
                    <th className="px-3.5 py-2.5 text-right">Paid</th>
                    <th className="px-3.5 py-2.5 text-right">Balance Due</th>
                    <th className="px-3.5 py-2.5 text-center rounded-r-lg">Aging Bucket</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDues.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-xs font-semibold text-slate-400">
                        No outstanding receivables found — all invoices fully settled!
                      </td>
                    </tr>
                  ) : (
                    filteredDues.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100 last:border-b-0">
                        <td className="px-3.5 py-2.5 text-xs font-extrabold text-[#2563eb]">{item.invoiceNumber}</td>
                        <td className="px-3.5 py-2.5 text-xs font-semibold text-slate-500">{new Date(item.createdAt).toLocaleDateString()}</td>
                        <td className="px-3.5 py-2.5 text-xs font-bold text-slate-800">{item.customerName}</td>
                        <td className="px-3.5 py-2.5 text-xs font-semibold text-slate-600">{item.customerPhone}</td>
                        <td className="px-3.5 py-2.5 text-xs font-semibold text-slate-600 text-right">{formatCurrency(item.totalAmount)}</td>
                        <td className="px-3.5 py-2.5 text-xs font-semibold text-emerald-600 text-right">{formatCurrency(item.amountPaid)}</td>
                        <td className="px-3.5 py-2.5 text-xs font-extrabold text-rose-600 text-right">{formatCurrency(item.balanceDue)}</td>
                        <td className="px-3.5 py-2.5 text-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            item.agingBucket === "0-30"
                              ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                              : item.agingBucket === "31-60"
                              ? "bg-amber-50 text-amber-600 border-amber-100"
                              : "bg-rose-50 text-rose-600 border-rose-100"
                          }`}>
                            {item.agingBucket} ({item.ageDays}d)
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 7. Special Sub-Report: Dead Stock Audit */}
        {activeSubReport === "Dead Stock Audit" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 print:hidden">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Total Dead Stock Items
                </span>
                <span className="text-xl font-extrabold text-slate-900 tracking-tight mt-1 block">
                  {deadStockData.totalDeadItems} SKUs
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Total Unsold Units
                </span>
                <span className="text-xl font-extrabold text-[#2563eb] tracking-tight mt-1 block">
                  {deadStockData.totalDeadQuantity} Units
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Dead Capital Tied Up
                </span>
                <span className="text-xl font-extrabold text-rose-600 tracking-tight mt-1 block">
                  {formatCurrency(deadStockData.totalDeadCostValuation)}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-3.5 py-2.5 rounded-l-lg">Product Name</th>
                    <th className="px-3.5 py-2.5">Category</th>
                    <th className="px-3.5 py-2.5">Brand / SKU</th>
                    <th className="px-3.5 py-2.5 text-center">Unsold Units</th>
                    <th className="px-3.5 py-2.5 text-right">Cost Price</th>
                    <th className="px-3.5 py-2.5 text-right">Total Dead Value</th>
                    <th className="px-3.5 py-2.5 text-center rounded-r-lg">Days in Inventory</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDeadStock.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-xs font-semibold text-slate-400">
                        No dead stock items found — inventory turnover is optimal!
                      </td>
                    </tr>
                  ) : (
                    filteredDeadStock.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100 last:border-b-0">
                        <td className="px-3.5 py-2.5 text-xs font-bold text-slate-800">{item.name}</td>
                        <td className="px-3.5 py-2.5 text-xs font-semibold text-slate-500">{item.category}</td>
                        <td className="px-3.5 py-2.5 text-xs font-semibold text-slate-600">{item.brand || "—"} / {item.sku || "—"}</td>
                        <td className="px-3.5 py-2.5 text-xs font-extrabold text-slate-900 text-center">{item.quantity}</td>
                        <td className="px-3.5 py-2.5 text-xs font-semibold text-slate-600 text-right">{formatCurrency(item.costPrice)}</td>
                        <td className="px-3.5 py-2.5 text-xs font-extrabold text-rose-600 text-right">{formatCurrency(item.deadCostValuation)}</td>
                        <td className="px-3.5 py-2.5 text-center">
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-100">
                            {item.daysInStock} Days
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Default Standard Tables for other sub-reports */}
        {activeSubReport !== "Day-Wise Collection" && activeSubReport !== "Outstanding Dues" && activeSubReport !== "Dead Stock Audit" && (
          <>
            {/* Category KPIs */}
            {activeCategory === "sales" && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 print:hidden">
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

            {/* Tables */}
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
          </>
        )}
      </div>
    </div>
  );
}
