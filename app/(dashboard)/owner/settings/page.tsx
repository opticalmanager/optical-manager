import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/services/auth.service";
import { getOrganizationById } from "@/services/organization.service";
import { OwnerSettingsClient } from "@/components/owner/OwnerSettingsClient";

export default async function OwnerSettingsPage() {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) {
    redirect("/login");
  }

  const organization = await getOrganizationById(user.organizationId);

  return (
    <OwnerSettingsClient organization={organization} />
  );
}
