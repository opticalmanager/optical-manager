"use client";

import { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Package,
  IndianRupee,
  CalendarDays,
  Building2,
  Search,
  Filter,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowRight,
  Eye,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getPurchaseLedgerAction } from "@/actions/purchase.actions";
import type { PurchaseOrderWithVendor } from "@/services/purchase.service";

interface VendorOption {
  id: string;
  name: string;
  gstin?: string | null;
}

interface PurchaseLedgerKPIs {
  totalPurchases: number;
  totalAmount: number;
  thisMonthPurchases: number;
  topVendorName: string | null;
}

interface PurchaseLedgerClientProps {
  initialOrders: PurchaseOrderWithVendor[];
  initialTotalCount: number;
  kpis: PurchaseLedgerKPIs;
  vendors: VendorOption[];
  shopId: string;
}

const PAGE_SIZE = 20;

export function PurchaseLedgerClient({
  initialOrders,
  initialTotalCount,
  kpis,
  vendors,
  shopId,
}: PurchaseLedgerClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Filter & Search states
  const [orders, setOrders] = useState<PurchaseOrderWithVendor[]>(initialOrders);
  const [totalCount, setTotalCount] = useState<number>(initialTotalCount);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const [selectedVendor, setSelectedVendor] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedGstType, setSelectedGstType] = useState<string>("ALL");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // KPI Active Selection filter state
  const [activeKpiFilter, setActiveKpiFilter] = useState<"ALL" | "THIS_MONTH" | "TOP_VENDOR">("ALL");

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // Fetch data with current filters
  const applyFilters = (
    overrides?: {
      page?: number;
      vendorId?: string;
      status?: string;
      taxRule?: string;
      from?: string;
      to?: string;
      search?: string;
      kpiFilter?: "ALL" | "THIS_MONTH" | "TOP_VENDOR";
    }
  ) => {
    const targetPage = overrides?.page ?? 1;
    const vendor = overrides?.vendorId !== undefined ? overrides.vendorId : selectedVendor;
    const status = overrides?.status !== undefined ? overrides.status : selectedStatus;
    const taxRule = overrides?.taxRule !== undefined ? overrides.taxRule : selectedGstType;
    let from = overrides?.from !== undefined ? overrides.from : dateFrom;
    const to = overrides?.to !== undefined ? overrides.to : dateTo;
    const search = overrides?.search !== undefined ? overrides.search : searchQuery;
    const kpiFilter = overrides?.kpiFilter !== undefined ? overrides.kpiFilter : activeKpiFilter;

    // Handle quick KPI filter clicks
    let computedVendorId = vendor;
    if (kpiFilter === "TOP_VENDOR" && kpis.topVendorName) {
      const topV = vendors.find(
        (v) => v.name.toLowerCase() === kpis.topVendorName?.toLowerCase()
      );
      if (topV) computedVendorId = topV.id;
    } else if (kpiFilter === "THIS_MONTH") {
      const now = new Date();
      from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    }

    startTransition(async () => {
      const res = await getPurchaseLedgerAction({
        limit: PAGE_SIZE,
        offset: (targetPage - 1) * PAGE_SIZE,
        vendorId: computedVendorId !== "ALL" ? computedVendorId : undefined,
        status: status !== "ALL" ? (status as any) : undefined,
        taxRule: taxRule !== "ALL" ? (taxRule as any) : undefined,
        dateFrom: from || undefined,
        dateTo: to || undefined,
        search: search.trim() || undefined,
      });

      if (res.success) {
        setOrders(res.orders);
        setTotalCount(res.totalCount);
        setCurrentPage(targetPage);
      }
    });
  };

  const handleResetFilters = () => {
    setSelectedVendor("ALL");
    setSelectedStatus("ALL");
    setSelectedGstType("ALL");
    setDateFrom("");
    setDateTo("");
    setSearchQuery("");
    setActiveKpiFilter("ALL");
    startTransition(async () => {
      const res = await getPurchaseLedgerAction({
        limit: PAGE_SIZE,
        offset: 0,
      });
      if (res.success) {
        setOrders(res.orders);
        setTotalCount(res.totalCount);
        setCurrentPage(1);
      }
    });
  };

  const handleKpiCardClick = (type: "ALL" | "THIS_MONTH" | "TOP_VENDOR") => {
    if (activeKpiFilter === type) {
      setActiveKpiFilter("ALL");
      applyFilters({ kpiFilter: "ALL", from: "", vendorId: "ALL", page: 1 });
    } else {
      setActiveKpiFilter(type);
      applyFilters({ kpiFilter: type, page: 1 });
    }
  };

  // Helper date formatter
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    try {
      const date = new Date(dateStr);
      return new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(date);
    } catch {
      return dateStr;
    }
  };

  // Helper currency formatter
  const formatINR = (val: string | number | null | undefined) => {
    const num = Number(val) || 0;
    return `₹${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-4 pb-12 select-none text-slate-800 max-w-[1400px] mx-auto animate-in fade-in duration-200">
      {/* ─── Top Page Header ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Purchase Ledger
            </h1>
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-blue-50 text-[#2563eb] border border-blue-100">
              {totalCount} Invoices
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-400 mt-0.5">
            Complete inward supplier ledger, tax invoices, purchase valuation, and stock inwarding.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/shop/purchases/vendors"
            className="h-9 px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-all flex items-center gap-2 shadow-2xs"
          >
            <Building2 className="h-4 w-4 text-slate-500" />
            <span>Vendors</span>
          </Link>
          <Link
            href="/shop/purchases/new"
            className="h-9 px-4 rounded-xl bg-[#2563eb] hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all flex items-center gap-2"
          >
            <PlusCircle className="h-4 w-4" />
            <span>+ New Purchase</span>
          </Link>
        </div>
      </div>

      {/* ─── Interactive KPI Cards ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* KPI 1: Total Purchases */}
        <div
          onClick={() => handleKpiCardClick("ALL")}
          className={cn(
            "p-3.5 rounded-xl border bg-white cursor-pointer transition-all duration-150 relative overflow-hidden",
            activeKpiFilter === "ALL"
              ? "border-2 border-[#2563eb] shadow-md scale-[1.01]"
              : "border-slate-200 hover:border-blue-300 hover:shadow-xs hover:scale-[1.005]"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Total Purchases</span>
            <div className="h-8 w-8 rounded-lg bg-blue-50 text-[#2563eb] flex items-center justify-center">
              <Package className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1 tracking-tight">
            {kpis.totalPurchases.toLocaleString("en-IN")}
          </div>
          <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
            All-time inward purchase bills
          </p>
        </div>

        {/* KPI 2: Total Net Purchase Value */}
        <div
          className="p-3.5 rounded-xl border border-slate-200 bg-white transition-all duration-150 relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Net Valuation</span>
            <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <IndianRupee className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1 tracking-tight">
            ₹{Math.round(kpis.totalAmount).toLocaleString("en-IN")}
          </div>
          <p className="text-[11px] font-semibold text-emerald-600 font-bold mt-0.5">
            Total inward supply value
          </p>
        </div>

        {/* KPI 3: This Month Purchases */}
        <div
          onClick={() => handleKpiCardClick("THIS_MONTH")}
          className={cn(
            "p-3.5 rounded-xl border bg-white cursor-pointer transition-all duration-150 relative overflow-hidden",
            activeKpiFilter === "THIS_MONTH"
              ? "border-2 border-[#2563eb] shadow-md scale-[1.01]"
              : "border-slate-200 hover:border-blue-300 hover:shadow-xs hover:scale-[1.005]"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">This Month</span>
            <div className="h-8 w-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <CalendarDays className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1 tracking-tight">
            {kpis.thisMonthPurchases.toLocaleString("en-IN")}
          </div>
          <p className="text-[11px] font-semibold text-purple-600 mt-0.5">
            {new Intl.DateTimeFormat("en-IN", { month: "long" }).format(new Date())} inwarding
          </p>
        </div>

        {/* KPI 4: Top Supplier */}
        <div
          onClick={() => handleKpiCardClick("TOP_VENDOR")}
          className={cn(
            "p-3.5 rounded-xl border bg-white cursor-pointer transition-all duration-150 relative overflow-hidden",
            activeKpiFilter === "TOP_VENDOR"
              ? "border-2 border-[#2563eb] shadow-md scale-[1.01]"
              : "border-slate-200 hover:border-blue-300 hover:shadow-xs hover:scale-[1.005]"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Top Supplier</span>
            <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Building2 className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl font-extrabold text-slate-900 mt-1 tracking-tight truncate" title={kpis.topVendorName || "None"}>
            {kpis.topVendorName || "None"}
          </div>
          <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
            Most frequent inward vendor
          </p>
        </div>
      </div>

      {/* ─── Compact Filter Bar ─────────────────────────────────────────── */}
      <Card className="p-3 border border-slate-200/80 bg-white rounded-xl shadow-2xs space-y-2.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {/* 1. Search Query */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search bill # / vendor..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                applyFilters({ search: e.target.value, page: 1 });
              }}
              className="w-full h-8.5 pl-8 pr-2.5 rounded-lg border border-slate-200 bg-slate-50/50 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-[#2563eb] focus:bg-white transition-all"
            />
          </div>

          {/* 2. Vendor Dropdown */}
          <div>
            <select
              value={selectedVendor}
              onChange={(e) => {
                setSelectedVendor(e.target.value);
                applyFilters({ vendorId: e.target.value, page: 1 });
              }}
              className="w-full h-8.5 px-2.5 rounded-lg border border-slate-200 bg-slate-50/50 text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-[#2563eb] focus:bg-white transition-all"
            >
              <option value="ALL">All Vendors</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>

          {/* 3. GST Type Filter */}
          <div>
            <select
              value={selectedGstType}
              onChange={(e) => {
                setSelectedGstType(e.target.value);
                applyFilters({ taxRule: e.target.value, page: 1 });
              }}
              className="w-full h-8.5 px-2.5 rounded-lg border border-slate-200 bg-slate-50/50 text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-[#2563eb] focus:bg-white transition-all"
            >
              <option value="ALL">All GST Types</option>
              <option value="EXCLUDE">GST Exclusive</option>
              <option value="INCLUDE">GST Inclusive</option>
            </select>
          </div>

          {/* 4. Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                applyFilters({ status: e.target.value, page: 1 });
              }}
              className="w-full h-8.5 px-2.5 rounded-lg border border-slate-200 bg-slate-50/50 text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-[#2563eb] focus:bg-white transition-all"
            >
              <option value="ALL">All Statuses</option>
              <option value="COMPLETED">Completed</option>
              <option value="DRAFT">Draft</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {/* 5. Date From */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 shrink-0">From:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                applyFilters({ from: e.target.value, page: 1 });
              }}
              className="w-full h-8.5 px-2 rounded-lg border border-slate-200 bg-slate-50/50 text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-[#2563eb] focus:bg-white transition-all"
            />
          </div>

          {/* 6. Date To + Reset */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 shrink-0">To:</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                applyFilters({ to: e.target.value, page: 1 });
              }}
              className="w-full h-8.5 px-2 rounded-lg border border-slate-200 bg-slate-50/50 text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-[#2563eb] focus:bg-white transition-all"
            />
            <button
              onClick={handleResetFilters}
              title="Reset Filters"
              className="h-8.5 px-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 transition-colors shrink-0 flex items-center justify-center cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </Card>

      {/* ─── High-Density Purchase Transactions Table ───────────────────── */}
      <div className="border border-slate-200/80 rounded-xl bg-white shadow-2xs overflow-hidden">
        <div className="w-full">
          <table className="w-full text-left border-collapse table-auto">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] sm:text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-2.5 px-2 text-center w-8">#</th>
                <th className="py-2.5 px-2.5 w-24">Date</th>
                <th className="py-2.5 px-2.5 w-28">Invoice #</th>
                <th className="py-2.5 px-2.5">Vendor</th>
                <th className="py-2.5 px-2 text-center w-16">Items</th>
                <th className="py-2.5 px-2 text-center w-16">GST</th>
                <th className="py-2.5 px-2.5 text-right w-28">Amount (₹)</th>
                <th className="py-2.5 px-2.5 text-center w-28">Status</th>
                <th className="py-2.5 px-2 text-center w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
              {isPending ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="inline-flex items-center gap-2">
                      <div className="h-4 w-4 border-2 border-[#2563eb] border-t-transparent rounded-full animate-spin" />
                      <span>Loading purchase ledger...</span>
                    </div>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FileText className="h-8 w-8 text-slate-300 stroke-[1.5]" />
                      <p className="text-sm font-bold text-slate-700">No purchase records found</p>
                      <p className="text-xs text-slate-400 max-w-sm">
                        No inward purchase transactions match your current search and filter criteria.
                      </p>
                      <Link
                        href="/shop/purchases/new"
                        className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#2563eb] text-white text-xs font-bold hover:bg-blue-700 transition-colors shadow-xs"
                      >
                        <PlusCircle className="h-3.5 w-3.5" />
                        <span>Record Inward Supply</span>
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                orders.map((po, index) => {
                  const sNo = (currentPage - 1) * PAGE_SIZE + index + 1;
                  const isCompleted = po.status === "COMPLETED";
                  const isDraft = po.status === "DRAFT";
                  const isCancelled = po.status === "CANCELLED";

                  return (
                    <tr
                      key={po.id}
                      onClick={() => router.push(`/shop/purchases/${po.id}`)}
                      className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                    >
                      {/* 1. S.No */}
                      <td className="py-2 px-2 text-center text-slate-400 font-mono text-[11px]">
                        {sNo}
                      </td>

                      {/* 2. Date */}
                      <td className="py-2 px-2.5 text-slate-700 whitespace-nowrap">
                        <span className="font-bold text-slate-900 text-xs">
                          {formatDate(String(po.purchaseDate))}
                        </span>
                      </td>

                      {/* 3. Invoice # */}
                      <td className="py-2 px-2.5 whitespace-nowrap">
                        <span className="font-mono font-bold text-slate-900 bg-slate-100/90 px-1.5 py-0.5 rounded text-[11px]">
                          {po.purchaseNumber}
                        </span>
                      </td>

                      {/* 4. Vendor Name */}
                      <td className="py-2 px-2.5 min-w-0">
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold text-slate-900 text-xs truncate" title={po.vendorName || "—"}>
                            {po.vendorName || "—"}
                          </span>
                          {po.vendorGstin && (
                            <span className="text-[10px] text-slate-400 font-mono tracking-wide truncate">
                              GSTIN: {po.vendorGstin}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 5. Total Items */}
                      <td className="py-2 px-2 text-center whitespace-nowrap">
                        <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full text-[11px]">
                          {po.totalQuantity} pcs
                        </span>
                      </td>

                      {/* 6. GST Type */}
                      <td className="py-2 px-2 text-center whitespace-nowrap">
                        <span
                          className={cn(
                            "px-1.5 py-0.5 rounded text-[10px] font-bold uppercase",
                            po.taxRule === "INCLUDE"
                              ? "bg-purple-50 text-purple-700 border border-purple-100"
                              : "bg-blue-50 text-[#2563eb] border border-blue-100"
                          )}
                        >
                          {po.taxRule === "INCLUDE" ? "Incl" : "Excl"}
                        </span>
                      </td>

                      {/* 7. Total Amount */}
                      <td className="py-2 px-2.5 text-right whitespace-nowrap">
                        <span className="font-extrabold text-slate-900 text-xs sm:text-sm">
                          {formatINR(po.totalNetPurchase)}
                        </span>
                      </td>

                      {/* 8. Combined Status & Payment Badge */}
                      <td className="py-2 px-2.5 text-center whitespace-nowrap">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1",
                            isCompleted
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                              : isDraft
                              ? "bg-amber-50 text-amber-700 border border-amber-200/60"
                              : "bg-rose-50 text-rose-700 border border-rose-200/60"
                          )}
                        >
                          <span className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            isCompleted ? "bg-emerald-500" : isDraft ? "bg-amber-500" : "bg-rose-500"
                          )} />
                          <span>{isCompleted ? "Completed" : isDraft ? "Draft" : "Cancelled"}</span>
                        </span>
                      </td>

                      {/* 9. Action Link */}
                      <td className="py-2 px-2 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/shop/purchases/${po.id}`);
                          }}
                          className="h-6 w-6 rounded-md bg-slate-100 hover:bg-[#2563eb] hover:text-white text-slate-500 transition-colors inline-flex items-center justify-center cursor-pointer"
                          title="View Details"
                        >
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ─── Compact Table Footer / Pagination ────────────────────────── */}
        <div className="py-2.5 px-4 border-t border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500 font-semibold">
          <div>
            Showing{" "}
            <span className="font-bold text-slate-800">
              {totalCount === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}
            </span>{" "}
            to{" "}
            <span className="font-bold text-slate-800">
              {Math.min(currentPage * PAGE_SIZE, totalCount)}
            </span>{" "}
            of <span className="font-bold text-slate-800">{totalCount}</span> purchase bills
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={currentPage <= 1 || isPending}
              onClick={() => applyFilters({ page: currentPage - 1 })}
              className="h-7 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Previous</span>
            </button>

            <span className="px-2 py-1 text-slate-700 font-bold bg-white border border-slate-200 rounded-md">
              Page {currentPage} of {totalPages}
            </span>

            <button
              disabled={currentPage >= totalPages || isPending}
              onClick={() => applyFilters({ page: currentPage + 1 })}
              className="h-7 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
