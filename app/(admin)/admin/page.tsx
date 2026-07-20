import React from "react";
import { getPlatformStats, getAllOrganizations } from "@/services/admin.service";
import AdminDashboardClient from "@/components/admin/AdminDashboardClient";

export const metadata = {
  title: "Platform Overview | Super Admin Control Panel",
  description: "Platform-wide SaaS telemetry, active stores, and MRR metrics.",
};

export default async function AdminDashboardPage() {
  const stats = await getPlatformStats();
  const organizations = await getAllOrganizations();

  return (
    <AdminDashboardClient 
      stats={stats}
      recentOrganizations={organizations}
    />
  );
}
