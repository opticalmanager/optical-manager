import React from "react";
import { getPlatformAddonsOverview } from "@/services/admin.service";
import AdminAddonsClient from "@/components/admin/AdminAddonsClient";

export const metadata = {
  title: "Add-on Services & API Control Hub | Super Admin",
  description: "Platform-wide telemetry, rate card management, and tenant add-on quotas.",
};

export const dynamic = "force-dynamic";

export default async function AdminAddonsPage() {
  const data = await getPlatformAddonsOverview();

  return <AdminAddonsClient initialData={data} />;
}
