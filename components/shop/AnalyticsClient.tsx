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
  CreditCard
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import RevenueChart from "@/app/(dashboard)/shop/dashboard/RevenueChart";
import DeliveryDonut from "@/app/(dashboard)/shop/dashboard/DeliveryDonut";
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

  // Dropdown open states
  const [revKpiOpen, setRevKpiOpen] = useState(false);
  const [chartKpiOpen, setChartKpiOpen] = useState(false);

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

        {/* Unified Date Range Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
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
            variant="outline"
            className="h-9 px-3 text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl cursor-pointer flex items-center gap-1.5"
          >
            <Download className="h-3.5 w-3.5 text-slate-500" /> Export Report
          </Button>
        </div>
      </div>

      {/* 2. Top 4 KPI Metrics Row */}
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
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-3">
            {formatCurrency(data.kpis.revenue)}
          </div>
        </div>

        {/* Card 2: Pending Orders */}
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
          <div className="text-2xl sm:text-3xl font-extrabold text-[#2563eb] tracking-tight mt-3">
            {data.kpis.pendingOrders}
          </div>
        </Link>

        {/* Card 3: Low Stock Alerts */}
        <Link 
          href="/shop/inventory?filter=low-stock"
          className="bg-white border border-slate-200/80 p-4 rounded-xl shadow-xs hover:border-rose-500 transition-all flex flex-col justify-between cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              LOW STOCK ALERTS
            </span>
            <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-3">
            {data.kpis.lowStockAlerts}
          </div>
        </Link>

        {/* Card 4: Pending Payments */}
        <Link 
          href="/shop/orders?tab=PARTIALLY_PAID"
          className="bg-white border border-slate-200/80 p-4 rounded-xl shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              PENDING PAYMENTS
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-3">
            {formatCurrency(data.kpis.pendingPayments)}
          </div>
        </Link>
      </div>

      {/* 3. Middle Grid Row: Revenue Chart, Priority Actions, Delivery Performance */}
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

        {/* Card 2: Priority Actions */}
        <div className="bg-white border border-slate-200/80 p-4.5 rounded-2xl shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Priority Actions
            </h3>
            <span className="text-[9px] font-extrabold text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-md uppercase tracking-wider">
              Attention Required
            </span>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[240px]">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="px-3 py-2 text-left rounded-l-lg">
                    Task Description
                  </th>
                  <th className="px-3 py-2 text-right rounded-r-lg w-20">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.priorityActions.map((action, idx) => (
                  <tr key={action.id || idx} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100 last:border-b-0">
                    <td className="px-3 py-2.5">
                      <span className="text-xs font-semibold text-slate-700 block leading-normal">
                        {action.description}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <Link 
                        href={action.actionHref}
                        className="text-xs font-bold text-[#2563eb] hover:underline"
                      >
                        {action.actionLabel}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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

      {/* 4. Bottom Grid Row: Tables */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 items-start">
        {/* Left Column */}
        <div className="space-y-4">
          {/* Recent Orders */}
          <div className="bg-white border border-slate-200/80 p-4.5 rounded-2xl shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Recent Orders
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <tr>
                      <th className="px-3.5 py-2 rounded-l-lg">
                        Customer
                      </th>
                      <th className="px-3.5 py-2 text-right">
                        Amount
                      </th>
                      <th className="px-3.5 py-2 text-center rounded-r-lg">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentOrders.map((order, idx) => (
                      <tr key={order.id || idx} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100 last:border-b-0">
                        <td className="px-3.5 py-2.5">
                          <span className="text-xs font-bold text-slate-800 block">
                            {order.customerName}
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5 text-right">
                          <span className="text-xs font-extrabold text-slate-900">
                            {formatCurrency(order.amount)}
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5 text-center">
                          <span 
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              order.status === "PAID" 
                                ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                                : order.status === "PARTIALLY_PAID"
                                ? "bg-amber-50 text-amber-600 border-amber-100"
                                : "bg-rose-50 text-rose-600 border-rose-100"
                            }`}
                          >
                            {order.status === "PARTIALLY_PAID" ? "Partially Paid" : order.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="pt-3 mt-3 border-t border-slate-100 px-2">
              <Link 
                href="/shop/orders" 
                className="text-xs font-bold text-[#2563eb] hover:underline inline-flex items-center gap-1"
              >
                View all orders <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {/* Top Performing SKUs */}
          <div className="bg-white border border-slate-200/80 p-4.5 rounded-2xl shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Top Performing SKUs
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-3.5 py-2 rounded-l-lg">
                      Product
                    </th>
                    <th className="px-3.5 py-2 text-center">
                      Sold
                    </th>
                    <th className="px-3.5 py-2 text-right rounded-r-lg">
                      Growth
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.topSKUs.map((sku, idx) => (
                    <tr key={sku.id || idx} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100 last:border-b-0">
                      <td className="px-3.5 py-2.5">
                        <span className="text-xs font-bold text-slate-800 block">
                          {sku.productName}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 text-center">
                        <span className="text-xs font-extrabold text-slate-900">
                          {sku.sold}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 text-right flex items-center justify-end gap-2">
                        <span className="text-[9px] font-bold text-slate-500 border border-slate-200 rounded px-1.5 py-0.5 bg-slate-50">
                          {sku.timeframe}
                        </span>
                        <span className="text-xs font-extrabold text-emerald-600 inline-flex items-center gap-0.5">
                          <ArrowUpRight className="h-3.5 w-3.5" />
                          {sku.growthPercent >= 0 ? `+${sku.growthPercent}%` : `${sku.growthPercent}%`}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column (Stock Alerts) */}
        <div className="bg-white border border-slate-200/80 p-4.5 rounded-2xl shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Low Stock Alerts
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-3.5 py-2 rounded-l-lg">
                      Item
                    </th>
                    <th className="px-3.5 py-2 text-center">
                      Units
                    </th>
                    <th className="px-3.5 py-2 text-center rounded-r-lg">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.stockAlerts.map((alert, idx) => (
                    <tr key={alert.id || idx} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100 last:border-b-0">
                      <td className="px-3.5 py-2.5">
                        <span className="text-xs font-bold text-slate-800 block">
                          {alert.name}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 text-center">
                        <span className="text-xs font-extrabold text-slate-900">
                          {alert.units}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 text-center">
                        <span 
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            alert.status === "IN_STOCK" 
                              ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                              : alert.status === "LOW_STOCK"
                              ? "bg-amber-50 text-amber-600 border-amber-100"
                              : "bg-rose-50 text-rose-600 border-rose-100"
                          }`}
                        >
                          {alert.status === "LOW_STOCK" ? "Low Stock" : alert.status === "OUT_OF_STOCK" ? "Out of Stock" : "In Stock"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pt-3 mt-4 border-t border-slate-100 px-2">
            <Link 
              href="/shop/inventory" 
              className="text-xs font-bold text-[#2563eb] hover:underline inline-flex items-center gap-1"
            >
              View all inventory <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
