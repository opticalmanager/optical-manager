import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/services/auth.service";
import { getOrganizationById } from "@/services/organization.service";
import { getShopsByOrganization } from "@/services/shop.service";
import { getCustomizationSettings } from "@/services/customization.service";
import { CustomizationSettingsClient } from "@/components/owner/CustomizationSettingsClient";

export const metadata = {
  title: "Store & System Customization | Optical Manager",
  description: "Configure customizable fields, table columns, checkout workflows, and printing rules across all optical modules.",
};

export default async function CustomizationSettingsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "OWNER" || !user.organizationId) {
    redirect("/login");
  }

  let organization: any = null;
  let shops: any[] = [];
  let customizationConfig: any = null;

  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Customization settings fetch timeout")), 8000)
    );

    const [orgData, shopsData, configData] = await Promise.race([
      Promise.all([
        getOrganizationById(user.organizationId),
        getShopsByOrganization(user.organizationId),
        getCustomizationSettings(user.organizationId),
      ]),
      timeoutPromise,
    ]);

    organization = orgData;
    shops = Array.isArray(shopsData) ? shopsData : [];
    customizationConfig = configData;
  } catch (err) {
    organization = {
      id: user.organizationId,
      name: "Optical Store",
    };
    shops = [];
    customizationConfig = await getCustomizationSettings(user.organizationId);
  }

  return (
    <CustomizationSettingsClient
      initialConfig={customizationConfig}
      organizationName={organization?.name || "Optical Store"}
      shops={shops.map((s) => ({ id: s.id, name: s.name }))}
    />
  );
}
