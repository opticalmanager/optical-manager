import React from "react";
import { getPlatformAddonsOverview } from "@/services/admin.service";
import AdminAddonsClient from "@/components/admin/AdminAddonsClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Add-on Services & API Control Hub | Super Admin",
  description: "Platform-wide telemetry, rate card management, and tenant add-on quotas.",
};

export default async function AdminAddonsPage() {
  const data = await getPlatformAddonsOverview().catch((err) => {
    console.error("[AdminAddonsPage] Failed to fetch add-ons overview:", err);
    return {
      telemetry: {
        totalQueries: 0,
        cachedHits: 0,
        liveCalls: 0,
        cacheHitRatio: 0,
        totalCostInr: 0,
        whatsappDispatches: 0,
      },
      tenants: [],
    };
  });

  return <AdminAddonsClient initialData={data} />;
}
