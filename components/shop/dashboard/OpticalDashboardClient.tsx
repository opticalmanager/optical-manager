"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  Receipt,
  RotateCcw,
  Package,
  Calendar,
  ChevronDown,
  Building2,
  Users,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ArrowUpRight,
  Sparkles,
  Store,
  Wallet,
  ShoppingBag,
  Clock,
  ArrowRight,
} from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import { DashboardData } from "@/services/dashboard.service";
import DashboardDonut from "./DashboardDonut";

interface OpticalDashboardClientProps {
  data: DashboardData;
  userName?: string;
  shopName?: string;
  currentTimeframe?: string;
}

const timeframeOptions = [
  { value: "24h", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "7d", label: "Last 7 Days" },
  { value: "30d", label: "This Month" },
  { value: "90d", label: "This Quarter (Apr 1 - Jun 30)" },
  { value: "12m", label: "Last 12 Months" },
  { value: "ytd", label: "Year to Date" },
  { value: "all", label: "All Time" },
];

export default function OpticalDashboardClient({
  data,
  userName = "User",
  shopName = "Vision Plus Outlet",
  currentTimeframe = "90d",
}: OpticalDashboardClientProps) {
  const router = useRouter();

  // Date range picker dropdown state
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  // Sales Bifurcation active tab: "lenses" | "frames" | "brands" | "gender" | "age"
  const [bifurcationTab, setBifurcationTab] = useState<
    "lenses" | "frames" | "brands" | "gender" | "age"
  >("lenses");

  // Filter dropdown state for sub-cards
  const [customerFilter, setCustomerFilter] = useState("This Month");
  const [returnFilter, setReturnFilter] = useState("This Month");
  const [salesFilter, setSalesFilter] = useState("This Month");
  const [retentionFilter, setRetentionFilter] = useState("This Month");

  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  const [returnDropdownOpen, setReturnDropdownOpen] = useState(false);
  const [salesDropdownOpen, setSalesDropdownOpen] = useState(false);
  const [retentionDropdownOpen, setRetentionDropdownOpen] = useState(false);

  // Extract optical KPIs with safe fallbacks
  const kpis = data?.opticalKPIs || {
    revenue: data?.kpis?.revenue || 0,
    revenueGrowth: 0,
    salesInvoicesCount: data?.kpis?.totalOrdersCount || 0,
    salesInvoicesGrowth: 0,
    accountsReceivable: data?.kpis?.pendingPayments || 0,
    accountsReceivableGrowth: 0,
    activeCustomersCount: 0,
    activeCustomersGrowth: 0,
    totalStoresCount: 1,
    totalStoresGrowth: 0,
    collections: data?.kpis?.collections || 0,
    pendingOrders: data?.kpis?.pendingOrders || 0,
    readyForPickupOrders: data?.kpis?.readyForPickupOrders || 0,
    delayedOrders: data?.kpis?.delayedOrders || 0,
    appointmentsToday: data?.kpis?.appointmentsToday || 0,
    lowStockAlerts: data?.kpis?.lowStockAlerts || 0,
    pendingPayments: data?.kpis?.pendingPayments || 0,
    totalOrdersCount: data?.kpis?.totalOrdersCount || 0,
    avgOrderValue: data?.kpis?.avgOrderValue || 0,
    paidInvoicesCount: data?.kpis?.paidInvoicesCount || 0,
    patientVisitsCount: data?.kpis?.patientVisitsCount || 0,
  };

  // Extract Customer Bifurcation
  const customerBifurcation = data?.customerBifurcation || {
    onlyFrame: 0,
    onlyFramePercent: 0,
    onlyLens: 0,
    onlyLensPercent: 0,
    bothFrameAndLens: 0,
    bothFrameAndLensPercent: 0,
    totalCustomers: 0,
  };

  // Customer Donut Slices
  const customerDonutData = [
    {
      name: "Only Frame",
      value: customerBifurcation.onlyFrame,
      color: "#8B5CF6", // Purple
    },
    {
      name: "Only Lense",
      value: customerBifurcation.onlyLens,
      color: "#06B6D4", // Cyan
    },
    {
      name: "Both Frame & Lense",
      value: customerBifurcation.bothFrameAndLens,
      color: "#10B981", // Emerald
    },
  ];

  // Extract Dead Stock
  const deadStock = data?.deadStock || {
    count: 0,
    percentageOfTotal: 0,
    totalItems: 0,
  };

  // Extract Stock Valuation
  const stockValuation = data?.stockValuation || {
    totalValue: 0,
    totalUnits: 0,
    categories: [
      { category: "FRAME", label: "Frames", value: 0, count: 0, percentage: 0, color: "#3B82F6" },
      { category: "LENS", label: "Lenses", value: 0, count: 0, percentage: 0, color: "#8B5CF6" },
    ],
  };

  const stockValuationDonutData = stockValuation.categories.map((c) => ({
    name: c.label,
    value: c.value,
    color: c.color,
  }));

  // Extract Return Rate
  const returnRate = data?.returnRate || {
    totalSales: 0,
    returnedItems: 0,
    returnRatePercent: 0,
  };

  const returnRateDonutData = [
    { name: "Returned", value: returnRate.returnRatePercent, color: "#EF4444" },
    { name: "Kept", value: Math.max(0, 100 - returnRate.returnRatePercent), color: "#E2E8F0" },
  ];

  // Extract Sales Bifurcation
  const salesBifurcation = data?.salesBifurcation || {
    totalSalesAmount: 0,
    byLenses: {
      slices: [
        { name: "Single Vision", count: 0, amount: 0, percentage: 0, color: "#3B82F6" },
        { name: "Bifocal", count: 0, amount: 0, percentage: 0, color: "#8B5CF6" },
        { name: "Progressive", count: 0, amount: 0, percentage: 0, color: "#10B981" },
        { name: "Other", count: 0, amount: 0, percentage: 0, color: "#F59E0B" },
      ],
      total: 0,
    },
    byFrames: {
      slices: [
        { name: "Full Rim", count: 0, amount: 0, percentage: 0, color: "#3B82F6" },
        { name: "Half Rim", count: 0, amount: 0, percentage: 0, color: "#8B5CF6" },
        { name: "Rimless", count: 0, amount: 0, percentage: 0, color: "#06B6D4" },
        { name: "Sunglasses", count: 0, amount: 0, percentage: 0, color: "#F59E0B" },
        { name: "Other", count: 0, amount: 0, percentage: 0, color: "#64748B" },
      ],
      total: 0,
    },
    byBrands: {
      slices: [
        { name: "Ray-Ban", count: 0, amount: 0, percentage: 0, color: "#3B82F6" },
        { name: "Oakley", count: 0, amount: 0, percentage: 0, color: "#8B5CF6" },
        { name: "Titan", count: 0, amount: 0, percentage: 0, color: "#06B6D4" },
        { name: "Other", count: 0, amount: 0, percentage: 0, color: "#64748B" },
      ],
      total: 0,
    },
    byGender: {
      slices: [
        { name: "Male", count: 0, amount: 0, percentage: 0, color: "#3B82F6" },
        { name: "Female", count: 0, amount: 0, percentage: 0, color: "#EC4899" },
        { name: "Unisex", count: 0, amount: 0, percentage: 0, color: "#8B5CF6" },
        { name: "Other", count: 0, amount: 0, percentage: 0, color: "#64748B" },
      ],
      total: 0,
    },
    byAge: {
      slices: [
        { name: "Kids (<18)", count: 0, amount: 0, percentage: 0, color: "#06B6D4" },
        { name: "Young Adults (18-35)", count: 0, amount: 0, percentage: 0, color: "#3B82F6" },
        { name: "Middle Age (36-55)", count: 0, amount: 0, percentage: 0, color: "#8B5CF6" },
        { name: "Seniors (55+)", count: 0, amount: 0, percentage: 0, color: "#F59E0B" },
      ],
      total: 0,
    },
  };

  const getActiveBifurcationData = () => {
    switch (bifurcationTab) {
      case "lenses":
        return salesBifurcation.byLenses;
      case "frames":
        return salesBifurcation.byFrames;
      case "brands":
        return salesBifurcation.byBrands;
      case "gender":
        return salesBifurcation.byGender;
      case "age":
        return salesBifurcation.byAge;
      default:
        return salesBifurcation.byLenses;
    }
  };

  const activeBifurcation = getActiveBifurcationData();
  const salesDonutData = activeBifurcation.slices.map((s) => ({
    name: s.name,
    value: s.count > 0 ? s.count : s.amount,
    color: s.color,
  }));

  // Extract Retention Rate
  const retentionRate = data?.retentionRate || {
    totalCustomers: 0,
    returningCustomers: 0,
    retentionRatePercent: 0,
  };

  const retentionDonutData = [
    { name: "Returning", value: retentionRate.retentionRatePercent, color: "#3B82F6" },
    { name: "Single Visit", value: Math.max(0, 100 - retentionRate.retentionRatePercent), color: "#E2E8F0" },
  ];

  // Extract Low Stock Summary
  const lowStockSummary = data?.lowStockSummary || {
    lowStockCount: 0,
    items: [],
  };

  // Extract Recent Transactions
  const recentTransactions = data?.recentTransactions || [];

  // Timeframe change handler
  const handleTimeframeSelect = (val: string) => {
    setDatePickerOpen(false);
    router.push(`/shop/dashboard?timeframe=${val}`);
  };

  const selectedTimeframeLabel =
    timeframeOptions.find((opt) => opt.value === currentTimeframe)?.label ||
    "Apr 1, 2026 - Jun 30, 2026";

  // Dynamic Greeting based on current hour
  const getGreeting = () => {
    const hours = new Date().getHours();
    if (hours < 12) return "Good morning";
    if (hours < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="space-y-3.5 select-none max-w-[1440px] mx-auto pb-8">
      {/* ========================================================================= */}
      {/* TOP HEADER SECTION */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5 shadow-2xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <span>
              {getGreeting()}, {userName}!
            </span>
            <span className="text-xl">👋</span>
          </h1>
          <p className="text-xs font-medium text-slate-500 mt-1">
            Here's your multi-shop business performance report today.
          </p>
        </div>

        {/* Date Range Picker Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setDatePickerOpen(!datePickerOpen)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-xs font-bold text-slate-700 shadow-2xs transition-all cursor-pointer hover:bg-slate-50/50"
          >
            <Calendar className="h-4 w-4 text-slate-400" />
            <span>{selectedTimeframeLabel}</span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400 ml-1" />
          </button>

          {datePickerOpen && (
            <>
              <div
                className="fixed inset-0 z-40 bg-transparent"
                onClick={() => setDatePickerOpen(false)}
              />
              <div className="absolute right-0 top-full mt-1.5 w-60 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 z-50 text-left animate-in fade-in-50 zoom-in-95">
                <div className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                  Select Timeframe
                </div>
                {timeframeOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleTimeframeSelect(opt.value)}
                    className={cn(
                      "w-full px-3.5 py-2 text-xs font-semibold text-left transition-colors flex items-center justify-between cursor-pointer",
                      currentTimeframe === opt.value
                        ? "bg-blue-50/80 text-[#2563EB] font-bold"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    )}
                  >
                    <span>{opt.label}</span>
                    {currentTimeframe === opt.value && (
                      <span className="h-1.5 w-1.5 rounded-full bg-[#2563EB]" />
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ROW 1: 5 KPI CARDS GRID (High-Density & Proportional) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Card 1: TOTAL REVENUE */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between shadow-2xs hover:shadow-xs transition-all duration-200">
          <div className="flex items-center justify-between">
            <div className="h-8 w-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm">
              ₹
            </div>
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-emerald-50/80 border border-emerald-100/80 text-[10px] font-extrabold text-emerald-600">
              <ArrowUpRight className="h-3 w-3" />
              {kpis.revenueGrowth >= 0 ? `${kpis.revenueGrowth}%` : `${kpis.revenueGrowth}%`}
            </span>
          </div>
          <div className="mt-3">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
              TOTAL REVENUE
            </span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">
              {formatCurrency(kpis.revenue)}
            </div>
            <p className="text-[11px] font-medium text-slate-400 mt-1">
              Collected cash payments
            </p>
          </div>
        </div>

        {/* Card 2: SALES INVOICES */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between shadow-2xs hover:shadow-xs transition-all duration-200">
          <div className="flex items-center justify-between">
            <div className="h-8 w-8 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center">
              <Receipt className="h-4 w-4" />
            </div>
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-blue-50/80 border border-blue-100/80 text-[10px] font-extrabold text-[#2563EB]">
              <ArrowUpRight className="h-3 w-3" />
              {kpis.salesInvoicesGrowth >= 0
                ? `${kpis.salesInvoicesGrowth}%`
                : `${kpis.salesInvoicesGrowth}%`}
            </span>
          </div>
          <div className="mt-3">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
              SALES INVOICES
            </span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">
              {kpis.salesInvoicesCount}
            </div>
            <p className="text-[11px] font-medium text-slate-400 mt-1">
              Created invoice slips
            </p>
          </div>
        </div>

        {/* Card 3: ACCOUNTS RECEIVABLE */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between shadow-2xs hover:shadow-xs transition-all duration-200">
          <div className="flex items-center justify-between">
            <div className="h-8 w-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Wallet className="h-4 w-4" />
            </div>
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-amber-50/80 border border-amber-100/80 text-[10px] font-extrabold text-amber-600">
              <ArrowUpRight className="h-3 w-3" />
              {kpis.accountsReceivableGrowth >= 0
                ? `${kpis.accountsReceivableGrowth}%`
                : `${kpis.accountsReceivableGrowth}%`}
            </span>
          </div>
          <div className="mt-3">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
              ACCOUNTS RECEIVABLE
            </span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">
              {formatCurrency(kpis.accountsReceivable)}
            </div>
            <p className="text-[11px] font-medium text-slate-400 mt-1">
              Outstanding balances due
            </p>
          </div>
        </div>

        {/* Card 4: ACTIVE CUSTOMERS */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between shadow-2xs hover:shadow-xs transition-all duration-200">
          <div className="flex items-center justify-between">
            <div className="h-8 w-8 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-cyan-50/80 border border-cyan-100/80 text-[10px] font-extrabold text-cyan-600">
              <ArrowUpRight className="h-3 w-3" />
              {kpis.activeCustomersGrowth >= 0
                ? `${kpis.activeCustomersGrowth}%`
                : `${kpis.activeCustomersGrowth}%`}
            </span>
          </div>
          <div className="mt-3">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
              ACTIVE CUSTOMERS
            </span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">
              {kpis.activeCustomersCount}
            </div>
            <p className="text-[11px] font-medium text-slate-400 mt-1">
              Registered base cross-branch
            </p>
          </div>
        </div>

        {/* Card 5: TOTAL STORES */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between shadow-2xs hover:shadow-xs transition-all duration-200">
          <div className="flex items-center justify-between">
            <div className="h-8 w-8 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center">
              <Store className="h-4 w-4" />
            </div>
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-pink-50/80 border border-pink-100/80 text-[10px] font-extrabold text-pink-600">
              <ArrowUpRight className="h-3 w-3" />
              {kpis.totalStoresGrowth}%
            </span>
          </div>
          <div className="mt-3">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
              TOTAL STORES
            </span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">
              {kpis.totalStoresCount}
            </div>
            <p className="text-[11px] font-medium text-slate-400 mt-1">
              Your connected branches
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ROW 2: 3 COLUMNS (Customer Bifurcation, Dead Stock, Stock Valuation) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
        {/* Card 1: Customer Bifurcation */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-indigo-50 text-[#2563EB]">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Customer Bifurcation</h3>
                <p className="text-[11px] font-medium text-slate-400">By purchase type</p>
              </div>
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setCustomerDropdownOpen(!customerDropdownOpen)}
                className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/70 text-[10px] font-bold text-slate-600 hover:bg-slate-100 transition-colors flex items-center gap-1 cursor-pointer"
              >
                {customerFilter} <ChevronDown className="h-3 w-3 text-slate-400" />
              </button>

              {customerDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40 bg-transparent"
                    onClick={() => setCustomerDropdownOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-50 text-left">
                    {["This Month", "This Quarter", "All Time"].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          setCustomerFilter(opt);
                          setCustomerDropdownOpen(false);
                        }}
                        className="w-full px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 text-left cursor-pointer"
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 py-2 flex-1">
            <div className="shrink-0">
              <DashboardDonut
                data={customerDonutData}
                size={120}
                thickness={14}
                centerPrimary={customerBifurcation.totalCustomers}
                centerSecondary="Total Customers"
              />
            </div>

            <div className="space-y-2.5 text-xs font-semibold flex-1">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#8B5CF6] shrink-0" />
                  <span className="text-slate-600 text-xs font-medium">Only Frame</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-slate-900">{customerBifurcation.onlyFrame}</span>{" "}
                  <span className="text-slate-400 text-[11px]">
                    ({customerBifurcation.onlyFramePercent}%)
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#06B6D4] shrink-0" />
                  <span className="text-slate-600 text-xs font-medium">Only Lense</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-slate-900">{customerBifurcation.onlyLens}</span>{" "}
                  <span className="text-slate-400 text-[11px]">
                    ({customerBifurcation.onlyLensPercent}%)
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#10B981] shrink-0" />
                  <span className="text-slate-600 text-xs font-medium">Both Frame & Lense</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-slate-900">
                    {customerBifurcation.bothFrameAndLens}
                  </span>{" "}
                  <span className="text-slate-400 text-[11px]">
                    ({customerBifurcation.bothFrameAndLensPercent}%)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Dead Stock */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-indigo-50 text-[#2563EB]">
                <Package className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Dead Stock</h3>
                <p className="text-[11px] font-medium text-slate-400">
                  Items not moved in last 90 days
                </p>
              </div>
            </div>

            <Link
              href="/shop/inventory?filter=dead-stock"
              className="text-xs font-bold text-[#2563EB] hover:underline"
            >
              View all
            </Link>
          </div>

          <div className="flex flex-col items-center justify-center text-center py-4 flex-1">
            <div className="h-12 w-12 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex items-center justify-center text-indigo-500 mb-2 shadow-2xs">
              <Package className="h-6 w-6" />
            </div>
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {deadStock.count}
            </div>
            <p className="text-xs font-medium text-slate-400 mt-0.5">Dead stock items</p>
            <div className="mt-3">
              <span className="inline-block px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 text-[11px] font-bold">
                {deadStock.percentageOfTotal}% of total stock
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Stock Valuation */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600">
                <Layers className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Stock Valuation</h3>
                <p className="text-[11px] font-medium text-slate-400">
                  Asset distribution by category
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center py-3 flex-1">
            <DashboardDonut
              data={stockValuationDonutData}
              size={135}
              thickness={15}
              centerPrimary={formatCurrency(stockValuation.totalValue)}
              centerSecondary="TOTAL VALUE"
              centerPrimaryClass="text-base font-black text-slate-900"
            />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ROW 3: 3 COLUMNS (Return Rate, Sales Bifurcation, Low Stock Alerts) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        {/* Card 1: Return Rate (Col-span 3 or 4) */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between shadow-2xs lg:col-span-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-blue-50 text-[#2563EB]">
                <RotateCcw className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Return Rate</h3>
                <p className="text-[11px] font-medium text-slate-400">% of products returned</p>
              </div>
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setReturnDropdownOpen(!returnDropdownOpen)}
                className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/70 text-[10px] font-bold text-slate-600 hover:bg-slate-100 transition-colors flex items-center gap-1 cursor-pointer"
              >
                {returnFilter} <ChevronDown className="h-3 w-3 text-slate-400" />
              </button>

              {returnDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40 bg-transparent"
                    onClick={() => setReturnDropdownOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-50 text-left">
                    {["This Month", "This Quarter", "All Time"].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          setReturnFilter(opt);
                          setReturnDropdownOpen(false);
                        }}
                        className="w-full px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 text-left cursor-pointer"
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 py-2 flex-1">
            <div className="shrink-0">
              <DashboardDonut
                data={returnRateDonutData}
                size={110}
                thickness={12}
                centerPrimary={`${returnRate.returnRatePercent}%`}
                centerSecondary="Return Rate"
                centerPrimaryClass="text-sm font-black text-slate-900"
              />
            </div>

            <div className="space-y-2 text-xs font-medium text-slate-500 flex-1 pl-2">
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">
                  Total Sales
                </span>
                <span className="font-bold text-slate-900 text-sm">{returnRate.totalSales}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">
                  Returned Items
                </span>
                <span className="font-bold text-slate-900 text-sm">
                  {returnRate.returnedItems}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">
                  Return Rate
                </span>
                <span className="font-bold text-emerald-600 text-xs">
                  {returnRate.returnRatePercent}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Sales Bifurcation (Col-span 5) */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between shadow-2xs lg:col-span-5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-indigo-50 text-[#2563EB]">
                <TrendingUp className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Sales Bifurcation</h3>
                <p className="text-[11px] font-medium text-slate-400">
                  Breakdown by different categories
                </p>
              </div>
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setSalesDropdownOpen(!salesDropdownOpen)}
                className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/70 text-[10px] font-bold text-slate-600 hover:bg-slate-100 transition-colors flex items-center gap-1 cursor-pointer"
              >
                {salesFilter} <ChevronDown className="h-3 w-3 text-slate-400" />
              </button>

              {salesDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40 bg-transparent"
                    onClick={() => setSalesDropdownOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-50 text-left">
                    {["This Month", "This Quarter", "All Time"].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          setSalesFilter(opt);
                          setSalesDropdownOpen(false);
                        }}
                        className="w-full px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 text-left cursor-pointer"
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* 5 Tab buttons */}
          <div className="flex items-center gap-1 p-1 bg-slate-100/70 rounded-xl my-1.5 overflow-x-auto">
            {[
              { id: "lenses", label: "By Lenses" },
              { id: "frames", label: "By Frames" },
              { id: "brands", label: "By Brands" },
              { id: "gender", label: "By Gender" },
              { id: "age", label: "By Age" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setBifurcationTab(tab.id as any)}
                className={cn(
                  "flex-1 px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap text-center",
                  bifurcationTab === tab.id
                    ? "bg-[#2563EB] text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Donut and Dynamic Legend */}
          <div className="flex items-center justify-between gap-3 py-1 flex-1">
            <div className="shrink-0">
              <DashboardDonut
                data={salesDonutData}
                size={115}
                thickness={13}
                centerPrimary={formatCurrency(salesBifurcation.totalSalesAmount)}
                centerSecondary="Total Sales"
                centerPrimaryClass="text-xs font-black text-slate-900"
              />
            </div>

            <div className="space-y-1.5 text-xs font-medium flex-1 pl-2">
              {activeBifurcation.slices.map((slice) => (
                <div key={slice.name} className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: slice.color }}
                    />
                    <span className="text-slate-600 text-xs truncate">{slice.name}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-bold text-slate-900">{slice.count}</span>{" "}
                    <span className="text-slate-400 text-[10px]">({slice.percentage}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Card 3: Low Stock Alerts (Col-span 3) */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between shadow-2xs lg:col-span-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-lg bg-amber-50 text-amber-600">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Low Stock Alerts</h3>
            </div>

            <Link
              href="/shop/inventory?filter=low-stock"
              className="text-xs font-bold text-[#2563EB] hover:underline flex items-center gap-0.5"
            >
              View stock <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="flex flex-col items-center justify-center text-center py-4 flex-1">
            {lowStockSummary.lowStockCount === 0 ? (
              <>
                <div className="h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500 mb-2">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">All items fully in stock</h4>
                <p className="text-[11px] text-slate-400 mt-1 max-w-[200px] leading-relaxed">
                  No inventory items are currently running below their minimum count.
                </p>
              </>
            ) : (
              <div className="w-full space-y-2 text-left">
                {lowStockSummary.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100"
                  >
                    <div className="min-w-0 pr-2">
                      <span className="text-xs font-bold text-slate-800 block truncate">
                        {item.name}
                      </span>
                      <span className="text-[10px] text-rose-500 font-semibold">
                        {item.quantity} units left (Min: {item.minQuantity})
                      </span>
                    </div>
                    <Link
                      href="/shop/inventory"
                      className="text-[10px] font-bold text-[#2563EB] hover:underline shrink-0"
                    >
                      Restock
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ROW 4: 2 COLUMNS (Retention Rate & Recent Transactions) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        {/* Column 1: Retention Rate (lg:col-span-4) */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between shadow-2xs lg:col-span-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-indigo-50 text-[#2563EB]">
                <RotateCcw className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Retention Rate</h3>
                <p className="text-[11px] font-medium text-slate-400">
                  Repeat customers coming back to store
                </p>
              </div>
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setRetentionDropdownOpen(!retentionDropdownOpen)}
                className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/70 text-[10px] font-bold text-slate-600 hover:bg-slate-100 transition-colors flex items-center gap-1 cursor-pointer"
              >
                {retentionFilter} <ChevronDown className="h-3 w-3 text-slate-400" />
              </button>

              {retentionDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40 bg-transparent"
                    onClick={() => setRetentionDropdownOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-50 text-left">
                    {["This Month", "This Quarter", "All Time"].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          setRetentionFilter(opt);
                          setRetentionDropdownOpen(false);
                        }}
                        className="w-full px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 text-left cursor-pointer"
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 py-2 flex-1">
            <div className="shrink-0">
              <DashboardDonut
                data={retentionDonutData}
                size={110}
                thickness={12}
                centerPrimary={`${retentionRate.retentionRatePercent}%`}
                centerSecondary="Retention Rate"
                centerPrimaryClass="text-sm font-black text-slate-900"
              />
            </div>

            <div className="space-y-2 text-xs font-medium text-slate-500 flex-1 pl-2">
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">
                  Total Customers
                </span>
                <span className="font-bold text-slate-900 text-sm">
                  {retentionRate.totalCustomers}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">
                  Returning Customers
                </span>
                <span className="font-bold text-slate-900 text-sm">
                  {retentionRate.returningCustomers}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">
                  Retention Rate
                </span>
                <span className="font-bold text-emerald-600 text-xs">
                  {retentionRate.retentionRatePercent}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Column 2: Recent Transactions (lg:col-span-8) */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between shadow-2xs lg:col-span-8">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-50 text-[#2563EB]">
                <Receipt className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Recent Transactions</h3>
            </div>

            <Link
              href="/shop/orders"
              className="text-xs font-bold text-[#2563EB] hover:underline flex items-center gap-0.5"
            >
              View Customers <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-2 px-3">DATE & TIME</th>
                  <th className="py-2 px-3">CUSTOMER</th>
                  <th className="py-2 px-3">ITEMS</th>
                  <th className="py-2 px-3 text-right">AMOUNT</th>
                  <th className="py-2 px-3 text-center">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {recentTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-6 text-xs text-slate-400 font-medium">
                      No recent transactions recorded yet.
                    </td>
                  </tr>
                ) : (
                  recentTransactions.map((tx) => (
                    <tr
                      key={tx.id}
                      className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                    >
                      <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap text-[11px] font-medium">
                        {tx.dateFormatted}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-800 whitespace-nowrap">
                        {tx.customerName}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 font-medium truncate max-w-[220px]">
                        {tx.itemsSummary}
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-slate-900 whitespace-nowrap">
                        {formatCurrency(tx.amount)}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border",
                            tx.status === "PAID"
                              ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                              : tx.status === "PARTIALLY_PAID"
                              ? "bg-amber-50 text-amber-600 border-amber-100"
                              : "bg-rose-50 text-rose-600 border-rose-100"
                          )}
                        >
                          {tx.status === "PAID" ? (
                            <>
                              <span className="text-[9px]">✓</span> Completed
                            </>
                          ) : tx.status === "PARTIALLY_PAID" ? (
                            "Partial"
                          ) : (
                            tx.status
                          )}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
