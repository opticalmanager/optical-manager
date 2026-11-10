import React from "react";
import { getAllOrganizations } from "@/services/admin.service";
import AdminOrganizationsClient from "@/components/admin/AdminOrganizationsClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Tenant Store Organizations | Super Admin Control Panel",
  description: "Manage optical retail store subscriptions, extensions, and suspension locks.",
};

export default async function AdminOrganizationsPage() {
  const organizations = await getAllOrganizations().catch((err) => {
    console.error("[AdminOrganizationsPage] Failed to fetch organizations:", err);
    return [];
  });

  return <AdminOrganizationsClient organizations={organizations} />;
}
