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

  let organization: any = null;
  let shops: any[] = [];

  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Owner settings fetch timeout")), 8000)
    );

    [organization, shops] = await Promise.race([
      Promise.all([
        getOrganizationById(user.organizationId),
        getShopsByOrganization(user.organizationId),
      ]),
      timeoutPromise,
    ]);
  } catch (err) {
    organization = {
      id: user.organizationId,
      name: "Optical Store",
      onboardingCompleted: true,
    };
    shops = [];
  }

  return (
    <OwnerSettingsClient organization={organization} shops={shops} />
  );
}
