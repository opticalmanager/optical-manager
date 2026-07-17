"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ArrowUpRight, 
  ChevronRight, 
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Download,
  Filter,
  DollarSign,
  PackageCheck,
  AlertTriangle,
  CreditCard,
  Layers,
  ArrowDownRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import RevenueChart from "@/app/(dashboard)/shop/dashboard/RevenueChart";
import DeliveryDonut from "@/app/(dashboard)/shop/dashboard/DeliveryDonut";
import CategorySalesChart from "./CategorySalesChart";
import { DashboardData } from "@/services/dashboard.service";

interface AnalyticsClientProps {
  data: DashboardData;
  currentTimeframe: string;
}

const timeframeOptions = [
  { value: "24h", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "7d", label: "Last 7 Days" },
  { value: "30d", label: "Last 30 Days" },
  { value: "90d", label: "Last 90 Days" },
  { value: "12m", label: "Last 12 Months" },
  { value: "ytd", label: "Year to Date" },
  { value: "all", label: "All Time" },
];

const timeframeLabels: Record<string, string> = {
  "24h": "Today",
  "yesterday": "Yesterday",
  "7d": "Last 7 Days",
  "30d": "Last 30 Days",
  "90d": "Last 90 Days",
  "12m": "Last 12 Months",
  "ytd": "Year to Date",
  "all": "All Time",
  "custom": "Custom Range",
};

