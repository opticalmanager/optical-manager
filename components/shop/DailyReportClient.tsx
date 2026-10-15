"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Download,
  Printer,
  Search,
  ChevronLeft,
  ChevronRight,
  User,
  Phone,
  Receipt,
  FileText,
  Clock,
  DollarSign,
  Wallet,
  CreditCard,
  QrCode,
  ArrowUpRight,
  Copy,
  Check,
  CheckCircle2,
  TrendingUp,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import {
  SingleDayCollectionReportData,
  SingleDayCustomerCollectionItem,
} from "@/services/report.service";

interface DailyReportClientProps {
  data: SingleDayCollectionReportData;
  shopId: string;
}

export default function DailyReportClient({ data, shopId }: DailyReportClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<
    "all" | "CASH" | "UPI" | "CARD" | "NEW_ORDERS" | "DUES"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const isToday = data.date === todayStr;

  // Date Switcher Handlers
  const handleDateChange = (newDate: string) => {
    if (!newDate) return;
    router.push(`/shop/reports/daily?date=${newDate}`);
  };

  const handlePrevDay = () => {
    const [y, m, d] = data.date.split("-").map(Number);
    const prev = new Date(y, (m || 1) - 1, (d || 1) - 1);
    const prevStr = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}-${String(
      prev.getDate()
    ).padStart(2, "0")}`;
    handleDateChange(prevStr);
  };

  const handleNextDay = () => {
    const [y, m, d] = data.date.split("-").map(Number);
    const next = new Date(y, (m || 1) - 1, (d || 1) + 1);
    const nextStr = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(
      next.getDate()
    ).padStart(2, "0")}`;
    handleDateChange(nextStr);
  };

  const handleToday = () => {
    handleDateChange(todayStr);
  };

  // Export CSV
  const handleExportCSV = () => {
    window.open(`/api/reports/export?type=daily&from=${data.date}&to=${data.date}`, "_blank");
  };

  // Copy Phone Number
  const handleCopyPhone = (phone: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(phone);
    setCopiedPhone(phone);
    setTimeout(() => setCopiedPhone(null), 1800);
  };

  // Filtered Collections
  const query = searchQuery.trim().toLowerCase();

  const filteredCollections = useMemo(() => {
    return data.collections.filter((item) => {
      // Tab filter
      if (activeTab === "CASH" && item.paymentMethod !== "CASH") return false;
      if (activeTab === "UPI" && item.paymentMethod !== "UPI") return false;
      if (
        activeTab === "CARD" &&
        item.paymentMethod !== "CARD" &&
        item.paymentMethod !== "BANK_TRANSFER"
      )
        return false;
      if (
        activeTab === "NEW_ORDERS" &&
        item.collectionType !== "FULL_PAYMENT" &&
        item.collectionType !== "ADVANCE_PAYMENT" &&
        item.collectionType !== "NEW_SALE"
      )
        return false;
      if (activeTab === "DUES" && item.collectionType !== "DUES_SETTLEMENT") return false;

      // Text query
      if (!query) return true;
      return (
        item.customerName.toLowerCase().includes(query) ||
        (item.customerPhone && item.customerPhone.includes(query)) ||
        item.invoiceNumber.toLowerCase().includes(query) ||
        (item.receiptNumber && item.receiptNumber.toLowerCase().includes(query)) ||
        (item.orderNumber && item.orderNumber.toLowerCase().includes(query)) ||
        item.itemsSummary.toLowerCase().includes(query)
      );
    });
  }, [data.collections, activeTab, query]);

  // Tab counts
  const cashCount = useMemo(
    () => data.collections.filter((c) => c.paymentMethod === "CASH").length,
    [data.collections]
  );
  const upiCount = useMemo(
    () => data.collections.filter((c) => c.paymentMethod === "UPI").length,
    [data.collections]
  );
  const cardCount = useMemo(
    () =>
      data.collections.filter(
        (c) => c.paymentMethod === "CARD" || c.paymentMethod === "BANK_TRANSFER"
      ).length,
    [data.collections]
  );
  const newOrdersCount = useMemo(
    () =>
      data.collections.filter(
        (c) =>
          c.collectionType === "FULL_PAYMENT" ||
          c.collectionType === "ADVANCE_PAYMENT" ||
          c.collectionType === "NEW_SALE"
      ).length,
    [data.collections]
  );
  const duesCount = useMemo(
    () => data.collections.filter((c) => c.collectionType === "DUES_SETTLEMENT").length,
    [data.collections]
  );

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12 print:p-0 print:space-y-3">
      {/* 1. Header Toolbar & Date Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs print:hidden">
        {/* Breadcrumb & Navigation */}
        <div className="flex items-center gap-3">
          <Link
            href="/shop/reports?preset=30d&sub=daywise"
            className="h-8.5 px-3 rounded-xl border border-slate-200 hover:border-slate-300 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 transition-all flex items-center gap-1.5 shadow-2xs"
          >
            <ArrowLeft className="h-3.5 w-3.5 text-slate-500" />
            Back to Reports
          </Link>
          <div className="h-4 w-[1px] bg-slate-200 hidden sm:block" />
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
              <span>Reports</span>
              <span>/</span>
              <span>Day-Wise Collection</span>
              <span>/</span>
              <span className="text-[#2563eb] font-bold">Daily Report</span>
            </div>
            <h1 className="text-base font-extrabold text-slate-900 tracking-tight">
              {data.formattedDate}
            </h1>
          </div>
        </div>

        {/* Date Switcher & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Date Switcher */}
          <div className="flex items-center bg-slate-50 p-1 rounded-xl border border-slate-200/80 shadow-2xs">
            <button
              type="button"
              onClick={handlePrevDay}
              title="Previous Day"
              className="h-7 w-7 rounded-lg hover:bg-white text-slate-600 hover:text-slate-900 flex items-center justify-center transition-all cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <input
              type="date"
              value={data.date}
              onChange={(e) => handleDateChange(e.target.value)}
              className="px-2 py-0.5 rounded-lg border-0 bg-transparent text-xs font-extrabold text-slate-800 focus:outline-none focus:ring-0 cursor-pointer"
            />

            <button
              type="button"
              onClick={handleNextDay}
              title="Next Day"
              className="h-7 w-7 rounded-lg hover:bg-white text-slate-600 hover:text-slate-900 flex items-center justify-center transition-all cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {!isToday && (
            <Button
              type="button"
              onClick={handleToday}
              variant="outline"
              className="h-8.5 px-3 text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl cursor-pointer"
            >
              Today
            </Button>
          )}

          <Button
            type="button"
            onClick={() => window.print()}
            variant="outline"
            className="h-8.5 px-3 text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <Printer className="h-3.5 w-3.5 text-slate-500" />
            Print EOD Slip
          </Button>

          <Button
            type="button"
            onClick={handleExportCSV}
            className="h-8.5 px-3.5 text-xs font-bold bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-xl shadow-md shadow-blue-500/20 cursor-pointer flex items-center gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Printable EOD Register Header (Only visible on Print) */}
      <div className="hidden print:block border-b border-slate-300 pb-3 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-slate-900 uppercase">
              End-of-Day Collection Register
            </h1>
            <p className="text-xs font-semibold text-slate-600">
              Date: {data.formattedDate} ({data.date})
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold text-slate-500">Optical Store Register</span>
            <p className="text-[10px] text-slate-400">
              Printed on {new Date().toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Primary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 print:grid-cols-4 print:gap-2">
        {/* Total Collected */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-sm">
          <div className="flex items-center justify-between opacity-90">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">
              Total Inflow Today
            </span>
            <Wallet className="h-4 w-4" />
          </div>
          <span className="text-2xl font-black tracking-tight mt-1.5 block">
            {formatCurrency(data.totalCollected)}
          </span>
          <span className="text-[11px] font-semibold opacity-90 mt-1 block">
            From {data.collections.length} total customer transactions
          </span>
        </div>

        {/* Cash in Drawer */}
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Cash in Hand / Drawer
            </span>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </div>
          <span className="text-2xl font-black text-slate-900 tracking-tight mt-1.5 block">
            {formatCurrency(data.cashTotal)}
          </span>
          <span className="text-[11px] font-bold text-emerald-600 mt-1 block">
            {cashCount} Cash Transactions
          </span>
        </div>

        {/* UPI & Digital */}
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              UPI & QR Digital
            </span>
            <QrCode className="h-4 w-4 text-[#2563eb]" />
          </div>
          <span className="text-2xl font-black text-[#2563eb] tracking-tight mt-1.5 block">
            {formatCurrency(data.upiTotal)}
          </span>
          <span className="text-[11px] font-bold text-[#2563eb] mt-1 block">
            {upiCount} PhonePe / GPay / QR Payments
          </span>
        </div>

        {/* Card & Bank */}
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Card & Bank POS
            </span>
            <CreditCard className="h-4 w-4 text-indigo-600" />
          </div>
          <span className="text-2xl font-black text-indigo-700 tracking-tight mt-1.5 block">
            {formatCurrency(data.cardTotal + data.bankTotal)}
          </span>
          <span className="text-[11px] font-bold text-indigo-600 mt-1 block">
            {cardCount} POS Card Swipes & NEFT
          </span>
        </div>
      </div>

      {/* 3. Secondary Metrics Strip */}
      <div className="bg-slate-50/90 border border-slate-200/80 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs print:border-slate-300">
        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-semibold">New Bills Issued:</span>
          <span className="font-extrabold text-slate-900">
            {data.totalInvoicesCount} Invoices ({formatCurrency(data.totalInvoiced)})
          </span>
        </div>

        <div className="h-3 w-[1px] bg-slate-200 hidden md:block" />

        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-semibold">Advances on New Orders:</span>
          <span className="font-extrabold text-emerald-700">
            {formatCurrency(data.advancesCollected)}
          </span>
        </div>

        <div className="h-3 w-[1px] bg-slate-200 hidden md:block" />

        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-semibold">Old Dues Recovered:</span>
          <span className="font-extrabold text-purple-700">
            {formatCurrency(data.duesSettled)}
          </span>
        </div>

        <div className="h-3 w-[1px] bg-slate-200 hidden md:block" />

        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-semibold">Uncollected Balance Due:</span>
          <span className="font-extrabold text-rose-600">
            {formatCurrency(data.totalBalanceRemaining)}
          </span>
        </div>

        <div className="h-3 w-[1px] bg-slate-200 hidden md:block" />

        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-semibold">Distinct Customers:</span>
          <span className="font-extrabold text-[#2563eb]">
            {data.uniqueCustomersCount} Patients
          </span>
        </div>
      </div>

      {/* 4. Customer Collections Ledger Table Workspace */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-4 print:border-none print:shadow-none print:p-0">
        {/* Table Controls: Filter Pills & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 print:hidden">
          {/* Quick Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "all"
                  ? "bg-[#2563eb] text-white shadow-xs"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              All Collections ({data.collections.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("CASH")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "CASH"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100/60"
              }`}
            >
              Cash ({cashCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("UPI")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "UPI"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-blue-50 text-[#2563eb] hover:bg-blue-100/60"
              }`}
            >
              UPI / QR ({upiCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("CARD")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "CARD"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100/60"
              }`}
            >
              Card ({cardCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("NEW_ORDERS")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "NEW_ORDERS"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200/60"
              }`}
            >
              New Orders ({newOrdersCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("DUES")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "DUES"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "bg-purple-50 text-purple-700 hover:bg-purple-100/60"
              }`}
            >
              Dues Settled ({duesCount})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search customer, phone, invoice, item..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#2563eb] bg-slate-50/50"
            />
          </div>
        </div>

        {/* Transactions Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="px-3.5 py-2.5 rounded-l-lg">Time</th>
                <th className="px-3.5 py-2.5">Customer Details</th>
                <th className="px-3.5 py-2.5">Invoice / Receipt</th>
                <th className="px-3.5 py-2.5">Collection Type</th>
                <th className="px-3.5 py-2.5">Items Ordered</th>
                <th className="px-3.5 py-2.5">Payment Method</th>
                <th className="px-3.5 py-2.5 text-right">Bill Total</th>
                <th className="px-3.5 py-2.5 text-right font-extrabold text-emerald-700">
                  Collected Today
                </th>
                <th className="px-3.5 py-2.5 text-right">Balance Due</th>
                <th className="px-3.5 py-2.5 text-right rounded-r-lg print:hidden">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredCollections.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="text-center py-12 text-xs font-semibold text-slate-400"
                  >
                    <div className="max-w-sm mx-auto space-y-2">
                      <AlertCircle className="h-8 w-8 text-slate-300 mx-auto" />
                      <p className="text-sm font-bold text-slate-700">
                        No collection transactions found
                      </p>
                      <p className="text-xs text-slate-400">
                        {query
                          ? `No records match "${query}". Try clearing the search query.`
                          : `There are no payments recorded for ${data.formattedDate}. Select another date using the picker above.`}
                      </p>
                      {!query && !isToday && (
                        <Button
                          type="button"
                          onClick={handleToday}
                          className="mt-2 h-7 px-3 text-xs font-bold bg-[#2563eb] text-white rounded-lg"
                        >
                          View Today's Report
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCollections.map((c, idx) => {
                  return (
                    <tr
                      key={c.id || idx}
                      className="hover:bg-slate-50/70 transition-colors border-b border-slate-100 last:border-b-0"
                    >
                      {/* Time */}
                      <td className="px-3.5 py-2.5 text-xs font-bold text-slate-500 whitespace-nowrap">
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="h-3 w-3 text-slate-400" />
                          {c.time}
                        </span>
                      </td>

                      {/* Customer Details */}
                      <td className="px-3.5 py-2.5">
                        <div className="space-y-0.5">
                          <span className="text-xs font-extrabold text-slate-900 block">
                            {c.customerName}
                          </span>
                          {c.customerPhone ? (
                            <button
                              type="button"
                              onClick={(e) => handleCopyPhone(c.customerPhone!, e)}
                              className="text-[11px] font-semibold text-slate-500 hover:text-[#2563eb] flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <Phone className="h-3 w-3 text-slate-400" />
                              <span>{c.customerPhone}</span>
                              {copiedPhone === c.customerPhone ? (
                                <Check className="h-3 w-3 text-emerald-600" />
                              ) : (
                                <Copy className="h-2.5 w-2.5 opacity-60" />
                              )}
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400">No phone</span>
                          )}
                        </div>
                      </td>

                      {/* Invoice & Receipt */}
                      <td className="px-3.5 py-2.5">
                        <div className="space-y-0.5">
                          <Link
                            href={`/shop/invoices/${c.invoiceId}`}
                            className="text-xs font-extrabold text-[#2563eb] hover:underline flex items-center gap-1"
                          >
                            <span>{c.invoiceNumber}</span>
                            <ArrowUpRight className="h-3 w-3 print:hidden" />
                          </Link>
                          {c.receiptNumber && (
                            <span className="text-[10px] font-mono text-slate-400 block">
                              Rcpt: {c.receiptNumber}
                            </span>
                          )}
                          {c.orderNumber && c.orderNumber !== c.invoiceNumber && (
                            <span className="text-[10px] font-mono text-slate-400 block">
                              Order: {c.orderNumber}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Collection Type Badge */}
                      <td className="px-3.5 py-2.5">
                        {c.collectionType === "FULL_PAYMENT" && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-[#2563eb] border border-blue-100">
                            Full Payment
                          </span>
                        )}
                        {c.collectionType === "ADVANCE_PAYMENT" && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-100">
                            Advance Booking
                          </span>
                        )}
                        {c.collectionType === "DUES_SETTLEMENT" && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-50 text-purple-700 border border-purple-100">
                            Balance Settlement
                          </span>
                        )}
                        {c.collectionType === "NEW_SALE" && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-100">
                            New Sale
                          </span>
                        )}
                      </td>

                      {/* Items Ordered */}
                      <td className="px-3.5 py-2.5 max-w-xs">
                        <p
                          className="text-xs font-semibold text-slate-700 truncate"
                          title={c.itemsSummary}
                        >
                          {c.itemsSummary}
                        </p>
                      </td>

                      {/* Payment Method */}
                      <td className="px-3.5 py-2.5">
                        <div className="space-y-0.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                              c.paymentMethod === "CASH"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                : c.paymentMethod === "UPI"
                                ? "bg-blue-50 text-[#2563eb] border border-blue-100"
                                : "bg-indigo-50 text-indigo-700 border border-indigo-100"
                            }`}
                          >
                            {c.paymentMethod === "CASH" && <DollarSign className="h-3 w-3" />}
                            {c.paymentMethod === "UPI" && <QrCode className="h-3 w-3" />}
                            {(c.paymentMethod === "CARD" ||
                              c.paymentMethod === "BANK_TRANSFER") && (
                              <CreditCard className="h-3 w-3" />
                            )}
                            {c.paymentMethod}
                          </span>
                          {c.transactionId && (
                            <span
                              className="text-[10px] font-mono text-slate-400 block truncate max-w-[120px]"
                              title={c.transactionId}
                            >
                              Txn: {c.transactionId}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Total Bill Amount */}
                      <td className="px-3.5 py-2.5 text-xs font-semibold text-slate-600 text-right whitespace-nowrap">
                        {formatCurrency(c.totalBillAmount)}
                      </td>

                      {/* Amount Collected Today */}
                      <td className="px-3.5 py-2.5 text-xs font-black text-emerald-600 text-right whitespace-nowrap">
                        {formatCurrency(c.amountCollectedToday)}
                      </td>

                      {/* Balance Due */}
                      <td className="px-3.5 py-2.5 text-xs font-bold text-right whitespace-nowrap">
                        {c.balanceRemaining > 0 ? (
                          <span className="text-rose-600">
                            {formatCurrency(c.balanceRemaining)}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-semibold">₹0.00</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="px-3.5 py-2.5 text-right print:hidden">
                        <Link
                          href={`/shop/invoices/${c.invoiceId}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-[#2563eb] text-slate-700 hover:text-white text-[11px] font-bold transition-all shadow-2xs"
                        >
                          Invoice
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {/* Table Footer with Summary */}
            {filteredCollections.length > 0 && (
              <tfoot className="bg-slate-50 border-t-2 border-slate-200 text-xs font-bold text-slate-900">
                <tr>
                  <td colSpan={6} className="px-3.5 py-2.5 text-right uppercase tracking-wider">
                    Total Displayed ({filteredCollections.length} entries):
                  </td>
                  <td className="px-3.5 py-2.5 text-right text-slate-600">
                    {formatCurrency(
                      filteredCollections.reduce((acc, c) => acc + c.totalBillAmount, 0)
                    )}
                  </td>
                  <td className="px-3.5 py-2.5 text-right text-emerald-700 font-black">
                    {formatCurrency(
                      filteredCollections.reduce((acc, c) => acc + c.amountCollectedToday, 0)
                    )}
                  </td>
                  <td className="px-3.5 py-2.5 text-right text-rose-600">
                    {formatCurrency(
                      filteredCollections.reduce((acc, c) => acc + c.balanceRemaining, 0)
                    )}
                  </td>
                  <td className="print:hidden"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
