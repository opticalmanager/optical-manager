import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/services/auth.service";
import { getOrganizationById } from "@/services/organization.service";
import { getShopsWithManagers } from "@/services/shop-manager.service";
import { getAppointmentConfig } from "@/services/appointment.service";
import { AppointmentPageBuilder } from "@/components/owner/AppointmentPageBuilder";

export const metadata = {
  title: "Appointment Booking Page Builder | Optical Manager",
  description: "Customize your public store appointment booking page.",
};

export default async function AppointmentSettingsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "OWNER" || !user.organizationId) {
    redirect("/login");
  }

  // Fetch organization, shops, and config with offline timeout resilience
  let organization: any = null;
  let shops: any[] = [];
  let initialConfig: any = {};

  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Appointment settings fetch timeout")), 8000)
    );

    const [orgData, shopsRes, configRes] = await Promise.race([
      Promise.all([
        getOrganizationById(user.organizationId),
        getShopsWithManagers().catch(() => ({ success: false, data: [] })),
        getAppointmentConfig(user.organizationId).catch(() => ({ success: false, data: null })),
      ]),
      timeoutPromise,
    ]);

    organization = orgData;
    shops = shopsRes && (shopsRes as any).success ? (shopsRes as any).data || [] : [];
    initialConfig = configRes && (configRes as any).success && (configRes as any).data ? (configRes as any).data : {};
  } catch (err) {
    organization = {
      id: user.organizationId,
      name: "Optical Store",
      slug: "opticalstore",
      phone: null,
    };
    shops = [];
    initialConfig = {};
  }

  if (!organization) {
    organization = {
      id: user.organizationId,
      name: "Optical Store",
      slug: "opticalstore",
      phone: null,
    };
  }

  return (
    <AppointmentPageBuilder
      organization={{
        id: organization.id,
        name: organization.name,
        slug: organization.slug || "niceroptical",
        phone: organization.phone || null,
      }}
      shops={shops.map((s) => ({
        id: s.id,
        name: s.name,
        address: s.address,
        phone: s.phone,
      }))}
      initialConfig={initialConfig}
    />
  );
}
