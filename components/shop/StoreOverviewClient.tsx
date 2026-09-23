"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  Truck,
  RotateCcw,
  Receipt,
  MessageSquare,
  Clock,
  ExternalLink,
  Activity,
  ArrowUpRight,
  Eye,
  CheckCircle2,
  Phone,
  UserCheck,
  Sparkles,
  Inbox
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency, cn } from "@/lib/utils";
import { 
  DashboardData, 
  AppointmentItem, 
  RecentOrder, 
  StockAlert, 
  RecentActivityItem 
} from "@/services/dashboard.service";
import { AppointmentDetailsModal } from "./AppointmentDetailsModal";
import { offlineDB } from "@/lib/offline/db";

interface StoreOverviewClientProps {
  data: DashboardData;
  shopName?: string;
}

function getRelativeTimeString(dateIso: string) {
  try {
    const d = new Date(dateIso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHrs = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHrs / 24);

    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHrs < 24) return `${diffHrs}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
  } catch {
    return dateIso;
  }
}

export default function StoreOverviewClient({ data, shopName }: StoreOverviewClientProps) {
  const [activeTab, setActiveTab] = useState<"appointments" | "pending" | "pickup" | "delayed">("appointments");
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentItem | null>(null);

  const [appointmentsList, setAppointmentsList] = useState<AppointmentItem[]>(data?.todayAppointments || data?.appointments || []);
  const [kpis, setKpis] = useState(data?.kpis || {
    revenue: 0,
    collections: 0,
    pendingOrders: 0,
    readyForPickupOrders: 0,
    delayedOrders: 0,
    appointmentsToday: 0,
    lowStockAlerts: 0,
    pendingPayments: 0,
    totalOrdersCount: 0,
    avgOrderValue: 0,
    paidInvoicesCount: 0,
    patientVisitsCount: 0,
  });
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>(data?.recentOrders || []);
  const [pendingOrders, setPendingOrders] = useState<RecentOrder[]>(data?.pendingOrders || []);
  const [pickupOrders, setPickupOrders] = useState<RecentOrder[]>(data?.pickupOrders || []);
  const [delayedOrders, setDelayedOrders] = useState<RecentOrder[]>(data?.delayedOrders || []);
  const [recentActivities, setRecentActivities] = useState<RecentActivityItem[]>(data?.recentActivities || []);
  const [stockAlerts, setStockAlerts] = useState<StockAlert[]>(data?.stockAlerts || []);

  // Bottom tabs state
  const [bottomTab, setBottomTab] = useState<"activities" | "orders" | "stock">("activities");
  const [activityFilter, setActivityFilter] = useState<string>("ALL");

  // Sync server props when online or refreshed
  useEffect(() => {
    if (typeof navigator === "undefined" || navigator.onLine) {
      if (data?.kpis) setKpis(data.kpis);
      if (data?.todayAppointments || data?.appointments) {
        setAppointmentsList(data.todayAppointments || data.appointments);
      }
      if (data?.recentOrders) setRecentOrders(data.recentOrders);
      if (data?.pendingOrders) setPendingOrders(data.pendingOrders);
      if (data?.pickupOrders) setPickupOrders(data.pickupOrders);
      if (data?.delayedOrders) setDelayedOrders(data.delayedOrders);
      if (data?.recentActivities) setRecentActivities(data.recentActivities);
      if (data?.stockAlerts) setStockAlerts(data.stockAlerts);
    }
  }, [data]);

  // Resilient IndexedDB hydration for offline mode
  useEffect(() => {
    async function loadOfflineStoreData() {
      if (typeof navigator === "undefined") return;
      if (!navigator.onLine || !data?.kpis || (data?.recentOrders && data.recentOrders.length === 0)) {
        try {
          const [cachedApps, cachedOrders, cachedInv, offlineQueue] = await Promise.all([
            offlineDB.cached_appointments.toArray(),
            offlineDB.cached_orders.toArray(),
            offlineDB.cached_inventory.toArray(),
            offlineDB.offline_invoices_queue.toArray(),
          ]);

          const todayStr = new Date().toISOString().split("T")[0];

          // 1. Appointments Today
          if (cachedApps.length > 0) {
            const mappedApps: AppointmentItem[] = cachedApps
              .filter((a) => a.appointmentDate === todayStr || !a.appointmentDate)
              .map((a) => ({
                id: a.id,
                customerName: a.patientName,
                customerPhone: a.patientPhone,
                visitTime: a.appointmentTime || "10:00 AM",
                purposeOfVisit: a.type || "Routine Eye Exam",
                status: (a.status as any) || "CONFIRMED",
                notes: a.notes,
              }));
            if (mappedApps.length > 0) {
              setAppointmentsList(mappedApps);
            }
          }

          // 2. Orders & KPIs
          let pendingCount = 0;
          let pickupCount = 0;
          let delayedCount = 0;
          const mappedRecentOrders: RecentOrder[] = [];
          const mappedPendingOrders: RecentOrder[] = [];
          const mappedPickupOrders: RecentOrder[] = [];
          const mappedDelayedOrders: RecentOrder[] = [];

          // Queue items first
          const seenOrderIds = new Set<string>();
          for (const q of offlineQueue) {
            const p = q.payload;
            const items = p?.invoiceItems || p?.items || [];
            let subtotal = 0;
            let calculatedDiscount = 0;
            let totalTax = 0;
            for (const it of items) {
              subtotal += (Number(it.unitPrice) || 0) * (Number(it.quantity) || 1);
              calculatedDiscount += Number(it.discountAmount) || 0;
              totalTax += (Number(it.cgstAmount) || 0) + (Number(it.sgstAmount) || 0) + (Number(it.igstAmount) || 0);
            }
            const grandTotal = Math.max(0, subtotal - calculatedDiscount) + totalTax;
            const amount = p?.total !== undefined ? parseFloat(p.total) : (grandTotal || subtotal);

            const orderKey = q.offlineInvoiceNumber || q.id;
            seenOrderIds.add(orderKey);

            const row: RecentOrder = {
              id: q.id,
              invoiceNumber: q.offlineInvoiceNumber || `OFF-${q.id.slice(0, 8)}`,
              customerName: p?.customer?.fullName || "Walk-in Patient",
              customerPhone: p?.customer?.phone || undefined,
              amount,
              status: q.syncStatus === "SYNCED" ? "PAID" : "PENDING",
              fulfillmentStatus: "UNDER_PROCESSING",
              dateStr: new Date(q.createdAt).toLocaleDateString(),
            };

            mappedRecentOrders.push(row);
            mappedPendingOrders.push(row);
            pendingCount++;
          }

          // Cached orders (avoid duplicate counts)
          for (const o of cachedOrders) {
            const orderKey = o.invoiceNumber || o.id;
            if (seenOrderIds.has(orderKey)) {
              continue;
            }
            seenOrderIds.add(orderKey);

            const row: RecentOrder = {
              id: o.id,
              invoiceNumber: o.invoiceNumber,
              customerName: o.customerName,
              customerPhone: o.customerPhone || undefined,
              amount: parseFloat(o.totalAmount) || 0,
              status: parseFloat(o.dueAmount) === 0 ? "PAID" : parseFloat(o.paidAmount) > 0 ? "PARTIALLY_PAID" : "PENDING",
              fulfillmentStatus: o.status,
              dateStr: new Date(o.createdAt).toLocaleDateString(),
              estimatedDelivery: o.deliveryDate || undefined,
            };

            if (mappedRecentOrders.length < 8) {
              mappedRecentOrders.push(row);
            }

            if (o.status !== "DELIVERED") {
              pendingCount++;
              mappedPendingOrders.push(row);
              if (o.status === "READY" || o.status === "PROCESSING") {
                pickupCount++;
                mappedPickupOrders.push(row);
              }
              if (o.deliveryDate && o.deliveryDate < todayStr) {
                delayedCount++;
                mappedDelayedOrders.push(row);
              }
            }
          }

          if (mappedRecentOrders.length > 0) setRecentOrders(mappedRecentOrders);
          if (mappedPendingOrders.length > 0) setPendingOrders(mappedPendingOrders);
          if (mappedPickupOrders.length > 0) setPickupOrders(mappedPickupOrders);
          if (mappedDelayedOrders.length > 0) setDelayedOrders(mappedDelayedOrders);

          // 3. Stock Alerts
          const lowStock = cachedInv
            .filter((i) => i.quantity <= ((i as any).minQuantity || 5))
            .slice(0, 8)
            .map((i) => ({
              id: i.id,
              name: i.name,
              units: i.quantity,
              sku: i.sku || undefined,
              status: (i.quantity <= 0 ? "OUT_OF_STOCK" : "LOW_STOCK") as any,
            }));

          if (lowStock.length > 0) {
            setStockAlerts(lowStock);
          }

          setKpis((prev) => ({
            ...prev,
            pendingOrders: pendingCount,
            readyForPickupOrders: pickupCount,
            delayedOrders: delayedCount,
            appointmentsToday: cachedApps.filter((a) => a.appointmentDate === todayStr).length,
          }));
        } catch (err) {
          console.warn("[StoreOverviewClient] Failed to load offline dashboard data:", err);
        }
      }
    }

    loadOfflineStoreData();

    const handleDataUpdated = () => {
      if (!navigator.onLine) {
        loadOfflineStoreData();
      }
    };

    window.addEventListener("offline-databank-updated", handleDataUpdated);
    window.addEventListener("offline", loadOfflineStoreData);
    return () => {
      window.removeEventListener("offline-databank-updated", handleDataUpdated);
      window.removeEventListener("offline", loadOfflineStoreData);
    };
  }, [data]);

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

  // Filtered Activities
  const filteredActivities = useMemo(() => {
    if (activityFilter === "ALL") return recentActivities;
    return recentActivities.filter((a) => a.type === activityFilter);
  }, [recentActivities, activityFilter]);

  return (
    <div className="space-y-5 select-none max-w-[1400px] mx-auto pb-8">
      {/* Page Title Header (Sticky Topbar is the single primary CTA source) */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111827]">
            Store Overview
          </h1>
          <p className="text-xs text-[#6B7280] font-medium mt-0.5">
            Real-time outlet operations, fulfillment statuses, and store activities
          </p>
        </div>
      </div>

      {/* Top 4 Interactive KPI Cards Grid (Accurate Live Metrics + 0ms Filter Reactivity) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Card 1: PENDING ORDERS */}
        <div 
          onClick={() => setActiveTab("pending")}
          className={cn(
            "bg-white rounded-xl p-4 flex flex-col justify-between transition-all duration-200 cursor-pointer min-h-[110px]",
            activeTab === "pending"
              ? "border-2 border-[#2563EB] shadow-md scale-[1.01]"
              : "border border-[#E5E7EB] hover:border-slate-300 hover:shadow-xs"
          )}
        >
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-lg bg-blue-50 text-[#2563EB]">
              <ClipboardList className="h-4.5 w-4.5" />
            </div>
            <span className="bg-[#EFF6FF] text-[#2563EB] text-[11px] font-bold px-2 py-0.5 rounded-full border border-blue-200">
              Active
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block mt-3">
              PENDING ORDERS
            </span>
            <div className="text-2xl font-extrabold text-[#111827] tracking-tight mt-0.5">
              {kpis.pendingOrders}
            </div>
          </div>
        </div>

        {/* Card 2: READY FOR PICKUP */}
        <div 
          onClick={() => setActiveTab("pickup")}
          className={cn(
            "bg-white rounded-xl p-4 flex flex-col justify-between transition-all duration-200 cursor-pointer min-h-[110px]",
            activeTab === "pickup"
              ? "border-2 border-[#2563EB] shadow-md scale-[1.01]"
              : "border border-[#E5E7EB] hover:border-slate-300 hover:shadow-xs"
          )}
        >
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-lg bg-emerald-50 text-[#059669]">
              <ShoppingBag className="h-4.5 w-4.5" />
            </div>
            <span className="bg-[#ECFDF5] text-[#059669] text-[11px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
              Ready
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block mt-3">
              READY FOR PICKUP
            </span>
            <div className="text-2xl font-extrabold text-[#111827] tracking-tight mt-0.5">
              {kpis.readyForPickupOrders}
            </div>
          </div>
        </div>

        {/* Card 3: DELAYED ORDERS */}
        <div 
          onClick={() => setActiveTab("delayed")}
          className={cn(
            "bg-white rounded-xl p-4 flex flex-col justify-between transition-all duration-200 cursor-pointer min-h-[110px]",
            activeTab === "delayed"
              ? "border-2 border-[#2563EB] shadow-md scale-[1.01]"
              : "border border-[#E5E7EB] hover:border-slate-300 hover:shadow-xs"
          )}
        >
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-lg bg-red-50 text-[#DC2626]">
              <AlertTriangle className="h-4.5 w-4.5" />
            </div>
            <span className={cn(
              "text-[11px] font-bold px-2 py-0.5 rounded-full border",
              kpis.delayedOrders > 0
                ? "bg-[#FEF2F2] text-[#DC2626] border-red-200"
                : "bg-[#F3F4F6] text-[#6B7280] border-[#E5E7EB]"
            )}>
              {kpis.delayedOrders > 0 ? "Requires Action" : "Clear"}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block mt-3">
              DELAYED ORDERS
            </span>
            <div className={cn(
              "text-2xl font-extrabold tracking-tight mt-0.5",
              kpis.delayedOrders > 0 ? "text-[#DC2626]" : "text-[#111827]"
            )}>
              {kpis.delayedOrders}
            </div>
          </div>
        </div>

        {/* Card 4: APPOINTMENTS TODAY */}
        <div 
          onClick={() => setActiveTab("appointments")}
          className={cn(
            "bg-white rounded-xl p-4 flex flex-col justify-between transition-all duration-200 cursor-pointer min-h-[110px]",
            activeTab === "appointments"
              ? "border-2 border-[#2563EB] shadow-md scale-[1.01]"
              : "border border-[#E5E7EB] hover:border-slate-300 hover:shadow-xs"
          )}
        >
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-lg bg-blue-50 text-[#2563EB]">
              <Calendar className="h-4.5 w-4.5" />
            </div>
            <span className="bg-[#EFF6FF] text-[#2563EB] text-[11px] font-bold px-2 py-0.5 rounded-full border border-blue-200">
              Today
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block mt-3">
              APPOINTMENTS TODAY
            </span>
            <div className="text-2xl font-extrabold text-[#111827] tracking-tight mt-0.5">
              {kpis.appointmentsToday}
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Upper Table Container (Updates in 0ms when clicking any KPI Card) */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-xs overflow-hidden">
        {/* Card Table Header */}
        <div className="px-5 py-3.5 border-b border-[#E5E7EB] flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            {activeTab === "appointments" && <Calendar className="h-4.5 w-4.5 text-[#2563EB]" />}
            {activeTab === "pending" && <ClipboardList className="h-4.5 w-4.5 text-[#2563EB]" />}
            {activeTab === "pickup" && <ShoppingBag className="h-4.5 w-4.5 text-[#059669]" />}
            {activeTab === "delayed" && <AlertTriangle className="h-4.5 w-4.5 text-[#DC2626]" />}
            
            <h2 className="text-base font-extrabold text-[#111827] tracking-tight">
              {activeTab === "appointments" && `Today's Appointments (${appointmentsList.length})`}
              {activeTab === "pending" && `Pending Orders in Fulfillment (${pendingOrders.length})`}
              {activeTab === "pickup" && `Orders Ready for Pickup (${pickupOrders.length})`}
              {activeTab === "delayed" && `Delayed Orders Requiring Follow-Up (${delayedOrders.length})`}
            </h2>
          </div>

          <div>
            {activeTab === "appointments" ? (
              <Link 
                href="/shop/appointments" 
                className="text-xs font-bold text-[#2563EB] hover:underline flex items-center gap-1"
              >
                View Full Calendar <ChevronRight className="h-3 w-3" />
              </Link>
            ) : (
              <Link 
                href="/shop/orders" 
                className="text-xs font-bold text-[#2563EB] hover:underline flex items-center gap-1"
              >
                View All Orders <ChevronRight className="h-3 w-3" />
              </Link>
            )}
          </div>
        </div>

        {/* Dynamic Table Content based on activeTab */}
        <div className="overflow-x-auto">
          {/* TAB 1: Appointments Today */}
          {activeTab === "appointments" && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#F3F6FA] text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">
                  <th className="py-2.5 px-5">PATIENT NAME</th>
                  <th className="py-2.5 px-5">PHONE NUMBER</th>
                  <th className="py-2.5 px-5">TIME</th>
                  <th className="py-2.5 px-5">PURPOSE</th>
                  <th className="py-2.5 px-5">STATUS</th>
                  <th className="py-2.5 px-5 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] bg-white">
                {appointmentsList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-xs text-[#6B7280] font-semibold">
                      No appointments scheduled for today
                    </td>
                  </tr>
                ) : (
                  appointmentsList.map((app) => (
                    <tr 
                      key={app.id} 
                      onClick={() => setSelectedAppointment(app)}
                      className="hover:bg-[#F9FAFB] transition-colors group cursor-pointer"
                    >
                      <td className="py-3 px-5">
                        <div className="flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-full bg-blue-100 text-[#2563EB] font-bold text-[10px] flex items-center justify-center shrink-0">
                            {getInitials(app.customerName)}
                          </div>
                          <span className="text-xs font-bold text-[#111827]">
                            {app.customerName}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-5 text-xs font-semibold text-[#6B7280]">
                        {app.customerPhone}
                      </td>
                      <td className="py-3 px-5 text-xs font-semibold text-[#111827]">
                        {app.visitTime}
                      </td>
                      <td className="py-3 px-5">
                        <span className="text-xs font-medium text-[#111827]">
                          {app.purposeOfVisit}
                        </span>
                      </td>
                      <td className="py-3 px-5">
                        <span className={cn(
                          "inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border",
                          app.status === "COMPLETED"
                            ? "bg-[#ECFDF5] text-[#059669] border-emerald-200"
                            : app.status === "CANCELLED"
                            ? "bg-[#FEF2F2] text-[#DC2626] border-red-200"
                            : "bg-[#EFF6FF] text-[#2563EB] border-blue-200"
                        )}>
                          {app.status}
                        </span>
                      </td>
                      <td className="py-3 px-5 text-right">
                        <button
                          type="button"
                          className="h-7 px-2.5 rounded-lg bg-white border border-[#D1D5DB] hover:bg-[#F9FAFB] text-[#374151] text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                        >
                          Check In <ChevronRight className="h-3 w-3 text-[#6B7280]" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {/* TAB 2: Pending Orders */}
          {activeTab === "pending" && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#F3F6FA] text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">
                  <th className="py-2.5 px-5">ORDER #</th>
                  <th className="py-2.5 px-5">CUSTOMER</th>
                  <th className="py-2.5 px-5 text-right">TOTAL AMOUNT</th>
                  <th className="py-2.5 px-5 text-center">PAYMENT</th>
                  <th className="py-2.5 px-5 text-center">FULFILLMENT</th>
                  <th className="py-2.5 px-5 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] bg-white">
                {pendingOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-xs text-[#6B7280] font-semibold">
                      All orders fulfilled! No pending orders.
                    </td>
                  </tr>
                ) : (
                  pendingOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-[#F9FAFB] transition-colors group">
                      <td className="py-3 px-5 font-mono text-xs font-bold text-[#2563EB]">
                        {order.invoiceNumber || order.id}
                      </td>
                      <td className="py-3 px-5">
                        <span className="text-xs font-bold text-[#111827] block">
                          {order.customerName}
                        </span>
                        {order.customerPhone && (
                          <span className="text-[10px] text-[#6B7280]">{order.customerPhone}</span>
                        )}
                      </td>
                      <td className="py-3 px-5 text-right text-xs font-extrabold text-[#111827]">
                        {formatCurrency(order.amount)}
                      </td>
                      <td className="py-3 px-5 text-center">
                        <span className={cn(
                          "inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border",
                          order.status === "PAID"
                            ? "bg-[#ECFDF5] text-[#059669] border-emerald-200"
                            : order.status === "PARTIALLY_PAID"
                            ? "bg-[#FFFBEB] text-[#D97706] border-amber-200"
                            : "bg-[#FEF2F2] text-[#DC2626] border-red-200"
                        )}>
                          {order.status === "PARTIALLY_PAID" ? "Partial" : order.status}
                        </span>
                      </td>
                      <td className="py-3 px-5 text-center">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-[#374151] border border-slate-200">
                          {order.fulfillmentStatus || "PROCESSING"}
                        </span>
                      </td>
                      <td className="py-3 px-5 text-right">
                        <Link 
                          href="/shop/orders" 
                          className="h-7 px-2.5 rounded-lg bg-white border border-[#D1D5DB] hover:bg-[#F9FAFB] text-[#374151] text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                        >
                          Manage <ChevronRight className="h-3 w-3 text-[#6B7280]" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {/* TAB 3: Ready for Pickup Orders */}
          {activeTab === "pickup" && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#F3F6FA] text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">
                  <th className="py-2.5 px-5">ORDER #</th>
                  <th className="py-2.5 px-5">CUSTOMER NAME</th>
                  <th className="py-2.5 px-5">CONTACT PHONE</th>
                  <th className="py-2.5 px-5 text-right">TOTAL AMOUNT</th>
                  <th className="py-2.5 px-5 text-center">STATUS</th>
                  <th className="py-2.5 px-5 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] bg-white">
                {pickupOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-xs text-[#6B7280] font-semibold">
                      No orders currently awaiting customer pickup.
                    </td>
                  </tr>
                ) : (
                  pickupOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-[#F9FAFB] transition-colors group">
                      <td className="py-3 px-5 font-mono text-xs font-bold text-[#2563EB]">
                        {order.invoiceNumber || order.id}
                      </td>
                      <td className="py-3 px-5">
                        <span className="text-xs font-bold text-[#111827]">
                          {order.customerName}
                        </span>
                      </td>
                      <td className="py-3 px-5 text-xs text-[#6B7280]">
                        {order.customerPhone || "N/A"}
                      </td>
                      <td className="py-3 px-5 text-right text-xs font-extrabold text-[#111827]">
                        {formatCurrency(order.amount)}
                      </td>
                      <td className="py-3 px-5 text-center">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#ECFDF5] text-[#059669] border border-emerald-200">
                          Ready For Pickup
                        </span>
                      </td>
                      <td className="py-3 px-5 text-right">
                        <Link 
                          href="/shop/orders" 
                          className="h-7 px-2.5 rounded-lg bg-white border border-[#D1D5DB] hover:bg-[#F9FAFB] text-[#374151] text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                        >
                          Deliver <ChevronRight className="h-3 w-3 text-[#6B7280]" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {/* TAB 4: Delayed Orders */}
          {activeTab === "delayed" && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#F3F6FA] text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">
                  <th className="py-2.5 px-5">ORDER #</th>
                  <th className="py-2.5 px-5">CUSTOMER NAME</th>
                  <th className="py-2.5 px-5">ESTIMATED DELIVERY</th>
                  <th className="py-2.5 px-5 text-right">TOTAL AMOUNT</th>
                  <th className="py-2.5 px-5 text-center">URGENCY</th>
                  <th className="py-2.5 px-5 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] bg-white">
                {delayedOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-xs text-[#059669] font-semibold bg-[#ECFDF5]/30">
                      Excellent! There are no delayed orders.
                    </td>
                  </tr>
                ) : (
                  delayedOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-[#F9FAFB] transition-colors group">
                      <td className="py-3 px-5 font-mono text-xs font-bold text-[#DC2626]">
                        {order.invoiceNumber || order.id}
                      </td>
                      <td className="py-3 px-5">
                        <span className="text-xs font-bold text-[#111827] block">
                          {order.customerName}
                        </span>
                        {order.customerPhone && (
                          <span className="text-[10px] text-[#6B7280]">{order.customerPhone}</span>
                        )}
                      </td>
                      <td className="py-3 px-5 text-xs font-bold text-[#DC2626]">
                        {order.estimatedDelivery ? new Date(order.estimatedDelivery).toLocaleDateString() : "Overdue"}
                      </td>
                      <td className="py-3 px-5 text-right text-xs font-extrabold text-[#111827]">
                        {formatCurrency(order.amount)}
                      </td>
                      <td className="py-3 px-5 text-center">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#FEF2F2] text-[#DC2626] border border-red-200">
                          Delayed
                        </span>
                      </td>
                      <td className="py-3 px-5 text-right">
                        <Link 
                          href="/shop/orders" 
                          className="h-7 px-2.5 rounded-lg bg-white border border-[#D1D5DB] hover:bg-[#F9FAFB] text-[#374151] text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                        >
                          Expedite <ChevronRight className="h-3 w-3 text-[#6B7280]" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Card Table Footer Link */}
        <div className="py-2.5 border-t border-[#E5E7EB] text-center bg-[#F9FAFB]">
          {activeTab === "appointments" ? (
            <Link 
              href="/shop/appointments" 
              className="text-xs font-bold text-[#6B7280] hover:text-[#2563EB] transition-colors"
            >
              Show All Appointments →
            </Link>
          ) : (
            <Link 
              href="/shop/orders" 
              className="text-xs font-bold text-[#6B7280] hover:text-[#2563EB] transition-colors"
            >
              Show All Orders →
            </Link>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* BOTTOM SECTION: Dedicated Tabbed Panel (Recent Activity, Orders, Stock Alerts) */}
      {/* ========================================================================= */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-xs overflow-hidden">
        {/* Navigation Tabs Bar */}
        <div className="px-4 sm:px-5 pt-3 border-b border-[#E5E7EB] flex items-center justify-between flex-wrap gap-2 bg-white">
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => setBottomTab("activities")}
              className={cn(
                "px-3.5 py-2 rounded-t-lg text-xs font-bold transition-colors cursor-pointer border-b-2 flex items-center gap-2",
                bottomTab === "activities"
                  ? "border-[#2563EB] text-[#2563EB] bg-[#EFF6FF]/40"
                  : "border-transparent text-[#6B7280] hover:text-[#111827] hover:bg-[#F9FAFB]"
              )}
            >
              <Activity className="h-4 w-4" />
              <span>Recent Activity</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-blue-100 text-[#2563EB]">
                {recentActivities.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setBottomTab("orders")}
              className={cn(
                "px-3.5 py-2 rounded-t-lg text-xs font-bold transition-colors cursor-pointer border-b-2 flex items-center gap-2",
                bottomTab === "orders"
                  ? "border-[#2563EB] text-[#2563EB] bg-[#EFF6FF]/40"
                  : "border-transparent text-[#6B7280] hover:text-[#111827] hover:bg-[#F9FAFB]"
              )}
            >
              <ShoppingBag className="h-4 w-4" />
              <span>Recent Orders</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-slate-100 text-[#374151]">
                {recentOrders.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setBottomTab("stock")}
              className={cn(
                "px-3.5 py-2 rounded-t-lg text-xs font-bold transition-colors cursor-pointer border-b-2 flex items-center gap-2",
                bottomTab === "stock"
                  ? "border-[#2563EB] text-[#2563EB] bg-[#EFF6FF]/40"
                  : "border-transparent text-[#6B7280] hover:text-[#111827] hover:bg-[#F9FAFB]"
              )}
            >
              <AlertCircle className="h-4 w-4 text-[#D97706]" />
              <span>Low Stock Alerts</span>
              {stockAlerts.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-amber-100 text-[#D97706]">
                  {stockAlerts.length}
                </span>
              )}
            </button>
          </div>

          <div className="pb-2">
            {bottomTab === "activities" && (
              <span className="text-[11px] font-semibold text-[#6B7280] flex items-center gap-1">
                <Clock className="h-3 w-3" /> Live Event Feed
              </span>
            )}
            {bottomTab === "orders" && (
              <Link href="/shop/orders" className="text-xs font-bold text-[#2563EB] hover:underline flex items-center gap-0.5">
                Full Orders Ledger <ChevronRight className="h-3 w-3" />
              </Link>
            )}
            {bottomTab === "stock" && (
              <Link href="/shop/inventory" className="text-xs font-bold text-[#2563EB] hover:underline flex items-center gap-0.5">
                Full Inventory <ChevronRight className="h-3 w-3" />
              </Link>
            )}
          </div>
        </div>

        {/* Tab 1 Body: Store Recent Activity Feed */}
        {bottomTab === "activities" && (
          <div className="p-4 sm:p-5 space-y-4">
            {/* Activity Type Filters */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              {[
                { key: "ALL", label: "All Activities" },
                { key: "INVOICE", label: "Invoices" },
                { key: "PURCHASE", label: "Purchases" },
                { key: "RETURN", label: "Returns" },
                { key: "STOCK", label: "Stock Movements" },
                { key: "APPOINTMENT", label: "Appointments" },
                { key: "COMMUNICATION", label: "WhatsApp" },
              ].map((pill) => (
                <button
                  key={pill.key}
                  type="button"
                  onClick={() => setActivityFilter(pill.key)}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border",
                    activityFilter === pill.key
                      ? "bg-[#2563EB] text-white border-[#2563EB] shadow-2xs"
                      : "bg-white text-[#374151] border-[#D1D5DB] hover:bg-[#F9FAFB]"
                  )}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            {/* Activities List */}
            {filteredActivities.length === 0 ? (
              <div className="py-12 text-center text-[#6B7280]">
                <Inbox className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-semibold">No recent activity recorded for this filter.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredActivities.map((act) => {
                  return (
                    <div
                      key={act.id}
                      className="p-3 sm:p-3.5 rounded-xl border border-[#E5E7EB] bg-white hover:bg-[#F9FAFB] transition-all flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Type Icon Container */}
                        <div className={cn(
                          "h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border",
                          act.type === "INVOICE" && "bg-blue-50 text-[#2563EB] border-blue-100",
                          act.type === "PURCHASE" && "bg-emerald-50 text-[#059669] border-emerald-100",
                          act.type === "RETURN" && "bg-amber-50 text-[#D97706] border-amber-100",
                          act.type === "STOCK" && "bg-purple-50 text-purple-600 border-purple-100",
                          act.type === "APPOINTMENT" && "bg-cyan-50 text-cyan-600 border-cyan-100",
                          act.type === "COMMUNICATION" && "bg-emerald-50 text-[#059669] border-emerald-100"
                        )}>
                          {act.type === "INVOICE" && <Receipt className="h-4 w-4" />}
                          {act.type === "PURCHASE" && <Truck className="h-4 w-4" />}
                          {act.type === "RETURN" && <RotateCcw className="h-4 w-4" />}
                          {act.type === "STOCK" && <Package className="h-4 w-4" />}
                          {act.type === "APPOINTMENT" && <Calendar className="h-4 w-4" />}
                          {act.type === "COMMUNICATION" && <MessageSquare className="h-4 w-4" />}
                        </div>

                        {/* Title and details */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-[#111827] truncate">
                              {act.title}
                            </span>
                            <span className="text-[10px] font-semibold text-[#6B7280] hidden sm:inline">
                              • {act.action}
                            </span>
                            <span className={cn(
                              "px-2 py-0.2 rounded-full text-[9px] font-bold uppercase border",
                              act.badgeVariant === "success" && "bg-[#ECFDF5] text-[#059669] border-emerald-200",
                              act.badgeVariant === "warning" && "bg-[#FFFBEB] text-[#D97706] border-amber-200",
                              act.badgeVariant === "danger" && "bg-[#FEF2F2] text-[#DC2626] border-red-200",
                              act.badgeVariant === "info" && "bg-[#EFF6FF] text-[#2563EB] border-blue-200",
                              act.badgeVariant === "neutral" && "bg-slate-100 text-[#374151] border-slate-200"
                            )}>
                              {act.status}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#6B7280] truncate mt-0.5">
                            {act.subtitle}
                          </p>
                        </div>
                      </div>

                      {/* Right info & shortcut action */}
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right hidden sm:block">
                          <span className="text-[10px] font-bold text-[#6B7280] block">
                            {getRelativeTimeString(act.timestamp)}
                          </span>
                        </div>
                        {act.actionHref && (
                          <Link
                            href={act.actionHref}
                            className="h-7 px-2.5 rounded-lg bg-white border border-[#D1D5DB] hover:bg-[#F9FAFB] text-[#374151] text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                          >
                            <span>View</span>
                            <ArrowUpRight className="h-3 w-3 text-[#6B7280]" />
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2 Body: Recent Orders */}
        {bottomTab === "orders" && (
          <div className="p-0 overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#F3F6FA] border-b border-[#E5E7EB] text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-2.5">ORDER #</th>
                  <th className="px-5 py-2.5">CUSTOMER</th>
                  <th className="px-5 py-2.5 text-right">AMOUNT</th>
                  <th className="px-5 py-2.5 text-center">PAYMENT</th>
                  <th className="px-5 py-2.5 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] bg-white">
                {recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-xs text-[#6B7280] font-semibold">
                      No recent orders recorded
                    </td>
                  </tr>
                ) : (
                  recentOrders.map((order, idx) => (
                    <tr key={order.id || idx} className="hover:bg-[#F9FAFB] transition-colors">
                      <td className="px-5 py-3 font-mono text-xs font-bold text-[#2563EB]">
                        {order.invoiceNumber || order.id}
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-xs font-bold text-[#111827] block">
                          {order.customerName}
                        </span>
                        {order.dateStr && (
                          <span className="text-[10px] text-[#6B7280]">{order.dateStr}</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className="text-xs font-extrabold text-[#111827]">
                          {formatCurrency(order.amount)}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span 
                          className={cn(
                            "inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border",
                            order.status === "PAID" 
                              ? "bg-[#ECFDF5] text-[#059669] border-emerald-200" 
                              : order.status === "PARTIALLY_PAID"
                              ? "bg-[#FFFBEB] text-[#D97706] border-amber-200"
                              : "bg-[#FEF2F2] text-[#DC2626] border-red-200"
                          )}
                        >
                          {order.status === "PARTIALLY_PAID" ? "Partially Paid" : order.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Link
                          href="/shop/orders"
                          className="h-7 px-2.5 rounded-lg bg-white border border-[#D1D5DB] hover:bg-[#F9FAFB] text-[#374151] text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                        >
                          Details <ChevronRight className="h-3 w-3 text-[#6B7280]" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3 Body: Low Stock Alerts */}
        {bottomTab === "stock" && (
          <div className="p-0 overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#F3F6FA] border-b border-[#E5E7EB] text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-2.5">ITEM NAME</th>
                  <th className="px-5 py-2.5 text-center">UNITS IN STOCK</th>
                  <th className="px-5 py-2.5 text-center">STATUS</th>
                  <th className="px-5 py-2.5 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] bg-white">
                {stockAlerts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-xs text-[#059669] font-semibold bg-[#ECFDF5]/30">
                      All inventory items are currently healthy!
                    </td>
                  </tr>
                ) : (
                  stockAlerts.map((alert, idx) => (
                    <tr key={alert.id || idx} className="hover:bg-[#F9FAFB] transition-colors">
                      <td className="px-5 py-3">
                        <span className="text-xs font-bold text-[#111827] block">
                          {alert.name}
                        </span>
                        {alert.sku && (
                          <span className="text-[10px] font-mono text-[#6B7280]">SKU: {alert.sku}</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className="text-xs font-extrabold text-[#111827]">
                          {alert.units}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span 
                          className={cn(
                            "inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border",
                            alert.status === "IN_STOCK" 
                              ? "bg-[#ECFDF5] text-[#059669] border-emerald-200" 
                              : alert.status === "LOW_STOCK"
                              ? "bg-[#FFFBEB] text-[#D97706] border-amber-200"
                              : "bg-[#FEF2F2] text-[#DC2626] border-red-200"
                          )}
                        >
                          {alert.status === "LOW_STOCK" ? "Low Stock" : alert.status === "OUT_OF_STOCK" ? "Out of Stock" : "In Stock"}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Link
                          href="/shop/purchases/new"
                          className="h-7 px-2.5 rounded-lg bg-white border border-[#D1D5DB] hover:bg-[#F9FAFB] text-[#374151] text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                        >
                          Restock <ChevronRight className="h-3 w-3 text-[#6B7280]" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
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
