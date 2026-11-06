import React from "react";
import { 
  getPlatformStats, 
  getAllOrganizations, 
  getExpiringSubscriptions, 
  getPlatformActivityPulse 
} from "@/services/admin.service";
import AdminDashboardClient from "@/components/admin/AdminDashboardClient";

export const metadata = {
  title: "Platform Overview | Super Admin Control Panel",
  description: "Platform-wide SaaS telemetry, active stores, and MRR metrics.",
};

export default async function AdminDashboardPage() {
  const [stats, organizations, expiringSubscriptions, activityPulse] = await Promise.all([
    getPlatformStats(),
    getAllOrganizations(),
    getExpiringSubscriptions(),
    getPlatformActivityPulse(),
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
