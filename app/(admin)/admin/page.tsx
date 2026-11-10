import React from "react";
import { 
  getPlatformStats, 
  getAllOrganizations, 
  getExpiringSubscriptions, 
  getPlatformActivityPulse 
} from "@/services/admin.service";
import AdminDashboardClient from "@/components/admin/AdminDashboardClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Platform Overview | Super Admin Control Panel",
  description: "Platform-wide SaaS telemetry, active stores, and MRR metrics.",
};

export default async function AdminDashboardPage() {
  const [stats, organizations, expiringSubscriptions, activityPulse] = await Promise.all([
    getPlatformStats().catch((err) => {
      console.error("[AdminDashboardPage] Failed to fetch platform stats:", err);
      return {
        totalOrganizations: 0,
        totalShops: 0,
        activeSubscriptions: 0,
        pendingLeads: 0,
        approvedLeads: 0,
        totalPlatformRevenue: 0,
        totalInvoicesCount: 0,
        monthGmv: 0,
        monthInvoicesCount: 0,
        todayGmv: 0,
        todayInvoicesCount: 0,
        totalPrescriptionsCount: 0,
        whatsappMessagesCount: 0,
        gstinLookupsCount: 0,
        totalAddonCost: 0,
        expiringSubscriptionsCount: 0,
        mrr: 0,
        arr: 0,
        planDistribution: { enterprise: 0, pro: 0, basic: 0, trial: 0 },
      };
    }),
    getAllOrganizations().catch((err) => {
      console.error("[AdminDashboardPage] Failed to fetch organizations:", err);
      return [];
    }),
    getExpiringSubscriptions().catch((err) => {
      console.error("[AdminDashboardPage] Failed to fetch expiring subscriptions:", err);
      return [];
    }),
    getPlatformActivityPulse().catch((err) => {
      console.error("[AdminDashboardPage] Failed to fetch activity pulse:", err);
      return [];
    }),
  ]);

  return (
    <AdminDashboardClient 
      stats={stats}
      recentOrganizations={organizations}
      expiringSubscriptions={expiringSubscriptions}
      activityPulse={activityPulse}
    />
  );
}
