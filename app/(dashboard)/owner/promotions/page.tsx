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

  const dashboardData = await getPromotionDashboardData(user?.organizationId || "");

  return (
    <PromotionsMainClient
      initialData={dashboardData}
      initialTab={initialTab}
    />
  );
}
