import React from "react";
import { getAllOrganizations } from "@/services/admin.service";
import AdminOrganizationsClient from "@/components/admin/AdminOrganizationsClient";

export const metadata = {
  title: "Tenant Store Organizations | Super Admin Control Panel",
  description: "Manage optical retail store subscriptions, extensions, and suspension locks.",
};

export default async function AdminOrganizationsPage() {
  const organizations = await getAllOrganizations();

  return <AdminOrganizationsClient organizations={organizations} />;
}
