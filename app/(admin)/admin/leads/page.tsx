import React from "react";
import { getDemoRequests } from "@/services/admin.service";
import AdminLeadsClient from "@/components/admin/AdminLeadsClient";

export const metadata = {
  title: "Demo Requests & Leads | Super Admin Control Panel",
  description: "Manage incoming store owner leads and 14-day trial requests.",
};

export default async function AdminLeadsPage() {
  const leads = await getDemoRequests();

  return <AdminLeadsClient leads={leads} />;
}