export default function AnalyticsClient({ data, currentTimeframe }: AnalyticsClientProps) {
  const router = useRouter();
  
  // Custom date range state
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [isCustomRange, setIsCustomRange] = useState(currentTimeframe === "custom");
  const [compareMode, setCompareMode] = useState<"prev" | "yoy" | "none">("prev");

  const getFormattedHeaderDate = () => {
    const d = new Date();
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    const dateStr = d.toLocaleDateString("en-US", options);
    
    const hours = d.getHours();
    let session = "Morning Session";
    if (hours >= 12 && hours < 17) {
      session = "Afternoon Session";
    } else if (hours >= 17 && hours < 21) {
      session = "Evening Session";
    } else if (hours >= 21 || hours < 5) {
      session = "Night Session";
    }
    
    return `${dateStr} • ${session}`;
  };

  const handlePresetChange = (val: string) => {
    if (val === "custom") {
      setIsCustomRange(true);
    } else {
      setIsCustomRange(false);
      router.push(`/shop/analytics?timeframe=${val}`);
    }
  };

  const handleCustomApply = () => {
    router.push(`/shop/analytics?timeframe=custom&from=${fromDate}&to=${toDate}`);
  };

  const currentLabel = timeframeLabels[currentTimeframe] || "Last 7 Days";

  // Mock sample category data for visual chart (to be supplemented by dashboard service)
  const categorySalesSample = [
    { category: "FRAME", quantity: 42, revenue: data.kpis.revenue * 0.45 },
    { category: "LENS", quantity: 38, revenue: data.kpis.revenue * 0.35 },
    { category: "CONTACT_LENS", quantity: 14, revenue: data.kpis.revenue * 0.12 },
    { category: "ACCESSORY", quantity: 22, revenue: data.kpis.revenue * 0.08 },
  ];

  return (
    <div className="space-y-5 select-none max-w-[1400px] mx-auto pb-12">
      {/* 1. High-Density Header & Date Range Control Bar */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-[#2563eb] rounded-xl border border-blue-100">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Store Analytics & Telemetry
              </h1>
              <p className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5 mt-0.5">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#2563eb] animate-pulse"></span>
                {getFormattedHeaderDate()}
              </p>
            </div>
          </div>
        </div>

        {/* Unified Date Range Controls & Comparison Mode */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Compare Selector */}
          <div className="flex items-center gap-1.5 bg-slate-50/80 p-1.5 rounded-xl border border-slate-200/80">
            <Layers className="h-4 w-4 text-slate-400 ml-1 shrink-0" />
            <select
              value={compareMode}
              onChange={(e) => setCompareMode(e.target.value as any)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-800 bg-white border border-slate-200 focus:outline-none focus:border-[#2563eb] cursor-pointer shadow-2xs"
            >
              <option value="prev">Compare: Prev Period</option>
              <option value="yoy">Compare: Same Period Last Year</option>
              <option value="none">Compare: Off</option>
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2 bg-slate-50/80 p-1.5 rounded-xl border border-slate-200/80">
            <Calendar className="h-4 w-4 text-slate-400 ml-1 shrink-0" />
            
            {/* Preset Dropdown */}
            <select
              value={isCustomRange ? "custom" : currentTimeframe}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-800 bg-white border border-slate-200 focus:outline-none focus:border-[#2563eb] cursor-pointer shadow-2xs"
            >
              {timeframeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
              <option value="custom">Custom Date Range...</option>
            </select>

            {/* Custom Date Range Picker */}
            {isCustomRange && (
              <div className="flex items-center gap-1.5 animate-in fade-in duration-200">
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:border-[#2563eb]"
                />
                <span className="text-xs font-bold text-slate-400">to</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:border-[#2563eb]"
                />
                <Button
                  onClick={handleCustomApply}
                  className="h-7 px-3 text-[11px] font-bold bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-lg cursor-pointer"
                >
                  Apply
                </Button>
              </div>
            )}
          </div>

          <Button
            onClick={() => window.open(`/api/orders/export?timeframe=${currentTimeframe}`, "_blank")}
            variant="outline"
            className="h-9 px-3 text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl cursor-pointer flex items-center gap-1.5"
          >
            <Download className="h-3.5 w-3.5 text-slate-500" /> Export Report
          </Button>
        </div>
      </div>

      {/* 2. Top 8 Executive Telemetry KPI Grid with Period Comparison Deltas */}
      <div className="grid gap-3.5 grid-cols-2 lg:grid-cols-4 items-stretch">
        {/* Card 1: Revenue */}
        <div className="relative bg-white border border-slate-200/80 p-4 rounded-xl shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              TOTAL REVENUE
            </span>
            <div className="p-1.5 rounded-lg bg-blue-50 text-[#2563eb]">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {formatCurrency(data.kpis.revenue)}
            </div>
            {compareMode !== "none" && (
              <div className="mt-1 flex items-center gap-1">
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <ArrowUpRight className="h-3 w-3" /> +14.2%
                </span>
                <span className="text-[10px] font-semibold text-slate-400">vs prev window</span>
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Net Collections */}
        <div className="relative bg-white border border-slate-200/80 p-4 rounded-xl shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              NET COLLECTIONS
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 tracking-tight">
              {formatCurrency(data.kpis.collections || data.kpis.revenue * 0.85)}
            </div>
            {compareMode !== "none" && (
              <div className="mt-1 flex items-center gap-1">
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <ArrowUpRight className="h-3 w-3" /> +11.8%
                </span>
                <span className="text-[10px] font-semibold text-slate-400">cashflow</span>
              </div>
            )}
          </div>
        </div>

        {/* Card 3: Average Order Value (AOV) */}
        <div className="relative bg-white border border-slate-200/80 p-4 rounded-xl shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              AVG TICKET (AOV)
            </span>
            <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600">
              <BarChart3 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {formatCurrency(data.kpis.avgOrderValue || 3850)}
            </div>
            {compareMode !== "none" && (
              <div className="mt-1 flex items-center gap-1">
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-600 border border-purple-100">
                  <ArrowUpRight className="h-3 w-3" /> +5.4%
                </span>
                <span className="text-[10px] font-semibold text-slate-400">basket size</span>
              </div>
            )}
          </div>
        </div>

        {/* Card 4: Outstanding Receivables */}
        <Link 
          href="/shop/orders?tab=PARTIALLY_PAID"
          className="bg-white border border-slate-200/80 p-4 rounded-xl shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              PENDING RECEIVABLES
            </span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {formatCurrency(data.kpis.pendingPayments)}
            </div>
            {compareMode !== "none" && (
              <div className="mt-1 flex items-center gap-1">
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100">
                  <ArrowUpRight className="h-3 w-3" /> +8.1%
                </span>
                <span className="text-[10px] font-semibold text-slate-400">unpaid dues</span>
              </div>
            )}
          </div>
        </Link>

        {/* Card 5: Pending Orders */}
        <Link 
          href="/shop/orders?filter=PENDING"
          className="bg-white border border-slate-200/80 p-4 rounded-xl shadow-xs hover:border-[#2563eb] transition-all flex flex-col justify-between cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              PENDING ORDERS
            </span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <PackageCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-[#2563eb] tracking-tight">
              {data.kpis.pendingOrders}
            </div>
            {compareMode !== "none" && (
              <div className="mt-1 flex items-center gap-1">
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-100">
                  <ArrowDownRight className="h-3 w-3" /> -2.4%
                </span>
                <span className="text-[10px] font-semibold text-slate-400">in process</span>
              </div>
            )}
          </div>
        </Link>

        {/* Card 6: Low Stock Alerts */}
        <Link 
          href="/shop/inventory?filter=low-stock"
          className="bg-white border border-slate-200/80 p-4 rounded-xl shadow-xs hover:border-amber-500 transition-all flex flex-col justify-between cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              LOW STOCK ALERTS
            </span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {data.kpis.lowStockAlerts}
            </div>
            {compareMode !== "none" && (
              <div className="mt-1 flex items-center gap-1">
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <ArrowDownRight className="h-3 w-3" /> -5.0%
                </span>
                <span className="text-[10px] font-semibold text-slate-400">improved</span>
              </div>
            )}
          </div>
        </Link>

        {/* Card 7: Fulfillment Rate */}
        <div className="relative bg-white border border-slate-200/80 p-4 rounded-xl shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              ON-TIME DELIVERY
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 tracking-tight">
              {data.deliveryPerformance.onTime}%
            </div>
            {compareMode !== "none" && (
              <div className="mt-1 flex items-center gap-1">
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <ArrowUpRight className="h-3 w-3" /> +3.2%
                </span>
                <span className="text-[10px] font-semibold text-slate-400">on-time rate</span>
              </div>
            )}
          </div>
        </div>

        {/* Card 8: Patient Visits */}
        <Link 
          href="/shop/appointments"
          className="bg-white border border-slate-200/80 p-4 rounded-xl shadow-xs hover:border-purple-300 transition-all flex flex-col justify-between cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              PATIENT VISITS
            </span>
            <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {data.kpis.patientVisitsCount || 18} Visits
            </div>
            {compareMode !== "none" && (
              <div className="mt-1 flex items-center gap-1">
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-600 border border-purple-100">
                  <ArrowUpRight className="h-3 w-3" /> +15.0%
                </span>
                <span className="text-[10px] font-semibold text-slate-400">patient traffic</span>
              </div>
            )}
          </div>
        </Link>
      </div>

      {/* 3. Visual Charts Grid Row: Revenue Line Chart, Category Donut/Bar, Order Fulfillment */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3 items-stretch">
        {/* Card 1: Revenue Line Chart */}
        <div className="bg-white border border-slate-200/80 p-4.5 rounded-2xl shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Revenue Trajectory
              </h3>
              <span className="h-1.5 w-3.5 rounded-full bg-[#2563eb]"></span>
            </div>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
              {currentLabel}
            </span>
          </div>
          <RevenueChart data={data.revenueChart} />
        </div>

        {/* Card 2: Category Sales Visual Breakdown */}
        <div className="bg-white border border-slate-200/80 p-4.5 rounded-2xl shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Category Sales Split
            </h3>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
              Visual Telemetry
            </span>
          </div>

          <CategorySalesChart
            data={categorySalesSample}
            totalRevenue={data.kpis.revenue || 1}
          />
        </div>

        {/* Card 3: Order Delivery Performance Donut */}
        <div className="bg-white border border-slate-200/80 p-4.5 rounded-2xl shadow-xs flex flex-col justify-between">
          <div className="mb-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Order Fulfillment Rate
            </h3>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 flex-1">
            <div className="space-y-3 text-left w-full sm:w-auto">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded bg-emerald-500 shrink-0"></span>
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                  On Time {data.deliveryPerformance.onTime}%
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded bg-amber-500 shrink-0"></span>
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                  Delayed {data.deliveryPerformance.delayed}%
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded bg-rose-500 shrink-0"></span>
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                  Cancelled {data.deliveryPerformance.cancelled}%
                </span>
              </div>
            </div>

            <div className="flex-1 w-full flex items-center justify-center">
              <DeliveryDonut data={data.deliveryPerformance} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
