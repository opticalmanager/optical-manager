import React from "react";
import { getCurrentUser } from "@/services/auth.service";
import { getPromotionDashboardData } from "@/services/promotion.service";
import { PromotionsMainClient } from "@/components/owner/promotions/PromotionsMainClient";

export const metadata = {
  title: "Promotions & WhatsApp Automation | Optical Manager",
  description: "Manage WhatsApp marketing templates, automated event triggers, and broadcast campaigns.",
};

interface OwnerPromotionsPageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function OwnerPromotionsPage({ searchParams }: OwnerPromotionsPageProps) {
  const user = await getCurrentUser();
  const resolvedParams = await searchParams;
  const initialTab = resolvedParams.tab || "overview";

  let dashboardData: any = {
    whatsappStatus: "DISCONNECTED",
    activeTemplatesCount: 0,
    activeTriggersCount: 0,
    upcomingCampaignsCount: 0,
    telemetry: { totalSent: 0, delivered: 0, read: 0, replied: 0 },
    recentCampaigns: [],
    activeTriggers: [],
  };

  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Promotions fetch timeout")), 8000)
    );
    dashboardData = await Promise.race([
      getPromotionDashboardData(user?.organizationId || ""),
      timeoutPromise,
    ]);
  } catch (err) {
    // Graceful offline fallback
  }

  return (
    <PromotionsMainClient
      initialData={dashboardData}
      initialTab={initialTab}
    />
  );
}
