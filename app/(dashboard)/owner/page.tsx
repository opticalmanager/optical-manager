import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/services/auth.service";
import { getDashboardData, type DashboardData } from "@/services/dashboard.service";
import { getOrganizationById } from "@/services/organization.service";
import { getShopsByOrganization } from "@/services/shop.service";
import { TimeframeType } from "@/services/order.service";
import OwnerDashboardClient from "@/components/owner/OwnerDashboardClient";

export const metadata = {
  title: "Owner Dashboard | Optical Manager",
  description: "Optical Store enterprise dashboard showing multi-branch performance metrics, customer bifurcation, and transactions.",
};

interface PageProps {
  searchParams: Promise<{
    timeframe?: string;
    shopId?: string;
  }>;
}

export default async function OwnerDashboardPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) {
    redirect("/login");
  }

  const params = await searchParams;
  const timeframe = (params.timeframe || "90d") as TimeframeType;
  const targetShopId = params.shopId || "all";

  let data: DashboardData = {
    kpis: {
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
    },
    revenueChart: [],
    priorityActions: [],
    deliveryPerformance: { onTime: 0, delayed: 0, cancelled: 0 },
    recentOrders: [],
    pendingOrders: [],
    pickupOrders: [],
    delayedOrders: [],
    stockAlerts: [],
    topSKUs: [],
    topCustomers: [],
    categorySales: [],
    appointments: [],
    todayAppointments: [],
    recentActivities: [],
  };
  let organization: any = null;
  let shops: any[] = [];

  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Owner dashboard DB query timeout")), 8000)
    );
    const results = await Promise.race([
      Promise.all([
        getDashboardData(targetShopId, timeframe, user.organizationId),
        getOrganizationById(user.organizationId),
        getShopsByOrganization(user.organizationId),
      ]),
      timeoutPromise,
    ]);
    data = results[0];
    organization = results[1];
    shops = results[2] || [];
  } catch (err) {
    console.warn("[OwnerDashboardPage] Failed to fetch dashboard data (offline/timeout fallback):", err);
  }

  // Extract first name for friendly greeting
  const firstName = user.fullName
    ? user.fullName.trim().split(" ")[0]
    : user.email
    ? user.email.split("@")[0]
    : "Owner";

  return (
    <OwnerDashboardClient
      data={data}
      userName={firstName}
      shopName={organization?.name || "Optical Network"}
      currentTimeframe={timeframe}
      currentShopId={targetShopId}
      shops={shops}
    />
  );
}
