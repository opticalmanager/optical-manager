"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  ClipboardList, 
  ShoppingBag, 
  AlertTriangle, 
  Calendar, 
  ChevronRight, 
  Zap, 
  AlertCircle, 
  Package, 
  Truck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency, cn } from "@/lib/utils";
import { DashboardData, AppointmentItem } from "@/services/dashboard.service";
import { AppointmentDetailsModal } from "./AppointmentDetailsModal";

interface StoreOverviewClientProps {
  data: DashboardData;
  shopName?: string;
}

// Fallback appointment records matching screenshot if DB table is currently empty
const mockAppointments: AppointmentItem[] = [
  {
    id: "app-1",
    customerName: "Arjun Kapoor",
    customerPhone: "+91 98765-43210",
    visitTime: "10:30 AM",
    rawVisitTime: new Date().toISOString(),
    purposeOfVisit: "Eye Examination",
    status: "CONFIRMED",
  },
  {
    id: "app-2",
    customerName: "Priya Iyer",
    customerPhone: "+91 91234-56789",
    visitTime: "11:15 AM",
    rawVisitTime: new Date().toISOString(),
    purposeOfVisit: "Contact Lens Fitting",
    status: "CONFIRMED",
  },
  {
    id: "app-3",
    customerName: "Rajesh Sharma",
    customerPhone: "+91 98111-22334",
    visitTime: "02:00 PM",
    rawVisitTime: new Date().toISOString(),
    purposeOfVisit: "Frame Selection",
    status: "PENDING",
  },
  {
    id: "app-4",
    customerName: "Ananya Deshmukh",
    customerPhone: "+91 97654-32109",
    visitTime: "03:30 PM",
    rawVisitTime: new Date().toISOString(),
    purposeOfVisit: "Vision Checkup",
    status: "CONFIRMED",
  },
];

