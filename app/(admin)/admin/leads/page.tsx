import React from "react";
import { getDemoRequests } from "@/services/admin.service";
import AdminLeadsClient from "@/components/admin/AdminLeadsClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Demo Requests & Leads | Super Admin Control Panel",
  description: "Manage incoming store owner leads and 14-day trial requests.",
};

export default async function AdminLeadsPage() {
  const leads = await getDemoRequests().catch((err) => {
    console.error("[AdminLeadsPage] Failed to fetch leads:", err);
    return [];
  });

  return <AdminLeadsClient leads={leads} />;
}
