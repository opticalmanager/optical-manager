import React from "react";
import { notFound } from "next/navigation";
import { getPublicAppointmentData } from "@/services/appointment.service";
import { PublicBookingForm } from "@/components/public/PublicBookingForm";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getPublicAppointmentData(slug);

  if (!data) {
    return {
      title: "Book Appointment | Optical Manager",
    };
  }

  return {
    title: `${data.config.pageTitle || "Book Appointment"} | ${data.organization.name}`,
    description: data.config.pageSubtitle || `Book your vision consultation with ${data.organization.name}.`,
  };
}

export default async function PublicBookingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getPublicAppointmentData(slug);

  if (!data) {
    notFound();
  }

  return (
    <PublicBookingForm
      organization={data.organization}
      shops={data.shops}
      config={data.config}
    />
  );
}