export default function StoreOverviewClient({ data, shopName }: StoreOverviewClientProps) {
  const [activeTab, setActiveTab] = useState<"appointments" | "pending" | "pickup" | "delayed">("appointments");
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentItem | null>(null);

  const initialList = data.appointments && data.appointments.length > 0
    ? data.appointments
    : mockAppointments;

  const [appointmentsList, setAppointmentsList] = useState<AppointmentItem[]>(initialList);

  const handleStatusUpdated = (appointmentId: string, newStatus: "COMPLETED" | "CANCELLED" | "CONFIRMED") => {
    setAppointmentsList((prev) =>
      prev.map((app) => (app.id === appointmentId ? { ...app, status: newStatus } : app))
    );
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-5 select-none max-w-[1400px] mx-auto pb-8">
      {/* Page Title Header (Cleaned without duplicate New Invoice button) */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          Store Overview
        </h1>
      </div>

      {/* Top 4 Interactive KPI Cards Grid (Compact & Proportional UI/UX) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Card 1: PENDING ORDERS */}
        <div 
          onClick={() => setActiveTab("pending")}
          className={cn(
            "bg-white rounded-xl p-4 flex flex-col justify-between transition-all duration-200 cursor-pointer min-h-[110px]",
            activeTab === "pending"
              ? "border-2 border-[#2563eb] shadow-md scale-[1.01]"
              : "border border-slate-200/80 hover:border-slate-300 hover:shadow-xs"
          )}
        >
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-lg bg-blue-50 text-[#2563eb]">
              <ClipboardList className="h-4.5 w-4.5" />
            </div>
            <span className="bg-blue-50 text-[#2563eb] text-[11px] font-bold px-2 py-0.5 rounded-full border border-blue-100">
              +12%
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mt-3">
              PENDING ORDERS
            </span>
            <div className="text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
              {data.kpis.pendingOrders}
            </div>
          </div>
        </div>

        {/* Card 2: READY FOR PICKUP */}
        <div 
          onClick={() => setActiveTab("pickup")}
          className={cn(
            "bg-white rounded-xl p-4 flex flex-col justify-between transition-all duration-200 cursor-pointer min-h-[110px]",
            activeTab === "pickup"
              ? "border-2 border-[#2563eb] shadow-md scale-[1.01]"
              : "border border-slate-200/80 hover:border-slate-300 hover:shadow-xs"
          )}
        >
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <ShoppingBag className="h-4.5 w-4.5" />
            </div>
            <span className="bg-slate-100 text-slate-600 text-[11px] font-bold px-2 py-0.5 rounded-full border border-slate-200">
              On Track
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mt-3">
              READY FOR PICKUP
            </span>
            <div className="text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
              {data.kpis.readyForPickupOrders}
            </div>
          </div>
        </div>

        {/* Card 3: DELAYED ORDERS */}
        <div 
          onClick={() => setActiveTab("delayed")}
          className={cn(
            "bg-white rounded-xl p-4 flex flex-col justify-between transition-all duration-200 cursor-pointer min-h-[110px]",
            activeTab === "delayed"
              ? "border-2 border-[#2563eb] shadow-md scale-[1.01]"
              : "border border-slate-200/80 hover:border-slate-300 hover:shadow-xs"
          )}
        >
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-lg bg-rose-50 text-rose-600">
              <AlertTriangle className="h-4.5 w-4.5" />
            </div>
            <span className="bg-rose-50 text-rose-600 text-[11px] font-bold px-2 py-0.5 rounded-full border border-rose-100">
              High Priority
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mt-3">
              DELAYED ORDERS
            </span>
            <div className="text-2xl font-extrabold text-rose-600 tracking-tight mt-0.5">
              {data.kpis.delayedOrders}
            </div>
          </div>
        </div>

        {/* Card 4: APPOINTMENTS TODAY */}
        <div 
          onClick={() => setActiveTab("appointments")}
          className={cn(
            "bg-white rounded-xl p-4 flex flex-col justify-between transition-all duration-200 cursor-pointer min-h-[110px]",
            activeTab === "appointments"
              ? "border-2 border-[#2563eb] shadow-md scale-[1.01]"
              : "border border-slate-200/80 hover:border-slate-300 hover:shadow-xs"
          )}
        >
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-lg bg-[#2563eb] text-white shadow-xs">
              <Calendar className="h-4.5 w-4.5" />
            </div>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mt-3">
              APPOINTMENTS TODAY
            </span>
            <div className="text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
              {data.kpis.appointmentsToday}
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Schedule & Orders Table Container (Optimized Proportional Layout) */}
      <div className="bg-white border border-slate-200/80 rounded-xl shadow-xs overflow-hidden">
        {/* Card Table Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {activeTab === "appointments" && <Calendar className="h-4.5 w-4.5 text-[#2563eb]" />}
            {activeTab === "pending" && <ClipboardList className="h-4.5 w-4.5 text-[#2563eb]" />}
            {activeTab === "pickup" && <ShoppingBag className="h-4.5 w-4.5 text-indigo-600" />}
            {activeTab === "delayed" && <AlertTriangle className="h-4.5 w-4.5 text-rose-600" />}
            
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
              {activeTab === "appointments" && "Today's Schedule"}
              {activeTab === "pending" && "Pending Orders Schedule"}
              {activeTab === "pickup" && "Orders Ready for Pickup"}
              {activeTab === "delayed" && "Delayed Orders Requiring Action"}
            </h2>
          </div>

          <div>
            {activeTab === "appointments" ? (
              <Link 
                href="/shop/appointments" 
                className="text-xs font-bold text-[#2563eb] hover:underline"
              >
                View Calendar
              </Link>
            ) : (
              <Link 
                href="/shop/orders" 
                className="text-xs font-bold text-[#2563eb] hover:underline"
              >
                View All Orders
              </Link>
            )}
          </div>
        </div>

        {/* Dynamic Table Content */}
        <div className="overflow-x-auto">
          {activeTab === "appointments" && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-2.5 px-5">PATIENT NAME</th>
                  <th className="py-2.5 px-5">PHONE NUMBER</th>
                  <th className="py-2.5 px-5">TIME</th>
                  <th className="py-2.5 px-5">PURPOSE</th>
                  <th className="py-2.5 px-5 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {appointmentsList.map((app) => (
                  <tr 
                    key={app.id} 
                    onClick={() => setSelectedAppointment(app)}
                    className="hover:bg-blue-50/40 transition-colors group cursor-pointer"
                  >
                    <td className="py-3 px-5">
                      <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-full bg-blue-100 text-[#2563eb] font-bold text-[10px] flex items-center justify-center shrink-0">
                          {getInitials(app.customerName)}
                        </div>
                        <span className="text-xs font-bold text-slate-900">
                          {app.customerName}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-5 text-xs font-semibold text-slate-600">
                      {app.customerPhone}
                    </td>
                    <td className="py-3 px-5 text-xs font-semibold text-slate-900">
                      {app.visitTime}
                    </td>
                    <td className="py-3 px-5">
                      <span className={cn(
                        "inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border",
                        app.status === "COMPLETED"
                          ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                          : app.status === "CANCELLED"
                          ? "bg-rose-50 text-rose-600 border-rose-100"
                          : "bg-blue-50 text-[#2563eb] border-blue-100"
                      )}>
                        {app.purposeOfVisit}
                      </span>
                    </td>
                    <td className="py-3 px-5 text-right">
                      <span className="inline-flex items-center justify-center">
                        <ChevronRight className="h-4 w-4 text-[#2563eb] group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab !== "appointments" && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-2.5 px-5">CUSTOMER NAME</th>
                  <th className="py-2.5 px-5 text-right">AMOUNT</th>
                  <th className="py-2.5 px-5 text-center">STATUS</th>
                  <th className="py-2.5 px-5 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/50 transition-colors group cursor-pointer">
                    <td className="py-3 px-5">
                      <span className="text-xs font-bold text-slate-900 block">
                        {order.customerName}
                      </span>
                    </td>
                    <td className="py-3 px-5 text-right text-xs font-bold text-slate-900">
                      {formatCurrency(order.amount)}
                    </td>
                    <td className="py-3 px-5 text-center">
                      <span className={cn(
                        "inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase border",
                        order.status === "PAID" 
                          ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                          : order.status === "PARTIALLY_PAID"
                          ? "bg-amber-50 text-amber-600 border-amber-100"
                          : "bg-rose-50 text-rose-600 border-rose-100"
                      )}>
                        {order.status === "PARTIALLY_PAID" ? "Partially Paid" : order.status}
                      </span>
                    </td>
                    <td className="py-3 px-5 text-right">
                      <Link href="/shop/orders" className="inline-flex items-center justify-center">
                        <ChevronRight className="h-4 w-4 text-[#2563eb] group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Card Table Footer Link */}
        <div className="py-2.5 border-t border-slate-100 text-center bg-slate-50/30">
          {activeTab === "appointments" ? (
            <Link 
              href="/shop/appointments" 
              className="text-xs font-bold text-slate-500 hover:text-[#2563eb] transition-colors"
            >
              Show All Appointments
            </Link>
          ) : (
            <Link 
              href="/shop/orders" 
              className="text-xs font-bold text-slate-500 hover:text-[#2563eb] transition-colors"
            >
              Show All Orders
            </Link>
          )}
        </div>
      </div>

      {/* Bottom Grid Row: Recent Orders & Stock Alerts Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 items-start">
        {/* Left Column: Recent Orders Table */}
        <div className="bg-white border border-slate-200/80 p-4.5 rounded-xl shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <ShoppingBag className="h-4.5 w-4.5 text-[#2563eb]" /> Recent Orders
            </h2>
            <Link 
              href="/shop/orders" 
              className="text-xs font-bold text-[#2563eb] hover:underline flex items-center gap-1"
            >
              View all orders <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="px-3 py-2 rounded-l-lg">CUSTOMER</th>
                  <th className="px-3 py-2 text-right">AMOUNT</th>
                  <th className="px-3 py-2 text-center rounded-r-lg">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center py-6 text-xs text-slate-400 font-semibold">
                      No recent orders recorded
                    </td>
                  </tr>
                ) : (
                  data.recentOrders.map((order, idx) => (
                    <tr key={order.id || idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-3 py-2.5">
                        <span className="text-xs font-bold text-slate-800 block">
                          {order.customerName}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <span className="text-xs font-extrabold text-slate-900">
                          {formatCurrency(order.amount)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Low Stock Alerts Table */}
        <div className="bg-white border border-slate-200/80 p-4.5 rounded-xl shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <AlertCircle className="h-4.5 w-4.5 text-amber-600" /> Low Stock Alerts
            </h2>
            <Link 
              href="/shop/inventory" 
              className="text-xs font-bold text-[#2563eb] hover:underline flex items-center gap-1"
            >
              View all inventory <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="px-3 py-2 rounded-l-lg">ITEM</th>
                  <th className="px-3 py-2 text-center">UNITS</th>
                  <th className="px-3 py-2 text-center rounded-r-lg">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.stockAlerts.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center py-6 text-xs text-slate-400 font-semibold">
                      All inventory items healthy
                    </td>
                  </tr>
                ) : (
                  data.stockAlerts.map((alert, idx) => (
                    <tr key={alert.id || idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-3 py-2.5">
                        <span className="text-xs font-bold text-slate-800 block">
                          {alert.name}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className="text-xs font-extrabold text-slate-900">
                          {alert.units}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Appointment Details & Check-In Modal */}
      <AppointmentDetailsModal
        appointment={selectedAppointment}
        shopName={shopName}
        onClose={() => setSelectedAppointment(null)}
        onStatusUpdated={handleStatusUpdated}
      />
    </div>
  );
}

