import React from "react";
import { getCurrentUser } from "@/services/auth.service";
import { getWabaConfig } from "@/services/promotion.service";
import { WabaManagementClient } from "@/components/owner/promotions/WabaManagementClient";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Official WhatsApp Business API (WABA) Hub | Optical Manager",
  description: "Connect and manage Meta Cloud API & Zernio official WhatsApp accounts with live delivery diagnostics.",
};

export default async function OwnerWabaPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  let wabaConfig = null;
  if (user.organizationId) {
    try {
      wabaConfig = await getWabaConfig(user.organizationId);
    } catch (err) {
      console.error("[OwnerWabaPage] Error loading WABA config:", err);
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <WabaManagementClient initialConfig={wabaConfig} />
    </div>
  );
}
