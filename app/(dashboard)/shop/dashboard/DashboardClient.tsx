"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ArrowUpRight, 
  ChevronRight, 
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import RevenueChart from "./RevenueChart";
import DeliveryDonut from "./DeliveryDonut";
import { DashboardData } from "@/services/dashboard.service";

interface DashboardClientProps {
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
};

export default function DashboardClient({ data, currentTimeframe }: DashboardClientProps) {
  const router = useRouter();
  
  // Dropdown open states
  const [revKpiOpen, setRevKpiOpen] = useState(false);
  const [chartKpiOpen, setChartKpiOpen] = useState(false);

  // Calculate dynamic date-time and session for client
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

  const handleTimeframeChange = (val: string) => {
    router.push(`/shop/dashboard?timeframe=${val}`);
  };

  const currentLabel = timeframeLabels[currentTimeframe] || "Last 7 Days";

  return (
    <div className="space-y-8 select-none max-w-[1400px] mx-auto pb-10">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-800">
            Store Performance
          </h1>
          <p className="text-xs font-semibold text-slate-400 mt-1.5 flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#0a52c3] animate-pulse"></span>
            {getFormattedHeaderDate()}
          </p>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Revenue (Interactive Timeframe Selection) */}
        <div className="relative bg-white border border-slate-200/60 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between min-h-[120px]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-[#0a52c3] uppercase tracking-widest">
              Revenue
            </span>
            <div className="relative">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setRevKpiOpen(!revKpiOpen);
                }}
                className="px-2.5 py-1 rounded-full bg-slate-50 border border-slate-100 text-[10px] font-bold text-slate-500 flex items-center gap-1 hover:bg-slate-100 transition-colors"
              >
                {currentLabel} ▾
              </button>
              
              {revKpiOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40 bg-transparent" 
                    onClick={() => setRevKpiOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-1.5 w-48 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-50 animate-fade-in text-left">
                    {timeframeOptions.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => {
                          handleTimeframeChange(opt.value);
                          setRevKpiOpen(false);
                        }}
                        className={`w-full px-4 py-2 text-xs font-semibold text-left transition-colors flex items-center justify-between ${
                          currentTimeframe === opt.value 
                            ? "bg-[#0a52c3]/5 text-[#0a52c3]" 
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-800 tracking-tight mt-4">
            {formatCurrency(data.kpis.revenue)}
          </div>
        </div>

        {/* Card 2: Pending Orders (Navigates to Orders with Pending Filter) */}
        <Link 
          href="/shop/orders?filter=PENDING"
          className="bg-white border border-slate-200/60 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between min-h-[120px] hover:scale-[1.01] cursor-pointer"
        >
          <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">
            Pending Orders
          </span>
          <div className="text-3xl font-extrabold text-slate-800 tracking-tight mt-4">
            {data.kpis.pendingOrders}
          </div>
        </Link>

        {/* Card 3: Low Stock Alerts (Navigates to Stock Management with Low Stock Filter) */}
        <Link 
          href="/shop/inventory?filter=low-stock"
          className="bg-white border border-slate-200/60 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between min-h-[120px] hover:scale-[1.01] cursor-pointer"
        >
          <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">
            Low Stock Alerts
          </span>
          <div className="text-3xl font-extrabold text-slate-800 tracking-tight mt-4">
            {data.kpis.lowStockAlerts}
          </div>
        </Link>

        {/* Card 4: Pending Payments (Navigates to Orders with Partially Paid filter) */}
        <Link 
          href="/shop/orders?tab=PARTIALLY_PAID"
          className="bg-white border border-slate-200/60 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between min-h-[120px] hover:scale-[1.01] cursor-pointer"
        >
          <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">
            Pending Payments
          </span>
          <div className="text-3xl font-extrabold text-slate-800 tracking-tight mt-4">
            {formatCurrency(data.kpis.pendingPayments)}
          </div>
        </Link>
      </div>

      {/* Middle Grid Row: Revenue Chart, Priority Actions, Delivery Donut */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Card 1: Revenue Line Chart */}
        <div className="bg-white border border-slate-200/60 p-6 rounded-2xl shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
                Revenue
              </h3>
              <span className="h-1.5 w-4 rounded-full bg-[#0a52c3]"></span>
            </div>
            <div className="relative">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setChartKpiOpen(!chartKpiOpen);
                }}
                className="px-2 py-0.5 rounded bg-slate-50 border border-slate-100 text-[10px] font-bold text-slate-500 hover:bg-slate-100 transition-colors"
              >
                {currentLabel} ▾
              </button>

              {chartKpiOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40 bg-transparent" 
                    onClick={() => setChartKpiOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-1.5 w-48 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-50 animate-fade-in text-left">
                    {timeframeOptions.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => {
                          handleTimeframeChange(opt.value);
                          setChartKpiOpen(false);
                        }}
                        className={`w-full px-4 py-2 text-xs font-semibold text-left transition-colors flex items-center justify-between ${
                          currentTimeframe === opt.value 
                            ? "bg-[#0a52c3]/5 text-[#0a52c3]" 
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
          <RevenueChart data={data.revenueChart} />
        </div>

        {/* Card 2: Priority Actions */}
        <div className="bg-white border border-slate-200/60 p-6 rounded-2xl shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
              Priority Actions
            </h3>
            <span className="text-[9px] font-black text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded uppercase tracking-widest animate-pulse">
              Immediate Attention
            </span>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[250px]">
            <table className="w-full">
              <thead className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <tr>
                  <th className="px-2.5 sm:px-4 py-2.5 text-left rounded-l-lg">
                    Task Description
                  </th>
                  <th className="px-2.5 sm:px-4 py-2.5 text-right rounded-r-lg w-24">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.priorityActions.map((action, idx) => (
                  <tr key={action.id || idx} className="hover:bg-slate-50/30 transition-colors border-b border-slate-100/70 last:border-b-0">
                    <td className="px-2.5 sm:px-4 py-3.5 pr-2">
                      <span className="text-xs font-semibold text-slate-700 block leading-normal">
                        {action.description}
                      </span>
                    </td>
                    <td className="px-2.5 sm:px-4 py-3.5 text-right">
                      <Link 
                        href={action.actionHref}
                        className="text-xs font-extrabold text-[#0a52c3] hover:underline"
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
        <div className="bg-white border border-slate-200/60 p-6 rounded-2xl shadow-sm flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
              Order delivery performance
            </h3>
          </div>

          {/* Legend and Donut Row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 flex-1">
            {/* Donut Legend */}
            <div className="space-y-3.5 text-left w-full sm:w-auto">
              <div className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 rounded bg-[#10b981] flex-shrink-0"></span>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  On Time {data.deliveryPerformance.onTime}%
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 rounded bg-[#f59e0b] flex-shrink-0"></span>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  Delayed {data.deliveryPerformance.delayed}%
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 rounded bg-[#ef4444] flex-shrink-0"></span>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  Cancelled {data.deliveryPerformance.cancelled}%
                </span>
              </div>
            </div>

            {/* Donut Chart */}
            <div className="flex-1 w-full flex items-center justify-center">
              <DeliveryDonut data={data.deliveryPerformance} />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Grid Row: Tables (Left: Recent Orders & Top Performing SKUs, Right: Stock Alerts) */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 items-start">
        {/* Left Column (Recent Orders + Top Performing SKUs) */}
        <div className="space-y-6">
          {/* Card 1: Recent Orders */}
          <div className="bg-white border border-slate-200/60 p-6 rounded-2xl shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
                  Recent orders
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <tr>
                      <th className="px-2.5 sm:px-4 py-2.5 rounded-l-lg">
                        Customer
                      </th>
                      <th className="px-2.5 sm:px-4 py-2.5 text-right">
                        Amount
                      </th>
                      <th className="px-2.5 sm:px-4 py-2.5 text-center rounded-r-lg">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentOrders.map((order, idx) => (
                      <tr key={order.id || idx} className="hover:bg-slate-50/30 transition-colors border-b border-slate-100/70 last:border-b-0">
                        <td className="px-2.5 sm:px-4 py-3.5">
                          <span className="text-xs font-bold text-slate-700 block">
                            {order.customerName}
                          </span>
                        </td>
                        <td className="px-2.5 sm:px-4 py-3.5 text-right">
                          <span className="text-xs font-extrabold text-slate-700">
                            {formatCurrency(order.amount)}
                          </span>
                        </td>
                        <td className="px-2.5 sm:px-4 py-3.5 text-center">
                          <span 
                            className={`inline-block px-3 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-wider border ${
                              order.status === "PAID" 
                                ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                                : order.status === "PARTIALLY_PAID"
                                ? "bg-amber-50 text-amber-650 border-amber-100"
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

            <div className="pt-4 mt-4 border-t border-slate-100 px-4">
              <Link 
                href="/shop/orders" 
                className="text-xs font-extrabold text-[#0a52c3] hover:underline inline-flex items-center gap-1"
              >
                View all orders <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {/* Card 2: Top Performing SKUs */}
          <div className="bg-white border border-slate-200/60 p-6 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
                Top performing SKUs
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <tr>
                    <th className="px-2.5 sm:px-4 py-2.5 rounded-l-lg">
                      Product
                    </th>
                    <th className="px-2.5 sm:px-4 py-2.5 text-center">
                      Sold
                    </th>
                    <th className="px-2.5 sm:px-4 py-2.5 text-right rounded-r-lg">
                      Growth
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.topSKUs.map((sku, idx) => (
                    <tr key={sku.id || idx} className="hover:bg-slate-50/30 transition-colors border-b border-slate-100/70 last:border-b-0">
                      <td className="px-2.5 sm:px-4 py-3.5">
                        <span className="text-xs font-bold text-slate-700 block">
                          {sku.productName}
                        </span>
                      </td>
                      <td className="px-2.5 sm:px-4 py-3.5 text-center">
                        <span className="text-xs font-extrabold text-slate-700">
                          {sku.sold}
                        </span>
                      </td>
                      <td className="px-2.5 sm:px-4 py-3.5 text-right flex items-center justify-end gap-2">
                        <span className="text-[9px] font-extrabold text-slate-400 uppercase border border-slate-200 rounded px-1.5 py-0.5 bg-slate-50">
                          {sku.timeframe}
                        </span>
                        <span className="text-xs font-black text-emerald-500 inline-flex items-center gap-0.5">
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
        <div className="bg-white border border-slate-200/60 p-6 rounded-2xl shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
                Stock alerts
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <tr>
                    <th className="px-2.5 sm:px-4 py-2.5 rounded-l-lg">
                      Item
                    </th>
                    <th className="px-2.5 sm:px-4 py-2.5 text-center">
                      Units
                    </th>
                    <th className="px-2.5 sm:px-4 py-2.5 text-center rounded-r-lg">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.stockAlerts.map((alert, idx) => (
                    <tr key={alert.id || idx} className="hover:bg-slate-50/30 transition-colors border-b border-slate-100/70 last:border-b-0">
                      <td className="px-2.5 sm:px-4 py-3.5">
                        <span className="text-xs font-bold text-slate-700 block">
                          {alert.name}
                        </span>
                      </td>
                      <td className="px-2.5 sm:px-4 py-3.5 text-center">
                        <span className="text-xs font-extrabold text-slate-700">
                          {alert.units}
                        </span>
                      </td>
                      <td className="px-2.5 sm:px-4 py-3.5 text-center">
                        <span 
                          className={`inline-block px-3 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-wider border ${
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

          <div className="pt-4 mt-6 border-t border-slate-100 px-4">
            <Link 
              href="/shop/inventory" 
              className="text-xs font-extrabold text-[#0a52c3] hover:underline inline-flex items-center gap-1"
            >
              View all inventory <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
