import React from "react";
import { notFound, redirect } from "next/navigation";
import { getOrganizationDetailsById } from "@/services/admin.service";
import OrganizationDetailClient from "@/components/admin/OrganizationDetailClient";

export const dynamic = "force-dynamic";

interface OrganizationDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export async function generateMetadata({ params }: OrganizationDetailPageProps) {
  const { id } = await params;
  const data = await getOrganizationDetailsById(id);
  return {
    title: data ? `${data.organization.name} | Tenant Administration` : "Tenant Details",
    description: "Inspect tenant store outlets, subscription validity, and administrative controls.",
  };
}

export default async function OrganizationDetailPage({ params }: OrganizationDetailPageProps) {
  const { id } = await params;
  const data = await getOrganizationDetailsById(id);

  if (!data) {
    redirect("/admin/organizations");
  }

  return <OrganizationDetailClient data={data} />;
}
