import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/services/auth.service";
import { getOrganizationById } from "@/services/organization.service";
import { getShopsByOrganization } from "@/services/shop.service";
import { OwnerSettingsClient } from "@/components/owner/OwnerSettingsClient";

export default async function OwnerSettingsPage() {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) {
    redirect("/login");
  }

  const [organization, shops] = await Promise.all([
    getOrganizationById(user.organizationId),
    getShopsByOrganization(user.organizationId),
  ]);

  return (
    <OwnerSettingsClient organization={organization} shops={shops} />
  );
}
