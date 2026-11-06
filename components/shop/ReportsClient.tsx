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
  DollarSign,
  ChevronDown,
  ExternalLink,
  Copy,
  Check,
  ShieldCheck,
  FileSpreadsheet,
  Building2,
  User,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { formatIndianDate, formatDateOfSale, getLivePublicInvoiceUrl } from "@/lib/gst-utils";
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
  DeadStockReportData,
  CreditNotesReportData,
  DocumentSummaryData
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
  creditNotesData?: CreditNotesReportData;
  documentSummaryData?: DocumentSummaryData;
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
  creditNotesData,
  documentSummaryData,
  autoReportSchedule,
  initialFrom,
  initialTo,
}: ReportsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const workspaceRef = useRef<HTMLDivElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Navigation & Category states
  const [activeCategory, setActiveCategory] = useState<"item" | "sales" | "representative" | "invoices" | "misc" | "lab">("sales");
  const [activeSubReport, setActiveSubReport] = useState<string>("Summary Report");
  const [searchQuery, setSearchQuery] = useState("");
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Date Range & Period State (Matching img1)
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedYearVal, setSelectedYearVal] = useState<string>(String(now.getFullYear()));
  const [fromDate, setFromDate] = useState(initialFrom || "");
  const [toDate, setToDate] = useState(initialTo || "");
  const [isCustomRange, setIsCustomRange] = useState(false);
  const [periodPreset, setPeriodPreset] = useState<string>(() => {
    const p = searchParams.get("preset");
    if (p === "last-month") return "last-month";
    if (p === "30d" || (!initialFrom && !initialTo)) return "this-month";
    if (initialFrom && initialTo) return "custom";
    return "this-month";
  });

  // Month Names for period picker
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Close export dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setIsExportMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Detect ?sub= on mount or navigation
  useEffect(() => {
    const sub = searchParams.get("sub");
    if (sub === "daywise" || sub === "day-wise") {
      setActiveCategory("sales");
      setActiveSubReport("Day-Wise Collection");
      setTimeout(() => {
        workspaceRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 150);
    } else if (sub === "all" || sub === "invoices" || sub === "gst") {
      setActiveCategory("invoices");
      setActiveSubReport("All Invoices");
    } else if (sub === "b2b") {
      setActiveCategory("invoices");
      setActiveSubReport("B2B Invoices");
    } else if (sub === "b2c") {
      setActiveCategory("invoices");
      setActiveSubReport("B2C Invoices");
    } else if (sub === "hsn") {
      setActiveCategory("invoices");
      setActiveSubReport("HSN Summary");
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

  // Header Period Selector Handlers (Matching img1)
  const handleSelectThisMonth = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const startStr = `${y}-${String(m).padStart(2, "0")}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const endStr = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    setFromDate(startStr);
    setToDate(endStr);
    setSelectedMonth(m);
    setSelectedYearVal(String(y));
    setPeriodPreset("this-month");
    setIsCustomRange(false);

    const url = new URL(window.location.href);
    url.searchParams.set("preset", "30d");
    url.searchParams.set("from", startStr);
    url.searchParams.set("to", endStr);
    window.location.href = url.toString();
  };

  const handleSelectLastMonth = () => {
    const d = new Date();
    let y = d.getFullYear();
    let m = d.getMonth(); // 0-based: if current is Nov (10), m=10 gives Oct
    if (m === 0) {
      m = 12;
      y -= 1;
    }
    const startStr = `${y}-${String(m).padStart(2, "0")}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const endStr = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    setFromDate(startStr);
    setToDate(endStr);
    setSelectedMonth(m);
    setSelectedYearVal(String(y));
    setPeriodPreset("last-month");
    setIsCustomRange(false);

    const url = new URL(window.location.href);
    url.searchParams.set("preset", "last-month");
    url.searchParams.set("from", startStr);
    url.searchParams.set("to", endStr);
    window.location.href = url.toString();
  };

  const handleMonthChange = (mIndex: number) => {
    setSelectedMonth(mIndex);
    const y = /^\d{4}$/.test(selectedYearVal) ? parseInt(selectedYearVal, 10) : now.getFullYear();
    const startStr = `${y}-${String(mIndex).padStart(2, "0")}-01`;
    const lastDay = new Date(y, mIndex, 0).getDate();
    const endStr = `${y}-${String(mIndex).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    setFromDate(startStr);
    setToDate(endStr);
    setPeriodPreset("month-year");
    setIsCustomRange(false);

    const url = new URL(window.location.href);
    url.searchParams.set("preset", "custom");
    url.searchParams.set("from", startStr);
    url.searchParams.set("to", endStr);
    window.location.href = url.toString();
  };

  const handleYearOrFYChange = (val: string) => {
    setSelectedYearVal(val);
    setPeriodPreset("month-year");
    setIsCustomRange(false);

    if (/^\d{4}$/.test(val)) {
      const y = parseInt(val, 10);
      const startStr = `${y}-${String(selectedMonth).padStart(2, "0")}-01`;
      const lastDay = new Date(y, selectedMonth, 0).getDate();
      const endStr = `${y}-${String(selectedMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      setFromDate(startStr);
      setToDate(endStr);

      const url = new URL(window.location.href);
      url.searchParams.set("preset", "custom");
      url.searchParams.set("from", startStr);
      url.searchParams.set("to", endStr);
      window.location.href = url.toString();
    } else if (val.startsWith("FY-")) {
      const startYear = parseInt(val.split("-")[1], 10);
      const startStr = `${startYear}-04-01`;
      const endStr = `${startYear + 1}-03-31`;
      setFromDate(startStr);
      setToDate(endStr);

      const url = new URL(window.location.href);
      url.searchParams.set("preset", "custom");
      url.searchParams.set("from", startStr);
      url.searchParams.set("to", endStr);
      window.location.href = url.toString();
    } else if (val.startsWith("Q")) {
      const y = /^\d{4}$/.test(selectedYearVal) ? parseInt(selectedYearVal, 10) : now.getFullYear();
      let startM = 4, endM = 6, calcYear = y;
      if (val === "Q1") { startM = 4; endM = 6; }
      else if (val === "Q2") { startM = 7; endM = 9; }
      else if (val === "Q3") { startM = 10; endM = 12; }
      else if (val === "Q4") { startM = 1; endM = 3; calcYear = y + 1; }

      const startStr = `${calcYear}-${String(startM).padStart(2, "0")}-01`;
      const lastDay = new Date(calcYear, endM, 0).getDate();
      const endStr = `${calcYear}-${String(endM).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      setFromDate(startStr);
      setToDate(endStr);

      const url = new URL(window.location.href);
      url.searchParams.set("preset", "custom");
      url.searchParams.set("from", startStr);
      url.searchParams.set("to", endStr);
      window.location.href = url.toString();
    }
  };

  const handleApplyCustomDates = () => {
    if (!fromDate || !toDate) return;
    setPeriodPreset("custom");
    const url = new URL(window.location.href);
    url.searchParams.set("preset", "custom");
    url.searchParams.set("from", fromDate);
    url.searchParams.set("to", toDate);
    window.location.href = url.toString();
  };

  // Clipboard copy helper
  const copyToClipboard = (text: string, key: string) => {
    if (typeof window !== "undefined" && navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  // Canonical Live Public Invoice Link Resolver (Never points to localhost)
  const getPublicShareUrl = (invoiceId: string) =>
    getLivePublicInvoiceUrl(invoiceId, typeof window !== "undefined" ? window.location.origin : undefined);

  // Browser print layout
  const handlePrint = () => {
    window.print();
  };

  // Export Trigger (Supports formatted Excel .xlsx and statutory CSV)
  const handleExport = (specificType?: string, format: "csv" | "xlsx" = "xlsx") => {
    let reportType = "sales";
    if (specificType) {
      reportType = specificType;
    } else if (activeCategory === "invoices") {
      if (activeSubReport === "All Invoices" || activeSubReport === "GST Compliance") reportType = "all";
      else if (activeSubReport === "B2B Invoices") reportType = "b2b";
      else if (activeSubReport === "B2C Invoices") reportType = "b2c";
      else if (activeSubReport === "Credit / Debit Notes") reportType = "creditnotes";
      else if (activeSubReport === "HSN Summary") reportType = "hsn";
      else if (activeSubReport === "Document Summary") reportType = "docsummary";
      else reportType = "all";
    } else if (activeSubReport === "Day-Wise Collection") reportType = "daywise";
    else if (activeSubReport === "Outstanding Dues") reportType = "dues";
    else if (activeSubReport === "Dead Stock Audit") reportType = "deadstock";
    else if (activeCategory === "item") reportType = "items";
    else if (activeCategory === "sales") reportType = "sales";
    else if (activeCategory === "misc") reportType = "inventory";
    else if (activeCategory === "representative") reportType = "payments";
    else if (activeCategory === "lab") reportType = "appointments";

    let exportUrl = `/api/reports/export?type=${reportType}&format=${format}`;
    if (fromDate && toDate) {
      exportUrl += `&from=${fromDate}&to=${toDate}`;
    }
    if (shopId && shopId !== "all") {
      exportUrl += `&shopId=${shopId}`;
    }
    setIsExportMenuOpen(false);
    window.open(exportUrl, "_blank");
  };

  const handleExportCSV = (specificType?: string) => handleExport(specificType, "csv");

  // Categories & Sub-reports config (Updated with CA-Grade GST Reports)
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
      title: "GST REPORTS",
      icon: Receipt,
      items: [
        "All Invoices",
        "B2B Invoices",
        "B2C Invoices",
        "Credit / Debit Notes",
        "HSN Summary",
        "Document Summary",
        "GST Rate Slabs",
        "Receipt Type Wise",
      ],
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

  // GST Specific Filtered Memos
  const filteredAllInvoices = useMemo(() => {
    const list = gstData.allInvoices || [...(gstData.b2bInvoices || []), ...(gstData.b2cInvoices || [])];
    if (!query) return list;
    return list.filter(
      (item) =>
        item.invoiceNumber.toLowerCase().includes(query) ||
        item.customerName.toLowerCase().includes(query) ||
        (item.customerGstin && item.customerGstin.toLowerCase().includes(query)) ||
        (item.customerPhone && item.customerPhone.includes(query)) ||
        item.placeOfSupply.toLowerCase().includes(query) ||
        item.paymentMethod.toLowerCase().includes(query)
    );
  }, [gstData.allInvoices, gstData.b2bInvoices, gstData.b2cInvoices, query]);

  const filteredB2B = useMemo(() => {
    const list = gstData.b2bInvoices || [];
    if (!query) return list;
    return list.filter(
      (item) =>
        item.invoiceNumber.toLowerCase().includes(query) ||
        item.customerName.toLowerCase().includes(query) ||
        (item.customerGstin && item.customerGstin.toLowerCase().includes(query)) ||
        item.placeOfSupply.toLowerCase().includes(query) ||
        item.paymentMethod.toLowerCase().includes(query)
    );
  }, [gstData.b2bInvoices, query]);

  const filteredB2C = useMemo(() => {
    const list = gstData.b2cInvoices || [];
    if (!query) return list;
    return list.filter(
      (item) =>
        item.invoiceNumber.toLowerCase().includes(query) ||
        item.customerName.toLowerCase().includes(query) ||
        (item.customerPhone && item.customerPhone.includes(query)) ||
        item.placeOfSupply.toLowerCase().includes(query) ||
        item.paymentMethod.toLowerCase().includes(query)
    );
  }, [gstData.b2cInvoices, query]);

  const filteredCreditNotes = useMemo(() => {
    const list = creditNotesData?.notes || [];
    if (!query) return list;
    return list.filter(
      (n) =>
        n.noteNumber.toLowerCase().includes(query) ||
        n.originalInvoiceNumber.toLowerCase().includes(query) ||
        n.customerName.toLowerCase().includes(query) ||
        (n.customerGstin && n.customerGstin.toLowerCase().includes(query)) ||
        n.reason.toLowerCase().includes(query)
    );
  }, [creditNotesData?.notes, query]);

  const filteredHSN = useMemo(() => {
    const list = gstData.hsnSummary || [];
    if (!query) return list;
    return list.filter(
      (h) =>
        h.hsnCode.toLowerCase().includes(query) ||
        h.description.toLowerCase().includes(query)
    );
  }, [gstData.hsnSummary, query]);

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
    const list = paymentData.items || [];
    if (!query) return list;
    return list.filter(
      (item) =>
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
        item.customerPhone.includes(query) ||
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

      {/* 1. Page Header (Clean & Uncluttered) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs print:hidden">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <span>Analytics & Reports</span>
            {activeCategory === "invoices" && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-[#2563eb] border border-blue-200">
                GST Statutory Audit
              </span>
            )}
          </h1>
          <p className="text-xs font-semibold text-slate-400 mt-0.5">
            {activeCategory === "invoices"
              ? "CA-standard GST compliance registers, GSTR-1 & GSTR-3B audit tables, and HSN analysis."
              : "Explore store performance reports, day-wise ledgers, inventory valuation, and dues."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsScheduleModalOpen(true)}
            variant="outline"
            className="h-9 px-3.5 text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <Mail className="h-3.5 w-3.5 text-[#2563eb]" /> Schedule EOD
          </Button>

          <Button
            onClick={handlePrint}
            variant="outline"
            className="h-9 px-3.5 text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <Printer className="h-3.5 w-3.5 text-slate-500" /> Print
          </Button>
        </div>
      </div>

      {/* 2. Top Report Category Cards Grid */}
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
              <div className="p-2 space-y-1">
                {cat.items.map((subItem) => {
                  const isSelected = isActiveCategory && activeSubReport === subItem;
                  return (
                    <button
                      key={subItem}
                      type="button"
                      onClick={() => handleSelectSubReport(cat.id, subItem)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? "bg-blue-50 text-[#2563eb]"
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <span className="truncate">{subItem}</span>
                      {isSelected && <ArrowUpRight className="h-3 w-3 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {/* Footer Indicator Bar */}
              <div
                className={`h-1 w-full transition-colors ${
                  isActiveCategory ? "bg-[#2563eb]" : "bg-transparent"
                }`}
              />
            </div>
          );
        })}
      </div>

      {/* 3. Main Workspace Container */}
      <div
        ref={workspaceRef}
        className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-5"
      >
        {/* Workspace Table Header Controls */}
        <div className="space-y-3.5 border-b border-slate-100 pb-4 print:hidden">
          {/* Top Row: Breadcrumb & Search & Export Actions */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-[#2563eb] text-xs font-extrabold uppercase tracking-wide border border-blue-100">
                {activeCategory === "invoices" ? "GST COMPLIANCE" : activeCategory}
              </span>
              <span className="text-slate-300 font-bold">/</span>
              <span className="text-base font-extrabold text-slate-900">{activeSubReport}</span>
              {fromDate && toDate && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 text-xs font-semibold">
                  <Clock className="h-3 w-3 text-slate-400" />
                  <span>{formatIndianDate(fromDate)} – {formatIndianDate(toDate)}</span>
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Quick Search */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder={
                    activeCategory === "invoices"
                      ? "Search invoice, GSTIN, customer..."
                      : "Search report records..."
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2563eb] bg-slate-50/60"
                />
              </div>

              {/* Export Dropdown Menu */}
              <div className="relative" ref={exportMenuRef}>
                <div className="flex items-center shadow-xs">
                  <Button
                    onClick={() => handleExport(undefined, "xlsx")}
                    className="h-8.5 px-3 text-xs font-bold bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-l-xl cursor-pointer flex items-center gap-1.5 border-r border-blue-400/40"
                    title="Export styled Excel (.xlsx) with auto-calculated column widths"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>
                      {activeCategory === "invoices"
                        ? activeSubReport === "All Invoices"
                          ? "Export All Invoices"
                          : `Export ${activeSubReport}`
                        : "Export Excel"}
                    </span>
                  </Button>
                  <Button
                    onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                    className="h-8.5 px-2 text-xs font-bold bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-r-xl cursor-pointer"
                    aria-label="Export options"
                  >
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </div>

                {/* Dropdown Popover */}
                {isExportMenuOpen && (
                  <div className="absolute right-0 mt-1.5 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 max-h-[85vh] overflow-y-auto">
                    <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 flex items-center justify-between">
                      <span>Statutory GST Registers</span>
                      <span className="text-[9px] text-[#2563eb] font-semibold">CA Audit Grade</span>
                    </div>

                    {/* Master All Invoices (Both B2B and B2C) */}
                    <button
                      type="button"
                      onClick={() => handleExport("all", "xlsx")}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-blue-50/50 flex items-center justify-between cursor-pointer group"
                    >
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4 text-[#2563eb]" />
                        <span className="font-bold text-slate-900 group-hover:text-[#2563eb]">
                          Export All Invoices (Excel .xlsx)
                        </span>
                      </div>
                      <span className="text-[10px] bg-blue-100 text-[#2563eb] px-1.5 py-0.5 rounded font-bold">
                        Master
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExport("all", "csv")}
                      className="w-full text-left px-3 py-1 text-xs text-slate-500 hover:bg-slate-50 flex items-center gap-2 cursor-pointer pl-9"
                    >
                      <span>Export All Invoices (CSV)</span>
                    </button>

                    <div className="border-t border-slate-100 my-1"></div>

                    {/* B2B Invoices */}
                    <button
                      type="button"
                      onClick={() => handleExport("b2b", "xlsx")}
                      className="w-full text-left px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4 text-[#2563eb]" />
                        <span>Export B2B Invoices (Excel .xlsx)</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">Table 4A</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExport("b2b", "csv")}
                      className="w-full text-left px-3 py-1 text-xs text-slate-500 hover:bg-slate-50 flex items-center gap-2 cursor-pointer pl-9"
                    >
                      <span>Export B2B (CSV)</span>
                    </button>

                    {/* B2C Retail */}
                    <button
                      type="button"
                      onClick={() => handleExport("b2c", "xlsx")}
                      className="w-full text-left px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                        <span>Export B2C Retail (Excel .xlsx)</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">Table 5/7</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExport("b2c", "csv")}
                      className="w-full text-left px-3 py-1 text-xs text-slate-500 hover:bg-slate-50 flex items-center gap-2 cursor-pointer pl-9"
                    >
                      <span>Export B2C (CSV)</span>
                    </button>

                    <div className="border-t border-slate-100 my-1"></div>

                    {/* Portal Formats & Summaries */}
                    <button
                      type="button"
                      onClick={() => handleExport("gstr1", "csv")}
                      className="w-full text-left px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                    >
                      <ShieldCheck className="h-4 w-4 text-purple-600" />
                      <span>GSTR-1 Portal Format (CSV)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExport("hsn", "xlsx")}
                      className="w-full text-left px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                    >
                      <Layers className="h-4 w-4 text-amber-600" />
                      <span>Export HSN Summary (Excel .xlsx)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExport("creditnotes", "xlsx")}
                      className="w-full text-left px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                    >
                      <Receipt className="h-4 w-4 text-rose-600" />
                      <span>Export Credit Notes (Excel .xlsx)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExport("docsummary", "xlsx")}
                      className="w-full text-left px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                    >
                      <FileText className="h-4 w-4 text-indigo-600" />
                      <span>Export Document Summary (Excel .xlsx)</span>
                    </button>

                    <div className="border-t border-slate-100 my-1"></div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsExportMenuOpen(false);
                        handlePrint();
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                    >
                      <Printer className="h-4 w-4 text-slate-500" />
                      <span>Print / Save as PDF</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Row: Dedicated Horizontal Period Selector Bar (Directly on Table Header!) */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 p-2 bg-slate-50/90 border border-slate-200/80 rounded-xl shadow-2xs">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 px-1.5">
                <Calendar className="h-4 w-4 text-[#2563eb] shrink-0" />
                <span className="text-xs font-bold text-slate-700">Period:</span>
              </div>

              {/* This Month Pill */}
              <button
                type="button"
                onClick={handleSelectThisMonth}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                  periodPreset === "this-month"
                    ? "bg-white text-[#2563eb] border-[#2563eb] shadow-xs scale-[1.01]"
                    : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                }`}
              >
                This Month
              </button>

              {/* Last Month Pill */}
              <button
                type="button"
                onClick={handleSelectLastMonth}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                  periodPreset === "last-month"
                    ? "bg-white text-[#2563eb] border-[#2563eb] shadow-xs scale-[1.01]"
                    : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                }`}
              >
                Last Month
              </button>

              {/* Month Dropdown */}
              <div className="relative">
                <select
                  value={selectedMonth}
                  onChange={(e) => handleMonthChange(parseInt(e.target.value, 10))}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-800 bg-white border border-slate-200 focus:outline-none focus:border-[#2563eb] cursor-pointer shadow-2xs appearance-none pr-7"
                >
                  {monthNames.map((name, idx) => (
                    <option key={name} value={idx + 1}>
                      {name}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                  <ChevronDown className="h-3 w-3" />
                </div>
              </div>

              {/* Year / Financial Year Dropdown */}
              <div className="relative">
                <select
                  value={selectedYearVal}
                  onChange={(e) => handleYearOrFYChange(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-800 bg-white border border-slate-200 focus:outline-none focus:border-[#2563eb] cursor-pointer shadow-2xs appearance-none pr-7"
                >
                  <optgroup label="Calendar Year">
                    <option value="2024">2024</option>
                    <option value="2025">2025</option>
                    <option value="2026">2026</option>
                    <option value="2027">2027</option>
                    <option value="2028">2028</option>
                  </optgroup>
                  <optgroup label="Financial Year (CA Audit)">
                    <option value="FY-2024">FY 2024-25</option>
                    <option value="FY-2025">FY 2025-26</option>
                    <option value="FY-2026">FY 2026-27</option>
                  </optgroup>
                  <optgroup label="FY Quarters">
                    <option value="Q1">Q1 (Apr - Jun)</option>
                    <option value="Q2">Q2 (Jul - Sep)</option>
                    <option value="Q3">Q3 (Oct - Dec)</option>
                    <option value="Q4">Q4 (Jan - Mar)</option>
                  </optgroup>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                  <ChevronDown className="h-3 w-3" />
                </div>
              </div>

              {/* Custom Dates Pill */}
              <button
                type="button"
                onClick={() => setIsCustomRange(!isCustomRange)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                  isCustomRange || periodPreset === "custom"
                    ? "bg-[#2563eb] text-white border-[#2563eb] shadow-xs"
                    : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                }`}
              >
                Custom Dates
              </button>

              {/* Inline Custom Date Inputs */}
              {isCustomRange && (
                <div className="flex items-center gap-1.5 animate-in fade-in duration-200 pl-2 border-l border-slate-200">
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="px-2 py-1 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:border-[#2563eb]"
                  />
                  <span className="text-xs font-bold text-slate-400">to</span>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="px-2 py-1 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:border-[#2563eb]"
                  />
                  <Button
                    onClick={handleApplyCustomDates}
                    className="h-7 px-3 text-[11px] font-bold bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-lg cursor-pointer"
                  >
                    Apply
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 4. GST Statutory Reports Special Views */}
        {activeCategory === "invoices" && (
          <div className="space-y-4">
            {/* Data Quality Banner (Audit Integrity) */}
            {gstData.dataQuality && (gstData.dataQuality.missingHsnCount > 0 || gstData.dataQuality.invalidGstinCount > 0) && (
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl text-xs text-amber-900 print:hidden">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                  <span className="font-bold">CA Audit Notice:</span>
                  <span>
                    {gstData.dataQuality.totalInvoicesAnalyzed} invoices analyzed. Found{" "}
                    {gstData.dataQuality.missingHsnCount > 0 && (
                      <span className="font-bold underline decoration-amber-400">
                        {gstData.dataQuality.missingHsnCount} item(s) with missing HSN codes
                      </span>
                    )}
                    {gstData.dataQuality.missingHsnCount > 0 && gstData.dataQuality.invalidGstinCount > 0 && " and "}
                    {gstData.dataQuality.invalidGstinCount > 0 && (
                      <span className="font-bold underline decoration-amber-400">
                        {gstData.dataQuality.invalidGstinCount} customer(s) with invalid GSTIN format
                      </span>
                    )}
                    .
                  </span>
                </div>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                  Review Recommended
                </span>
              </div>
            )}

            {/* Sub-Report 0: All Invoices (Master GST Sales Register - B2B + B2C) */}
            {(activeSubReport === "All Invoices" || activeSubReport === "GST Compliance") && (
              <div className="space-y-4">
                {/* Master KPI Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 print:hidden">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Total Invoices
                    </span>
                    <span className="text-xl font-extrabold text-[#2563eb] tracking-tight mt-1 block">
                      {gstData.allInvoices?.length || (gstData.b2bInvoices.length + gstData.b2cInvoices.length)}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      B2B Registered
                    </span>
                    <span className="text-xl font-extrabold text-blue-600 tracking-tight mt-1 block">
                      {gstData.b2bSummary?.invoiceCount || 0}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      B2C Retail
                    </span>
                    <span className="text-xl font-extrabold text-emerald-600 tracking-tight mt-1 block">
                      {gstData.b2cSummary?.invoiceCount || 0}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Taxable Turnover
                    </span>
                    <span className="text-xl font-extrabold text-slate-900 tracking-tight mt-1 block">
                      {formatCurrency(gstData.overallSummary?.taxableValue || 0)}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Total Tax (GST)
                    </span>
                    <span className="text-xl font-extrabold text-purple-600 tracking-tight mt-1 block">
                      {formatCurrency(gstData.overallSummary?.totalTax || 0)}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Total Sales (Gross)
                    </span>
                    <span className="text-xl font-extrabold text-slate-900 tracking-tight mt-1 block">
                      {formatCurrency(gstData.overallSummary?.totalValue || 0)}
                    </span>
                  </div>
                </div>

                {/* Master Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <tr>
                        <th className="px-3.5 py-2.5 rounded-l-lg">Type</th>
                        <th className="px-3.5 py-2.5">Invoice No</th>
                        <th className="px-3.5 py-2.5">Date of Sale</th>
                        <th className="px-3.5 py-2.5">Party / Customer Name</th>
                        <th className="px-3.5 py-2.5">GSTIN / UIN</th>
                        <th className="px-3.5 py-2.5">Place of Supply</th>
                        <th className="px-3.5 py-2.5 text-right">Taxable (₹)</th>
                        <th className="px-3.5 py-2.5 text-right">CGST</th>
                        <th className="px-3.5 py-2.5 text-right">SGST</th>
                        <th className="px-3.5 py-2.5 text-right">IGST</th>
                        <th className="px-3.5 py-2.5 text-right">Total (₹)</th>
                        <th className="px-3.5 py-2.5 text-center">Payment</th>
                        <th className="px-3.5 py-2.5 text-center rounded-r-lg">Bill Link</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAllInvoices.length === 0 ? (
                        <tr>
                          <td colSpan={13} className="text-center py-8 text-xs font-semibold text-slate-400">
                            No invoices found for the selected period
                          </td>
                        </tr>
                      ) : (
                        filteredAllInvoices.map((item) => (
                          <tr key={item.invoiceId} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100 last:border-b-0">
                            <td className="px-3.5 py-2.5 text-xs">
                              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold border ${
                                item.isB2B
                                  ? "bg-blue-50 text-[#2563eb] border-blue-200"
                                  : item.isB2CLarge
                                  ? "bg-purple-50 text-purple-700 border-purple-200"
                                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
                              }`}>
                                {item.isB2B ? "B2B" : (item.isB2CLarge ? "B2C-Large" : "B2C-Small")}
                              </span>
                            </td>
                            <td className="px-3.5 py-2.5 text-xs font-extrabold text-[#2563eb]">
                              {item.invoiceNumber}
                            </td>
                            <td className="px-3.5 py-2.5 text-xs font-semibold text-slate-500 whitespace-nowrap">
                              {formatDateOfSale(item.invoiceDate)}
                            </td>
                            <td className="px-3.5 py-2.5 text-xs font-bold text-slate-800">
                              <div className="flex items-center gap-1.5">
                                {item.isB2B ? (
                                  <Building2 className="h-3 w-3 text-slate-400 shrink-0" />
                                ) : (
                                  <User className="h-3 w-3 text-slate-400 shrink-0" />
                                )}
                                <span>{item.customerName}</span>
                              </div>
                            </td>
                            <td className="px-3.5 py-2.5 text-xs">
                              {item.customerGstin ? (
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(item.customerGstin!, `gstin-${item.invoiceId}`)}
                                  className="group flex items-center gap-1 font-mono text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded hover:bg-slate-200 transition-colors cursor-pointer"
                                  title="Click to copy GSTIN"
                                >
                                  <span>{item.customerGstin}</span>
                                  {copiedKey === `gstin-${item.invoiceId}` ? (
                                    <Check className="h-3 w-3 text-emerald-600" />
                                  ) : (
                                    <Copy className="h-3 w-3 text-slate-400 group-hover:text-slate-600" />
                                  )}
                                </button>
                              ) : (
                                <span className="text-slate-400 text-[10px]">Unregistered</span>
                              )}
                            </td>
                            <td className="px-3.5 py-2.5 text-xs">
                              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold border ${
                                item.supplyType === "Inter-State"
                                  ? "bg-purple-50 text-purple-700 border-purple-200"
                                  : "bg-blue-50 text-[#2563eb] border-blue-200"
                              }`}>
                                {item.placeOfSupply}
                              </span>
                            </td>
                            <td className="px-3.5 py-2.5 text-xs font-semibold text-slate-700 text-right">
                              {formatCurrency(item.taxableValue)}
                            </td>
                            <td className="px-3.5 py-2.5 text-xs font-semibold text-slate-600 text-right">
                              {formatCurrency(item.cgstAmount)}
                            </td>
                            <td className="px-3.5 py-2.5 text-xs font-semibold text-slate-600 text-right">
                              {formatCurrency(item.sgstAmount)}
                            </td>
                            <td className="px-3.5 py-2.5 text-xs font-semibold text-purple-600 text-right">
                              {formatCurrency(item.igstAmount)}
                            </td>
                            <td className="px-3.5 py-2.5 text-xs font-extrabold text-slate-900 text-right">
                              {formatCurrency(item.invoiceValue)}
                            </td>
                            <td className="px-3.5 py-2.5 text-center">
                              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                item.paymentStatus === "PAID"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-amber-50 text-amber-700"
                              }`}>
                                {item.paymentMethod}
                              </span>
                            </td>
                            <td className="px-3.5 py-2.5 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <a
                                  href={getPublicShareUrl(item.invoiceId)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 rounded hover:bg-slate-100 text-slate-600 hover:text-[#2563eb] transition-colors"
                                  title="View Public Invoice"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                                <button
                                  type="button"
                                  onClick={() => {
                                    copyToClipboard(getPublicShareUrl(item.invoiceId), `link-${item.invoiceId}`);
                                  }}
                                  className="p-1 rounded hover:bg-slate-100 text-slate-600 hover:text-[#2563eb] transition-colors cursor-pointer"
                                  title="Copy Public Link"
                                >
                                  {copiedKey === `link-${item.invoiceId}` ? (
                                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                                  ) : (
                                    <Copy className="h-3.5 w-3.5" />
                                  )}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {filteredAllInvoices.length > 0 && (
                      <tfoot className="bg-slate-50/80 font-bold border-t border-slate-200 text-xs text-slate-900">
                        <tr>
                          <td colSpan={6} className="px-3.5 py-2.5 font-extrabold">Total ({filteredAllInvoices.length} Invoices)</td>
                          <td className="px-3.5 py-2.5 text-right font-extrabold text-slate-900">
                            {formatCurrency(filteredAllInvoices.reduce((acc, i) => acc + i.taxableValue, 0))}
                          </td>
                          <td className="px-3.5 py-2.5 text-right font-bold text-slate-700">
                            {formatCurrency(filteredAllInvoices.reduce((acc, i) => acc + i.cgstAmount, 0))}
                          </td>
                          <td className="px-3.5 py-2.5 text-right font-bold text-slate-700">
                            {formatCurrency(filteredAllInvoices.reduce((acc, i) => acc + i.sgstAmount, 0))}
                          </td>
                          <td className="px-3.5 py-2.5 text-right font-bold text-purple-700">
                            {formatCurrency(filteredAllInvoices.reduce((acc, i) => acc + i.igstAmount, 0))}
                          </td>
                          <td className="px-3.5 py-2.5 text-right font-extrabold text-[#2563eb]">
                            {formatCurrency(filteredAllInvoices.reduce((acc, i) => acc + i.invoiceValue, 0))}
                          </td>
                          <td colSpan={2}></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            )}

            {/* Sub-Report 1: B2B Invoices (GSTR-1 Table 4A) */}
            {activeSubReport === "B2B Invoices" && (
              <div className="space-y-4">
                {/* B2B KPI Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 print:hidden">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      B2B Invoices
                    </span>
                    <span className="text-xl font-extrabold text-[#2563eb] tracking-tight mt-1 block">
                      {gstData.b2bSummary?.invoiceCount || 0}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Taxable Turnover
                    </span>
                    <span className="text-xl font-extrabold text-slate-900 tracking-tight mt-1 block">
                      {formatCurrency(gstData.b2bSummary?.taxableValue || 0)}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      CGST + SGST
                    </span>
                    <span className="text-xl font-extrabold text-emerald-600 tracking-tight mt-1 block">
                      {formatCurrency((gstData.b2bSummary?.cgst || 0) + (gstData.b2bSummary?.sgst || 0))}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      IGST (Inter-State)
                    </span>
                    <span className="text-xl font-extrabold text-purple-600 tracking-tight mt-1 block">
                      {formatCurrency(gstData.b2bSummary?.igst || 0)}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Total Invoice Value
                    </span>
                    <span className="text-xl font-extrabold text-slate-900 tracking-tight mt-1 block">
                      {formatCurrency(gstData.b2bSummary?.totalValue || 0)}
                    </span>
                  </div>
                </div>

                {/* B2B Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <tr>
                        <th className="px-3.5 py-2.5 rounded-l-lg">Invoice No</th>
                        <th className="px-3.5 py-2.5">Date of Sale</th>
                        <th className="px-3.5 py-2.5">Buyer / Business</th>
                        <th className="px-3.5 py-2.5">Buyer GSTIN</th>
                        <th className="px-3.5 py-2.5">Place of Supply</th>
                        <th className="px-3.5 py-2.5 text-right">Taxable (₹)</th>
                        <th className="px-3.5 py-2.5 text-right">CGST</th>
                        <th className="px-3.5 py-2.5 text-right">SGST</th>
                        <th className="px-3.5 py-2.5 text-right">IGST</th>
                        <th className="px-3.5 py-2.5 text-right">Total (₹)</th>
                        <th className="px-3.5 py-2.5 text-center">Payment</th>
                        <th className="px-3.5 py-2.5 text-center rounded-r-lg">Bill Link</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredB2B.length === 0 ? (
                        <tr>
                          <td colSpan={12} className="text-center py-8 text-xs font-semibold text-slate-400">
                            No registered B2B invoices found for selected period
                          </td>
                        </tr>
                      ) : (
                        filteredB2B.map((item) => (
                          <tr key={item.invoiceId} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100 last:border-b-0">
                            <td className="px-3.5 py-2.5 text-xs font-extrabold text-[#2563eb]">
                              {item.invoiceNumber}
                            </td>
                            <td className="px-3.5 py-2.5 text-xs font-semibold text-slate-500 whitespace-nowrap">
                              {formatDateOfSale(item.invoiceDate)}
                            </td>
                            <td className="px-3.5 py-2.5 text-xs font-bold text-slate-800">
                              <div className="flex items-center gap-1.5">
                                <Building2 className="h-3 w-3 text-slate-400 shrink-0" />
                                <span>{item.customerName}</span>
                              </div>
                            </td>
                            <td className="px-3.5 py-2.5 text-xs">
                              {item.customerGstin ? (
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(item.customerGstin!, `gstin-${item.invoiceId}`)}
                                  className="group flex items-center gap-1 font-mono text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded hover:bg-slate-200 transition-colors cursor-pointer"
                                  title="Click to copy GSTIN"
                                >
                                  <span>{item.customerGstin}</span>
                                  {copiedKey === `gstin-${item.invoiceId}` ? (
                                    <Check className="h-3 w-3 text-emerald-600" />
                                  ) : (
                                    <Copy className="h-3 w-3 text-slate-400 group-hover:text-slate-600" />
                                  )}
                                </button>
                              ) : (
                                <span className="text-slate-400 text-[10px]">Unregistered</span>
                              )}
                            </td>
                            <td className="px-3.5 py-2.5 text-xs">
                              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold border ${
                                item.supplyType === "Inter-State"
                                  ? "bg-purple-50 text-purple-700 border-purple-200"
                                  : "bg-blue-50 text-[#2563eb] border-blue-200"
                              }`}>
                                {item.placeOfSupply}
                              </span>
                            </td>
                            <td className="px-3.5 py-2.5 text-xs font-semibold text-slate-700 text-right">
                              {formatCurrency(item.taxableValue)}
                            </td>
                            <td className="px-3.5 py-2.5 text-xs font-semibold text-slate-600 text-right">
                              {formatCurrency(item.cgstAmount)}
                            </td>
                            <td className="px-3.5 py-2.5 text-xs font-semibold text-slate-600 text-right">
                              {formatCurrency(item.sgstAmount)}
                            </td>
                            <td className="px-3.5 py-2.5 text-xs font-semibold text-purple-600 text-right">
                              {formatCurrency(item.igstAmount)}
                            </td>
                            <td className="px-3.5 py-2.5 text-xs font-extrabold text-slate-900 text-right">
                              {formatCurrency(item.invoiceValue)}
                            </td>
                            <td className="px-3.5 py-2.5 text-center">
                              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                item.paymentStatus === "PAID"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-amber-50 text-amber-700"
                              }`}>
                                {item.paymentMethod}
                              </span>
                            </td>
                            <td className="px-3.5 py-2.5 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <a
                                  href={getPublicShareUrl(item.invoiceId)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 rounded hover:bg-slate-100 text-slate-600 hover:text-[#2563eb] transition-colors"
                                  title="View Public Invoice"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                                <button
                                  type="button"
                                  onClick={() => {
                                    copyToClipboard(getPublicShareUrl(item.invoiceId), `link-${item.invoiceId}`);
                                  }}
                                  className="p-1 rounded hover:bg-slate-100 text-slate-600 hover:text-[#2563eb] transition-colors cursor-pointer"
                                  title="Copy Public Link"
                                >
                                  {copiedKey === `link-${item.invoiceId}` ? (
                                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                                  ) : (
                                    <Copy className="h-3.5 w-3.5" />
                                  )}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {filteredB2B.length > 0 && (
                      <tfoot className="bg-slate-50/80 font-bold border-t border-slate-200 text-xs text-slate-900">
                        <tr>
                          <td colSpan={5} className="px-3.5 py-2.5 font-extrabold">Total B2B ({filteredB2B.length} Invoices)</td>
                          <td className="px-3.5 py-2.5 text-right font-extrabold text-slate-900">
                            {formatCurrency(filteredB2B.reduce((acc, i) => acc + i.taxableValue, 0))}
                          </td>
                          <td className="px-3.5 py-2.5 text-right font-bold text-slate-700">
                            {formatCurrency(filteredB2B.reduce((acc, i) => acc + i.cgstAmount, 0))}
                          </td>
                          <td className="px-3.5 py-2.5 text-right font-bold text-slate-700">
                            {formatCurrency(filteredB2B.reduce((acc, i) => acc + i.sgstAmount, 0))}
                          </td>
                          <td className="px-3.5 py-2.5 text-right font-bold text-purple-700">
                            {formatCurrency(filteredB2B.reduce((acc, i) => acc + i.igstAmount, 0))}
                          </td>
                          <td className="px-3.5 py-2.5 text-right font-extrabold text-[#2563eb]">
                            {formatCurrency(filteredB2B.reduce((acc, i) => acc + i.invoiceValue, 0))}
                          </td>
                          <td colSpan={2}></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            )}

            {/* Sub-Report 2: B2C Invoices (GSTR-1 Table 7 / Table 8) */}
            {activeSubReport === "B2C Invoices" && (
              <div className="space-y-4">
                {/* B2C KPI Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 print:hidden">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Total B2C Invoices
                    </span>
                    <span className="text-xl font-extrabold text-[#2563eb] tracking-tight mt-1 block">
                      {gstData.b2cSummary?.invoiceCount || 0}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      B2C-Large (&gt; ₹2.5L)
                    </span>
                    <span className="text-xl font-extrabold text-amber-600 tracking-tight mt-1 block">
                      {gstData.b2cLargeSummary?.invoiceCount || 0}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      B2C-Small (Retail)
                    </span>
                    <span className="text-xl font-extrabold text-slate-900 tracking-tight mt-1 block">
                      {gstData.b2cSmallSummary?.invoiceCount || 0}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Total Tax Collected
                    </span>
                    <span className="text-xl font-extrabold text-emerald-600 tracking-tight mt-1 block">
                      {formatCurrency(gstData.b2cSummary?.totalTax || 0)}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Total Retail Sales
                    </span>
                    <span className="text-xl font-extrabold text-slate-900 tracking-tight mt-1 block">
                      {formatCurrency(gstData.b2cSummary?.totalValue || 0)}
                    </span>
                  </div>
                </div>

                {/* B2C Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <tr>
                        <th className="px-3.5 py-2.5 rounded-l-lg">Type</th>
                        <th className="px-3.5 py-2.5">Invoice No</th>
                        <th className="px-3.5 py-2.5">Date of Sale</th>
                        <th className="px-3.5 py-2.5">Customer Name</th>
                        <th className="px-3.5 py-2.5">Phone</th>
                        <th className="px-3.5 py-2.5">Place of Supply</th>
                        <th className="px-3.5 py-2.5 text-right">Taxable (₹)</th>
                        <th className="px-3.5 py-2.5 text-right">CGST</th>
                        <th className="px-3.5 py-2.5 text-right">SGST</th>
                        <th className="px-3.5 py-2.5 text-right">Total Amount (₹)</th>
                        <th className="px-3.5 py-2.5 text-center">Method</th>
                        <th className="px-3.5 py-2.5 text-center rounded-r-lg">Bill Link</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredB2C.length === 0 ? (
                        <tr>
                          <td colSpan={12} className="text-center py-8 text-xs font-semibold text-slate-400">
                            No retail B2C consumer invoices found for selected period
                          </td>
                        </tr>
                      ) : (
                        filteredB2C.map((item) => (
                          <tr key={item.invoiceId} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100 last:border-b-0">
                            <td className="px-3.5 py-2.5 text-xs">
                              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold border ${
                                item.isB2CLarge
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-slate-100 text-slate-600 border-slate-200"
                              }`}>
                                {item.isB2CLarge ? "B2C-Large" : "B2C-Small"}
                              </span>
                            </td>
                            <td className="px-3.5 py-2.5 text-xs font-extrabold text-[#2563eb]">
                              {item.invoiceNumber}
                            </td>
                            <td className="px-3.5 py-2.5 text-xs font-semibold text-slate-500 whitespace-nowrap">
                              {formatDateOfSale(item.invoiceDate)}
                            </td>
                            <td className="px-3.5 py-2.5 text-xs font-bold text-slate-800">
                              <div className="flex items-center gap-1.5">
                                <User className="h-3 w-3 text-slate-400 shrink-0" />
                                <span>{item.customerName}</span>
                              </div>
                            </td>
                            <td className="px-3.5 py-2.5 text-xs font-semibold text-slate-600">
                              {item.customerPhone || "—"}
                            </td>
                            <td className="px-3.5 py-2.5 text-xs">
                              <span className="text-slate-600 text-xs font-medium">
                                {item.placeOfSupply}
                              </span>
                            </td>
                            <td className="px-3.5 py-2.5 text-xs font-semibold text-slate-700 text-right">
                              {formatCurrency(item.taxableValue)}
                            </td>
                            <td className="px-3.5 py-2.5 text-xs font-semibold text-slate-600 text-right">
                              {formatCurrency(item.cgstAmount)}
                            </td>
                            <td className="px-3.5 py-2.5 text-xs font-semibold text-slate-600 text-right">
                              {formatCurrency(item.sgstAmount)}
                            </td>
                            <td className="px-3.5 py-2.5 text-xs font-extrabold text-slate-900 text-right">
                              {formatCurrency(item.invoiceValue)}
                            </td>
                            <td className="px-3.5 py-2.5 text-center">
                              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">
                                {item.paymentMethod}
                              </span>
                            </td>
                            <td className="px-3.5 py-2.5 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <a
                                  href={getPublicShareUrl(item.invoiceId)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 rounded hover:bg-slate-100 text-slate-600 hover:text-[#2563eb] transition-colors"
                                  title="View Public Invoice"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                                <button
                                  type="button"
                                  onClick={() => {
                                    copyToClipboard(getPublicShareUrl(item.invoiceId), `link-${item.invoiceId}`);
                                  }}
                                  className="p-1 rounded hover:bg-slate-100 text-slate-600 hover:text-[#2563eb] transition-colors cursor-pointer"
                                  title="Copy Public Link"
                                >
                                  {copiedKey === `link-${item.invoiceId}` ? (
                                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                                  ) : (
                                    <Copy className="h-3.5 w-3.5" />
                                  )}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {filteredB2C.length > 0 && (
                      <tfoot className="bg-slate-50/80 font-bold border-t border-slate-200 text-xs text-slate-900">
                        <tr>
                          <td colSpan={6} className="px-3.5 py-2.5 font-extrabold">Total B2C ({filteredB2C.length} Invoices)</td>
                          <td className="px-3.5 py-2.5 text-right font-extrabold text-slate-900">
                            {formatCurrency(filteredB2C.reduce((acc, i) => acc + i.taxableValue, 0))}
                          </td>
                          <td className="px-3.5 py-2.5 text-right font-bold text-slate-700">
                            {formatCurrency(filteredB2C.reduce((acc, i) => acc + i.cgstAmount, 0))}
                          </td>
                          <td className="px-3.5 py-2.5 text-right font-bold text-slate-700">
                            {formatCurrency(filteredB2C.reduce((acc, i) => acc + i.sgstAmount, 0))}
                          </td>
                          <td className="px-3.5 py-2.5 text-right font-extrabold text-[#2563eb]">
                            {formatCurrency(filteredB2C.reduce((acc, i) => acc + i.invoiceValue, 0))}
                          </td>
                          <td colSpan={2}></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            )}

            {/* Sub-Report 3: Credit / Debit Notes (GSTR-1 Table 9A/9B) */}
            {activeSubReport === "Credit / Debit Notes" && (
              <div className="space-y-4">
                {/* Credit Notes KPI Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 print:hidden">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Total Credit Notes
                    </span>
                    <span className="text-xl font-extrabold text-[#2563eb] tracking-tight mt-1 block">
                      {creditNotesData?.totalNotes || 0}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Table 9A (Registered B2B)
                    </span>
                    <span className="text-xl font-extrabold text-emerald-600 tracking-tight mt-1 block">
                      {creditNotesData?.registeredCount || 0}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Table 9B (Unregistered B2C)
                    </span>
                    <span className="text-xl font-extrabold text-slate-900 tracking-tight mt-1 block">
                      {creditNotesData?.unregisteredCount || 0}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Total Refund Valuation
                    </span>
                    <span className="text-xl font-extrabold text-rose-600 tracking-tight mt-1 block">
                      {formatCurrency(creditNotesData?.totalRefundValue || 0)}
                    </span>
                  </div>
                </div>

                {/* Credit Notes Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <tr>
                        <th className="px-3.5 py-2.5 rounded-l-lg">Credit Note No</th>
                        <th className="px-3.5 py-2.5">Date</th>
                        <th className="px-3.5 py-2.5">Original Invoice</th>
                        <th className="px-3.5 py-2.5">Customer Name</th>
                        <th className="px-3.5 py-2.5">GSTIN</th>
                        <th className="px-3.5 py-2.5">Statutory Group</th>
                        <th className="px-3.5 py-2.5">Return Reason</th>
                        <th className="px-3.5 py-2.5 text-right">Refund Amount</th>
                        <th className="px-3.5 py-2.5 text-center rounded-r-lg">Refund Mode</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCreditNotes.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="text-center py-8 text-xs font-semibold text-slate-400">
                            No credit / debit notes issued for returns in selected period
                          </td>
                        </tr>
                      ) : (
                        filteredCreditNotes.map((note, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100 last:border-b-0">
                            <td className="px-3.5 py-2.5 text-xs font-extrabold text-rose-600">
                              {note.noteNumber}
                            </td>
                            <td className="px-3.5 py-2.5 text-xs font-semibold text-slate-500 whitespace-nowrap">
                              {formatDateOfSale(note.noteDate)}
                            </td>
                            <td className="px-3.5 py-2.5 text-xs font-bold text-[#2563eb]">
                              {note.originalInvoiceNumber}
                            </td>
                            <td className="px-3.5 py-2.5 text-xs font-bold text-slate-800">
                              {note.customerName}
                            </td>
                            <td className="px-3.5 py-2.5 text-xs font-mono">
                              {note.customerGstin || <span className="text-slate-400">URP</span>}
                            </td>
                            <td className="px-3.5 py-2.5 text-xs">
                              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold border ${
                                note.isRegistered
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-slate-100 text-slate-700 border-slate-200"
                              }`}>
                                {note.isRegistered ? "Table 9A (B2B)" : "Table 9B (B2C)"}
                              </span>
                            </td>
                            <td className="px-3.5 py-2.5 text-xs font-semibold text-slate-600">
                              {note.reason}
                            </td>
                            <td className="px-3.5 py-2.5 text-xs font-extrabold text-rose-600 text-right">
                              {formatCurrency(note.noteValue)}
                            </td>
                            <td className="px-3.5 py-2.5 text-center">
                              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">
                                {note.refundMethod}
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

            {/* Sub-Report 4: HSN / SAC Summary (GSTR-1 Table 12) */}
            {activeSubReport === "HSN Summary" && (
              <div className="space-y-4">
                {/* HSN Summary Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <tr>
                        <th className="px-3.5 py-2.5 rounded-l-lg">HSN Code</th>
                        <th className="px-3.5 py-2.5">Commodity Description</th>
                        <th className="px-3.5 py-2.5 text-center">UQC</th>
                        <th className="px-3.5 py-2.5 text-center">Units Sold</th>
                        <th className="px-3.5 py-2.5 text-right">Taxable Value (₹)</th>
                        <th className="px-3.5 py-2.5 text-right">CGST (₹)</th>
                        <th className="px-3.5 py-2.5 text-right">SGST (₹)</th>
                        <th className="px-3.5 py-2.5 text-right">IGST (₹)</th>
                        <th className="px-3.5 py-2.5 text-right">Total Tax (₹)</th>
                        <th className="px-3.5 py-2.5 text-right rounded-r-lg">Total Turnover (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredHSN.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="text-center py-8 text-xs font-semibold text-slate-400">
                            No HSN records found for selected period
                          </td>
                        </tr>
                      ) : (
                        filteredHSN.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100 last:border-b-0">
                            <td className="px-3.5 py-2.5 text-xs font-mono font-bold text-[#2563eb]">
                              {item.hsnCode}
                            </td>
                            <td className="px-3.5 py-2.5 text-xs font-semibold text-slate-800">
                              {item.description}
                            </td>
                            <td className="px-3.5 py-2.5 text-xs font-bold text-slate-500 text-center">
                              {item.uqc}
                            </td>
                            <td className="px-3.5 py-2.5 text-xs font-extrabold text-slate-900 text-center">
                              {item.totalQuantity}
                            </td>
                            <td className="px-3.5 py-2.5 text-xs font-semibold text-slate-700 text-right">
                              {formatCurrency(item.taxableValue)}
                            </td>
                            <td className="px-3.5 py-2.5 text-xs font-semibold text-slate-600 text-right">
                              {formatCurrency(item.cgst)}
                            </td>
                            <td className="px-3.5 py-2.5 text-xs font-semibold text-slate-600 text-right">
                              {formatCurrency(item.sgst)}
                            </td>
                            <td className="px-3.5 py-2.5 text-xs font-semibold text-purple-600 text-right">
                              {formatCurrency(item.igst)}
                            </td>
                            <td className="px-3.5 py-2.5 text-xs font-extrabold text-emerald-600 text-right">
                              {formatCurrency(item.totalTax)}
                            </td>
                            <td className="px-3.5 py-2.5 text-xs font-extrabold text-slate-900 text-right">
                              {formatCurrency(item.totalValue)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {filteredHSN.length > 0 && (
                      <tfoot className="bg-slate-50/80 font-bold border-t border-slate-200 text-xs text-slate-900">
                        <tr>
                          <td colSpan={3} className="px-3.5 py-2.5 font-extrabold">HSN Grand Total</td>
                          <td className="px-3.5 py-2.5 text-center font-extrabold">
                            {filteredHSN.reduce((acc, h) => acc + h.totalQuantity, 0)}
                          </td>
                          <td className="px-3.5 py-2.5 text-right font-extrabold">
                            {formatCurrency(filteredHSN.reduce((acc, h) => acc + h.taxableValue, 0))}
                          </td>
                          <td className="px-3.5 py-2.5 text-right font-bold text-slate-700">
                            {formatCurrency(filteredHSN.reduce((acc, h) => acc + h.cgst, 0))}
                          </td>
                          <td className="px-3.5 py-2.5 text-right font-bold text-slate-700">
                            {formatCurrency(filteredHSN.reduce((acc, h) => acc + h.sgst, 0))}
                          </td>
                          <td className="px-3.5 py-2.5 text-right font-bold text-purple-700">
                            {formatCurrency(filteredHSN.reduce((acc, h) => acc + h.igst, 0))}
                          </td>
                          <td className="px-3.5 py-2.5 text-right font-extrabold text-emerald-600">
                            {formatCurrency(filteredHSN.reduce((acc, h) => acc + h.totalTax, 0))}
                          </td>
                          <td className="px-3.5 py-2.5 text-right font-extrabold text-[#2563eb]">
                            {formatCurrency(filteredHSN.reduce((acc, h) => acc + h.totalValue, 0))}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            )}

            {/* Sub-Report 5: Document Summary (GSTR-1 Table 13) */}
            {activeSubReport === "Document Summary" && (
              <div className="space-y-4">
                {/* Continuity Audit Banner */}
                {documentSummaryData?.hasGaps ? (
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between text-xs text-amber-900">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                      <span className="font-bold">Missing Sequence Detected:</span>
                      <span>Some invoice serial numbers have numerical gaps. Review missing numbers below.</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-amber-200 text-amber-900 font-extrabold text-[10px]">
                      Gaps Present
                    </span>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-emerald-900">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span className="font-bold">Continuous Sequence Verified:</span>
                      <span>All invoices and credit notes in this period form an unbroken serial sequence.</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-emerald-200 text-emerald-900 font-extrabold text-[10px]">
                      100% Continuous
                    </span>
                  </div>
                )}

                {/* Table 13 Documents List */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <tr>
                        <th className="px-3.5 py-2.5 rounded-l-lg">Nature of Document</th>
                        <th className="px-3.5 py-2.5">Sr. No. From</th>
                        <th className="px-3.5 py-2.5">Sr. No. To</th>
                        <th className="px-3.5 py-2.5 text-center">Total Number</th>
                        <th className="px-3.5 py-2.5 text-center">Cancelled</th>
                        <th className="px-3.5 py-2.5 text-center">Net Issued</th>
                        <th className="px-3.5 py-2.5 rounded-r-lg">Sequence Continuity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(documentSummaryData?.rows || []).length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center py-8 text-xs font-semibold text-slate-400">
                            No documents issued in selected period
                          </td>
                        </tr>
                      ) : (
                        documentSummaryData?.rows.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100 last:border-b-0">
                            <td className="px-3.5 py-2.5 text-xs font-bold text-slate-800">
                              {row.documentType}
                            </td>
                            <td className="px-3.5 py-2.5 text-xs font-mono font-bold text-[#2563eb]">
                              {row.serialFrom}
                            </td>
                            <td className="px-3.5 py-2.5 text-xs font-mono font-bold text-[#2563eb]">
                              {row.serialTo}
                            </td>
                            <td className="px-3.5 py-2.5 text-xs font-bold text-slate-900 text-center">
                              {row.totalNumber}
                            </td>
                            <td className="px-3.5 py-2.5 text-xs font-semibold text-rose-600 text-center">
                              {row.cancelled}
                            </td>
                            <td className="px-3.5 py-2.5 text-xs font-extrabold text-emerald-600 text-center">
                              {row.netIssued}
                            </td>
                            <td className="px-3.5 py-2.5 text-xs">
                              {row.missingNumbers && row.missingNumbers.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {row.missingNumbers.map((m, mIdx) => (
                                    <span key={mIdx} className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 text-[10px] font-bold border border-rose-200">
                                      {m}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-emerald-700 text-xs font-bold flex items-center gap-1">
                                  <Check className="h-3 w-3" /> Continuous Sequence
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Sub-Report 6: GST Rate Slab Summary */}
            {activeSubReport === "GST Rate Slabs" && (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <tr>
                        <th className="px-3.5 py-2.5 rounded-l-lg">Tax Rate Slab</th>
                        <th className="px-3.5 py-2.5 text-right">Taxable Turnover (₹)</th>
                        <th className="px-3.5 py-2.5 text-right">Central Tax (CGST)</th>
                        <th className="px-3.5 py-2.5 text-right">State Tax (SGST)</th>
                        <th className="px-3.5 py-2.5 text-right">Integrated Tax (IGST)</th>
                        <th className="px-3.5 py-2.5 text-right rounded-r-lg">Total Tax Collected</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(gstData.rateSummary || []).length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-8 text-xs font-semibold text-slate-400">
                            No tax rate slab data for selected period
                          </td>
                        </tr>
                      ) : (
                        gstData.rateSummary.map((slab, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100 last:border-b-0">
                            <td className="px-3.5 py-2.5 text-xs font-extrabold text-[#2563eb]">
                              <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-[#2563eb] border border-blue-200">
                                {slab.rate}% GST Slab
                              </span>
                            </td>
                            <td className="px-3.5 py-2.5 text-xs font-extrabold text-slate-900 text-right">
                              {formatCurrency(slab.taxableValue)}
                            </td>
                            <td className="px-3.5 py-2.5 text-xs font-semibold text-slate-700 text-right">
                              {formatCurrency(slab.cgst)}
                            </td>
                            <td className="px-3.5 py-2.5 text-xs font-semibold text-slate-700 text-right">
                              {formatCurrency(slab.sgst)}
                            </td>
                            <td className="px-3.5 py-2.5 text-xs font-semibold text-purple-600 text-right">
                              {formatCurrency(slab.igst)}
                            </td>
                            <td className="px-3.5 py-2.5 text-xs font-extrabold text-emerald-600 text-right">
                              {formatCurrency(slab.totalTax)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Sub-Report 7: Receipt Type Wise (Payment Method Breakdown) */}
            {activeSubReport === "Receipt Type Wise" && (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <tr>
                        <th className="px-3.5 py-2.5 rounded-l-lg">Payment Settlement Mode</th>
                        <th className="px-3.5 py-2.5 text-right">Receipts Count</th>
                        <th className="px-3.5 py-2.5 text-right rounded-r-lg">Total Amount Collected</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(paymentData.items || []).length === 0 ? (
                        <tr>
                          <td colSpan={3} className="text-center py-8 text-xs font-semibold text-slate-400">
                            No receipts found for selected period
                          </td>
                        </tr>
                      ) : (
                        ["CASH", "UPI", "CARD", "BANK_TRANSFER"].map((method) => {
                          const matching = (paymentData.items || []).filter((p) => p.paymentMethod === method);
                          const total = matching.reduce((acc, p) => acc + p.amountPaid, 0);
                          return (
                            <tr key={method} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100 last:border-b-0">
                              <td className="px-3.5 py-2.5 text-xs font-extrabold text-slate-800">
                                <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-mono text-xs">
                                  {method}
                                </span>
                              </td>
                              <td className="px-3.5 py-2.5 text-xs font-bold text-[#2563eb] text-right">
                                {matching.length} Transactions
                              </td>
                              <td className="px-3.5 py-2.5 text-xs font-extrabold text-emerald-600 text-right">
                                {formatCurrency(total)}
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
          </div>
        )}

        {/* 5. Special Sub-Report: Day-Wise Collection Ledger */}
        {activeSubReport === "Day-Wise Collection" && (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-3.5 py-2.5 rounded-l-lg">Date</th>
                    <th className="px-3.5 py-2.5 text-center">Invoices</th>
                    <th className="px-3.5 py-2.5 text-right">Subtotal</th>
                    <th className="px-3.5 py-2.5 text-right">Tax Collected</th>
                    <th className="px-3.5 py-2.5 text-right">Total Revenue</th>
                    <th className="px-3.5 py-2.5 text-right">Amount Collected</th>
                    <th className="px-3.5 py-2.5 text-right">Cash</th>
                    <th className="px-3.5 py-2.5 text-right">UPI</th>
                    <th className="px-3.5 py-2.5 text-right">Card</th>
                    <th className="px-3.5 py-2.5 text-right rounded-r-lg">Balance Due</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDayWise.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-8 text-xs font-semibold text-slate-400">
                        No day-wise collection records found
                      </td>
                    </tr>
                  ) : (
                    filteredDayWise.map((day) => (
                      <tr key={day.date} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100 last:border-b-0">
                        <td className="px-3.5 py-2.5 text-xs font-bold text-slate-800">{day.date}</td>
                        <td className="px-3.5 py-2.5 text-xs font-extrabold text-[#2563eb] text-center">{day.totalInvoices}</td>
                        <td className="px-3.5 py-2.5 text-xs font-semibold text-slate-600 text-right">{formatCurrency(day.subtotal)}</td>
                        <td className="px-3.5 py-2.5 text-xs font-semibold text-slate-600 text-right">{formatCurrency(day.tax)}</td>
                        <td className="px-3.5 py-2.5 text-xs font-extrabold text-slate-900 text-right">{formatCurrency(day.totalRevenue)}</td>
                        <td className="px-3.5 py-2.5 text-xs font-extrabold text-emerald-600 text-right">{formatCurrency(day.totalCollected)}</td>
                        <td className="px-3.5 py-2.5 text-xs font-semibold text-slate-600 text-right">{formatCurrency(day.cashTotal)}</td>
                        <td className="px-3.5 py-2.5 text-xs font-semibold text-purple-600 text-right">{formatCurrency(day.upiTotal)}</td>
                        <td className="px-3.5 py-2.5 text-xs font-semibold text-blue-600 text-right">{formatCurrency(day.cardTotal)}</td>
                        <td className="px-3.5 py-2.5 text-xs font-bold text-rose-600 text-right">{formatCurrency(day.balanceDue)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 6. Special Sub-Report: Outstanding Dues */}
        {activeSubReport === "Outstanding Dues" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 print:hidden">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Total Outstanding
                </span>
                <span className="text-xl font-extrabold text-rose-600 tracking-tight mt-1 block">
                  {formatCurrency(duesData.totalOutstanding)}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  0-30 Days Due
                </span>
                <span className="text-xl font-extrabold text-emerald-600 tracking-tight mt-1 block">
                  {formatCurrency(duesData.total0to30)}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  31-60 Days Overdue
                </span>
                <span className="text-xl font-extrabold text-amber-600 tracking-tight mt-1 block">
                  {formatCurrency(duesData.total31to60)}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  60+ Days Delinquent
                </span>
                <span className="text-xl font-extrabold text-rose-600 tracking-tight mt-1 block">
                  {formatCurrency(duesData.total60Plus)}
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

        {/* 8. Default Standard Tables for other non-special sub-reports */}
        {activeCategory !== "invoices" && activeSubReport !== "Day-Wise Collection" && activeSubReport !== "Outstanding Dues" && activeSubReport !== "Dead Stock Audit" && (
          <>
            {/* Sales KPIs */}
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

            {/* Standard Category Tables */}
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
