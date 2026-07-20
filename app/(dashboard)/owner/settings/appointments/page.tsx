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

  // Fetch organization info
  const organization = await getOrganizationById(user.organizationId);
  if (!organization) {
    redirect("/login");
  }

  // Fetch store branches
  const shopsRes = await getShopsWithManagers();
  const shops = shopsRes.success ? shopsRes.data || [] : [];

  // Fetch existing appointment configuration
  const configRes = await getAppointmentConfig(user.organizationId);
  const initialConfig = configRes.success && configRes.data ? configRes.data : {};

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
