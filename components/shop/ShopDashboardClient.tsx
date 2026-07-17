"use client";

import React from "react";
import Link from "next/link";
import { 
  Plus, 
  UserPlus, 
  PackagePlus, 
  ReceiptText,
  BarChart3,
  ArrowRight,
  ChevronRight,
  AlertTriangle,
  Clock,
  Sparkles,
  ShoppingBag
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { DashboardData } from "@/services/dashboard.service";

interface ShopDashboardClientProps {
  data: DashboardData;
  shopName?: string;
}

export default function ShopDashboardClient({ data, shopName }: ShopDashboardClientProps) {
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

  return (
    <div className="space-y-8 select-none max-w-[1400px] mx-auto pb-10">
      {/* Top Welcome & Quick Actions Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              Welcome back, {shopName || "Store Manager"}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-extrabold uppercase border border-emerald-100">
              Active Store
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-400 mt-1.5 flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#2563eb] animate-pulse"></span>
            {getFormattedHeaderDate()}
          </p>
        </div>

        {/* Quick Action Shortcuts */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Link href="/shop/invoices/new">
            <Button className="h-10 px-4 text-xs font-bold text-white bg-[#2563eb] hover:bg-[#1d4ed8] rounded-xl shadow-md shadow-blue-500/20 cursor-pointer flex items-center gap-2">
              <Plus className="h-4 w-4" /> New Invoice
            </Button>
          </Link>
          <Link href="/shop/patients/new">
            <Button variant="outline" className="h-10 px-4 text-xs font-bold text-slate-700 hover:bg-slate-50 border-slate-200 rounded-xl cursor-pointer flex items-center gap-2 bg-white">
              <UserPlus className="h-4 w-4 text-slate-500" /> Add Patient
            </Button>
          </Link>
          <Link href="/shop/inventory/add">
            <Button variant="outline" className="h-10 px-4 text-xs font-bold text-slate-700 hover:bg-slate-50 border-slate-200 rounded-xl cursor-pointer flex items-center gap-2 bg-white">
              <PackagePlus className="h-4 w-4 text-slate-500" /> Add Stock
            </Button>
          </Link>
        </div>
      </div>

      {/* Operational KPI Summary Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {/* Total Revenue */}
        <div className="bg-white border border-slate-200/60 p-6 rounded-2xl shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-extrabold text-[#2563eb] uppercase tracking-widest">
            Total Revenue
          </span>
          <div className="text-3xl font-extrabold text-slate-800 tracking-tight mt-4">
            {formatCurrency(data.kpis.revenue)}
          </div>
        </div>

        {/* Pending Orders */}
        <Link 
          href="/shop/orders?filter=PENDING"
          className="bg-white border border-slate-200/60 p-6 rounded-2xl shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between hover:scale-[1.01] cursor-pointer"
        >
          <span className="text-[11px] font-extrabold text-amber-600 uppercase tracking-widest">
            Pending Orders
          </span>
          <div className="text-3xl font-extrabold text-slate-800 tracking-tight mt-4">
            {data.kpis.pendingOrders}
          </div>
        </Link>

        {/* Low Stock Alerts */}
        <Link 
          href="/shop/inventory?filter=low-stock"
          className="bg-white border border-slate-200/60 p-6 rounded-2xl shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between hover:scale-[1.01] cursor-pointer"
        >
          <span className="text-[11px] font-extrabold text-rose-600 uppercase tracking-widest">
            Low Stock Alerts
          </span>
          <div className="text-3xl font-extrabold text-slate-800 tracking-tight mt-4">
            {data.kpis.lowStockAlerts}
          </div>
        </Link>

        {/* Pending Payments */}
        <Link 
          href="/shop/orders?tab=PARTIALLY_PAID"
          className="bg-white border border-slate-200/60 p-6 rounded-2xl shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between hover:scale-[1.01] cursor-pointer"
        >
          <span className="text-[11px] font-extrabold text-indigo-600 uppercase tracking-widest">
            Pending Payments
          </span>
          <div className="text-3xl font-extrabold text-slate-800 tracking-tight mt-4">
            {formatCurrency(data.kpis.pendingPayments)}
          </div>
        </Link>
      </div>

      {/* Analytics CTA Callout Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-[#2563eb] to-indigo-900 rounded-2xl p-6 md:p-8 text-white shadow-lg relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-xs text-xs font-bold uppercase tracking-wider text-blue-100 border border-white/10">
            <Sparkles className="h-3.5 w-3.5 text-yellow-300" /> Store Telemetry & Insights
          </div>
          <h2 className="text-2xl font-black tracking-tight">Deep Store Analytics & Revenue Graphs</h2>
          <p className="text-xs text-blue-100 leading-relaxed font-medium">
            Explore interactive revenue charts, delivery performance donut breakdowns, top-selling optical SKUs, and timeframe telemetry.
          </p>
        </div>

        <Link href="/shop/analytics" className="relative z-10 shrink-0">
          <Button className="h-11 px-6 text-xs font-extrabold text-slate-900 bg-white hover:bg-slate-100 rounded-xl shadow-md cursor-pointer flex items-center gap-2 transition-all hover:gap-3">
            View Analytics Workspace <ArrowRight className="h-4 w-4 text-[#2563eb]" />
          </Button>
        </Link>

        {/* Background Decorative Accent */}
        <div className="absolute -right-10 -bottom-10 h-48 w-48 bg-white/5 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* Main Operational Tables Row */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 items-start">
        {/* Priority Actions */}
        <div className="bg-white border border-slate-200/60 p-6 rounded-2xl shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
              Priority Actions
            </h3>
            <span className="text-[9px] font-black text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded uppercase tracking-widest">
              Immediate Attention
            </span>
          </div>

          <div className="overflow-y-auto max-h-[300px]">
            <table className="w-full text-left">
              <thead className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <tr>
                  <th className="px-3 py-2.5 rounded-l-lg">Task Description</th>
                  <th className="px-3 py-2.5 text-right rounded-r-lg w-24">Action</th>
                </tr>
              </thead>
              <tbody>
                {data.priorityActions.map((action, idx) => (
                  <tr key={action.id || idx} className="hover:bg-slate-50/30 transition-colors border-b border-slate-100/70 last:border-b-0">
                    <td className="px-3 py-3.5 pr-2">
                      <span className="text-xs font-semibold text-slate-700 block leading-normal">
                        {action.description}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-right">
                      <Link 
                        href={action.actionHref}
                        className="text-xs font-extrabold text-[#2563eb] hover:underline"
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

        {/* Recent Orders */}
        <div className="bg-white border border-slate-200/60 p-6 rounded-2xl shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
                Recent Orders
              </h3>
              <Link 
                href="/shop/orders" 
                className="text-xs font-extrabold text-[#2563eb] hover:underline inline-flex items-center gap-1"
              >
                View all orders <ChevronRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <tr>
                    <th className="px-3 py-2.5 rounded-l-lg">Customer</th>
                    <th className="px-3 py-2.5 text-right">Amount</th>
                    <th className="px-3 py-2.5 text-center rounded-r-lg">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentOrders.map((order, idx) => (
                    <tr key={order.id || idx} className="hover:bg-slate-50/30 transition-colors border-b border-slate-100/70 last:border-b-0">
                      <td className="px-3 py-3.5">
                        <span className="text-xs font-bold text-slate-700 block">
                          {order.customerName}
                        </span>
                      </td>
                      <td className="px-3 py-3.5 text-right">
                        <span className="text-xs font-extrabold text-slate-700">
                          {formatCurrency(order.amount)}
                        </span>
                      </td>
                      <td className="px-3 py-3.5 text-center">
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
        </div>
      </div>
    </div>
  );
}
